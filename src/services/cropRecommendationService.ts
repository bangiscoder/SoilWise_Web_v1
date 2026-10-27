/**
 * SoilWise AI Deterministic Crop Recommendation Decision Engine
 * 
 * Canonical Reference: IAR Crop Variety Descriptors Compendium (iar_crop_varieties_database.json)
 * Publisher: Institute for Agricultural Research (IAR), Federal Ministry of Agriculture and Food Security, Ahmadu Bello University, Zaria, Nigeria
 * 
 * Core Philosophy:
 * - Deterministic agronomic rule-based scoring (no random seeds, 100% reproducible).
 * - Layered separation between IAR Knowledge (Layer A) and SoilWise Decision (Layer B).
 * - Traceable machine-readable evidence factors ready for future LLM conversational explanation.
 * - Strict adherence to documented IAR potential yield disclaimers and agro-ecological ranges.
 */

import { 
  IAR_DATABASE, 
  IAR_DATASET_METADATA, 
  loadAllIarVarieties 
} from '../data/iarCropVarieties';

import {
  IarVarietyRecord,
  NormalisedFarmRecommendationInput,
  RecommendationEvidenceFactor,
  CandidateEligibility,
  RecommendedVarietyCandidate,
  ExcludedVarietyCandidate,
  FarmerFacingRecommendation,
  CropRecommendationDecision,
} from '../types/cropRecommendation';

import {
  FarmLocation,
  SoilData,
  RainfallOutlook,
  SoilTexture,
  EnvironmentalInfo,
} from '../types/soilwise';

/**
 * Maps Nigerian State/LGA or geographic coordinates to primary Savanna Agro-Ecological Zone
 */
export function determineFarmEcology(location: FarmLocation, envInfo?: EnvironmentalInfo): string {
  const stateRaw = location.state || location.address?.state || '';
  const state = stateRaw.trim().toLowerCase();

  // Known state mappings in Nigerian Savanna systems
  const sahelStates = ['borno', 'yobe'];
  const sudanStates = ['kano', 'katsina', 'sokoto', 'jigawa', 'zamfara', 'kebbi'];
  const northernGuineaStates = ['kaduna', 'bauchi', 'gombe', 'plateau', 'adamawa'];
  const southernGuineaStates = ['niger', 'benue', 'nasarawa', 'taraba', 'kwara', 'kogi', 'federal capital territory', 'abuja'];
  const derivedSavannaStates = ['oyo', 'osun', 'ekiti', 'ondo', 'edo', 'enugu', 'ebonyi'];

  if (sahelStates.some((s) => state.includes(s))) {
    return 'Sahel Savanna';
  }
  if (sudanStates.some((s) => state.includes(s))) {
    return 'Sudan Savanna';
  }
  if (northernGuineaStates.some((s) => state.includes(s))) {
    return 'Northern Guinea Savanna';
  }
  if (southernGuineaStates.some((s) => state.includes(s))) {
    return 'Southern Guinea Savanna';
  }
  if (derivedSavannaStates.some((s) => state.includes(s))) {
    return 'Southern Guinea Savanna';
  }

  // Fallback to Köppen-Geiger or Environmental Climatological Signal if available
  const climateZone = (envInfo?.climateZone || '').toLowerCase();
  if (climateZone.includes('semi-arid') || climateZone.includes('bsh')) {
    return 'Sudan Savanna';
  }
  if (climateZone.includes('tropical wet and dry') || climateZone.includes('aw')) {
    return 'Northern Guinea Savanna';
  }

  // Fallback by Latitude in Nigeria
  const lat = location.latitude;
  if (lat !== null && lat !== undefined) {
    if (lat >= 12.0) return 'Sudan Savanna';
    if (lat >= 10.0) return 'Northern Guinea Savanna';
    if (lat >= 7.5) return 'Southern Guinea Savanna';
    return 'Guinea Savanna and Forest ecologies';
  }

  return 'Unknown Savanna Ecology';
}

/**
 * Normalises raw farm inputs into structured, audit-ready context
 */
export function normaliseFarmRecommendationInput(params: {
  location: FarmLocation;
  soilData: SoilData;
  rainfallOutlook?: RainfallOutlook;
  soilTexture?: SoilTexture;
  environmentalInfo?: EnvironmentalInfo;
  preferredCrop?: string;
  isUserMeasured?: boolean;
}): NormalisedFarmRecommendationInput {
  const {
    location,
    soilData,
    rainfallOutlook,
    soilTexture,
    environmentalInfo,
    preferredCrop,
    isUserMeasured = false,
  } = params;

  const farmEcology = determineFarmEcology(location, environmentalInfo);
  const rainfallAnnual = rainfallOutlook?.totalSeasonalRainfallMm ?? environmentalInfo?.annualPrecipitationMm ?? null;
  const seasonLength = rainfallOutlook?.estimatedSeasonDurationDays ?? null;

  // Determine drought risk
  let droughtRisk: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown';
  if (rainfallAnnual !== null) {
    if (rainfallAnnual < 650) {
      droughtRisk = 'high';
    } else if (rainfallAnnual < 900) {
      droughtRisk = 'moderate';
    } else {
      droughtRisk = 'low';
    }
  }

  return {
    location: {
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      state: location.state || location.address?.state || null,
      lga: location.lga || location.address?.county || null,
      ecology: farmEcology,
      elevation_m: location.elevationMeters ?? null,
    },
    soil: {
      ph: {
        value: soilData.ph ?? null,
        unit: 'pH',
        source: isUserMeasured ? 'User Soil Test' : 'iSDAsoil Location Estimate',
        status: soilData.ph !== null ? (isUserMeasured ? 'measured' : 'estimated') : 'unavailable',
        provenance: isUserMeasured ? 'user_measured' : 'location_estimated',
      },
      nitrogen: {
        value: soilData.nitrogen ?? null,
        unit: isUserMeasured ? 'mg/kg' : 'g/kg',
        source: isUserMeasured ? 'User Soil Test' : 'iSDAsoil Location Estimate',
        status: soilData.nitrogen !== null ? (isUserMeasured ? 'measured' : 'estimated') : 'unavailable',
        provenance: isUserMeasured ? 'user_measured' : 'location_estimated',
      },
      phosphorus: {
        value: soilData.phosphorus ?? null,
        unit: 'mg/kg',
        source: isUserMeasured ? 'User Soil Test' : 'iSDAsoil Location Estimate',
        status: soilData.phosphorus !== null ? (isUserMeasured ? 'measured' : 'estimated') : 'unavailable',
        provenance: isUserMeasured ? 'user_measured' : 'location_estimated',
      },
      potassium: {
        value: soilData.potassium ?? null,
        unit: 'mg/kg',
        source: isUserMeasured ? 'User Soil Test' : 'iSDAsoil Location Estimate',
        status: soilData.potassium !== null ? (isUserMeasured ? 'measured' : 'estimated') : 'unavailable',
        provenance: isUserMeasured ? 'user_measured' : 'location_estimated',
      },
      ec: {
        value: soilData.ec ?? null,
        unit: 'dS/m',
        source: isUserMeasured ? 'User Soil Test' : null,
        status: isUserMeasured && soilData.ec !== null ? 'measured' : 'unavailable',
        provenance: isUserMeasured ? 'user_measured' : 'unavailable',
      },
      texture: {
        class: soilTexture?.texturalClass || null,
        source: soilTexture ? 'Derived from Sand/Silt/Clay fractions' : null,
        status: soilTexture ? 'available' : 'unavailable',
      },
    },
    climate: {
      rainfall_annual_mm: rainfallAnnual,
      rainfall_source: rainfallOutlook?.source || 'Open-Meteo Climatological Normals',
      season_length_days: seasonLength,
      expected_onset: rainfallOutlook?.expectedOnset || null,
      expected_cessation: rainfallOutlook?.expectedCessation || null,
      drought_risk: droughtRisk,
      temperature_mean_c: environmentalInfo?.meanAnnualTemperatureC ?? null,
    },
    farmer_context: {
      preferred_crop: preferredCrop || null,
      production_goal: 'grain_yield',
    },
  };
}

/**
 * Checks whether a variety's documented ecologies are compatible with the farm's ecology
 */
export function evaluateEcologyCompatibility(
  farmEcology: string,
  varietyEcologies: string[]
): {
  isCompatible: boolean;
  matchType: 'exact' | 'umbrella' | 'unknown' | 'incompatible';
  matchedEcology: string | null;
} {
  if (!farmEcology || farmEcology === 'Unknown Savanna Ecology') {
    // If farm ecology cannot be determined, we do not force match or silently exclude;
    // we mark as umbrella/unknown compatibility so candidates can be reviewed conditionally
    return {
      isCompatible: true,
      matchType: 'unknown',
      matchedEcology: 'Broad Savanna Compatibility',
    };
  }

  const farmLower = farmEcology.toLowerCase();

  for (const docEcology of varietyEcologies) {
    const docLower = docEcology.toLowerCase();

    // Direct match (e.g. "Southern Guinea Savanna" === "Southern Guinea Savanna")
    if (docLower === farmLower) {
      return { isCompatible: true, matchType: 'exact', matchedEcology: docEcology };
    }

    // Umbrella ecological categories in IAR compendium:
    // "Guinea Savanna ecologies" covers both Southern Guinea and Northern Guinea
    if (
      docLower === 'guinea savanna ecologies' &&
      (farmLower.includes('guinea') || farmLower.includes('derived'))
    ) {
      return { isCompatible: true, matchType: 'umbrella', matchedEcology: docEcology };
    }

    // "Guinea Savanna and Forest ecologies" covers Guinea Savanna and southern forest transition
    if (
      docLower === 'guinea savanna and forest ecologies' &&
      (farmLower.includes('guinea') || farmLower.includes('forest') || farmLower.includes('derived'))
    ) {
      return { isCompatible: true, matchType: 'umbrella', matchedEcology: docEcology };
    }

    // "Sudan Guinea Savanna" covers boundary areas between Sudan and Guinea
    if (
      docLower === 'sudan guinea savanna' &&
      (farmLower.includes('sudan') || farmLower.includes('northern guinea'))
    ) {
      return { isCompatible: true, matchType: 'umbrella', matchedEcology: docEcology };
    }
  }

  return { isCompatible: false, matchType: 'incompatible', matchedEcology: null };
}

/**
 * Evaluates candidates, executes deterministic scoring, and constructs Canonical Decision Object
 */
export function generateCropRecommendationDecision(
  rawInput: NormalisedFarmRecommendationInput
): CropRecommendationDecision {
  const varieties = loadAllIarVarieties();
  const decisionId = `DEC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const generatedAt = new Date().toISOString();

  const eligibleCandidates: RecommendedVarietyCandidate[] = [];
  const excludedCandidates: ExcludedVarietyCandidate[] = [];

  const farmEcology = rawInput.location.ecology || 'Unknown Savanna Ecology';
  const farmPh = rawInput.soil.ph.value;
  const farmNitrogen = rawInput.soil.nitrogen.value;
  const isNitrogenLow = farmNitrogen !== null && (
    (rawInput.soil.nitrogen.unit === 'g/kg' && farmNitrogen < 1.2) ||
    (rawInput.soil.nitrogen.unit === 'mg/kg' && farmNitrogen < 15.0)
  );

  const seasonLength = rawInput.climate.season_length_days;
  const droughtRisk = rawInput.climate.drought_risk;
  const preferredCrop = rawInput.farmer_context?.preferred_crop?.trim().toLowerCase();

  // Check if user's preferred crop matches varieties in the IAR certified compendium
  const hasDirectIarMatches = preferredCrop && preferredCrop !== 'all' && preferredCrop !== 'any'
    ? varieties.some((v) => {
        const vLower = v.crop_type.toLowerCase();
        return vLower.includes(preferredCrop) || preferredCrop.includes(vLower);
      })
    : false;

  // Evaluate each variety in the database
  for (const variety of varieties) {
    const ecologyEval = evaluateEcologyCompatibility(farmEcology, variety.ecology);

    // Filter by preferred crop if user explicitly restricted preference AND varieties of that crop exist
    if (hasDirectIarMatches && preferredCrop) {
      const varietyCropLower = variety.crop_type.toLowerCase();
      if (!varietyCropLower.includes(preferredCrop) && !preferredCrop.includes(varietyCropLower)) {
        excludedCandidates.push({
          variety_id: variety.id,
          variety_name: variety.variety_name,
          crop_type: variety.crop_type,
          provenance: {
            source_name: 'IAR',
            dataset: 'iar_crop_varieties_database.json',
            record_id: variety.id,
          },
          exclusion_reason: `Crop mismatch: User requested ${rawInput.farmer_context?.preferred_crop}, candidate is ${variety.crop_type}.`,
          incompatible_factors: [
            {
              factor: 'crop_preference',
              reason: `Variety crop type (${variety.crop_type}) does not match farmer filter (${rawInput.farmer_context?.preferred_crop}).`,
              source: 'Farmer Context',
            },
          ],
          variety_profile: variety,
        });
        continue;
      }
    }

    // Eligibility check against documented agro-ecologies
    if (!ecologyEval.isCompatible) {
      excludedCandidates.push({
        variety_id: variety.id,
        variety_name: variety.variety_name,
        crop_type: variety.crop_type,
        provenance: {
          source_name: 'IAR',
          dataset: 'iar_crop_varieties_database.json',
          record_id: variety.id,
        },
        exclusion_reason: `Agro-ecological incompatibility: Variety is documented for [${variety.ecology.join(', ')}], which does not cover farm ecology [${farmEcology}].`,
        incompatible_factors: [
          {
            factor: 'ecology_mismatch',
            reason: `Field ecology [${farmEcology}] is outside documented cultivar release zones [${variety.ecology.join(', ')}].`,
            source: 'IAR Crop Variety Descriptors Compendium',
          },
        ],
        variety_profile: variety,
      });
      continue;
    }

    // -------------------------------------------------------------
    // DETERMINISTIC SCORING & EVIDENCE COMPILATION
    // Base potential score starts at 50, maximum achievable is 100.
    // -------------------------------------------------------------
    let rawScore = 50;
    const maxScore = 100;
    const matchedFactors: RecommendationEvidenceFactor[] = [];
    const unmatchedFactors: RecommendationEvidenceFactor[] = [];
    const notEvaluatedFactors: RecommendationEvidenceFactor[] = [];

    // Factor 1: Agro-Ecological Compatibility
    if (ecologyEval.matchType === 'exact') {
      rawScore += 15;
      matchedFactors.push({
        factor: 'ecology_match',
        category: 'ecology',
        weight: 15,
        status: 'matched',
        effect: 'positive',
        reason: `Directly adapted to ${farmEcology} as documented in IAR release records.`,
        condition: { name: 'Farm Agro-Ecology', value: farmEcology, source: 'SoilWise Location Service' },
        variety_attribute: { name: 'Documented Ecologies', value: variety.ecology, source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    } else if (ecologyEval.matchType === 'umbrella') {
      rawScore += 10;
      matchedFactors.push({
        factor: 'ecology_match',
        category: 'ecology',
        weight: 10,
        status: 'matched',
        effect: 'positive',
        reason: `Compatible with regional umbrella zone (${ecologyEval.matchedEcology}).`,
        condition: { name: 'Farm Agro-Ecology', value: farmEcology, source: 'SoilWise Location Service' },
        variety_attribute: { name: 'Documented Ecologies', value: variety.ecology, source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    } else {
      notEvaluatedFactors.push({
        factor: 'ecology_match',
        category: 'ecology',
        weight: 0,
        status: 'not_evaluated',
        effect: 'neutral',
        reason: `Farm location ecology could not be mapped with certainty; evaluated under broad savanna adaptation.`,
        condition: { name: 'Farm Agro-Ecology', value: farmEcology, source: 'SoilWise Location Service' },
        variety_attribute: { name: 'Documented Ecologies', value: variety.ecology, source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    }

    // Factor 2: Soil Nitrogen Adaptation
    const hasAdaptations = variety.soil_and_climate_adaptations !== undefined;
    const lowNTolerant = variety.soil_and_climate_adaptations?.low_nitrogen_tolerance;

    if (isNitrogenLow) {
      if (lowNTolerant === true) {
        rawScore += 15;
        matchedFactors.push({
          factor: 'low_nitrogen_tolerance',
          category: 'soil',
          weight: 15,
          status: 'matched',
          effect: 'positive',
          reason: `Farm soil has low nitrogen (${farmNitrogen} ${rawInput.soil.nitrogen.unit}); variety has verified IAR tolerance to low-nitrogen soils.`,
          condition: { name: 'Soil Nitrogen', value: farmNitrogen, source: rawInput.soil.nitrogen.source || 'Soil Test' },
          variety_attribute: { name: 'Low Nitrogen Tolerance', value: true, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      } else if (lowNTolerant === false) {
        rawScore -= 5;
        unmatchedFactors.push({
          factor: 'low_nitrogen_tolerance',
          category: 'soil',
          weight: 5,
          status: 'unmatched',
          effect: 'negative',
          reason: `Farm exhibits low soil nitrogen, and variety does not feature documented low-nitrogen tolerance. Additional fertiliser application required.`,
          condition: { name: 'Soil Nitrogen', value: farmNitrogen, source: rawInput.soil.nitrogen.source || 'Soil Test' },
          variety_attribute: { name: 'Low Nitrogen Tolerance', value: false, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      } else {
        // Legume check (cowpea, groundnut)
        const isLegume = variety.crop_type.toLowerCase().includes('cowpea') || 
                         variety.crop_type.toLowerCase().includes('groundnut');
        if (isLegume) {
          rawScore += 10;
          matchedFactors.push({
            factor: 'biological_nitrogen_fixation',
            category: 'soil',
            weight: 10,
            status: 'matched',
            effect: 'positive',
            reason: `Legume cultivar fixes atmospheric nitrogen through root nodulation, providing natural buffering in low-N soils.`,
            condition: { name: 'Soil Nitrogen', value: farmNitrogen, source: rawInput.soil.nitrogen.source || 'Soil Test' },
            variety_attribute: { name: 'Crop Type', value: variety.crop_type, source: 'IAR' },
            evidence_source: 'iar_crop_varieties_database.json',
          });
        } else {
          notEvaluatedFactors.push({
            factor: 'low_nitrogen_tolerance',
            category: 'soil',
            weight: 0,
            status: 'not_evaluated',
            effect: 'neutral',
            reason: `Low-nitrogen tolerance attribute is not documented in IAR record for this cultivar.`,
            condition: { name: 'Soil Nitrogen', value: farmNitrogen, source: rawInput.soil.nitrogen.source || 'Soil Test' },
            variety_attribute: { name: 'Low Nitrogen Tolerance', value: 'Not Documented', source: 'IAR' },
            evidence_source: 'iar_crop_varieties_database.json',
          });
        }
      }
    } else if (farmNitrogen !== null) {
      rawScore += 5;
      matchedFactors.push({
        factor: 'soil_nitrogen_sufficiency',
        category: 'soil',
        weight: 5,
        status: 'matched',
        effect: 'positive',
        reason: `Soil nitrogen level is adequate for crop establishment.`,
        condition: { name: 'Soil Nitrogen', value: farmNitrogen, source: rawInput.soil.nitrogen.source || 'Soil Test' },
        variety_attribute: { name: 'Low Nitrogen Tolerance', value: lowNTolerant ?? 'Not Documented', source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    } else {
      notEvaluatedFactors.push({
        factor: 'soil_nitrogen_sufficiency',
        category: 'soil',
        weight: 0,
        status: 'not_evaluated',
        effect: 'neutral',
        reason: `Soil nitrogen measurement was unavailable; soil fertility buffering not evaluated.`,
        condition: { name: 'Soil Nitrogen', value: null, source: 'Unavailable' },
        variety_attribute: { name: 'Low Nitrogen Tolerance', value: lowNTolerant ?? 'Not Documented', source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    }

    // Factor 3: Drought and Moisture Adaptation
    const droughtTolerant = variety.soil_and_climate_adaptations?.drought_tolerance;
    if (droughtRisk === 'high' || droughtRisk === 'moderate') {
      if (droughtTolerant === true) {
        rawScore += 12;
        matchedFactors.push({
          factor: 'drought_tolerance',
          category: 'climate',
          weight: 12,
          status: 'matched',
          effect: 'positive',
          reason: `Location is subject to moisture constraints (${rawInput.climate.rainfall_annual_mm ? rawInput.climate.rainfall_annual_mm + ' mm' : 'Moderate/High drought risk'}); variety features verified IAR drought tolerance.`,
          condition: { name: 'Drought Risk', value: droughtRisk, source: 'SoilWise Climate Outlook' },
          variety_attribute: { name: 'Drought Tolerance', value: true, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      } else if (droughtTolerant === false) {
        rawScore -= 5;
        unmatchedFactors.push({
          factor: 'drought_tolerance',
          category: 'climate',
          weight: 5,
          status: 'unmatched',
          effect: 'negative',
          reason: `Location has moisture constraints, and variety lacks documented drought tolerance. Risk of water stress during dry spells.`,
          condition: { name: 'Drought Risk', value: droughtRisk, source: 'SoilWise Climate Outlook' },
          variety_attribute: { name: 'Drought Tolerance', value: false, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      } else {
        notEvaluatedFactors.push({
          factor: 'drought_tolerance',
          category: 'climate',
          weight: 0,
          status: 'not_evaluated',
          effect: 'neutral',
          reason: `Drought tolerance attribute is not explicitly documented for this variety in the IAR database.`,
          condition: { name: 'Drought Risk', value: droughtRisk, source: 'SoilWise Climate Outlook' },
          variety_attribute: { name: 'Drought Tolerance', value: 'Not Documented', source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      }
    } else if (droughtRisk === 'low') {
      rawScore += 5;
      matchedFactors.push({
        factor: 'rainfall_adequacy',
        category: 'climate',
        weight: 5,
        status: 'matched',
        effect: 'positive',
        reason: `Projected rainfall (${rawInput.climate.rainfall_annual_mm} mm) provides ample moisture for vegetative and grain filling stages.`,
        condition: { name: 'Annual Rainfall', value: rawInput.climate.rainfall_annual_mm, source: 'SoilWise Climate Outlook' },
        variety_attribute: { name: 'Drought Tolerance', value: droughtTolerant ?? 'Not Documented', source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    } else {
      notEvaluatedFactors.push({
        factor: 'rainfall_adequacy',
        category: 'climate',
        weight: 0,
        status: 'not_evaluated',
        effect: 'neutral',
        reason: `Rainfall data unavailable; drought and rainfall adequacy could not be quantitatively calculated.`,
        condition: { name: 'Annual Rainfall', value: null, source: 'Unavailable' },
        variety_attribute: { name: 'Drought Tolerance', value: droughtTolerant ?? 'Not Documented', source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    }

    // Factor 4: Maturity Cycle Alignment
    if (seasonLength !== null && seasonLength > 0 && variety.maturity_days_min !== undefined) {
      const maxDays = variety.maturity_days_max || variety.maturity_days_min;
      const minDays = variety.maturity_days_min;

      if (maxDays <= seasonLength) {
        rawScore += 10;
        matchedFactors.push({
          factor: 'maturity_cycle_fit',
          category: 'climate',
          weight: 10,
          status: 'matched',
          effect: 'positive',
          reason: `Variety maturity window (${variety.maturity_days}) completes comfortably within projected rainy season duration (${seasonLength} days).`,
          condition: { name: 'Season Duration', value: `${seasonLength} days`, source: 'SoilWise Seasonal Outlook' },
          variety_attribute: { name: 'Maturity Days', value: variety.maturity_days, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      } else if (minDays > seasonLength + 15) {
        rawScore -= 10;
        unmatchedFactors.push({
          factor: 'maturity_cycle_fit',
          category: 'climate',
          weight: 10,
          status: 'unmatched',
          effect: 'negative',
          reason: `Variety requires ${variety.maturity_days}, which exceeds the estimated ${seasonLength}-day rainfall season, creating risk of moisture stress before grain maturity.`,
          condition: { name: 'Season Duration', value: `${seasonLength} days`, source: 'SoilWise Seasonal Outlook' },
          variety_attribute: { name: 'Maturity Days', value: variety.maturity_days, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      } else {
        rawScore += 5;
        matchedFactors.push({
          factor: 'maturity_cycle_fit',
          category: 'climate',
          weight: 5,
          status: 'matched',
          effect: 'positive',
          reason: `Variety maturity cycle (${variety.maturity_days}) is reasonably balanced with estimated rainy window (${seasonLength} days).`,
          condition: { name: 'Season Duration', value: `${seasonLength} days`, source: 'SoilWise Seasonal Outlook' },
          variety_attribute: { name: 'Maturity Days', value: variety.maturity_days, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      }
    } else {
      notEvaluatedFactors.push({
        factor: 'maturity_cycle_fit',
        category: 'climate',
        weight: 0,
        status: 'not_evaluated',
        effect: 'neutral',
        reason: `Validated rainfall season length signal is unavailable; maturity fit could not be quantitatively calculated.`,
        condition: { name: 'Season Duration', value: null, source: 'Unavailable' },
        variety_attribute: { name: 'Maturity Days', value: variety.maturity_days, source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    }

    // Factor 5: Soil pH Compatibility
    if (farmPh !== null) {
      if (farmPh >= 5.5 && farmPh <= 7.5) {
        rawScore += 8;
        matchedFactors.push({
          factor: 'soil_ph_suitability',
          category: 'soil',
          weight: 8,
          status: 'matched',
          effect: 'positive',
          reason: `Soil pH (${farmPh.toFixed(1)}) is in the optimal range (5.5–7.5) for nutrient availability and root development in ${variety.crop_type}.`,
          condition: { name: 'Soil pH', value: farmPh, source: rawInput.soil.ph.source || 'Soil Test' },
          variety_attribute: { name: 'Crop Type', value: variety.crop_type, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      } else if (farmPh < 5.0 || farmPh > 8.0) {
        rawScore -= 5;
        unmatchedFactors.push({
          factor: 'soil_ph_suitability',
          category: 'soil',
          weight: 5,
          status: 'unmatched',
          effect: 'negative',
          reason: `Soil pH (${farmPh.toFixed(1)}) deviates from the optimal range for ${variety.crop_type}, risking phosphorus fixation or micronutrient imbalance.`,
          condition: { name: 'Soil pH', value: farmPh, source: rawInput.soil.ph.source || 'Soil Test' },
          variety_attribute: { name: 'Crop Type', value: variety.crop_type, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      } else {
        rawScore += 4;
        matchedFactors.push({
          factor: 'soil_ph_suitability',
          category: 'soil',
          weight: 4,
          status: 'matched',
          effect: 'positive',
          reason: `Soil pH (${farmPh.toFixed(1)}) is acceptable with moderate nutrient management.`,
          condition: { name: 'Soil pH', value: farmPh, source: rawInput.soil.ph.source || 'Soil Test' },
          variety_attribute: { name: 'Crop Type', value: variety.crop_type, source: 'IAR' },
          evidence_source: 'iar_crop_varieties_database.json',
        });
      }
    } else {
      notEvaluatedFactors.push({
        factor: 'soil_ph_suitability',
        category: 'soil',
        weight: 0,
        status: 'not_evaluated',
        effect: 'neutral',
        reason: `Soil pH data unavailable; chemical suitability not evaluated.`,
        condition: { name: 'Soil pH', value: null, source: 'Unavailable' },
        variety_attribute: { name: 'Crop Type', value: variety.crop_type, source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    }

    // Factor 6: Striga Resistance / Tolerance (Savanna parasitic weed protection)
    const strigaResistant = variety.soil_and_climate_adaptations?.striga_resistance;
    const mentionsStriga = (variety.pest_disease_tolerance || []).some((p) => p.toLowerCase().includes('striga'));

    if (strigaResistant === true || mentionsStriga) {
      rawScore += 5;
      matchedFactors.push({
        factor: 'striga_resistance',
        category: 'pest_disease',
        weight: 5,
        status: 'matched',
        effect: 'positive',
        reason: `Cultivar documented with resistance or tolerance to Striga hermonthica (witchweed), a major yield limiter in Nigerian savanna ecologies.`,
        condition: { name: 'Regional Striga Pressure', value: 'Savanna Endemic', source: 'IAR Savanna Baseline' },
        variety_attribute: { name: 'Striga Resistance', value: true, source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    } else if (hasAdaptations) {
      notEvaluatedFactors.push({
        factor: 'striga_resistance',
        category: 'pest_disease',
        weight: 0,
        status: 'not_evaluated',
        effect: 'neutral',
        reason: `Striga resistance is not a designated breeding trait for this variety.`,
        condition: { name: 'Regional Striga Pressure', value: 'Savanna Endemic', source: 'IAR Savanna Baseline' },
        variety_attribute: { name: 'Striga Resistance', value: false, source: 'IAR' },
        evidence_source: 'iar_crop_varieties_database.json',
      });
    }

    // Factor 7: Genetic Potential Yield Contribution
    // Scaled bonus based on documented station yield (up to +10 pts for top yielders)
    const yieldBonus = Math.min(10, Math.max(2, Math.round((variety.potential_yield_tha / 10.0) * 10)));
    rawScore += yieldBonus;
    matchedFactors.push({
      factor: 'potential_yield_capacity',
      category: 'yield',
      weight: yieldBonus,
      status: 'matched',
      effect: 'positive',
      reason: `Documented IAR station potential yield of ${variety.potential_yield_tha} t/ha under recommended agronomic practice.`,
      condition: { name: 'Agricultural Productivity Target', value: 'High Yield', source: 'Farmer Context' },
      variety_attribute: { name: 'Potential Yield', value: `${variety.potential_yield_tha} t/ha`, source: 'IAR' },
      evidence_source: 'iar_crop_varieties_database.json',
    });

    // Normalise final score to 0 - 100 range
    const normalisedScore = Math.min(100, Math.max(10, rawScore));

    // Combine all evidence items for full traceability
    const allEvidence = [...matchedFactors, ...unmatchedFactors, ...notEvaluatedFactors];

    // Determine confidence level
    const basisCount = matchedFactors.length;
    let confidenceLevel: 'high' | 'moderate' | 'limited' | 'insufficient' = 'moderate';
    if (basisCount >= 4 && farmNitrogen !== null && seasonLength !== null) {
      confidenceLevel = 'high';
    } else if (basisCount <= 2 || farmPh === null) {
      confidenceLevel = 'limited';
    }

    const whyRecommended = matchedFactors
      .filter((f) => f.effect === 'positive')
      .map((f) => f.reason);

    const limitations: string[] = [
      'Documented potential yield is derived from research station trials and requires good field agronomy, weed management, and recommended fertiliser rates.',
    ];
    if (isNitrogenLow && lowNTolerant !== true) {
      limitations.push('Field is low in soil nitrogen; supplementary basal/top-dress nitrogen is required to realize yield potential.');
    }
    if (seasonLength === null) {
      limitations.push('Seasonal rainfall duration was not available; monitor rainfall onset and cessation locally.');
    }

    eligibleCandidates.push({
      rank: 0, // Assigned after sorting
      crop: {
        name: variety.crop_type,
        type: variety.crop_type,
      },
      variety: {
        id: variety.id,
        name: variety.variety_name,
      },
      provenance: {
        source_name: 'IAR',
        dataset: 'iar_crop_varieties_database.json',
        record_id: variety.id,
        release_year: variety.release_year,
        publisher: 'Institute for Agricultural Research (IAR), Federal Ministry of Agriculture and Food Security, Ahmadu Bello University, Zaria, Nigeria',
      },
      eligibility: {
        eligible: true,
        status: 'eligible',
        reasons: [
          {
            factor: 'ecology_compatibility',
            reason: `Cultivar documented for ${variety.ecology.join(', ')}.`,
            source: 'IAR Crop Variety Descriptors Compendium',
          },
        ],
      },
      score: {
        raw: rawScore,
        maximum: maxScore,
        normalised: normalisedScore,
      },
      matched_factors: matchedFactors,
      unmatched_factors: unmatchedFactors,
      not_evaluated_factors: notEvaluatedFactors,
      evidence: allEvidence,
      variety_profile: variety,
      potential_yield: {
        iar_potential_yield_tha: variety.potential_yield_tha,
        type: 'potential_yield',
        source: 'IAR',
        disclaimer: 'Documented IAR research station potential yield under optimal agronomic management; not a guaranteed smallholder field yield.',
      },
      confidence: {
        level: confidenceLevel,
        basis: matchedFactors.map((f) => f.factor),
        limitations,
      },
      explanation: {
        short: `${variety.variety_name} is well adapted to ${farmEcology} with documented IAR potential yield of ${variety.potential_yield_tha} t/ha.`,
        detailed: `${variety.variety_name} (${variety.crop_type}) scored ${normalisedScore}/100 based on ${matchedFactors.length} matching agronomic criteria including agro-ecological adaptation, maturity cycle compatibility (${variety.maturity_days}), and stress tolerances.`,
        why_recommended: whyRecommended,
      },
    });
  }

  // -------------------------------------------------------------
  // DETERMINISTIC RANKING SORT
  // 1. normalised score DESC
  // 2. potential_yield DESC
  // 3. variety.id ASC (tie-breaker for absolute reproducibility)
  // -------------------------------------------------------------
  eligibleCandidates.sort((a, b) => {
    if (b.score.normalised !== a.score.normalised) {
      return b.score.normalised - a.score.normalised;
    }
    if (b.potential_yield.iar_potential_yield_tha !== a.potential_yield.iar_potential_yield_tha) {
      return b.potential_yield.iar_potential_yield_tha - a.potential_yield.iar_potential_yield_tha;
    }
    return a.variety.id.localeCompare(b.variety.id);
  });

  // Assign 1-indexed ranks
  eligibleCandidates.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });

  const topRecommendation = eligibleCandidates.length > 0 ? eligibleCandidates[0] : null;

  // Build clean farmer-facing recommendation object
  let farmerFacing: FarmerFacingRecommendation | null = null;
  if (topRecommendation) {
    const v = topRecommendation.variety_profile;
    farmerFacing = {
      crop_name: v.crop_type,
      variety_name: v.variety_name,
      maturity_description: `${v.maturity_class} (${v.maturity_days})`,
      potential_yield_statement: `Documented IAR potential yield up to ${v.potential_yield_tha} tonnes/ha under recommended farm management`,
      key_reasons: topRecommendation.explanation.why_recommended.slice(0, 3),
      soil_considerations: isNitrogenLow
        ? 'Field has low nitrogen; apply recommended basal fertiliser or compost at planting.'
        : 'Soil mineral profile is suitable for good crop development.',
      climate_considerations: seasonLength !== null
        ? `Maturity cycle (${v.maturity_days}) aligns with your estimated ${seasonLength}-day rainfall season.`
        : 'Ensure planting aligns with verified rainfall onset in your local government area.',
      cautionary_statement: 'Actual farm yields depend on rainfall distribution, good seedbed preparation, timely weed control, and fertiliser application.',
    };
  }

  return {
    schema_version: '1.0.0',
    decision_rule_version: '1.0.0',
    dataset_version: '1.0.0',
    decision_id: decisionId,
    generated_at: generatedAt,

    input_context: rawInput,

    candidate_summary: {
      total_varieties_considered: varieties.length,
      eligible_varieties: eligibleCandidates.length,
      excluded_varieties: excludedCandidates.length,
      not_evaluated: 0,
    },

    // Return top 10 ranked cultivars and top 15 excluded candidates to keep decision snapshot lightweight and well within Firestore 1MB document limit
    recommendations: eligibleCandidates.slice(0, 10),
    top_recommendation: topRecommendation,
    excluded_candidates: excludedCandidates.slice(0, 15),

    farmer_facing: farmerFacing,

    decision_notes: [
      `Canonical dataset loaded: iar_crop_varieties_database.json (${varieties.length} varieties across 5 crop categories).`,
      `Target field ecology evaluated as "${farmEcology}".`,
      `Eligible cultivars (${eligibleCandidates.length}) ranked deterministically by agro-ecological suitability and stress tolerance.`,
      `Excluded cultivars (${excludedCandidates.length}) eliminated due to documented ecological boundaries or user crop filters.`,
    ],

    limitations: [
      'Potential yields recorded are IAR research station metrics and should not be interpreted as guaranteed farm yields.',
      'Location soil estimates from iSDAsoil are 30m digital estimates; laboratory soil testing is recommended for exact field calibration.',
      'Open-Meteo seasonal forecasts are climatological projections and not official NiMet predictions.',
    ],

    sources: [
      {
        name: 'Institute for Agricultural Research (IAR) Crop Variety Descriptors Compendium',
        type: 'reference_dataset',
        description: 'Authoritative variety releases, maturity cycles, ecologies, and trait tolerances (iar_crop_varieties_database.json).',
      },
      {
        name: 'SoilWise AI Evidence Layer',
        type: 'location_service',
        description: 'Normalised farmer soil measurements, 30m iSDAsoil digital soil properties, and agro-ecological zoning.',
      },
      {
        name: 'Open-Meteo Weather Model',
        type: 'weather_model',
        description: 'Climatological precipitation normals and seasonal duration projections.',
      },
    ],
  };
}
