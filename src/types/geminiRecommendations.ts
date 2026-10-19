export interface GeminiCropRecommendation {
  cropName: string; // e.g. "Drought-Tolerant Hybrid Maize"
  varietyName: string; // e.g. "SAMMAZ-52"
  cropType: string; // "maize" | "sorghum" | "cowpea" | "rice" | "soybean" | "millet" | "groundnut" | "cassava" | "vegetable" | "other"
  category: 'Cereal' | 'Legume' | 'Root & Tuber' | 'Oilseed' | 'Vegetable';
  suitabilityScore: number; // 0-100 (e.g. 96)
  suitabilityLevel: 'Optimal' | 'Highly Suitable' | 'Moderately Suitable';
  expectedYieldRange: string; // e.g. "5.0 – 6.8 t/ha"
  growthDurationDays: string; // e.g. "90 – 95 days"
  whyOptimalForSoil: string; // Specific rationale connecting soil pH, texture, N-P-K, drainage
  whyOptimalForClimate: string; // Specific rationale connecting rainfall, onset/cessation, temperature
  sowingWindow: string; // e.g. "Late May to Mid June"
  keyManagementPractices: string[]; // e.g. ["Apply basal NPK 15-15-15 at planting", "Topdress with Urea at 4 weeks"]
  soilFertilityAdjustment: string; // Specific advice if pH is acidic/alkaline or nutrients low
  climateRiskMitigation: string; // Mitigation for dry spells, drought, or heat
  certifiedBreederOrSource: string; // e.g. "IAR Zaria / Premier Seeds (NASC Certified)"
}

export interface GeminiRecommendedCropsResponse {
  success: boolean;
  farmSummary: {
    soilHealthSummary: string;
    climateFitSummary: string;
    limitingFactors: string[];
    soilStrengths: string[];
  };
  recommendations: GeminiCropRecommendation[];
  overallAgronomicStrategy: string;
  generatedAt: string;
  modelUsed?: string;
  isFallback?: boolean;
}
