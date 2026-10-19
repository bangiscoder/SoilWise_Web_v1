/**
 * Server-Side Gemini Crop Recommendation Service
 * 
 * Uses Google GenAI (gemini-3.8-flash) to suggest optimal crops
 * based on soil-test data, texture, and local climate parameters retrieved.
 */

import { GoogleGenAI } from '@google/genai';
import type { GeminiRecommendedCropsResponse, GeminiCropRecommendation } from '../../src/types/geminiRecommendations';

const PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI();
  }
  return aiInstance;
}

export interface CropRecommendationInput {
  location: {
    state?: string;
    lga?: string;
    latitude?: number;
    longitude?: number;
    elevationMeters?: number | null;
    agroecologicalZone?: string;
  };
  soilData: {
    ph?: number | null;
    nitrogen?: number | null;
    phosphorus?: number | null;
    potassium?: number | null;
    organicCarbonPercent?: number | null;
    electricalConductivity?: number | null;
    soilDataProvenance?: string;
  };
  soilTexture: {
    texturalClass?: string;
    sandPercent?: number | null;
    siltPercent?: number | null;
    clayPercent?: number | null;
  };
  climate: {
    annualPrecipitationMm?: number | null;
    seasonalRainfallMm?: number | null;
    seasonDurationDays?: number | null;
    expectedOnset?: string | null;
    expectedCessation?: string | null;
    meanAnnualTemperatureC?: number | null;
  };
}

/**
 * Executes crop recommendation inference with Gemini.
 */
export async function generateGeminiCropRecommendations(
  input: CropRecommendationInput
): Promise<GeminiRecommendedCropsResponse> {
  const { location, soilData, soilTexture, climate } = input;

  const phVal = soilData.ph != null ? soilData.ph.toFixed(1) : '6.2 (Neutral-Slightly Acidic)';
  const textClass = soilTexture.texturalClass || 'Sandy Loam';
  const stateStr = location.state || 'Kaduna';
  const lgaStr = location.lga || 'Zaria';
  const rainDays = climate.seasonDurationDays || 120;
  const annualRainMm = climate.annualPrecipitationMm || 950;
  const onset = climate.expectedOnset || 'Late May / Early June';
  const cessation = climate.expectedCessation || 'Late September / October';

  const systemInstruction = `You are the Lead Senior Agricultural Scientist and Agronomist for SoilWise AI, operating in partnership with the Institute for Agricultural Research (IAR) Zaria, NCRI Badeggi, and the National Agricultural Seeds Council (NASC) of Nigeria.

Your duty is to analyze smallholder farm soil-test data and retrieved climate parameters, and recommend the 3 most optimal, high-yielding, resilient crop varieties.

Crucial Guidelines:
1. Soil-test data alignment: Directly account for soil pH (${phVal}), texture (${textClass}), and nutrient profile (N, P, K, Organic Carbon). If soil is acidic (pH < 5.8), recommend acid-tolerant crops (e.g., groundnut, cowpea, cassava, adapted maize) or specify lime/ash management. If soil is sandy, favor drought-hardy deep rooters with organic mulching.
2. Climate parameters alignment: Match crop maturity duration to the estimated rainy season of ${rainDays} days (onset: ${onset}, cessation: ${cessation}, annual rainfall: ${annualRainMm} mm). Never recommend a 130-day crop in a 90-day short rainfall zone unless irrigated.
3. Authentic certified Nigerian/West African varieties: Reference real, released cultivars (e.g. SAMMAZ-52, SAMMAZ-15, SAMMAZ-16, CSR-01, KSV-8, SOSAT-C88, SAMPEA-14, SAMPEA-20-T PBR, FARO-44, FARO-52, TGx 1448-2E, SAMNUT-24, TME 419).
4. Output Format: Return strictly valid JSON adhering to the exact requested schema. No markdown formatting, no code fences, just clean raw JSON.
5. Conciseness: Keep each textual explanation concise (1 to 2 direct sentences max per field). Keep management practices to 2-3 brief bullet items. This ensures all JSON tokens are crisp, fast, and completely closed.`;

  const userPrompt = `Analyze the following retrieved farm soil and climate parameters and suggest optimal crops:

FARM GEOGRAPHY:
- State & LGA: ${stateStr}, ${lgaStr}
- Agroecological Zone: ${location.agroecologicalZone || 'Northern Guinea / Sudan Savanna'}
- Coordinates: Lat ${location.latitude ?? 11.1}, Lon ${location.longitude ?? 7.7}
- Elevation: ${location.elevationMeters ? `${location.elevationMeters}m` : 'savanna lowland/plateau'}

SOIL TEST DATA:
- pH: ${soilData.ph ?? '6.2'}
- Nitrogen (N): ${soilData.nitrogen != null ? `${soilData.nitrogen} mg/kg` : 'Medium (estimated)'}
- Phosphorus (P): ${soilData.phosphorus != null ? `${soilData.phosphorus} mg/kg` : 'Moderate (estimated)'}
- Potassium (K): ${soilData.potassium != null ? `${soilData.potassium} mg/kg` : 'Sufficient (estimated)'}
- Organic Carbon: ${soilData.organicCarbonPercent != null ? `${soilData.organicCarbonPercent}%` : '0.8 - 1.2%'}
- Soil Texture Class: ${textClass} (Sand: ${soilTexture.sandPercent ?? 60}%, Silt: ${soilTexture.siltPercent ?? 25}%, Clay: ${soilTexture.clayPercent ?? 15}%)
- Electrical Conductivity: ${soilData.electricalConductivity != null ? `${soilData.electricalConductivity} dS/m` : 'Non-saline (<0.5)'}
- Data Provenance: ${soilData.soilDataProvenance || 'User measured soil test'}

CLIMATE & WEATHER PARAMETERS:
- Annual Rainfall: ${annualRainMm} mm
- Estimated Rainy Season Duration: ${rainDays} days
- Projected Rainy Season Onset: ${onset}
- Projected Rainy Season Cessation: ${cessation}
- Mean Annual Temperature: ${climate.meanAnnualTemperatureC ? `${climate.meanAnnualTemperatureC}°C` : '26–28°C'}

Respond with JSON adhering to this structure:
{
  "farmSummary": {
    "soilHealthSummary": "Concise 1-2 sentence description of the soil chemical and physical status",
    "climateFitSummary": "Concise 1-2 sentence description of rainfall window and seasonal suitability",
    "limitingFactors": ["Factor 1 (e.g. low soil organic matter or mid-season dry spells)"],
    "soilStrengths": ["Strength 1 (e.g. favorable pH for phosphorus availability)"]
  },
  "overallAgronomicStrategy": "2-3 sentences advising on crop rotation, planting schedule, and fertilizer management",
  "recommendations": [
    {
      "cropName": "Crop name with type (e.g. Drought-Tolerant Hybrid Maize)",
      "varietyName": "Cultivar name (e.g. SAMMAZ-52)",
      "cropType": "maize | sorghum | cowpea | rice | soybean | millet | groundnut | cassava | vegetable | other",
      "category": "Cereal | Legume | Root & Tuber | Oilseed | Vegetable",
      "suitabilityScore": 96,
      "suitabilityLevel": "Optimal | Highly Suitable | Moderately Suitable",
      "expectedYieldRange": "e.g. 5.5 - 7.0 t/ha",
      "growthDurationDays": "e.g. 90 - 95 days",
      "whyOptimalForSoil": "Clear explanation referencing this farm's pH, texture, and nutrient retention",
      "whyOptimalForClimate": "Clear explanation referencing the ${rainDays} days season duration and temperature",
      "sowingWindow": "e.g. Late May to Mid June (after 20mm cumulative rain)",
      "keyManagementPractices": [
        "Practical field step 1",
        "Practical field step 2",
        "Practical field step 3"
      ],
      "soilFertilityAdjustment": "Specific fertilizer/compost/lime advice for this crop on this soil",
      "climateRiskMitigation": "How to protect yield against drought, heat, or early cessation",
      "certifiedBreederOrSource": "Breeder institute and certification status (e.g. IAR Zaria / Premier Seeds (NASC Certified))"
    }
  ]
}`;

  const ai = getGenAI();
  const modelsToTry = [PRIMARY_MODEL, 'gemini-3.1-flash-lite', FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for factual agricultural precision
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
        },
      });

      const replyText = response.text?.trim();
      if (replyText) {
        const cleanedJson = extractCleanJson(replyText);
        const parsed = safeParseOrRepairJson(cleanedJson);

        if (parsed && Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
          return {
            success: true,
            farmSummary: parsed.farmSummary || {
              soilHealthSummary: `Soil pH of ${phVal} with ${textClass} texture indicates good baseline cultivability.`,
              climateFitSummary: `${rainDays} estimated rainy days provide a solid growing window for adapted cultivars.`,
              limitingFactors: ['Seasonal moisture distribution', 'Moderate soil organic carbon'],
              soilStrengths: ['Favorable pH range for macro-nutrient availability', 'Good textural aeration'],
            },
            recommendations: parsed.recommendations,
            overallAgronomicStrategy: parsed.overallAgronomicStrategy || 'Adopt an integrated cereal-legume rotation to balance nitrogen depletion and sustain topsoil fertility.',
            generatedAt: new Date().toISOString(),
            modelUsed: model,
            isFallback: false,
          };
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Crop Recommendation] Model ${model} generation/parsing issue:`, err?.message || err);
    }
  }

  console.warn('[Gemini Crop Recommendation] Falling back to deterministic agronomic engine:', lastError?.message);
  return generateDeterministicFallbackRecommendations(input);
}

/**
 * Strips code fences, whitespace, and leading characters before JSON object
 */
function extractCleanJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }
  return cleaned.trim();
}

/**
 * Robust JSON parser that attempts self-healing if a token was cut off or unterminated.
 */
function safeParseOrRepairJson(raw: string): any {
  if (!raw) return null;

  // 1. Direct parse attempt
  try {
    return JSON.parse(raw);
  } catch (initialErr: any) {
    // 2. Repair unterminated string if quotes are mismatched
    let candidate = raw.trim();
    const quoteCount = (candidate.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      candidate += '"';
    }

    try {
      return JSON.parse(candidate);
    } catch {
      // 3. Salvage up to the last complete recommendation object
      const lastObjEnd = candidate.lastIndexOf('}');
      if (lastObjEnd > 0) {
        let truncated = candidate.substring(0, lastObjEnd + 1);
        const openBraces = (truncated.match(/{/g) || []).length;
        const closeBraces = (truncated.match(/}/g) || []).length;
        const openBrackets = (truncated.match(/\[/g) || []).length;
        const closeBrackets = (truncated.match(/]/g) || []).length;

        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          truncated += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          truncated += '}';
        }

        try {
          return JSON.parse(truncated);
        } catch {
          // If repair failed, rethrow initial error to allow loop to try fallback model/engine
          throw initialErr;
        }
      }
      throw initialErr;
    }
  }
}

/**
 * High-quality deterministic fallback recommendations grounded in IAR benchmarks
 * if the Gemini API is temporarily unreachable or offline.
 */
function generateDeterministicFallbackRecommendations(
  input: CropRecommendationInput
): GeminiRecommendedCropsResponse {
  const ph = input.soilData.ph ?? 6.2;
  const seasonDays = input.climate.seasonDurationDays ?? 115;
  const isShortSeason = seasonDays < 95;
  const isAcidic = ph < 5.8;

  const recommendations: GeminiCropRecommendation[] = [
    {
      cropName: isShortSeason ? 'Extra-Early White Maize' : 'Drought-Tolerant Hybrid White Maize',
      varietyName: isShortSeason ? 'SAMMAZ-15' : 'SAMMAZ-52',
      cropType: 'maize',
      category: 'Cereal',
      suitabilityScore: isAcidic ? 88 : 95,
      suitabilityLevel: 'Optimal',
      expectedYieldRange: isShortSeason ? '4.0 – 5.2 t/ha' : '5.5 – 7.0 t/ha',
      growthDurationDays: isShortSeason ? '80 – 85 days' : '90 – 95 days',
      whyOptimalForSoil: `Well-adapted to ${input.soilTexture.texturalClass || 'loamy'} topsoil with pH ${ph.toFixed(1)}. Roots explore upper 40cm efficiently for applied nitrogen and potassium.`,
      whyOptimalForClimate: `Growth cycle (${isShortSeason ? '80-85' : '90-95'} days) completes comfortably within the ${seasonDays}-day estimated rainy season, avoiding terminal drought stress.`,
      sowingWindow: 'Late May to mid-June (following 20mm cumulative rainfall)',
      keyManagementPractices: [
        'Apply basal NPK 15-15-15 at 200 kg/ha at planting or within 10 days of emergence',
        'Topdress with Urea at 100 kg/ha at 4 to 5 weeks after planting (knee-high stage)',
        'Maintain 75cm between ridges and 25cm between plant stands for optimum population'
      ],
      soilFertilityAdjustment: isAcidic 
        ? 'Incorporate 500 kg/ha agricultural lime or wood ash 2 weeks prior to sowing to buffer soil acidity.'
        : 'Integrate farmyard manure (2–3 tonnes/ha) to enhance cation exchange capacity and water holding.',
      climateRiskMitigation: 'Utilize ridging along contour lines to conserve rainfall and prevent topsoil wash during torrential savanna downpours.',
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
      whyOptimalForSoil: 'Exceptional biological nitrogen fixation capability. Thrives in savanna soils with moderate phosphorus, enriching topsoil for succeeding cereal crops.',
      whyOptimalForClimate: `Ultra-short 60-day cycle easily fits into the ${seasonDays}-day season and can be sown either as a sole crop or as a late relay crop in July/August.`,
      sowingWindow: 'Mid-July to early August (to coincide pod maturity with dry weather)',
      keyManagementPractices: [
        'Seed dressing with Apron Star before planting to eliminate seedling damping-off',
        'Apply Single Super Phosphate (SSP) at 100 kg/ha at land preparation to stimulate nodulation',
        'Scout and spray for Maruca pod borer at flower initiation and pod formation'
      ],
      soilFertilityAdjustment: 'Requires zero nitrogen fertilizer; relies on Rhizobia symbiosis. Ensure adequate phosphorus for root nodule development.',
      climateRiskMitigation: 'Deep taproot system tolerates 2-3 week dry spells with minimal flower drop.',
      certifiedBreederOrSource: 'IAR Zaria / IITA Ibadan / Premier Seeds (NASC Certified)',
    },
    {
      cropName: 'Early Dwarf Grain Sorghum (Guinea Corn)',
      varietyName: 'CSR-01',
      cropType: 'sorghum',
      category: 'Cereal',
      suitabilityScore: 92,
      suitabilityLevel: 'Highly Suitable',
      expectedYieldRange: '3.5 – 4.5 t/ha',
      growthDurationDays: '90 – 100 days',
      whyOptimalForSoil: `Highly tolerant of fluctuating pH (${ph.toFixed(1)}) and free-draining sandy loam. Can extract residual moisture from deeper subsoil layers.`,
      whyOptimalForClimate: 'Outstanding drought resilience. Can temporarily suspend active vegetative growth during harmattan dry spells and resume vigor upon rainfall.',
      sowingWindow: 'June 1 to June 25',
      keyManagementPractices: [
        'Sow 4-6 seeds per hole and thin to 2 vigorous seedlings per stand at 2 weeks',
        'Apply NPK 20-10-10 at 150 kg/ha at 2 weeks, topdress with Urea at 50 kg/ha at 6 weeks',
        'Keep field clean of Striga weed by hand pulling before weed seed maturity'
      ],
      soilFertilityAdjustment: 'Performs reliably on moderate fertility soils without excessive fertilizer demand.',
      climateRiskMitigation: 'Dwarf stature prevents lodging from heavy storm winds at the onset of rain cessation.',
      certifiedBreederOrSource: 'ICRISAT Kano / Da-Allgreen Seeds (NASC Certified)',
    },
    {
      cropName: 'Shatter-Resistant High-Yielding Soybean',
      varietyName: 'TGx 1448-2E',
      cropType: 'soybean',
      category: 'Oilseed',
      suitabilityScore: 89,
      suitabilityLevel: 'Highly Suitable',
      expectedYieldRange: '2.5 – 3.5 t/ha',
      growthDurationDays: '105 – 115 days',
      whyOptimalForSoil: 'Heavy biomass production deposits extensive organic residues, dramatically lifting soil organic carbon and improving moisture retention for future seasons.',
      whyOptimalForClimate: `Requires well-distributed rainfall across its 110-day cycle; matches the ${seasonDays}-day season well if planted promptly at rain establishment.`,
      sowingWindow: 'June 10 to July 5',
      keyManagementPractices: [
        'Inoculate seeds with Bradyrhizobium japonicum before planting for maximum nodulation',
        'Plant at 50cm row spacing and 5cm within row for complete ground canopy closure',
        'Harvest as soon as 90% of pods turn golden brown to eliminate shattering'
      ],
      soilFertilityAdjustment: 'Apply 150 kg/ha SSP at planting to feed mycorrhizal root associations.',
      climateRiskMitigation: 'Dense canopy protects topsoil from solar heat scorch and conserves soil water.',
      certifiedBreederOrSource: 'IITA Ibadan / NCRI Badeggi (NASC Certified)',
    }
  ];

  return {
    success: true,
    farmSummary: {
      soilHealthSummary: `Soil pH of ${ph.toFixed(1)} with ${input.soilTexture.texturalClass || 'sandy loam'} matrix exhibits good agricultural potential for adapted cultivars.`,
      climateFitSummary: `An estimated ${seasonDays}-day rainy season supports early and medium-duration cereal and legume cropping cycles.`,
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
    overallAgronomicStrategy: `Implement an alternating cereal-legume rotation (e.g. Maize/Sorghum followed by Cowpea/Soybean) to optimize biological nitrogen fixation, lower commercial fertilizer input costs, and protect topsoil during the ${seasonDays}-day wet season.`,
    generatedAt: new Date().toISOString(),
    modelUsed: 'deterministic-agronomic-engine',
    isFallback: true,
  };
}
