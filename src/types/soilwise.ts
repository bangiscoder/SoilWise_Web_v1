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
