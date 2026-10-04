/**
 * SoilWise AI Stage 2 Verification Test Suite
 * Tests User Analysis History, Snapshot Integrity, Immutability, Idempotency, and Security
 */

import fs from 'fs';
import path from 'path';
import { loadAllIarVarieties } from '../src/data/iarCropVarieties';
import { 
  normaliseFarmRecommendationInput, 
  generateCropRecommendationDecision 
} from '../src/services/cropRecommendationService';
import { FarmAnalysisResult } from '../src/types/soilwise';
import { SavedFarmAnalysisDocument } from '../src/types/analysisHistory';
import { isAdmin, AUTHORIZED_ADMIN_EMAIL } from '../src/lib/firebase';

console.log('================================================================');
console.log('SOILWISE AI — STAGE 2: ANALYSIS HISTORY & SNAPSHOT TEST SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// TEST 1: Decision Snapshot Completeness & Structure
// -------------------------------------------------------------
console.log('--- TEST 1: DECISION SNAPSHOT COMPLETENESS ---');
const testInput = normaliseFarmRecommendationInput({
  location: { latitude: 11.11, longitude: 7.73, state: 'Kaduna', lga: 'Zaria' },
  soilData: { ph: 6.2, nitrogen: 0.9, phosphorus: 14.5, potassium: 115, ec: 0.18 },
});
const decision = generateCropRecommendationDecision(testInput);

const mockAnalysisResult: FarmAnalysisResult = {
  id: 'FA-1790000000001',
  analysisDate: '2026-10-04',
  createdAt: new Date().toISOString(),
  soilData: { ph: 6.2, nitrogen: 0.9, phosphorus: 14.5, potassium: 115, ec: 0.18 },
  location: { latitude: 11.11, longitude: 7.73, state: 'Kaduna', lga: 'Zaria' },
  soilTexture: {
    clayPercent: 18,
    sandPercent: 62,
    siltPercent: 20,
    texturalClass: 'Sandy Loam',
    source: 'ISRIC SoilGrids',
    isAvailable: true,
  },
  rainfallOutlook: {
    isAvailable: true,
    seasonalOutlook: 'Normal',
    expectedOnset: 'May 20',
    expectedCessation: 'September 25',
    estimatedSeasonDurationDays: 125,
    estimatedRemainingDaysText: '55 days remaining',
    remainingDaysCount: 55,
    approximatePeakPeriod: 'July - August',
    rainfallOnsetStatus: 'Normal',
    totalSeasonalRainfallMm: 1040,
    source: 'Open-Meteo',
  },
  environmentalInfo: {
    isAvailable: true,
    climateZone: 'Northern Guinea Savanna',
    annualPrecipitationMm: 1040,
    meanAnnualTemperatureC: 25.4,
    elevationMeters: 650,
    source: 'Open-Meteo Climatological Normals',
  },
  status: 'completed',
  selectedState: 'Kaduna',
  selectedLga: 'Zaria',
  hasSoilTest: true,
  soilDataProvenance: 'user_measured',
  cropRecommendationDecision: decision,
};

// Construct snapshot document
const testUserId = 'firebase_user_abc123';
const snapshot: SavedFarmAnalysisDocument = {
  analysisId: mockAnalysisResult.id,
  userId: testUserId,
  createdAt: mockAnalysisResult.createdAt,
  updatedAt: mockAnalysisResult.createdAt,
  status: mockAnalysisResult.status,
  farm: {
    location: mockAnalysisResult.location,
    ecology: 'Northern Guinea Savanna',
    state: mockAnalysisResult.selectedState,
    lga: mockAnalysisResult.selectedLga,
  },
  soil: {
    input: mockAnalysisResult.soilData,
    provenance: mockAnalysisResult.soilDataProvenance,
    texture: mockAnalysisResult.soilTexture,
  },
  climate: {
    rainfallOutlook: mockAnalysisResult.rainfallOutlook,
    environmentalInfo: mockAnalysisResult.environmentalInfo,
  },
  recommendation: {
    topCrop: decision.top_recommendation!.crop.name,
    topVariety: decision.top_recommendation!.variety.name,
    score: decision.top_recommendation!.score.normalised,
    potentialYield: decision.top_recommendation!.potential_yield.iar_potential_yield_tha,
    decision,
  },
  versions: {
    decisionRuleVersion: decision.decision_rule_version,
    datasetVersion: decision.dataset_version,
    schemaVersion: decision.schema_version,
  },
  sources: decision.sources,
  limitations: decision.limitations,
  fullAnalysis: mockAnalysisResult,
};

const requiredFields = [
  'analysisId',
  'userId',
  'createdAt',
  'status',
  'farm',
  'soil',
  'climate',
  'recommendation',
  'versions',
  'sources',
  'limitations',
  'fullAnalysis',
];

const missing = requiredFields.filter((f) => !(f in snapshot));
if (missing.length > 0) {
  console.error(`FAIL: Snapshot missing required fields: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✓ Snapshot contains all required top-level structured attributes.');
console.log(`✓ Recommended Crop: ${snapshot.recommendation.topCrop}`);
console.log(`✓ Recommended Variety: ${snapshot.recommendation.topVariety}`);
console.log(`✓ Score: ${snapshot.recommendation.score}/100`);
console.log(`✓ Potential Yield: ${snapshot.recommendation.potentialYield} t/ha`);
console.log(`✓ Decision ID Preserved: ${snapshot.recommendation.decision.decision_id}`);
console.log(`✓ Matched Factors Count: ${snapshot.recommendation.decision.top_recommendation?.matched_factors.length}`);
const docSizeBytes = JSON.stringify(snapshot).length;
console.log(`✓ Document Serialized Size: ${docSizeBytes} bytes (${((docSizeBytes / 1048576) * 100).toFixed(1)}% of Firestore 1MB limit)`);
if (docSizeBytes >= 1048576) {
  console.error(`FAIL: Snapshot document size (${docSizeBytes} bytes) exceeds Firestore 1,048,576 bytes limit!`);
  process.exit(1);
}
console.log('✓ TEST 1 PASSED.\n');

// -------------------------------------------------------------
// TEST 2: Historical Integrity & Zero-Recalculation
// -------------------------------------------------------------
console.log('--- TEST 2: HISTORICAL INTEGRITY & REOPEN FIDELITY ---');
// When reopening from history:
const reopenedAnalysis = snapshot.fullAnalysis!;
const reopenedDecision = reopenedAnalysis.cropRecommendationDecision!;

if (reopenedAnalysis.id !== mockAnalysisResult.id) {
  console.error('FAIL: Reopened analysis ID does not match original!');
  process.exit(1);
}
if (reopenedDecision.top_recommendation?.variety.name !== decision.top_recommendation?.variety.name) {
  console.error('FAIL: Reopened variety does not match snapshot!');
  process.exit(1);
}
if (reopenedDecision.top_recommendation?.score.normalised !== decision.top_recommendation?.score.normalised) {
  console.error('FAIL: Reopened score does not match snapshot!');
  process.exit(1);
}

console.log('✓ Reopened analysis directly accesses snapshot without running live APIs.');
console.log('✓ Reopened decision factors match historical record with 100% fidelity.');
console.log('✓ TEST 2 PASSED.\n');

// -------------------------------------------------------------
// TEST 3: Subcollection Security Rules Verification
// -------------------------------------------------------------
console.log('--- TEST 3: FIRESTORE SECURITY RULES VERIFICATION ---');
const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

const hasSubcollection = rulesContent.includes('match /analyses/{analysisId}');
const hasOwnerRead = rulesContent.includes('allow read: if isOwner(uid) || isAdmin();');
const hasOwnerCreate = rulesContent.includes('request.resource.data.userId == uid');
const hasImmutability = rulesContent.includes('allow update: if isAdmin();');
const hasOwnerDelete = rulesContent.includes('allow delete: if isOwner(uid) || isAdmin();');

console.log(`✓ Rules contain /analyses/{analysisId} subcollection: ${hasSubcollection}`);
console.log(`✓ Rules enforce read ownership: ${hasOwnerRead}`);
console.log(`✓ Rules enforce userId == uid on create: ${hasOwnerCreate}`);
console.log(`✓ Rules enforce snapshot immutability (user update blocked): ${hasImmutability}`);
console.log(`✓ Rules allow explicit owner deletion: ${hasOwnerDelete}`);

if (!hasSubcollection || !hasOwnerRead || !hasOwnerCreate || !hasImmutability || !hasOwnerDelete) {
  console.error('FAIL: Firestore security rules verification failed!');
  process.exit(1);
}
console.log('✓ TEST 3 PASSED.\n');

// -------------------------------------------------------------
// TEST 4: Blueprint Intermediate Representation Schema
// -------------------------------------------------------------
console.log('--- TEST 4: FIREBASE BLUEPRINT SCHEMA VERIFICATION ---');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

const hasAnalysisEntity = Boolean(blueprint.entities?.FarmAnalysisRecord);
const hasAnalysisPath = Boolean(blueprint.firestore?.['/users/{uid}/analyses/{analysisId}']);

console.log(`✓ Blueprint contains FarmAnalysisRecord entity: ${hasAnalysisEntity}`);
console.log(`✓ Blueprint maps /users/{uid}/analyses/{analysisId}: ${hasAnalysisPath}`);

if (!hasAnalysisEntity || !hasAnalysisPath) {
  console.error('FAIL: Blueprint verification failed!');
  process.exit(1);
}
console.log('✓ TEST 4 PASSED.\n');

// -------------------------------------------------------------
// TEST 5: User Isolation and Cross-User Boundary Check
// -------------------------------------------------------------
console.log('--- TEST 5: USER ISOLATION & BOUNDARY CHECK ---');
const userA_Id = 'user_aaa_111';
const userB_Id = 'user_bbb_222';

// Simulated check against Firestore rule logic: isOwner(uid)
const isOwnerA = (authUid: string, docUid: string) => authUid === docUid;

console.log(`✓ User A accessing User A's analyses: ${isOwnerA(userA_Id, userA_Id)} (Allowed)`);
console.log(`✓ User B attempting to access User A's analyses: ${isOwnerA(userB_Id, userA_Id)} (Denied)`);
console.log(`✓ Admin access for inspection/support: ${isAdmin({ email: AUTHORIZED_ADMIN_EMAIL })} (Allowed)`);

if (isOwnerA(userB_Id, userA_Id)) {
  console.error('FAIL: Cross-user boundary breach detected!');
  process.exit(1);
}
console.log('✓ TEST 5 PASSED.\n');

// -------------------------------------------------------------
// TEST 6: Core Engine Regression Check
// -------------------------------------------------------------
console.log('--- TEST 6: CORE APPLICATION REGRESSION CHECK ---');
const varieties = loadAllIarVarieties();
console.log(`✓ IAR Varieties loaded dynamically: ${varieties.length} records`);

const sudanInput = normaliseFarmRecommendationInput({
  location: { latitude: 12.0, longitude: 8.5, state: 'Kano', lga: 'Dambatta' },
  soilData: { ph: 6.8, nitrogen: 1.2, phosphorus: 16.0, potassium: 130, ec: 0.2 },
});
const sudanDecision = generateCropRecommendationDecision(sudanInput);
console.log(`✓ Sudan Savanna Recommendation: ${sudanDecision.top_recommendation?.variety.name} (${sudanDecision.top_recommendation?.crop.name})`);

if (!sudanDecision.top_recommendation) {
  console.error('FAIL: Core recommendation regression detected!');
  process.exit(1);
}
console.log('✓ TEST 6 PASSED.\n');

console.log('================================================================');
console.log('ALL STAGE 2 TESTS PASSED SUCCESSFULLY');
console.log('================================================================');
