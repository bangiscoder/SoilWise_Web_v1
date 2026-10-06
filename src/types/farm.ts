/**
 * SoilWise AI Farm Profiles and Personalisation Data Types (Stage 3)
 * 
 * Separates User Preferences, Farm Identity & Evidence, and Analysis Snapshots.
 */

export interface FarmLocationData {
  latitude: number;
  longitude: number;
  state: string;
  lga: string;
  address?: string;
  elevationMeters?: number | null;
}

export interface FarmEcologyData {
  value: string; // e.g. "Northern Guinea Savanna", "Sudan Savanna"
  source: string; // e.g. "SoilWise location classification"
  status: 'derived' | 'validated';
}

export interface FarmProfileDocument {
  farmId: string;
  userId: string;
  name: string; // e.g. "My Main Farm", "Kaduna Farm"
  location: FarmLocationData;
  ecology: FarmEcologyData;
  sizeHectares?: number | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'deleted';
}

export interface CreateFarmInput {
  name: string;
  state: string;
  lga: string;
  latitude: number;
  longitude: number;
  sizeHectares?: number | null;
  notes?: string;
  address?: string;
}

export interface UpdateFarmInput {
  name?: string;
  state?: string;
  lga?: string;
  latitude?: number;
  longitude?: number;
  sizeHectares?: number | null;
  notes?: string;
  status?: 'active' | 'archived' | 'deleted';
}

export interface FarmProfileSummary {
  farmId: string;
  userId: string;
  name: string;
  state: string;
  lga: string;
  latitude: number;
  longitude: number;
  ecology: string;
  sizeHectares?: number | null;
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
}

export type ProfileCompletionStatus = 'minimal' | 'partially_complete' | 'complete';

export interface ProfileCompletionInfo {
  percentage: number;
  status: ProfileCompletionStatus;
  completedFields: string[];
  missingFields: string[];
}

/**
 * Section 15: Reusable Personalisation Context Object
 * Clean application-level representation consumed by context-aware workflows
 */
export interface SoilWisePersonalisationContext {
  user: {
    uid: string;
    displayName: string | null;
    email: string;
  };
  preferences: {
    preferredLanguage: string;
    preferredCrops: string[];
    farmingExperience: string;
    farmingInterests: string[];
  };
  activeFarm: FarmProfileSummary | null;
  farms: FarmProfileSummary[];
  completion: ProfileCompletionInfo;
}
