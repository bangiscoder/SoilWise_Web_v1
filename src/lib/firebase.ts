import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDocFromServer,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';

// Authorized administrator email
export const AUTHORIZED_ADMIN_EMAIL = 'bangiscoder@gmail.com';

/**
 * Centrally check if a user is the authorized SoilWise AI administrator.
 */
export function isAdmin(user: any): boolean {
  return Boolean(
    user &&
    user.email &&
    user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()
  );
}

// Interface for feedback submission
export interface FeedbackSubmission {
  id?: string;
  submittedAt?: any;
  name?: string;
  phone?: string;
  email?: string;
  userType?: string;
  location?: string;
  likesSoilwise: string;
  wouldUse: string;
  willingnessToPay: string;
  removeOrModify?: string;
  desiredFeatures?: string;
  mostValuableFeature?: string;
  joinWaitingList?: boolean;
  consent?: boolean;
}

// Load config from firebase-applet-config.json or environment fallbacks
let firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '',
};

// If firebase-applet-config.json exists, load it directly
try {
  // @ts-ignore
  const appletConfig = await import('../../firebase-applet-config.json');
  if (appletConfig && appletConfig.default) {
    firebaseConfig = { ...firebaseConfig, ...appletConfig.default };
  }
} catch {
  // Fall back to env or placeholders
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== '...' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== '...'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? firebaseConfig.firestoreDatabaseId
      : undefined;
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  } catch (error) {
    console.error('Error initializing Firebase services:', error);
  }
} else {
  console.warn('Firebase configuration missing or using placeholders. Feedback submission will display graceful notice.');
}

export { app, auth, db };

/**
 * Public feedback submission function.
 * Creates a brand new document in 'soilwise_feedback' using serverTimestamp().
 */
export async function submitFarmerFeedback(data: Omit<FeedbackSubmission, 'submittedAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!db || !isFirebaseConfigured) {
    return {
      success: false,
      error: 'Feedback service is temporarily unavailable. Please try again later.',
    };
  }

  try {
    const feedbackCol = collection(db, 'soilwise_feedback');
    const docRef = await addDoc(feedbackCol, {
      ...data,
      submittedAt: serverTimestamp(),
    });

    return {
      success: true,
      id: docRef.id,
    };
  } catch (err: any) {
    console.error('Firestore feedback submission error:', err);
    return {
      success: false,
      error: err?.message || 'Feedback could not be recorded. Please try again.',
    };
  }
}
