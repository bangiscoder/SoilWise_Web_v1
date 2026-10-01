import { SoilWiseNormalisedProfile, LocationValidationResult } from './soilDataValidation';

export interface SoilData {
  ph: number;
  nitrogen: number; // mg/kg or ppm
  phosphorus: number; // mg/kg or ppm
  potassium: number; // mg/kg or ppm
  ec: number; // dS/m or mS/cm
}

export interface FarmLocation {
  latitude: number;
  longitude: number;
  state?: string;
  lga?: string;
  address?: {
    fullAddress: string;
    road?: string;
    village?: string;
    town?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  landmark?: {
    name: string;
    distanceKm?: number;
  } | null;
  elevationMeters?: number | null;
}

export interface SoilTexture {
  clayPercent: number | null;
  sandPercent: number | null;
  siltPercent: number | null;
  texturalClass?: string | null;
  source: string;
  isAvailable: boolean;
  unavailabilityReason?: string;
  soilDataSource?: 'SoilGrids' | 'OpenLandMap' | string | null;
}

export type RainfallOnsetClassification = 
  | 'Early'
  | 'Normal'
  | 'Delayed'
  | 'Possible false start'
  | 'Not available';

export interface RainfallOutlook {
  isAvailable: boolean;
  unavailabilityReason?: string;
  seasonalOutlook: string;
  expectedOnset: string | null;
  expectedCessation: string | null;
  estimatedSeasonDurationDays: number | null;
  estimatedRemainingDaysText: string;
  remainingDaysCount: number | null;
  approximatePeakPeriod: string;
  rainfallOnsetStatus: RainfallOnsetClassification;
  totalSeasonalRainfallMm: number | null;
  source: string;
  calculationNote?: string;
  monthlyPrecipitation?: { month: string; precipitationMm: number }[];
}

export interface EnvironmentalInfo {
  isAvailable: boolean;
  unavailabilityReason?: string;
  meanAnnualTemperatureC?: number | null;
  annualPrecipitationMm?: number | null;
  climateZone?: string | null;
  climateClassificationExplanation?: string | null;
  elevationMeters?: number | null;
  source: string;
}

export type SoilDataProvenance = 'user_measured' | 'location_estimated' | 'unavailable';

export interface SoilTextureImageEstimate {
  texture: string;
  confidence: number;
  source: 'image_estimate';
  status: 'preliminary';
}

export interface IsdaDepthUncertainty {
  confidence_50?: { lower: number; upper: number } | null;
  confidence_68?: { lower: number; upper: number } | null;
  confidence_90?: { lower: number; upper: number } | null;
  lower?: number | null;
  upper?: number | null;
  stdev?: number | null;
}

export interface IsdaDepthLayer {
  depth: string; // e.g. "0-20cm", "20-50cm", "0-200cm"
  depthValue: string; // e.g. "0-20", "20-50"
  depthUnit: string; // e.g. "cm"
  value: number | string | null;
  unit: string | null;
  uncertainty?: IsdaDepthUncertainty | null;
}

export interface IsdaPropertyRecord {
  key: string;
  name: string;
  layers: IsdaDepthLayer[];
  topsoilLayer?: IsdaDepthLayer | null; // 0-20cm layer
  subsoilLayer?: IsdaDepthLayer | null; // 20-50cm layer
  status: 'available' | 'unavailable';
  unavailabilityReason?: string;
  analyticalMethod?: string | null;
}

export interface SoilEvidenceUserMeasurements {
  available: boolean;
  source_type: 'user_measured';
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  ec: number | null;
}

export interface SoilEvidenceLocationEstimate {
  available: boolean;
  source: 'iSDAsoil';
  source_type: 'location_estimated';
  resolution_m: number; // 30
  status: 'available' | 'partially_available' | 'unavailable' | 'error';
  fetched_at?: string;
  unavailabilityReason?: string;
  // Core normalised properties (0-20cm root zone):
  profile?: SoilWiseNormalisedProfile;
  // All multi-depth properties from iSDAsoil (including 0-20cm and 20-50cm, uncertainty, organic carbon, bulk density, CEC, etc.):
  properties?: Record<string, IsdaPropertyRecord>;
  rawResponse?: any;
}

export interface SoilEvidence {
  user_measurements: SoilEvidenceUserMeasurements;
  location_estimate: SoilEvidenceLocationEstimate;
}

export interface FarmAnalysisResult {
  id: string;
  analysisDate: string; // YYYY-MM-DD
  createdAt: string;
  soilData: SoilData;
  location: FarmLocation;
  soilTexture: SoilTexture;
  rainfallOutlook: RainfallOutlook;
  environmentalInfo: EnvironmentalInfo;
  status: 'completed' | 'partial';
  selectedState?: string;
  selectedLga?: string;
  hasSoilTest?: boolean;
  soilDataProvenance?: SoilDataProvenance;
  soilPhotoProvided?: boolean;
  soilPhoto?: string | null;
  soilTextureImageEstimate?: SoilTextureImageEstimate | null;
  photoAnalysisResult?: {
    estimatedTextureClass?: string;
    confidence?: number;
    fileName?: string;
  } | null;
  soilEvidence?: SoilEvidence;
  locationValidation?: LocationValidationResult | null;
}

export type AnalysisStep =
  | 'idle'
  | 'preparing_data'
  | 'retrieving_environmental'
  | 'retrieving_rainfall'
  | 'finding_location'
  | 'combining_data'
  | 'preparing_analysis'
  | 'completed';
