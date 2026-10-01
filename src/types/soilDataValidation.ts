export type ValidationStatus =
  | 'match'
  | 'state_mismatch'
  | 'lga_mismatch'
  | 'boundary_uncertain'
  | 'invalid_coordinates'
  | 'outside_nigeria'
  | 'unknown';

export interface LocationValidationResult {
  selected: {
    state: string;
    lga: string;
  };
  gps: {
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
  };
  detected: {
    state: string | null;
    lga: string | null;
  };
  validation: {
    status: ValidationStatus;
    distanceToStateBoundaryM?: number | null;
    distanceToLgaBoundaryM?: number | null;
    accuracyUsedM?: number | null;
    toleranceM?: number;
    reason?: string;
  };
  boundaryDetails: {
    detectedState: string | null;
    detectedLga: string | null;
    distanceToStateBorderKm: number | null;
    distanceToLgaBorderKm: number | null;
    isNearStateBorder: boolean;
    isNearLgaBorder: boolean;
    selectedStatePreserved: boolean;
    selectedLgaPreserved: boolean;
  };
}

export interface NormalisedSoilProperty {
  property: string;
  value: number | string | null;
  unit: string;
  depth: string;
  source: 'iSDAsoil';
  source_type: 'location_estimated';
  resolution_m: number;
  uncertainty: {
    lower: number | null;
    upper: number | null;
    stdev?: number | null;
  };
  status: 'available' | 'unavailable' | 'error';
  unavailability_reason?: string;
  original_value?: number | string | null;
  original_unit?: string | null;
  normalised_value?: number | null;
  normalised_unit?: string | null;
  analytical_method?: string | null;
  notes?: string;
}

export interface SoilWiseNormalisedProfile {
  ph: NormalisedSoilProperty;
  nitrogen_total: NormalisedSoilProperty;
  phosphorus_extractable: NormalisedSoilProperty;
  potassium_extractable: NormalisedSoilProperty;
  sand_content: NormalisedSoilProperty;
  silt_content: NormalisedSoilProperty;
  clay_content: NormalisedSoilProperty;
  texture_class: NormalisedSoilProperty;
  ec: NormalisedSoilProperty;
  overall_status: 'available' | 'partially_available' | 'unavailable' | 'error';
  depth: '0-20cm';
  source: 'iSDAsoil';
  source_type: 'location_estimated';
  spatial_resolution: '30m';
  fetched_at: string;
}

export interface TokenCacheMetadata {
  hasCachedToken: boolean;
  isExpired: boolean;
  expiresInSeconds: number | null;
  cachedAt: string | null;
  expiresAt: string | null;
  cacheHitsCount: number;
  authCallsCount: number;
  credentialsConfigured: boolean;
  usernameStatus: 'loaded' | 'missing';
  passwordStatus: 'loaded' | 'missing';
  usernameMasked: string | null;
  authEndpoint: string;
  source: 'process.env';
  scope?: string;
  clientIdConfigured?: boolean;
  clientSecretConfigured?: boolean;
}

export interface PipelineDiagnosticStep {
  timestamp: string;
  step: string;
  status: 'ok' | 'warning' | 'error' | 'info';
  message: string;
  durationMs?: number;
}

export interface AuthDiagnostic {
  endpoint: string;
  httpStatus: number | null;
  authentication: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  tokenReceived: boolean;
  message?: string;
}

export interface SoilPropertyDiagnostic {
  endpoint: string;
  httpStatus: number | null;
  responseReceived: boolean;
  message?: string;
}

export interface PipelineRunResult {
  success: boolean;
  locationValidation: LocationValidationResult;
  soilData: {
    success: boolean;
    raw: any;
    authDiagnostic?: AuthDiagnostic;
    soilPropertyDiagnostic?: SoilPropertyDiagnostic;
    normalised: SoilWiseNormalisedProfile;
    tokenInfo: TokenCacheMetadata;
    diagnostics: {
      timestamp: string;
      stage: string;
      status: 'ok' | 'warning' | 'error' | 'info';
      message: string;
    }[];
  };
  pipelineLog: PipelineDiagnosticStep[];
  totalDurationMs: number;
}
