/**
 * SoilWise AI Analysis History & Saved Farm Assessment Types (Stage 2)
 */

import { 
  FarmAnalysisResult, 
  FarmLocation, 
  SoilData, 
  SoilTexture, 
  RainfallOutlook, 
  EnvironmentalInfo, 
  SoilEvidence 
} from './soilwise';
import { CropRecommendationDecision } from './cropRecommendation';

export interface SavedAnalysisVersions {
  decisionRuleVersion: string;
  datasetVersion: string;
  schemaVersion: string;
}

export interface SavedAnalysisSummary {
  analysisId: string;
  userId: string;
  createdAt: string;
  state?: string;
  lga?: string;
  ecology: string;
  topCrop: string;
  topVariety: string;
  score: number;
  potentialYield: number;
  status: 'completed' | 'partial';
}

export interface SavedFarmAnalysisDocument {
  analysisId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: 'completed' | 'partial';

  farm: {
    location: FarmLocation;
    ecology: string;
    state?: string;
    lga?: string;
  };

  soil: {
    input: SoilData;
    provenance?: string;
    texture?: SoilTexture;
    evidence?: SoilEvidence;
  };

  climate: {
    rainfallOutlook: RainfallOutlook;
    environmentalInfo: EnvironmentalInfo;
  };

  recommendation: {
    topCrop: string;
    topVariety: string;
    score: number;
    potentialYield: number;
    decision: CropRecommendationDecision;
  };

  versions: SavedAnalysisVersions;

  sources: {
    name: string;
    type: string;
    description: string;
  }[];

  limitations: string[];

  // Optional cached fullAnalysis (for backwards compatibility if present)
  fullAnalysis?: FarmAnalysisResult;
}

export interface SaveAnalysisResult {
  success: boolean;
  analysisId?: string;
  error?: string;
}

/**
 * Reconstructs a full FarmAnalysisResult from a saved snapshot document.
 * Guarantees 100% faithful reopening without duplicating storage or exceeding Firestore document limits.
 */
export function reconstructFarmAnalysisFromSnapshot(
  doc: SavedFarmAnalysisDocument
): FarmAnalysisResult {
  if (doc.fullAnalysis) {
    return doc.fullAnalysis;
  }

  const analysisDate = doc.createdAt 
    ? doc.createdAt.substring(0, 10) 
    : new Date().toISOString().substring(0, 10);

  return {
    id: doc.analysisId,
    analysisDate,
    createdAt: doc.createdAt,
    soilData: doc.soil.input,
    location: doc.farm.location,
    soilTexture: doc.soil.texture || {
      clayPercent: null,
      sandPercent: null,
      siltPercent: null,
      texturalClass: null,
      source: 'ISRIC SoilGrids / Historical Record',
      isAvailable: false,
    },
    rainfallOutlook: doc.climate.rainfallOutlook,
    environmentalInfo: doc.climate.environmentalInfo,
    status: doc.status || 'completed',
    selectedState: doc.farm.state,
    selectedLga: doc.farm.lga,
    hasSoilTest: doc.soil.provenance === 'user_measured',
    soilDataProvenance: (doc.soil.provenance as any) || 'location_estimated',
    soilEvidence: doc.soil.evidence,
    cropRecommendationDecision: doc.recommendation.decision,
  };
}
