import { FarmAnalysisResult } from '../types/soilwise';
import { GeminiRecommendedCropsResponse, GeminiCropRecommendation } from '../types/geminiRecommendations';

// In-memory cache keyed by analysis ID or location string
const recommendationCache = new Map<string, GeminiRecommendedCropsResponse>();

/**
 * Client service to fetch Gemini-powered crop recommendations based on soil-test data and climate parameters.
 */
export async function fetchGeminiCropRecommendations(
  analysis: FarmAnalysisResult,
  forceRefresh: boolean = false
): Promise<GeminiRecommendedCropsResponse> {
  const cacheKey = analysis.id || `${analysis.location?.latitude}_${analysis.location?.longitude}`;

  if (!forceRefresh && recommendationCache.has(cacheKey)) {
    return recommendationCache.get(cacheKey)!;
  }

  // Construct payload from FarmAnalysisResult
  const payload = {
    location: {
      state: analysis.selectedState || analysis.location?.state,
      lga: analysis.selectedLga || analysis.location?.lga,
      latitude: analysis.location?.latitude,
      longitude: analysis.location?.longitude,
      elevationMeters: analysis.environmentalInfo?.elevationMeters,
      agroecologicalZone: analysis.environmentalInfo?.climateZone,
    },
    soilData: {
      ph: analysis.soilData?.ph,
      nitrogen: analysis.soilData?.nitrogen,
      phosphorus: analysis.soilData?.phosphorus,
      potassium: analysis.soilData?.potassium,
      organicCarbonPercent: (() => {
        const props = analysis.soilEvidence?.location_estimate?.properties;
        const oc = props?.['carbon_organic'] || props?.['organic_carbon'] || props?.['soc'];
        const val = oc?.topsoilLayer?.value;
        if (typeof val === 'number') {
          return val > 10 ? val / 10 : val;
        }
        return null;
      })(),
      electricalConductivity: analysis.soilData?.ec,
      soilDataProvenance: analysis.soilDataProvenance,
    },
    soilTexture: {
      texturalClass: analysis.soilTexture?.texturalClass,
      sandPercent: analysis.soilTexture?.sandPercent,
      siltPercent: analysis.soilTexture?.siltPercent,
      clayPercent: analysis.soilTexture?.clayPercent,
    },
    climate: {
      annualPrecipitationMm: analysis.environmentalInfo?.annualPrecipitationMm,
      seasonalRainfallMm: analysis.rainfallOutlook?.totalSeasonalRainfallMm,
      seasonDurationDays: analysis.rainfallOutlook?.estimatedSeasonDurationDays,
      expectedOnset: analysis.rainfallOutlook?.expectedOnset,
      expectedCessation: analysis.rainfallOutlook?.expectedCessation,
      meanAnnualTemperatureC: analysis.environmentalInfo?.meanAnnualTemperatureC,
    },
  };

  try {
    const res = await fetch('/api/ai/recommended-crops', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: GeminiRecommendedCropsResponse = await res.json();
      if (data && data.success && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        recommendationCache.set(cacheKey, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[Gemini Client] Failed to reach server endpoint, using client-side agronomic fallback:', err);
  }

  // Fallback generation if server endpoint is unreachable
  const fallback = generateClientFallbackRecommendations(analysis);
  recommendationCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Client-side grounded fallback recommendations.
 */
function generateClientFallbackRecommendations(
  analysis: FarmAnalysisResult
): GeminiRecommendedCropsResponse {
  const ph = analysis.soilData?.ph ?? 6.2;
  const seasonDays = analysis.rainfallOutlook?.estimatedSeasonDurationDays ?? 120;
  const textClass = analysis.soilTexture?.texturalClass || 'Sandy Loam';
  const isShortSeason = seasonDays < 95;
  const isAcidic = ph < 5.8;

  const recommendations: GeminiCropRecommendation[] = [
    {
      cropName: isShortSeason ? 'Extra-Early White Maize' : 'Drought-Tolerant Hybrid White Maize',
      varietyName: isShortSeason ? 'SAMMAZ-15' : 'SAMMAZ-52',
      cropType: 'maize',
      category: 'Cereal',
      suitabilityScore: isAcidic ? 88 : 96,
      suitabilityLevel: 'Optimal',
      expectedYieldRange: isShortSeason ? '4.0 – 5.2 t/ha' : '5.5 – 7.0 t/ha',
      growthDurationDays: isShortSeason ? '80 – 85 days' : '90 – 95 days',
      whyOptimalForSoil: `Highly adapted to ${textClass} soil with pH ${ph.toFixed(1)}. Efficient root penetration maximizes uptake of soil nitrogen and potassium.`,
      whyOptimalForClimate: `Maturing in ${isShortSeason ? '80-85' : '90-95'} days, this cultivar finishes grain filling comfortably within your ${seasonDays}-day estimated rainfall window.`,
      sowingWindow: 'Late May to mid-June (following 20mm cumulative rain)',
      keyManagementPractices: [
        'Apply basal NPK 15-15-15 at 200 kg/ha at planting or within 10 days of emergence',
        'Topdress with Urea at 100 kg/ha at 4 to 5 weeks after planting',
        'Plant at 75cm × 25cm spacing for optimal plant stand density'
      ],
      soilFertilityAdjustment: isAcidic
        ? 'Apply 500 kg/ha agricultural lime or wood ash at land prep to neutralize soil acidity.'
        : 'Supplement with compost or farmyard manure to increase organic matter and water holding.',
      climateRiskMitigation: 'Ridge across slope to harvest rainfall and prevent erosion from sudden savanna thunderstorms.',
      certifiedBreederOrSource: 'Institute for Agricultural Research (IAR) Zaria / Premier Seeds (NASC Certified)',
    },
    {
      cropName: 'Early-Maturing Grain Cowpea (Beans)',
      varietyName: 'SAMPEA-14',
      cropType: 'cowpea',
      category: 'Legume',
      suitabilityScore: 94,
      suitabilityLevel: 'Optimal',
      expectedYieldRange: '1.8 – 2.5 t/ha',
      growthDurationDays: '60 – 65 days',
      whyOptimalForSoil: 'Fixes atmospheric nitrogen through symbiotic root nodules, replenishing soil nitrogen for future cereal rotations.',
      whyOptimalForClimate: `Rapid 60-day maturity enables planting as a primary or late-season relay crop without risk of terminal drought in a ${seasonDays}-day season.`,
      sowingWindow: 'Mid-July to early August (to ensure harvest during dry conditions)',
      keyManagementPractices: [
        'Dress seeds with approved fungicide/insecticide before planting',
        'Apply Single Super Phosphate (SSP) at 100 kg/ha to stimulate root nodulation',
        'Spray for pod-boring insects at flower bud formation and podding stage'
      ],
      soilFertilityAdjustment: 'Requires zero nitrogen application; focuses on phosphorus to power biological nitrogen fixation.',
      climateRiskMitigation: 'Deep taproot structure tolerates dry spells of up to 3 weeks without critical wilting.',
      certifiedBreederOrSource: 'IAR Zaria / IITA Ibadan / Premier Seeds (NASC Certified)',
    },
    {
      cropName: 'Early Dwarf Grain Sorghum (Guinea Corn)',
      varietyName: 'CSR-01',
      cropType: 'sorghum',
      category: 'Cereal',
      suitabilityScore: 91,
      suitabilityLevel: 'Highly Suitable',
      expectedYieldRange: '3.5 – 4.5 t/ha',
      growthDurationDays: '90 – 100 days',
      whyOptimalForSoil: `Excels across fluctuating pH (${ph.toFixed(1)}) and free-draining sandy loam profiles, foraging deeply for residual subsoil moisture.`,
      whyOptimalForClimate: 'Exceptional drought tolerance mechanism allows the plant to go dormant during mid-season dry spells and resume growth when rains return.',
      sowingWindow: 'June 5 to June 25',
      keyManagementPractices: [
        'Thin to 2 healthy seedlings per stand at 2 weeks after emergence',
        'Apply NPK 20-10-10 at 150 kg/ha followed by Urea topdressing at 6 weeks',
        'Maintain clean weeding to suppress parasitic Striga weed'
      ],
      soilFertilityAdjustment: 'Highly efficient user of modest soil nutrients, requiring lower input rates than maize.',
      climateRiskMitigation: 'Dwarf architecture prevents stalk lodging from high harmattan winds during late-season storms.',
      certifiedBreederOrSource: 'ICRISAT Kano / Da-Allgreen Seeds (NASC Certified)',
    },
    {
      cropName: 'Shatter-Resistant High-Protein Soybean',
      varietyName: 'TGx 1448-2E',
      cropType: 'soybean',
      category: 'Oilseed',
      suitabilityScore: 89,
      suitabilityLevel: 'Highly Suitable',
      expectedYieldRange: '2.5 – 3.5 t/ha',
      growthDurationDays: '105 – 115 days',
      whyOptimalForSoil: 'Heavy leaf fall at maturity provides substantial organic mulch, boosting soil organic carbon and improving moisture retention.',
      whyOptimalForClimate: `Growth cycle of 105–115 days is well-matched with the ${seasonDays}-day seasonal rain duration when planted at early onset.`,
      sowingWindow: 'June 10 to July 5',
      keyManagementPractices: [
        'Inoculate seed with Bradyrhizobium nodule bacteria before sowing',
        'Plant at 50cm row spacing to achieve early canopy closure and shade out weeds',
        'Harvest promptly when 90% of pods turn straw yellow to minimize field losses'
      ],
      soilFertilityAdjustment: 'Apply 150 kg/ha SSP at planting to support strong root nodulation and early vigor.',
      climateRiskMitigation: 'Dense canopy protects soil from intense savanna solar radiation and conserves topsoil moisture.',
      certifiedBreederOrSource: 'IITA Ibadan / NCRI Badeggi (NASC Certified)',
    }
  ];

  return {
    success: true,
    farmSummary: {
      soilHealthSummary: `Soil pH of ${ph.toFixed(1)} with ${textClass} texture indicates fertile baseline conditions well-suited to adapted cultivars.`,
      climateFitSummary: `An estimated ${seasonDays}-day rainy season offers a dependable growth window for early and medium-duration crops.`,
      limitingFactors: [
        isAcidic ? 'Soil acidity requiring corrective lime/ash or acid-tolerant crop lines' : 'Organic carbon maintenance between cultivations',
        'Potential mid-season rainfall pauses'
      ],
      soilStrengths: [
        'Optimal drainage preventing waterlogging in cereal root zones',
        'Strong responsive potential to micro-dosing fertilization'
      ],
    },
    recommendations,
    overallAgronomicStrategy: `Implement an alternating cereal-legume rotation (e.g. Maize/Sorghum followed by Cowpea/Soybean) to maximize biological nitrogen fixation, reduce commercial fertilizer costs, and conserve topsoil moisture during the ${seasonDays}-day season.`,
    generatedAt: new Date().toISOString(),
    modelUsed: 'deterministic-agronomic-engine',
    isFallback: true,
  };
}
