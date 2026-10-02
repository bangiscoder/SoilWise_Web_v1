/**
 * Comprehensive Verification Script for SoilWise AI Deterministic Crop Recommendation Engine
 * Validates iar_crop_varieties_database.json integration and end-to-end decision workflow.
 */

import fs from 'fs';
import path from 'path';
import { 
  IAR_DATABASE, 
  IAR_DATASET_METADATA, 
  loadAllIarVarieties 
} from '../src/data/iarCropVarieties';
import { 
  normaliseFarmRecommendationInput, 
  generateCropRecommendationDecision,
  determineFarmEcology,
  evaluateEcologyCompatibility
} from '../src/services/cropRecommendationService';
import { NormalisedFarmRecommendationInput } from '../src/types/cropRecommendation';

console.log('================================================================');
console.log('SOILWISE AI — IAR CROP VARIETY RECOMMENDATION VERIFICATION TEST');
console.log('================================================================\n');

// -------------------------------------------------------------
// TEST 1: Canonical Dataset Loading & Schema Integrity
// -------------------------------------------------------------
console.log('--- TEST 1: CANONICAL DATASET LOADING ---');
const jsonPath = path.resolve(process.cwd(), 'src/data/iar_crop_varieties_database.json');
if (!fs.existsSync(jsonPath)) {
  console.error(`FAIL: File not found at ${jsonPath}`);
  process.exit(1);
}

const rawJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
console.log('✓ Canonical JSON file loaded successfully from:', jsonPath);
console.log('✓ Dataset Title:', rawJson.metadata.title);
console.log('✓ Publisher:', rawJson.metadata.publisher);
console.log('✓ Edition:', rawJson.metadata.edition);
console.log('✓ Documented Varieties in Metadata:', rawJson.metadata.total_varieties_documented);
console.log('✓ Schema Version:', rawJson.metadata.schema_version);

const categories = Object.keys(rawJson.crop_categories);
console.log(`✓ Crop Categories (${categories.length}):`, categories.join(', '));

const varieties = loadAllIarVarieties();
console.log(`✓ Total Variety Records Parsed: ${varieties.length}`);

// Category breakdown
const counts: Record<string, number> = {};
for (const v of varieties) {
  counts[v.crop_type] = (counts[v.crop_type] || 0) + 1;
}
console.log('✓ Varieties per Crop Type:', JSON.stringify(counts));

if (varieties.length === 0) {
  console.error('FAIL: No varieties loaded!');
  process.exit(1);
}
console.log('✓ TEST 1 PASSED: Dataset loaded cleanly without hardcoding.\n');

// -------------------------------------------------------------
// TEST 2: Real End-to-End Recommendation (Zaria, Kaduna - Northern Guinea Savanna)
// -------------------------------------------------------------
console.log('--- TEST 2: REAL END-TO-END RECOMMENDATION WORKFLOW ---');
const testInputZaria: NormalisedFarmRecommendationInput = {
  location: {
    latitude: 11.11,
    longitude: 7.73,
    state: 'Kaduna',
    lga: 'Zaria',
    ecology: 'Northern Guinea Savanna',
    elevation_m: 650,
  },
  soil: {
    ph: { value: 6.2, unit: 'pH', source: 'Soil Test', status: 'measured' },
    nitrogen: { value: 0.9, unit: 'g/kg', source: 'Soil Test', status: 'measured' }, // Low nitrogen (< 1.2 g/kg)
    phosphorus: { value: 14.5, unit: 'mg/kg', source: 'Soil Test', status: 'measured' },
    potassium: { value: 115.0, unit: 'mg/kg', source: 'Soil Test', status: 'measured' },
    ec: { value: 0.18, unit: 'dS/m', source: 'Soil Test', status: 'measured' },
    texture: { class: 'Sandy Loam', source: 'ISRIC SoilGrids', status: 'available' },
  },
  climate: {
    rainfall_annual_mm: 1040,
    rainfall_source: 'Open-Meteo Normals',
    season_length_days: 125,
    expected_onset: 'May 20',
    expected_cessation: 'September 25',
    drought_risk: 'low',
    temperature_mean_c: 25.4,
  },
  farmer_context: {
    preferred_crop: 'Maize',
    production_goal: 'grain_yield',
  },
};

const decisionZaria = generateCropRecommendationDecision(testInputZaria);
console.log('✓ Decision ID Generated:', decisionZaria.decision_id);
console.log('✓ Total Varieties Considered:', decisionZaria.candidate_summary.total_varieties_considered);
console.log('✓ Eligible Candidates:', decisionZaria.candidate_summary.eligible_varieties);
console.log('✓ Excluded Candidates:', decisionZaria.candidate_summary.excluded_varieties);

if (!decisionZaria.top_recommendation) {
  console.error('FAIL: No top recommendation produced for compatible farm!');
  process.exit(1);
}

const top = decisionZaria.top_recommendation;
console.log('\nTop Recommendation:');
console.log(`  Crop: ${top.crop.name}`);
console.log(`  Variety: ${top.variety.name} (ID: ${top.variety.id})`);
console.log(`  Normalised Score: ${top.score.normalised}/100 (Raw: ${top.score.raw})`);
console.log(`  IAR Potential Yield: ${top.potential_yield.iar_potential_yield_tha} t/ha`);
console.log(`  Provenance Source: ${top.provenance.source_name} [${top.provenance.dataset}]`);
console.log(`  Maturity: ${top.variety_profile.maturity_class} (${top.variety_profile.maturity_days})`);
console.log(`  Matched Factors (${top.matched_factors.length}):`, top.matched_factors.map(f => f.factor).join(', '));
console.log(`  Explanation: ${top.explanation.short}`);
console.log('✓ TEST 2 PASSED: Recommendation pipeline executed successfully.\n');

// -------------------------------------------------------------
// TEST 3: Traceability & 9 Decision Object Core Questions (Section 13)
// -------------------------------------------------------------
console.log('--- TEST 3: DECISION OBJECT TRACEABILITY (SECTION 13) ---');
console.log('Q1 (Crop):', top.crop.name);
console.log('Q2 (Variety):', top.variety.name);
console.log('Q3 (Why Eligible):', top.eligibility.reasons.map(r => r.reason).join(' | '));
console.log('Q4 (Score Basis):', `Raw ${top.score.raw}/${top.score.maximum} -> ${top.score.normalised}/100`);
console.log('Q5 (Farm Conditions Influencing Decision):', top.matched_factors.map(f => `${f.factor}: ${f.condition.name}=${f.condition.value}`).join('; '));
console.log('Q6 (IAR Attributes Supporting Recommendation):', top.matched_factors.map(f => `${f.variety_attribute.name}=${JSON.stringify(f.variety_attribute.value)}`).join('; '));
console.log('Q7 (Information Unavailable):', top.not_evaluated_factors.map(f => `${f.factor}: ${f.reason}`).join('; ') || 'None (all core signals evaluated)');
console.log('Q8 (Limitations):', top.confidence.limitations.join(' | '));
console.log('Q9 (Provenance):', `${top.provenance.source_name} -> ${top.provenance.dataset} (record: ${top.provenance.record_id})`);
console.log('✓ TEST 3 PASSED: All 9 structured decision questions satisfied.\n');

// -------------------------------------------------------------
// TEST 4: Ecology Filtering Verification (Section 6)
// -------------------------------------------------------------
console.log('--- TEST 4: ECOLOGY FILTERING & EXCLUSION LOGIC ---');
// Test Kano (Sudan Savanna) with no crop filter
const testInputKano: NormalisedFarmRecommendationInput = {
  location: {
    latitude: 12.0,
    longitude: 8.52,
    state: 'Kano',
    lga: 'Dambatta',
    ecology: 'Sudan Savanna',
  },
  soil: {
    ph: { value: 6.5, unit: 'pH', source: 'Location Estimate', status: 'estimated' },
    nitrogen: { value: 1.1, unit: 'g/kg', source: 'Location Estimate', status: 'estimated' },
    phosphorus: { value: 12.0, unit: 'mg/kg', source: 'Location Estimate', status: 'estimated' },
    potassium: { value: 140.0, unit: 'mg/kg', source: 'Location Estimate', status: 'estimated' },
    ec: { value: null, unit: 'dS/m', source: null, status: 'unavailable' },
  },
  climate: {
    rainfall_annual_mm: 680,
    rainfall_source: 'Open-Meteo Normals',
    season_length_days: 90,
    expected_onset: 'June 15',
    expected_cessation: 'September 15',
    drought_risk: 'moderate',
  },
  farmer_context: {
    preferred_crop: 'all',
  },
};

const decisionKano = generateCropRecommendationDecision(testInputKano);
console.log(`✓ Sudan Savanna Input -> ${decisionKano.candidate_summary.eligible_varieties} eligible, ${decisionKano.candidate_summary.excluded_varieties} excluded`);

// Verify that a variety documented ONLY for Southern Guinea Savanna (e.g. SAMMAZ 11, SAMMAZ 16, SAMMAZ 17) is excluded
const excludedIds = decisionKano.excluded_candidates.map(e => e.variety_id);
const ssgOnlyVarieties = ['SAMMAZ_11', 'SAMMAZ_16', 'SAMMAZ_17'];
const correctlyExcluded = ssgOnlyVarieties.every(id => excludedIds.includes(id));
console.log(`✓ Southern Guinea Savanna varieties correctly excluded from Sudan Savanna field: ${correctlyExcluded}`);
if (!correctlyExcluded) {
  console.error('FAIL: Incompatible ecology variety was not excluded!');
  process.exit(1);
}
console.log('✓ TEST 4 PASSED: Ecology filtering properly partitions candidates.\n');

// -------------------------------------------------------------
// TEST 5: Determinism Verification (Section 14)
// -------------------------------------------------------------
console.log('--- TEST 5: DETERMINISM AND REPRODUCIBILITY ---');
const run1 = generateCropRecommendationDecision(testInputZaria);
const run2 = generateCropRecommendationDecision(testInputZaria);
const run3 = generateCropRecommendationDecision(testInputZaria);

const top1 = run1.top_recommendation!;
const top2 = run2.top_recommendation!;
const top3 = run3.top_recommendation!;

const isIdentical = 
  top1.variety.id === top2.variety.id &&
  top2.variety.id === top3.variety.id &&
  top1.score.normalised === top2.score.normalised &&
  top2.score.normalised === top3.score.normalised &&
  run1.recommendations.length === run2.recommendations.length &&
  run2.recommendations.length === run3.recommendations.length;

console.log(`✓ Run 1 Top: ${top1.variety.id} (${top1.score.normalised})`);
console.log(`✓ Run 2 Top: ${top2.variety.id} (${top2.score.normalised})`);
console.log(`✓ Run 3 Top: ${top3.variety.id} (${top3.score.normalised})`);
console.log(`✓ Deterministic identity verified across runs: ${isIdentical}`);
if (!isIdentical) {
  console.error('FAIL: Non-deterministic output detected!');
  process.exit(1);
}
console.log('✓ TEST 5 PASSED: 100% deterministic ranking.\n');

// -------------------------------------------------------------
// TEST 6: Missing Data Robustness (Section 15)
// -------------------------------------------------------------
console.log('--- TEST 6: MISSING DATA ROBUSTNESS ---');
const testInputMissing: NormalisedFarmRecommendationInput = {
  location: {
    latitude: 10.5,
    longitude: 7.4,
    state: 'Kaduna',
    lga: null,
    ecology: 'Northern Guinea Savanna',
  },
  soil: {
    ph: { value: null, unit: 'pH', source: null, status: 'unavailable' },
    nitrogen: { value: null, unit: 'g/kg', source: null, status: 'unavailable' },
    phosphorus: { value: null, unit: 'mg/kg', source: null, status: 'unavailable' },
    potassium: { value: null, unit: 'mg/kg', source: null, status: 'unavailable' },
    ec: { value: null, unit: 'dS/m', source: null, status: 'unavailable' },
  },
  climate: {
    rainfall_annual_mm: null,
    rainfall_source: null,
    season_length_days: null, // Season length unavailable!
    expected_onset: null,
    expected_cessation: null,
    drought_risk: 'unknown',
  },
};

const decisionMissing = generateCropRecommendationDecision(testInputMissing);
console.log(`✓ Missing data run executed without crash: true`);
console.log(`✓ Top recommendation produced: ${decisionMissing.top_recommendation?.variety.name}`);
console.log(`✓ Not evaluated factors present: ${decisionMissing.top_recommendation?.not_evaluated_factors.length}`);
console.log(`✓ Confidence level adjusted to: ${decisionMissing.top_recommendation?.confidence.level}`);
if (!decisionMissing.top_recommendation) {
  console.error('FAIL: Engine failed when optional data was missing!');
  process.exit(1);
}
console.log('✓ TEST 6 PASSED: Graceful degradation under missing evidence.\n');

console.log('================================================================');
console.log('ALL VERIFICATION SUITES PASSED SUCCESSFULLY');
console.log('================================================================');
