/**
 * Crop Recommendation Decision Engine Type Definitions
 * Adheres to SoilWise AI Canonical Decision Schema (v1.0.0)
 * Designed for deterministic agronomic decision-making and seamless future LLM grounding.
 */

export interface IarSoilAndClimateAdaptations {
  low_nitrogen_tolerance?: boolean;
  drought_tolerance?: boolean;
  striga_resistance?: boolean;
  provitamin_a_enriched?: boolean;
  acid_soil_tolerance?: boolean;
  heat_tolerance?: boolean;
  waterlogging_tolerance?: boolean;
  poor_soil_tolerance?: boolean;
}

/**
 * Layer A: IAR Reference Knowledge Record
 * Preserves the original IAR Crop Variety Descriptors Compendium record without destructive mutation.
 */
export interface IarVarietyRecord {
  id: string; // e.g. "SAMMAZ_69", "SAMSORG_45", "SAMPEA_20"
  variety_name: string; // e.g. "SAMMAZ 69"
  crop_type: string; // e.g. "Maize", "Sorghum", "Cowpea", "Groundnut", "Sweet Sorghum", "Sunflower"
  botanical_name?: string;
  ecology: string[]; // Documented agro-ecologies, e.g. ["Northern Guinea Savanna", "Southern Guinea Savanna"]
  potential_yield_tha: number; // Documented research yield in tonnes/hectare
  maturity_class: string; // e.g. "Extra-early", "Early", "Medium", "Late maturing"
  maturity_days: string; // e.g. "80-85 days", "100-110 days"
  maturity_days_min?: number;
  maturity_days_max?: number;
  characteristics?: string;
  seed_color?: string;
  pest_disease_tolerance?: string[];
  soil_and_climate_adaptations?: IarSoilAndClimateAdaptations;
  release_year?: number;
  maintainer?: string;
  special_attributes?: string[];
  potential_brix_extract_liters_ha?: number;
  oil_content_percent?: string;
  growth_habit?: string;
}

export interface IarRawDatabaseMetadata {
  title: string;
  publisher: string;
  edition: string;
  total_varieties_documented: number;
  coverage_period: string;
  intended_use: string;
  schema_version: string;
}

export interface IarCropVarietiesDatabase {
  metadata: IarRawDatabaseMetadata;
  crop_categories: {
    [category: string]: IarVarietyRecord[];
  };
}

/**
 * Normalised Farm Input for the recommendation engine
 */
export interface NormalisedSoilPropertyInput {
  value: number | null;
  unit: string | null;
  source: string | null;
  status: 'available' | 'unavailable' | 'estimated' | 'measured';
  provenance?: 'user_measured' | 'location_estimated' | 'unavailable';
}

export interface NormalisedFarmRecommendationInput {
  location: {
    latitude: number | null;
    longitude: number | null;
    state: string | null;
    lga: string | null;
    ecology: string | null;
    elevation_m?: number | null;
  };
  soil: {
    ph: NormalisedSoilPropertyInput;
    nitrogen: NormalisedSoilPropertyInput;
    phosphorus: NormalisedSoilPropertyInput;
    potassium: NormalisedSoilPropertyInput;
    ec: NormalisedSoilPropertyInput;
    texture?: {
      class: string | null;
      source: string | null;
      status: 'available' | 'unavailable';
    };
  };
  climate: {
    rainfall_annual_mm: number | null;
    rainfall_source: string | null;
    season_length_days: number | null;
    expected_onset: string | null;
    expected_cessation: string | null;
    drought_risk: 'low' | 'moderate' | 'high' | 'unknown';
    temperature_mean_c?: number | null;
  };
  farmer_context?: {
    preferred_crop?: string | null;
    production_goal?: 'grain_yield' | 'fodder' | 'nutrition' | 'dual_purpose' | null;
  };
}

/**
 * Machine-readable Evidence Factor
 * Essential contract for future LLM explanation and personal conversational guidance.
 */
export interface RecommendationEvidenceFactor {
  factor: string; // e.g. "ecology_match", "low_nitrogen_tolerance", "drought_tolerance", "maturity_fit"
  category: 'ecology' | 'soil' | 'climate' | 'yield' | 'pest_disease' | 'farmer_preference';
  weight: number;
  status: 'matched' | 'unmatched' | 'not_evaluated' | 'unknown';
  effect: 'positive' | 'neutral' | 'negative';
  reason: string;
  condition: {
    name: string;
    value: any;
    source: string;
    status?: string;
  };
  variety_attribute: {
    name: string;
    value: any;
    source: 'IAR';
  };
  evidence_source: string;
  limitations?: string[];
}

export interface CandidateEligibility {
  eligible: boolean;
  status: 'eligible' | 'excluded' | 'conditionally_eligible';
  reasons: {
    factor: string;
    reason: string;
    source: string;
  }[];
}

/**
 * Ranked Crop Variety Candidate Output
 */
export interface RecommendedVarietyCandidate {
  rank: number;
  crop: {
    name: string;
    type: string;
  };
  variety: {
    id: string;
    name: string;
  };
  provenance: {
    source_name: 'IAR';
    dataset: 'iar_crop_varieties_database.json';
    record_id: string;
    release_year?: number;
    publisher: string;
  };
  eligibility: CandidateEligibility;
  score: {
    raw: number;
    maximum: number;
    normalised: number; // 0 - 100
  };
  matched_factors: RecommendationEvidenceFactor[];
  unmatched_factors: RecommendationEvidenceFactor[];
  not_evaluated_factors: RecommendationEvidenceFactor[];
  evidence: RecommendationEvidenceFactor[];
  variety_profile: IarVarietyRecord;
  potential_yield: {
    iar_potential_yield_tha: number;
    type: 'potential_yield';
    source: 'IAR';
    disclaimer: string;
  };
  confidence: {
    level: 'high' | 'moderate' | 'limited' | 'insufficient';
    basis: string[];
    limitations: string[];
  };
  explanation: {
    short: string;
    detailed: string;
    why_recommended: string[];
  };
}

export interface ExcludedVarietyCandidate {
  variety_id: string;
  variety_name: string;
  crop_type: string;
  provenance: {
    source_name: 'IAR';
    dataset: 'iar_crop_varieties_database.json';
    record_id: string;
  };
  exclusion_reason: string;
  incompatible_factors: {
    factor: string;
    reason: string;
    source: string;
  }[];
  variety_profile: IarVarietyRecord;
}

export interface FarmerFacingRecommendation {
  crop_name: string;
  variety_name: string;
  maturity_description: string;
  potential_yield_statement: string;
  key_reasons: string[];
  soil_considerations: string;
  climate_considerations: string;
  cautionary_statement: string;
}

/**
 * Canonical Recommendation Decision Object (v1.0.0)
 * Ground truth structure for UI, Developer Auditing, API, and future LLM reasoning.
 */
export interface CropRecommendationDecision {
  schema_version: '1.0.0';
  decision_rule_version: '1.0.0';
  dataset_version: '1.0.0';
  decision_id: string;
  generated_at: string;

  input_context: NormalisedFarmRecommendationInput;

  candidate_summary: {
    total_varieties_considered: number;
    eligible_varieties: number;
    excluded_varieties: number;
    not_evaluated: number;
  };

  recommendations: RecommendedVarietyCandidate[];
  top_recommendation: RecommendedVarietyCandidate | null;
  excluded_candidates: ExcludedVarietyCandidate[];

  farmer_facing: FarmerFacingRecommendation | null;

  decision_notes: string[];
  limitations: string[];
  sources: {
    name: string;
    type: 'reference_dataset' | 'location_service' | 'weather_model' | 'user_measurement';
    description: string;
  }[];
}
