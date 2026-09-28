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

// Interface for feedback submission (backward compatible with older records)
export interface FeedbackSubmission {
  id?: string;
  submittedAt?: any;
  name?: string;
  phone?: string;
  email?: string;
  userType?: string;
  respondentRole?: string;
  isFarmer?: boolean;
  location?: string;
  cropsGrown?: string[];
  otherCrop?: string;
  soilTested?: string;
  soilTestMethod?: string;
  otherSoilTestMethod?: string;
  weatherInformationSource?: string;
  otherWeatherInformationSource?: string;
  farmDecisionChallenge?: string;
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Strips all undefined fields recursively so Firestore addDoc/setDoc never throws
 * "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof Timestamp)
      ) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

/**
 * Public feedback submission function.
 * Creates a brand new document in 'soilwise_feedback' using serverTimestamp().
 * Safely strips any undefined properties to guarantee compatibility with Firestore.
 */
export async function submitFarmerFeedback(data: Omit<FeedbackSubmission, 'submittedAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!db || !isFirebaseConfigured) {
    return {
      success: false,
      error: 'Feedback service is temporarily unavailable. Please try again later.',
    };
  }

  const path = 'soilwise_feedback';
  try {
    const feedbackCol = collection(db, path);
    const sanitized = sanitizeForFirestore(data as Record<string, any>);
    const docRef = await addDoc(feedbackCol, {
      ...sanitized,
      submittedAt: serverTimestamp(),
    });

    return {
      success: true,
      id: docRef.id,
    };
  } catch (err: any) {
    console.error('Firestore feedback submission error:', err);
    if (err?.message?.includes('Missing or insufficient permissions')) {
      try {
        handleFirestoreError(err, OperationType.CREATE, path);
      } catch (formattedError: any) {
        return {
          success: false,
          error: formattedError.message,
        };
      }
    }
    return {
      success: false,
      error: err?.message || 'Feedback could not be recorded. Please try again.',
    };
  }
}
