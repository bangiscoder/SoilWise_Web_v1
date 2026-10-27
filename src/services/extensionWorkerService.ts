import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';
import { db, firebaseConfig, isFirebaseConfigured, AUTHORIZED_ADMIN_EMAIL } from '../lib/firebase';
import { 
  ExtensionWorker, 
  CreateExtensionWorkerInput, 
  ExtensionWorkerFarmerActivity,
  ExtensionWorkerSummaryStats 
} from '../types/extensionWorker';
import { SoilWiseUserProfile } from '../types/auth';
import { getUserAnalysisHistory } from './analysisHistoryService';

/**
 * Generates an 8-character secure alphanumeric password for new extension worker accounts.
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates an official Staff ID for extension workers (e.g., EW-KAD-2026-842).
 */
export function generateExtensionStaffId(state?: string): string {
  const stateCode = (state || 'NIG').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const rand = Math.floor(100 + Math.random() * 900);
  return `EW-${stateCode}-${year}-${rand}`;
}

export interface CreateExtensionWorkerResult {
  success: boolean;
  worker?: ExtensionWorker;
  generatedPassword?: string;
  emailStatus?: {
    sent: boolean;
    simulated: boolean;
    error?: string;
  };
  error?: string;
}

/**
 * Admin action: Creates a new Extension Worker account in Firebase Auth,
 * provisions their profile with role 'extension_worker', creates the extension worker record,
 * assigns initial farmers, and dispatches the welcome email with credentials.
 */
export async function createExtensionWorkerAccount(
  input: CreateExtensionWorkerInput,
  adminEmail: string
): Promise<CreateExtensionWorkerResult> {
  if (!db || !isFirebaseConfigured) {
    return { success: false, error: 'Database service is currently unavailable.' };
  }

  if (adminEmail.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: 'Unauthorized: Only the designated SoilWise administrator may create extension workers.' };
  }

  const emailClean = input.email.trim().toLowerCase();
  const nameClean = input.name.trim();
  const password = input.password?.trim() || generateTemporaryPassword();
  const staffId = input.staffId?.trim() || generateExtensionStaffId(input.coverageState);
  const nowIso = new Date().toISOString();

  let workerUid: string;

  // Use a secondary Firebase app instance to create the Auth user
  // This is CRITICAL so the current admin is NOT logged out of the browser session!
  const secondaryAppName = `adminCreateWorker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let secondaryApp: any = null;

  try {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailClean, password);
      workerUid = userCredential.user.uid;
      await updateProfile(userCredential.user, { displayName: nameClean });
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        // If account already exists in Auth, check if they exist in users collection
        const existingUsersQuery = query(collection(db, 'users'), where('email', '==', emailClean));
        const userSnaps = await getDocs(existingUsersQuery);
        if (!userSnaps.empty) {
          workerUid = userSnaps.docs[0].id;
        } else {
          return { success: false, error: `An account with ${emailClean} already exists in Firebase Auth. Please use another email or contact user.` };
        }
      } else {
        throw authErr;
      }
    } finally {
      if (secondaryAuth.currentUser) {
        await signOut(secondaryAuth);
      }
    }
  } catch (err: any) {
    console.error('Failed to create extension worker in Firebase Auth:', err);
    return { success: false, error: err.message || 'Could not create worker user authentication credentials.' };
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch (delErr) {
        console.warn('Error deleting secondary auth app instance:', delErr);
      }
    }
  }

  try {
    const workerDocRef = doc(db, 'extension_workers', workerUid);
    const userDocRef = doc(db, 'users', workerUid);

    const initialAssigned = input.initialAssignedFarmerIds || [];

    const workerRecord: ExtensionWorker = {
      id: workerUid,
      uid: workerUid,
      staffId,
      name: nameClean,
      email: emailClean,
      phone: input.phone.trim(),
      coverageState: input.coverageState,
      coverageLgas: input.coverageLgas && input.coverageLgas.length > 0 ? input.coverageLgas : [],
      organization: input.organization.trim(),
      assignedFarmerIds: initialAssigned,
      onboardedFarmerIds: [],
      specialization: input.specialization?.trim() || 'General Agronomy & Smallholder Extension',
      status: 'active',
      notes: input.notes?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso,
      createdByAdminEmail: adminEmail,
      welcomeEmailSent: false,
      initialTemporaryPassword: password,
    };

    // 1. Create or update user profile with role: 'extension_worker'
    await setDoc(userDocRef, {
      uid: workerUid,
      displayName: nameClean,
      email: emailClean,
      phoneNumber: input.phone.trim(),
      role: 'extension_worker',
      state: input.coverageState,
      lga: input.coverageLgas[0] || '',
      organization: input.organization.trim(),
      extensionWorkerStaffId: staffId,
      accountStatus: 'active',
      updatedAt: nowIso,
      createdAt: nowIso,
    }, { merge: true });

    // 2. If initial farmers are assigned, update their user profiles
    if (initialAssigned.length > 0) {
      for (const farmerUid of initialAssigned) {
        try {
          const farmerRef = doc(db, 'users', farmerUid);
          await updateDoc(farmerRef, {
            assignedExtensionWorkerId: workerUid,
            assignedExtensionWorkerName: nameClean,
            updatedAt: nowIso,
          });
        } catch (assignErr) {
          console.warn(`Could not update farmer ${farmerUid} assignment:`, assignErr);
        }
      }
    }

    // 3. Dispatch the congratulatory welcome email with login credentials
    let emailStatus = { sent: false, simulated: false, error: undefined as string | undefined };

    if (input.sendWelcomeEmail !== false) {
      try {
        const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://soilwise.ng';
        const resp = await fetch('/api/admin/extension-worker/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameClean,
            email: emailClean,
            temporaryPassword: password,
            staffId,
            organization: input.organization.trim(),
            coverageState: input.coverageState,
            coverageLgas: input.coverageLgas,
            portalUrl,
          }),
        });

        if (resp.ok) {
          const emailData = await resp.json();
          emailStatus = {
            sent: true,
            simulated: Boolean(emailData.simulated),
            error: emailData.error,
          };
          workerRecord.welcomeEmailSent = true;
          workerRecord.welcomeEmailSentAt = nowIso;
        } else {
          const errData = await resp.json();
          emailStatus = { sent: false, simulated: false, error: errData.error || 'Server error sending email' };
        }
      } catch (emailErr: any) {
        console.warn('Welcome email dispatch notice:', emailErr.message);
        emailStatus = { sent: false, simulated: false, error: emailErr.message };
      }
    }

    // 4. Save extension worker record to Firestore
    await setDoc(workerDocRef, workerRecord);

    return {
      success: true,
      worker: workerRecord,
      generatedPassword: password,
      emailStatus,
    };
  } catch (err: any) {
    console.error('Failed to save extension worker document:', err);
    return { success: false, error: err.message || 'Failed to save extension worker record.' };
  }
}

/**
 * Retrieves all registered Extension Workers from Firestore.
 */
export async function fetchAllExtensionWorkers(): Promise<ExtensionWorker[]> {
  if (!db || !isFirebaseConfigured) return [];

  try {
    const colRef = collection(db, 'extension_workers');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const list: ExtensionWorker[] = [];
    snapshot.forEach((d) => {
      list.push({
        id: d.id,
        ...d.data(),
      } as ExtensionWorker);
    });

    return list;
  } catch (err) {
    console.warn('Could not fetch extension workers:', err);
    return [];
  }
}

/**
 * Retrieves a single Extension Worker by their Firebase Auth UID.
 */
export async function getExtensionWorkerByUid(uid: string): Promise<ExtensionWorker | null> {
  if (!db || !isFirebaseConfigured || !uid) return null;

  try {
    const docRef = doc(db, 'extension_workers', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ExtensionWorker;
    }

    // Fallback: search by uid field
    const q = query(collection(db, 'extension_workers'), where('uid', '==', uid));
    const snaps = await getDocs(q);
    if (!snaps.empty) {
      return { id: snaps.docs[0].id, ...snaps.docs[0].data() } as ExtensionWorker;
    }

    return null;
  } catch (err) {
    console.warn('Could not retrieve extension worker profile:', err);
    return null;
  }
}

/**
 * Fetches all farmers assigned to or onboarded by the Extension Worker,
 * along with their farm analyses and the recommendations the system gave them.
 */
export async function fetchExtensionWorkerFarmerActivities(
  worker: ExtensionWorker
): Promise<ExtensionWorkerFarmerActivity[]> {
  if (!db || !isFirebaseConfigured) return [];

  try {
    const workerUid = worker.uid || worker.id;
    const assignedSet = new Set(worker.assignedFarmerIds || []);
    const onboardedSet = new Set(worker.onboardedFarmerIds || []);

    // 1. Query farmers from users collection
    const usersCol = collection(db, 'users');
    const allUsersSnap = await getDocs(usersCol);

    const relevantFarmers: Array<{
      uid: string;
      profile: SoilWiseUserProfile;
      relationship: 'onboarded' | 'assigned';
    }> = [];

    allUsersSnap.forEach((docSnap) => {
      const u = docSnap.data() as SoilWiseUserProfile;
      const uid = docSnap.id;

      // Don't include other extension workers or admin
      if (u.role === 'admin' || u.role === 'extension_worker') return;

      const isOnboardedByMe = u.onboardedByExtensionWorkerId === workerUid || onboardedSet.has(uid);
      const isAssignedToMe = u.assignedExtensionWorkerId === workerUid || assignedSet.has(uid);

      if (isOnboardedByMe) {
        relevantFarmers.push({ uid, profile: u, relationship: 'onboarded' });
      } else if (isAssignedToMe) {
        relevantFarmers.push({ uid, profile: u, relationship: 'assigned' });
      }
    });

    // 2. For each relevant farmer, retrieve their saved analysis history
    const activities: ExtensionWorkerFarmerActivity[] = [];

    for (const item of relevantFarmers) {
      try {
        const analyses = await getUserAnalysisHistory(item.uid);
        const latest = analyses && analyses.length > 0 ? analyses[0] : null;

        activities.push({
          farmerUid: item.uid,
          farmerName: item.profile.displayName || item.profile.email?.split('@')[0] || 'Smallholder Farmer',
          farmerEmail: item.profile.email || '',
          farmerPhone: item.profile.phoneNumber || item.profile.profile?.phoneNumber || undefined,
          state: item.profile.state || item.profile.profile?.state || worker.coverageState,
          lga: item.profile.lga || item.profile.profile?.lga || undefined,
          relationship: item.relationship,
          onboardedAt: item.profile.createdAt,
          totalAnalyses: analyses.length,
          latestAnalysisDate: latest?.createdAt,
          latestTopCrop: latest?.topCrop,
          latestTopVariety: latest?.topVariety,
          latestYieldPotential: latest?.potentialYield,
          latestScore: latest?.score,
          analyses,
        });
      } catch (analysisErr) {
        console.warn(`Error loading analyses for farmer ${item.uid}:`, analysisErr);
      }
    }

    // Sort by latest analysis date or join date descending
    activities.sort((a, b) => {
      const dateA = a.latestAnalysisDate ? new Date(a.latestAnalysisDate).getTime() : new Date(a.onboardedAt || 0).getTime();
      const dateB = b.latestAnalysisDate ? new Date(b.latestAnalysisDate).getTime() : new Date(b.onboardedAt || 0).getTime();
      return dateB - dateA;
    });

    return activities;
  } catch (err) {
    console.error('Error fetching farmer activities for extension worker:', err);
    return [];
  }
}

/**
 * Extension Worker Action: Onboard a new farmer in the field.
 * Tags the farmer with onboardedByExtensionWorkerId = worker.uid.
 */
export async function onboardFarmerInField(
  worker: ExtensionWorker,
  farmerInput: {
    name: string;
    phone: string;
    state: string;
    lga: string;
    primaryCrop?: string;
    farmSizeHectares?: number;
    email?: string;
  }
): Promise<{ success: boolean; farmerUid?: string; error?: string }> {
  if (!db || !isFirebaseConfigured) {
    return { success: false, error: 'Database service unavailable.' };
  }

  try {
    const workerUid = worker.uid || worker.id;
    const nowIso = new Date().toISOString();
    const farmerId = `FARMER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Create user profile in Firestore
    const farmerDocRef = doc(db, 'users', farmerId);
    await setDoc(farmerDocRef, {
      uid: farmerId,
      displayName: farmerInput.name.trim(),
      email: farmerInput.email?.trim() || `${farmerInput.phone.replace(/[^0-9]/g, '')}@farmer.soilwise.local`,
      phoneNumber: farmerInput.phone.trim(),
      role: 'user',
      state: farmerInput.state,
      lga: farmerInput.lga,
      primaryCrop: farmerInput.primaryCrop || 'Maize',
      farmSizeHectares: farmerInput.farmSizeHectares || 1,
      accountStatus: 'active',
      onboardedByExtensionWorkerId: workerUid,
      onboardedByExtensionWorkerName: worker.name,
      assignedExtensionWorkerId: workerUid,
      assignedExtensionWorkerName: worker.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Update worker's onboardedFarmerIds array
    const workerRef = doc(db, 'extension_workers', worker.id);
    await updateDoc(workerRef, {
      onboardedFarmerIds: arrayUnion(farmerId),
      updatedAt: nowIso,
    });

    return { success: true, farmerUid: farmerId };
  } catch (err: any) {
    console.error('Error onboarding farmer in field:', err);
    return { success: false, error: err.message || 'Failed to onboard farmer.' };
  }
}

/**
 * Admin Action: Assign or unassign farmers to an Extension Worker.
 */
export async function updateWorkerFarmerAssignments(
  workerId: string,
  workerUid: string,
  workerName: string,
  farmerUids: string[],
  action: 'assign' | 'unassign'
): Promise<{ success: boolean; error?: string }> {
  if (!db || !isFirebaseConfigured) {
    return { success: false, error: 'Database service unavailable.' };
  }

  try {
    const workerRef = doc(db, 'extension_workers', workerId);
    const nowIso = new Date().toISOString();

    if (action === 'assign') {
      await updateDoc(workerRef, {
        assignedFarmerIds: arrayUnion(...farmerUids),
        updatedAt: nowIso,
      });

      for (const fUid of farmerUids) {
        try {
          const fRef = doc(db, 'users', fUid);
          await updateDoc(fRef, {
            assignedExtensionWorkerId: workerUid,
            assignedExtensionWorkerName: workerName,
            updatedAt: nowIso,
          });
        } catch (e) {
          console.warn(`Could not update farmer ${fUid}:`, e);
        }
      }
    } else {
      await updateDoc(workerRef, {
        assignedFarmerIds: arrayRemove(...farmerUids),
        updatedAt: nowIso,
      });

      for (const fUid of farmerUids) {
        try {
          const fRef = doc(db, 'users', fUid);
          await updateDoc(fRef, {
            assignedExtensionWorkerId: null,
            assignedExtensionWorkerName: null,
            updatedAt: nowIso,
          });
        } catch (e) {
          console.warn(`Could not unassign farmer ${fUid}:`, e);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update farmer assignments.' };
  }
}

/**
 * Admin Action: Resend welcome & login credentials email to an Extension Worker.
 */
export async function resendExtensionWorkerWelcomeEmail(
  worker: ExtensionWorker,
  passwordOverride?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const pwd = passwordOverride || worker.initialTemporaryPassword || generateTemporaryPassword();
    const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://soilwise.ng';

    const resp = await fetch('/api/admin/extension-worker/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: worker.name,
        email: worker.email,
        temporaryPassword: pwd,
        staffId: worker.staffId,
        organization: worker.organization,
        coverageState: worker.coverageState,
        coverageLgas: worker.coverageLgas,
        portalUrl,
      }),
    });

    if (resp.ok) {
      if (db && worker.id) {
        await updateDoc(doc(db, 'extension_workers', worker.id), {
          welcomeEmailSent: true,
          welcomeEmailSentAt: new Date().toISOString(),
          initialTemporaryPassword: pwd,
        });
      }
      return { success: true };
    }

    const err = await resp.json();
    return { success: false, error: err.error || 'Failed to resend credentials email.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error resending email.' };
  }
}
