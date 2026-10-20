/**
 * SoilWise AI Authentication Service (Stage 1: Public User Authentication)
 * 
 * Provides robust Firebase Authentication integration:
 * - Email & Password Registration & Login
 * - Google Sign-In
 * - Password Reset
 * - Canonical User Profile Sync with Firestore (users/{uid})
 * - User-Friendly Error Translation
 * - Strict User / Administrator Separation
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db, isFirebaseConfigured, isAdmin } from '../lib/firebase';
import { 
  SoilWiseUserProfile, 
  UserRegistrationInput, 
  UserLoginInput,
  UpdateProfileInput 
} from '../types/auth';
import { enqueueSyncItem } from './backgroundSyncService';

/**
 * Translates Firebase internal authentication error codes into clear,
 * farmer-friendly messages without exposing raw technical errors.
 */
export function translateAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completion. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access has been temporarily paused. Please try again later or reset your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact SoilWise AI support.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled. Please contact support.';
    default:
      if (message.includes('password') && message.includes('match')) {
        return message;
      }
      return 'Authentication could not be completed. Please try again.';
  }
}

const USER_PROFILE_CACHE_PREFIX = 'soilwise_cached_user_profile_';

export function getCachedUserProfile(uid: string): SoilWiseUserProfile | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${USER_PROFILE_CACHE_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setCachedUserProfile(uid: string, profile: SoilWiseUserProfile): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${USER_PROFILE_CACHE_PREFIX}${uid}`, JSON.stringify(profile));
  } catch (e) {
    console.warn('Could not cache user profile locally:', e);
  }
}

/**
 * Retrieves the user profile document from Firestore (`users/{uid}`) with offline cache fallback
 */
export async function getUserProfile(uid: string): Promise<SoilWiseUserProfile | null> {
  const cached = getCachedUserProfile(uid);

  if (!db || !isFirebaseConfigured) {
    return cached;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as SoilWiseUserProfile;
      setCachedUserProfile(uid, data);
      return data;
    }
    return cached;
  } catch (error) {
    console.warn('Could not retrieve user profile from Firestore, using cache:', error);
    return cached;
  }
}

/**
 * Creates or synchronizes the user profile in Firestore.
 * Preserves existing profile data (e.g. manually updated display name).
 * Ensures new public users always receive the 'user' role.
 */
export async function createOrSyncUserProfile(
  firebaseUser: User,
  fallbackDisplayName?: string
): Promise<SoilWiseUserProfile> {
  const uid = firebaseUser.uid;
  const email = firebaseUser.email || '';
  const isUserAdmin = isAdmin(firebaseUser);
  const nowIso = new Date().toISOString();

  const providers = firebaseUser.providerData
    .map((p) => p.providerId)
    .filter(Boolean);

  let existingProfile: SoilWiseUserProfile | null = null;
  if (db && isFirebaseConfigured) {
    existingProfile = await getUserProfile(uid);
  }

  if (existingProfile) {
    // If profile already exists, do not overwrite custom display name with Google profile
    const updatedProviders = Array.from(new Set([...existingProfile.authProviders, ...providers]));
    const updatedProfile: SoilWiseUserProfile = {
      ...existingProfile,
      authProviders: updatedProviders,
      updatedAt: nowIso,
    };

    if (db && isFirebaseConfigured) {
      try {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, {
          authProviders: updatedProviders,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn('Could not update profile in Firestore:', err);
      }
    }

    return updatedProfile;
  }

  // Create brand new profile
  const newProfile: SoilWiseUserProfile = {
    uid,
    email,
    displayName: firebaseUser.displayName || fallbackDisplayName || null,
    photoURL: firebaseUser.photoURL || null,
    role: isUserAdmin ? 'admin' : 'user', // Strict separation: normal farmers receive 'user'
    authProviders: providers.length > 0 ? providers : ['password'],
    accountStatus: 'active',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (db && isFirebaseConfigured) {
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not persist new user profile to Firestore:', err);
    }
  }

  return newProfile;
}

/**
 * Register a new farmer account using Email and Password
 */
export async function registerWithEmail(
  input: UserRegistrationInput
): Promise<{ user: User; profile: SoilWiseUserProfile }> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('SoilWise authentication service is not configured.');
  }

  const name = input.name.trim();
  const email = input.email.trim();
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  // Validation
  if (!name) {
    throw new Error('Please enter your name.');
  }
  if (!email) {
    throw new Error('Please enter your email address.');
  }
  if (!password) {
    throw new Error('Please enter a password.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match. Please re-enter your password.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set user's displayName in Firebase Auth
  try {
    await updateProfile(user, { displayName: name });
  } catch (err) {
    console.warn('Could not update Firebase Auth displayName:', err);
  }

  // Create basic user profile in Firestore
  const profile = await createOrSyncUserProfile(user, name);

  return { user, profile };
}

/**
 * Login using Email and Password
 */
export async function loginWithEmail(
  input: UserLoginInput
): Promise<{ user: User; profile: SoilWiseUserProfile }> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('SoilWise authentication service is not configured.');
  }

  const email = input.email.trim();
  const password = input.password;

  if (!email || !password) {
    throw new Error('Please enter both your email address and password.');
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  const profile = await createOrSyncUserProfile(user);

  return { user, profile };
}

/**
 * Sign in using Google Provider
 */
export async function loginWithGoogle(): Promise<{ user: User; profile: SoilWiseUserProfile }> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('SoilWise authentication service is not configured.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;
  const profile = await createOrSyncUserProfile(user);

  return { user, profile };
}

/**
 * Trigger Password Reset Email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('SoilWise authentication service is not configured.');
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error('Please enter your email address.');
  }

  await sendPasswordResetEmail(auth, trimmedEmail);
}

/**
 * Terminate authenticated user session
 */
export async function logoutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/**
 * Updates a user's display name and agricultural personalization preferences (Stage 3).
 * Enforces role isolation: regular users cannot elevate roles or modify security fields.
 * Includes local storage caching and background sync queueing for offline reliability.
 */
export async function updateUserProfileData(
  uid: string,
  input: UpdateProfileInput
): Promise<SoilWiseUserProfile> {
  if (!uid) {
    throw new Error('User identifier is required.');
  }

  const nowIso = new Date().toISOString();

  // Try to retrieve profile from Firestore or local cache
  let existingProfile = await getUserProfile(uid);
  if (!existingProfile) {
    // Graceful baseline creation if user document didn't exist yet
    const currentFbUser = auth?.currentUser;
    existingProfile = {
      uid,
      email: currentFbUser?.email || '',
      displayName: currentFbUser?.displayName || null,
      phoneNumber: currentFbUser?.phoneNumber || null,
      photoURL: currentFbUser?.photoURL || null,
      role: currentFbUser && isAdmin(currentFbUser) ? 'admin' : 'user',
      authProviders: currentFbUser?.providerData.map(p => p.providerId) || ['password'],
      accountStatus: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  // If displayName or photoURL was updated, also update Firebase Auth user if available
  if (auth?.currentUser && auth.currentUser.uid === uid) {
    try {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (input.displayName !== undefined) authUpdates.displayName = input.displayName.trim();
      if (input.photoURL !== undefined && input.photoURL !== null) authUpdates.photoURL = input.photoURL;
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(auth.currentUser, authUpdates);
      }
    } catch (err) {
      console.warn('Could not update Firebase Auth user profile:', err);
    }
  }

  const nextDisplayName = input.displayName !== undefined
    ? (input.displayName.trim() || null)
    : existingProfile.displayName;

  const nextPhoneNumber = input.phoneNumber !== undefined
    ? (input.phoneNumber.trim() || null)
    : (existingProfile.phoneNumber || null);

  const nextPhotoURL = input.photoURL !== undefined
    ? input.photoURL
    : (existingProfile.photoURL || null);

  const nextState = input.state !== undefined
    ? (input.state.trim() || null)
    : (existingProfile.state || null);

  const nextLga = input.lga !== undefined
    ? (input.lga.trim() || null)
    : (existingProfile.lga || null);

  const nextBio = input.bio !== undefined
    ? (input.bio.trim() || null)
    : (existingProfile.bio || existingProfile.profile?.bio || null);

  const nextFarmSize = input.farmSizeHectares !== undefined
    ? input.farmSizeHectares
    : (existingProfile.farmSizeHectares ?? existingProfile.profile?.farmSizeHectares);

  const nextPrimaryCrop = input.primaryCrop !== undefined
    ? (input.primaryCrop.trim() || null)
    : (existingProfile.primaryCrop ?? existingProfile.profile?.primaryCrop ?? null);

  // Build merged preferences cleanly
  const existingProfilePrefs = existingProfile.profile || {};
  const nextProfilePrefs = {
    ...existingProfilePrefs,
    ...(input.preferredLanguage !== undefined ? { preferredLanguage: input.preferredLanguage } : {}),
    ...(input.farmingExperience !== undefined ? { farmingExperience: input.farmingExperience } : {}),
    ...(input.primaryFarmingInterest !== undefined ? { primaryFarmingInterest: input.primaryFarmingInterest } : {}),
    ...(input.farmingInterests !== undefined ? { farmingInterests: input.farmingInterests } : {}),
    ...(input.preferredCrops !== undefined ? { preferredCrops: input.preferredCrops } : {}),
    ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber } : {}),
    ...(input.state !== undefined ? { state: input.state } : {}),
    ...(input.lga !== undefined ? { lga: input.lga } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(nextFarmSize !== undefined ? { farmSizeHectares: nextFarmSize } : {}),
    ...(nextPrimaryCrop ? { primaryCrop: nextPrimaryCrop } : {}),
  };

  const nextActiveFarmId = input.activeFarmId !== undefined
    ? input.activeFarmId
    : existingProfile.activeFarmId;

  const updatedProfile: SoilWiseUserProfile = {
    ...existingProfile,
    displayName: nextDisplayName,
    phoneNumber: nextPhoneNumber,
    photoURL: nextPhotoURL,
    state: nextState || undefined,
    lga: nextLga || undefined,
    bio: nextBio || undefined,
    farmSizeHectares: nextFarmSize,
    primaryCrop: nextPrimaryCrop || undefined,
    preferredLanguage: nextProfilePrefs.preferredLanguage,
    farmingExperience: nextProfilePrefs.farmingExperience,
    primaryFarmingInterest: nextProfilePrefs.primaryFarmingInterest,
    farmingInterests: nextProfilePrefs.farmingInterests,
    preferredCrops: nextProfilePrefs.preferredCrops,
    profile: nextProfilePrefs,
    activeFarmId: nextActiveFarmId ?? null,
    updatedAt: nowIso,
  };

  // 1. Immediately cache updated profile in localStorage
  setCachedUserProfile(uid, updatedProfile);

  // 2. Prepare Firestore document payload with complete required attributes
  const firestorePayload: Record<string, any> = {
    uid,
    email: existingProfile.email || auth?.currentUser?.email || '',
    role: existingProfile.role || 'user',
    accountStatus: existingProfile.accountStatus || 'active',
    displayName: nextDisplayName,
    phoneNumber: nextPhoneNumber,
    photoURL: nextPhotoURL,
    state: nextState,
    lga: nextLga,
    bio: nextBio,
    farmSizeHectares: nextFarmSize ?? null,
    primaryCrop: nextPrimaryCrop,
    preferredLanguage: nextProfilePrefs.preferredLanguage || 'en',
    farmingExperience: nextProfilePrefs.farmingExperience || null,
    primaryFarmingInterest: nextProfilePrefs.primaryFarmingInterest || null,
    farmingInterests: nextProfilePrefs.farmingInterests || [],
    preferredCrops: nextProfilePrefs.preferredCrops || [],
    profile: nextProfilePrefs,
    activeFarmId: nextActiveFarmId ?? null,
    updatedAt: nowIso,
  };

  // 3. Persist to Firestore if online, or queue to backgroundSyncService
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline && db && isFirebaseConfigured) {
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        ...firestorePayload,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Network error writing profile to Firestore. Queuing offline sync item:', err);
      enqueueSyncItem('user_profile', firestorePayload, uid);
    }
  } else {
    // Offline mode: queue for synchronization
    console.log('[BackgroundSync] App is offline. Queued profile update for sync when connection is restored.');
    enqueueSyncItem('user_profile', firestorePayload, uid);
  }

  return updatedProfile;
}

/**
 * Updates the user's active/selected farm.
 */
export async function setActiveFarmId(
  uid: string,
  activeFarmId: string | null
): Promise<void> {
  if (!uid || !db || !isFirebaseConfigured) return;

  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, {
    activeFarmId: activeFarmId ?? null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

