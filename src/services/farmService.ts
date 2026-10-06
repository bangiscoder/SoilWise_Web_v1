/**
 * SoilWise AI Farm Profile & Personalisation Context Service (Stage 3)
 * 
 * Manages user-owned farm entities under users/{uid}/farms/{farmId}
 * and constructs the reusable Personalisation Context Object.
 * 
 * Key Principles:
 * - Farms belong to exactly one authenticated user (Firebase UID).
 * - Ecology is derived through SoilWise location logic with clear provenance.
 * - Historical analysis snapshots remain independent (deleting a farm does not destroy historical analyses).
 * - User Preferences, Farm Identity, and Recommendations remain strictly separated.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

import { db, isFirebaseConfigured, sanitizeForFirestore } from '../lib/firebase';
import { determineFarmEcology } from './cropRecommendationService';
import { SoilWiseUserProfile } from '../types/auth';
import {
  FarmProfileDocument,
  CreateFarmInput,
  UpdateFarmInput,
  FarmProfileSummary,
  ProfileCompletionInfo,
  SoilWisePersonalisationContext,
} from '../types/farm';

/**
 * Derives verified agro-ecological zone from State, LGA, and coordinates.
 * Retains provenance and status as 'derived'.
 */
export function deriveEcologyForLocation(
  state: string,
  lga: string,
  latitude: number,
  longitude: number
): { value: string; source: string; status: 'derived' } {
  const ecologyValue = determineFarmEcology({
    latitude,
    longitude,
    state,
    lga,
  });

  return {
    value: ecologyValue,
    source: 'SoilWise location classification',
    status: 'derived',
  };
}

/**
 * Creates a new user-owned Farm Profile under users/{uid}/farms/{farmId}.
 */
export async function createFarmProfile(
  userId: string,
  input: CreateFarmInput
): Promise<FarmProfileDocument> {
  if (!userId) {
    throw new Error('User must be authenticated to create a farm.');
  }
  if (!db || !isFirebaseConfigured) {
    throw new Error('Database service is temporarily unavailable.');
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error('Please enter a name for the farm (e.g. My Main Farm).');
  }

  const state = input.state.trim();
  const lga = input.lga.trim();
  if (!state || !lga) {
    throw new Error('Please specify the State and Local Government Area (LGA) for the farm.');
  }

  const lat = Number(input.latitude);
  const lon = Number(input.longitude);
  if (isNaN(lat) || isNaN(lon)) {
    throw new Error('Please provide valid geographic coordinates for the farm.');
  }

  // Generate stable farm identifier
  const farmId = `FARM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  // Deterministically derive agro-ecology based on SoilWise location logic
  const ecology = deriveEcologyForLocation(state, lga, lat, lon);

  const farmDoc: FarmProfileDocument = {
    farmId,
    userId,
    name,
    location: {
      latitude: lat,
      longitude: lon,
      state,
      lga,
      address: input.address?.trim() || `${state}, ${lga}`,
    },
    ecology,
    sizeHectares: input.sizeHectares !== undefined && input.sizeHectares !== null ? Number(input.sizeHectares) : null,
    notes: input.notes?.trim() || '',
    createdAt: nowIso,
    updatedAt: nowIso,
    status: 'active',
  };

  const farmDocRef = doc(db, 'users', userId, 'farms', farmId);
  const sanitized = sanitizeForFirestore(farmDoc as unknown as Record<string, any>);
  await setDoc(farmDocRef, {
    ...sanitized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return farmDoc;
}

/**
 * Retrieves all active farms belonging to the authenticated user.
 */
export async function getUserFarms(userId: string): Promise<FarmProfileDocument[]> {
  if (!userId || !db || !isFirebaseConfigured) return [];

  try {
    const farmsCol = collection(db, 'users', userId, 'farms');
    const q = query(farmsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const farms: FarmProfileDocument[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as FarmProfileDocument;
      // Filter out soft-deleted farms
      if (data.status !== 'deleted') {
        farms.push({
          ...data,
          farmId: data.farmId || d.id,
          userId: data.userId || userId,
        });
      }
    });

    return farms;
  } catch (error) {
    console.warn('Could not load user farms from Firestore:', error);
    return [];
  }
}

/**
 * Retrieves a single farm profile document by farmId.
 */
export async function getFarmProfile(
  userId: string,
  farmId: string
): Promise<FarmProfileDocument | null> {
  if (!userId || !farmId || !db || !isFirebaseConfigured) return null;

  try {
    const farmDocRef = doc(db, 'users', userId, 'farms', farmId);
    const snap = await getDoc(farmDocRef);
    if (snap.exists()) {
      return snap.data() as FarmProfileDocument;
    }
    return null;
  } catch (error) {
    console.error('Error fetching farm profile:', error);
    return null;
  }
}

/**
 * Updates an existing farm profile.
 * If location coordinates or State/LGA change, re-derives the verified agro-ecology.
 */
export async function updateFarmProfile(
  userId: string,
  farmId: string,
  input: UpdateFarmInput
): Promise<FarmProfileDocument> {
  if (!userId || !farmId) {
    throw new Error('User and Farm ID are required.');
  }
  if (!db || !isFirebaseConfigured) {
    throw new Error('Database service is temporarily unavailable.');
  }

  const existing = await getFarmProfile(userId, farmId);
  if (!existing) {
    throw new Error('Farm profile not found.');
  }

  const nowIso = new Date().toISOString();
  const nextName = input.name !== undefined ? input.name.trim() : existing.name;
  if (!nextName) {
    throw new Error('Farm name cannot be empty.');
  }

  const nextState = input.state !== undefined ? input.state.trim() : existing.location.state;
  const nextLga = input.lga !== undefined ? input.lga.trim() : existing.location.lga;
  const nextLat = input.latitude !== undefined ? Number(input.latitude) : existing.location.latitude;
  const nextLon = input.longitude !== undefined ? Number(input.longitude) : existing.location.longitude;

  // Re-derive ecology if location was updated
  const locationChanged =
    nextState !== existing.location.state ||
    nextLga !== existing.location.lga ||
    nextLat !== existing.location.latitude ||
    nextLon !== existing.location.longitude;

  const nextEcology = locationChanged
    ? deriveEcologyForLocation(nextState, nextLga, nextLat, nextLon)
    : existing.ecology;

  const updatedDoc: FarmProfileDocument = {
    ...existing,
    name: nextName,
    location: {
      ...existing.location,
      state: nextState,
      lga: nextLga,
      latitude: nextLat,
      longitude: nextLon,
    },
    ecology: nextEcology,
    sizeHectares: input.sizeHectares !== undefined ? input.sizeHectares : existing.sizeHectares,
    notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
    status: input.status !== undefined ? input.status : existing.status,
    updatedAt: nowIso,
  };

  const farmDocRef = doc(db, 'users', userId, 'farms', farmId);
  const sanitized = sanitizeForFirestore(updatedDoc as unknown as Record<string, any>);
  await updateDoc(farmDocRef, {
    ...sanitized,
    updatedAt: serverTimestamp(),
  });

  return updatedDoc;
}

/**
 * Deletes or deactivates a farm profile.
 * Implements Section 21: Does NOT touch or delete historical analysis snapshots.
 */
export async function deleteFarmProfile(
  userId: string,
  farmId: string,
  hardDelete = false
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !farmId || !db || !isFirebaseConfigured) {
    return { success: false, error: 'Database service is unavailable.' };
  }

  try {
    const farmDocRef = doc(db, 'users', userId, 'farms', farmId);

    if (hardDelete) {
      await deleteDoc(farmDocRef);
    } else {
      // Soft-delete by setting status: 'deleted'
      await updateDoc(farmDocRef, {
        status: 'deleted',
        updatedAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error removing farm profile:', error);
    return { success: false, error: error?.message || 'Could not delete farm profile.' };
  }
}

/**
 * Maps a FarmProfileDocument to a clean FarmProfileSummary.
 */
export function toFarmProfileSummary(doc: FarmProfileDocument): FarmProfileSummary {
  return {
    farmId: doc.farmId,
    userId: doc.userId,
    name: doc.name,
    state: doc.location.state,
    lga: doc.location.lga,
    latitude: doc.location.latitude,
    longitude: doc.location.longitude,
    ecology: doc.ecology.value,
    sizeHectares: doc.sizeHectares ?? null,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

/**
 * Section 17: Profile Completion Calculation
 * Evaluates profile completeness progressively without pressuring farmers.
 */
export function calculateProfileCompletion(userProfile: SoilWiseUserProfile | null): ProfileCompletionInfo {
  if (!userProfile) {
    return {
      percentage: 0,
      status: 'minimal',
      completedFields: [],
      missingFields: ['displayName', 'preferredLanguage', 'farmingExperience', 'primaryFarmingInterest', 'preferredCrops'],
    };
  }

  const completed: string[] = [];
  const missing: string[] = [];

  // Core account identity (already collected)
  if (userProfile.displayName && userProfile.displayName.trim().length > 0) {
    completed.push('displayName');
  } else {
    missing.push('displayName');
  }

  const prefs = userProfile.profile;

  // Language preference
  if (prefs?.preferredLanguage && prefs.preferredLanguage.trim().length > 0) {
    completed.push('preferredLanguage');
  } else {
    missing.push('preferredLanguage');
  }

  // Farming experience
  if (prefs?.farmingExperience && prefs.farmingExperience.trim().length > 0) {
    completed.push('farmingExperience');
  } else {
    missing.push('farmingExperience');
  }

  // Primary farming interest / interests
  if (
    (prefs?.primaryFarmingInterest && prefs.primaryFarmingInterest.trim().length > 0) ||
    (prefs?.farmingInterests && prefs.farmingInterests.length > 0)
  ) {
    completed.push('farmingInterests');
  } else {
    missing.push('farmingInterests');
  }

  // Preferred crops
  if (prefs?.preferredCrops && prefs.preferredCrops.length > 0) {
    completed.push('preferredCrops');
  } else {
    missing.push('preferredCrops');
  }

  const totalFields = 5;
  const percentage = Math.round((completed.length / totalFields) * 100);

  let status: 'minimal' | 'partially_complete' | 'complete' = 'minimal';
  if (percentage >= 80) {
    status = 'complete';
  } else if (percentage >= 40) {
    status = 'partially_complete';
  }

  return {
    percentage,
    status,
    completedFields: completed,
    missingFields: missing,
  };
}

/**
 * Section 15: Builds the Reusable Personalisation Context Object
 * Clean, structured representation of user preferences and farm identity for downstream consumers.
 */
export function buildPersonalisationContext(
  userProfile: SoilWiseUserProfile | null,
  farms: FarmProfileDocument[] = [],
  activeFarmId?: string | null
): SoilWisePersonalisationContext {
  const uid = userProfile?.uid || 'guest';
  const email = userProfile?.email || '';
  const displayName = userProfile?.displayName || null;
  const prefs = userProfile?.profile;

  const farmSummaries = farms.map(toFarmProfileSummary);

  const selectedFarmId = activeFarmId || userProfile?.activeFarmId || (farms.length > 0 ? farms[0].farmId : null);
  const activeFarm = farmSummaries.find((f) => f.farmId === selectedFarmId) || (farmSummaries.length > 0 ? farmSummaries[0] : null);

  const completion = calculateProfileCompletion(userProfile);

  return {
    user: {
      uid,
      displayName,
      email,
    },
    preferences: {
      preferredLanguage: prefs?.preferredLanguage || 'en',
      preferredCrops: prefs?.preferredCrops || [],
      farmingExperience: prefs?.farmingExperience || 'not_specified',
      farmingInterests: prefs?.farmingInterests || (prefs?.primaryFarmingInterest ? [prefs.primaryFarmingInterest] : []),
    },
    activeFarm,
    farms: farmSummaries,
    completion,
  };
}
