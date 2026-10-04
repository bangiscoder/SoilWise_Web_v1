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
  UserLoginInput 
} from '../types/auth';

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

/**
 * Retrieves the user profile document from Firestore (`users/{uid}`)
 */
export async function getUserProfile(uid: string): Promise<SoilWiseUserProfile | null> {
  if (!db || !isFirebaseConfigured) return null;

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as SoilWiseUserProfile;
    }
    return null;
  } catch (error) {
    console.warn('Could not retrieve user profile from Firestore:', error);
    return null;
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
