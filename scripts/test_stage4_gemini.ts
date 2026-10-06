/**
 * SoilWise AI — Stage 4: Context-Aware Gemini Agricultural Assistant Test Suite
 * 
 * Verifies all Stage 4 requirements according to Section 37 & 43:
 * - Test 1: Current Recommendation Grounding
 * - Test 2: Variety Selection & IAR Evidence
 * - Test 3: Soil Provenance (Measured vs Estimated)
 * - Test 4: Missing Soil Test Transparency
 * - Test 5: Eligible Alternatives (From Decision Engine)
 * - Test 6: Historical Analysis Chat
 * - Test 7: Current Primacy vs Historical Context
 * - Test 8: User Preferences (Personalisation ≠ Agronomic Evidence)
 * - Test 9: No Active Analysis Handling
 * - Test 10: No Hallucinated IAR Attributes
 * - Test 11: Potential Yield Disclaimer (Ceiling ≠ Guarantee)
 * - Test 12: Context & User Isolation
 * - Test 13: Secrets Protection & Security Boundary
 * - Test 14: Server-Side API Chat Execution & Fallback Resiliency
 */

import { buildGeminiContext, buildSoilWiseSystemInstruction, buildContextDebugSummary } from '../src/services/geminiContextService';
import { normaliseFarmRecommendationInput, generateCropRecommendationDecision } from '../src/services/cropRecommendationService';
import { executeGeminiAgriculturalChat } from '../server/services/geminiChatService';
import { FarmAnalysisResult, RainfallOutlook, EnvironmentalInfo } from '../src/types/soilwise';
import { SoilWiseUserProfile } from '../src/types/auth';

function createMockFarmAnalysis(options: {
  state?: string;
  lga?: string;
  lat?: number;
  lon?: number;
  hasSoilTest?: boolean;
  ph?: number;
  cropPref?: string;
  seasonDuration?: number;
}): FarmAnalysisResult {
  const state = options.state || 'Kaduna';
  const lga = options.lga || 'Zaria';
  const latitude = options.lat ?? 11.11;
  const longitude = options.lon ?? 7.73;
  const isUserMeasured = options.hasSoilTest ?? false;
  const phVal = options.ph ?? 6.2;

  const farmLocation = {
    latitude,
    longitude,
    state,
    lga,
  };

  const effectiveSoilData = {
    ph: phVal,
    nitrogen: 24,
    phosphorus: 12,
    potassium: 110,
    ec: 0.2,
  };

  const rainfallOutlook: RainfallOutlook = {
    isAvailable: true,
    seasonalOutlook: 'Normal onset expected with robust season duration',
    expectedOnset: '2026-05-20',
    expectedCessation: '2026-10-15',
    estimatedSeasonDurationDays: options.seasonDuration ?? 148,
    estimatedRemainingDaysText: '148 days',
    remainingDaysCount: options.seasonDuration ?? 148,
    approximatePeakPeriod: 'July - August',
    rainfallOnsetStatus: 'Normal',
    totalSeasonalRainfallMm: 950,
    source: 'NIMET / ERA5 Seasonal Model',
  };

  const soilTexture = {
    clayPercent: 18,
    sandPercent: 62,
    siltPercent: 20,
    texturalClass: 'Sandy Loam',
    source: 'iSDAsoil 30m resolution model',
    isAvailable: true,
  };

  const environmentalInfo: EnvironmentalInfo = {
    isAvailable: true,
    meanAnnualTemperatureC: 25.4,
    annualPrecipitationMm: 1050,
    climateZone: 'Northern Guinea Savanna',
    source: 'WorldClim baseline',
  };

  const normalisedRecInput = normaliseFarmRecommendationInput({
    location: farmLocation,
    soilData: effectiveSoilData,
    rainfallOutlook,
    soilTexture,
    environmentalInfo,
    isUserMeasured,
    preferredCrop: options.cropPref,
  });

  const decision = generateCropRecommendationDecision(normalisedRecInput);

  return {
    id: `FA-TEST-${Date.now()}`,
    analysisDate: '2026-06-15',
    createdAt: new Date().toISOString(),
    soilData: effectiveSoilData,
    location: farmLocation,
    soilTexture,
    rainfallOutlook,
    environmentalInfo,
    status: 'completed',
    selectedState: state,
    selectedLga: lga,
    hasSoilTest: isUserMeasured,
    soilDataProvenance: isUserMeasured ? 'user_measured' : 'location_estimated',
    cropRecommendationDecision: decision,
  };
}

function createUserProfile(options: {
  uid: string;
  name: string;
  email: string;
  language?: string;
  crops?: string[];
}): SoilWiseUserProfile {
  return {
    uid: options.uid,
    displayName: options.name,
    email: options.email,
    photoURL: null,
    role: 'user',
    authProviders: ['password'],
    accountStatus: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      preferredLanguage: options.language || 'en',
      farmingExperience: 'experienced',
      farmingInterests: ['Soil health', 'Crop production'],
      preferredCrops: options.crops || ['Maize'],
    },
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('SOILWISE AI — STAGE 4: CONTEXT-AWARE GEMINI ASSISTANT TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // --- TEST 1: CURRENT RECOMMENDATION GROUNDING ---
  console.log('--- TEST 1: CURRENT RECOMMENDATION GROUNDING ---');
  const analysis1 = createMockFarmAnalysis({ state: 'Kaduna', lga: 'Zaria', hasSoilTest: false });
  const user1 = createUserProfile({ uid: 'usr-123', name: 'Musa Bello', email: 'musa@example.com' });
  const ctx1 = buildGeminiContext({
    analysis: analysis1,
    userProfile: user1,
    userQuery: 'Why was this crop recommended?',
  });

  assert(ctx1.hasActiveAnalysis === true, 'Context recognizes active analysis is present.');
  assert(Boolean(ctx1.recommendationDecision?.topRecommendation?.crop), 'Top recommendation crop is preserved.');
  assert(Boolean(ctx1.recommendationDecision?.topRecommendation?.matchedFactors.length), 'Evidence matched factors are preserved.');
  assert(ctx1.recommendationDecision?.decisionRuleVersion === '1.0.0', 'Decision rule version 1.0.0 is cited.');
  console.log(`  Top Recommended: ${ctx1.recommendationDecision?.topRecommendation?.crop} (${ctx1.recommendationDecision?.topRecommendation?.variety})`);
  console.log('✓ TEST 1 PASSED.\n');

  // --- TEST 2: VARIETY SELECTION & IAR EVIDENCE ---
  console.log('--- TEST 2: VARIETY SELECTION & IAR EVIDENCE ---');
  assert(ctx1.relevantIarKnowledge.length > 0, 'Relevant IAR variety knowledge is retrieved for recommended variety.');
  const topIar = ctx1.relevantIarKnowledge[0];
  assert(topIar.varietyName === ctx1.recommendationDecision?.topRecommendation?.variety, 'IAR record matches top variety.');
  assert(typeof topIar.yieldPotentialTha === 'number', 'IAR research potential yield is preserved.');
  assert(ctx1.relevantIarKnowledge.length <= 5, 'Only relevant candidates are included (avoids dumping all 115 varieties).');
  console.log(`  IAR Record: ${topIar.varietyName} | Maturity: ${topIar.maturityDays} | Potential: ${topIar.yieldPotentialTha} t/ha`);
  console.log('✓ TEST 2 PASSED.\n');

  // --- TEST 3: SOIL PROVENANCE (MEASURED VS ESTIMATED) ---
  console.log('--- TEST 3: SOIL PROVENANCE (MEASURED VS ESTIMATED) ---');
  // Without lab test
  assert(ctx1.currentAnalysis?.soil.hasLaboratoryTest === false, 'No lab test recorded for estimated analysis.');
  assert(ctx1.currentAnalysis?.soil.ph.status === 'estimated', 'pH marked as estimated, not laboratory measured.');
  assert(ctx1.currentAnalysis?.soil.provenance === 'location_estimated', 'Provenance correctly indicates location_estimated.');

  // With lab test
  const analysisLab = createMockFarmAnalysis({ state: 'Kaduna', lga: 'Zaria', hasSoilTest: true, ph: 5.8 });
  const ctxLab = buildGeminiContext({ analysis: analysisLab, userProfile: user1 });
  assert(ctxLab.currentAnalysis?.soil.hasLaboratoryTest === true, 'Lab test recorded when farmer provides lab data.');
  assert(ctxLab.currentAnalysis?.soil.ph.status === 'measured', 'pH marked as measured when lab data provided.');
  assert(ctxLab.currentAnalysis?.soil.provenance === 'user_measured', 'Provenance indicates user_measured.');
  console.log('✓ TEST 3 PASSED.\n');

  // --- TEST 4: MISSING SOIL TEST TRANSPARENCY ---
  console.log('--- TEST 4: MISSING SOIL TEST TRANSPARENCY ---');
  const sysInst = buildSoilWiseSystemInstruction(ctx1);
  assert(sysInst.includes('PROVENANCE DISTINCTION'), 'System instruction strictly commands provenance distinction.');
  assert(sysInst.includes('encourage certified laboratory soil testing'), 'System instruction encourages lab testing where appropriate.');
  assert(sysInst.includes('Do NOT claim SoilWise physically tested the soil'), 'Explicit prohibition against claiming physical test.');
  console.log('✓ TEST 4 PASSED.\n');

  // --- TEST 5: ELIGIBLE ALTERNATIVES ---
  console.log('--- TEST 5: ELIGIBLE ALTERNATIVES FROM DECISION ENGINE ---');
  const alts = ctx1.recommendationDecision?.eligibleAlternatives || [];
  assert(alts.length > 0, 'Eligible alternative varieties are listed from deterministic decision.');
  assert(alts.every((a) => a.score <= (ctx1.recommendationDecision?.topRecommendation?.score || 100)), 'Alternative scores are ranked.');
  console.log(`  Found ${alts.length} alternative varieties: ${alts.map((a) => a.variety).join(', ')}`);
  console.log('✓ TEST 5 PASSED.\n');

  // --- TEST 6 & 7: HISTORICAL ANALYSIS & CURRENT PRIMACY ---
  console.log('--- TEST 6 & 7: HISTORICAL CHAT & CURRENT PRIMACY ---');
  const historyList = [
    {
      analysisId: 'FA-OLD-2025',
      userId: 'usr-123',
      createdAt: '2025-06-10T10:00:00Z',
      state: 'Kano',
      lga: 'Gwarzo',
      ecology: 'Sudan Savanna',
      topCrop: 'Sorghum',
      topVariety: 'SAMSORG 45',
      score: 95,
      potentialYield: 4.5,
      status: 'completed' as const,
    },
  ];

  // Standard current question: does not inject historical comparison
  const ctxCurrent = buildGeminiContext({
    analysis: analysis1,
    userProfile: user1,
    history: historyList,
    userQuery: 'What should I plant now?',
  });
  assert(ctxCurrent.historicalContext.comparisonWithPrevious === undefined, 'Current planting question does NOT mix old analysis.');
  assert(ctxCurrent.recommendationDecision?.topRecommendation?.crop === 'Maize', 'Current analysis remains primary recommendation.');

  // History comparison question: injects previous comparison
  const ctxHistoryQ = buildGeminiContext({
    analysis: analysis1,
    userProfile: user1,
    history: historyList,
    userQuery: 'What changed compared with my previous analysis?',
  });
  assert(Boolean(ctxHistoryQ.historicalContext.comparisonWithPrevious), 'History question triggers compact comparison.');
  assert(ctxHistoryQ.historicalContext.comparisonWithPrevious?.previousTopCrop === 'Sorghum', 'Previous crop identified as Sorghum.');
  assert(ctxHistoryQ.historicalContext.comparisonWithPrevious?.previousAnalysisId === 'FA-OLD-2025', 'Previous ID matches historical record.');
  console.log('✓ TEST 6 & 7 PASSED.\n');

  // --- TEST 8: USER PREFERENCES VS AGRONOMIC EVIDENCE ---
  console.log('--- TEST 8: USER PREFERENCES (PERSONALISATION ≠ AGRONOMIC EVIDENCE) ---');
  const userCowpea = createUserProfile({ uid: 'usr-456', name: 'Amina', email: 'amina@example.com', crops: ['Cowpea'] });
  const ctxCowpea = buildGeminiContext({
    analysis: analysis1, // Analysis where Maize is top recommendation
    userProfile: userCowpea,
  });
  assert(ctxCowpea.user.preferredCrops.includes('Cowpea'), 'User preference for Cowpea is captured in profile.');
  assert(ctxCowpea.recommendationDecision?.topRecommendation?.crop === 'Maize', 'Recommendation engine was NOT overridden by Cowpea preference.');
  assert(ctxCowpea.user.preferenceNotice.includes('User preferences are conversational and interest indicators ONLY'), 'Clear notice that preferences are not evidence.');
  console.log('✓ TEST 8 PASSED.\n');

  // --- TEST 9: NO ACTIVE ANALYSIS HANDLING ---
  console.log('--- TEST 9: NO ACTIVE ANALYSIS HANDLING ---');
  const ctxNoAnalysis = buildGeminiContext({
    analysis: null,
    userProfile: user1,
  });
  assert(ctxNoAnalysis.hasActiveAnalysis === false, 'hasActiveAnalysis is false.');
  assert(ctxNoAnalysis.currentAnalysis === null, 'currentAnalysis is null.');
  assert(ctxNoAnalysis.recommendationDecision === null, 'recommendationDecision is null.');
  const sysNoAnalysis = buildSoilWiseSystemInstruction(ctxNoAnalysis);
  assert(sysNoAnalysis.includes('No active farm analysis is currently loaded'), 'System instruction clarifies no farm analysis loaded.');
  console.log('✓ TEST 9 PASSED.\n');

  // --- TEST 10 & 11: NO HALLUCINATIONS & POTENTIAL YIELD CEILING ---
  console.log('--- TEST 10 & 11: NO HALLUCINATIONS & YIELD CEILING ---');
  assert(sysInst.includes('Never promise yield guarantees'), 'System instruction forbids yield guarantees.');
  assert(sysInst.includes('optimal research trial ceiling, NOT a guaranteed farmer harvest'), 'Potential yield explicitly defined as research ceiling.');
  assert(sysInst.includes('Never invent crop varieties or IAR characteristics'), 'Forbids inventing IAR characteristics.');
  console.log('✓ TEST 10 & 11 PASSED.\n');

  // --- TEST 12: USER CONTEXT ISOLATION ---
  console.log('--- TEST 12: USER CONTEXT ISOLATION ---');
  const userA = createUserProfile({ uid: 'UID-A', name: 'Farmer Audu', email: 'audu@farm.ng', language: 'ha' });
  const userB = createUserProfile({ uid: 'UID-B', name: 'Farmer Chukwuma', email: 'chukwuma@farm.ng', language: 'ig' });

  const ctxA = buildGeminiContext({ analysis: analysis1, userProfile: userA });
  const ctxB = buildGeminiContext({ analysis: analysis1, userProfile: userB });

  assert(ctxA.user.displayName === 'Farmer Audu', 'User A profile isolated to Audu.');
  assert(ctxA.user.preferredLanguage === 'ha', 'User A language isolated to Hausa.');
  assert(ctxB.user.displayName === 'Farmer Chukwuma', 'User B profile isolated to Chukwuma.');
  assert(ctxB.user.preferredLanguage === 'ig', 'User B language isolated to Igbo.');
  console.log('✓ TEST 12 PASSED.\n');

  // --- TEST 13: SECRETS PROTECTION ---
  console.log('--- TEST 13: SECRETS PROTECTION ---');
  const debug = buildContextDebugSummary(ctx1);
  const debugStr = JSON.stringify(debug);
  assert(!debugStr.includes('GEMINI_API_KEY'), 'No GEMINI_API_KEY in debug context.');
  assert(!debugStr.includes('password'), 'No passwords in debug context.');
  assert(!debugStr.includes('token'), 'No internal tokens in debug context.');
  assert(!debugStr.includes('Bearer'), 'No credentials in debug context.');
  console.log('✓ TEST 13 PASSED.\n');

  // --- TEST 14: LIVE SERVER-SIDE GEMINI CHAT EXECUTION & SECTION 38 RESILIENCY ---
  console.log('--- TEST 14: LIVE SERVER-SIDE GEMINI CHAT EXECUTION & RESILIENCY ---');
  const chatResp = await executeGeminiAgriculturalChat({
    userQuery: 'Why was this crop recommended for my farm?',
    context: ctx1,
  });

  if (chatResp.success) {
    assert(Boolean(chatResp.reply && chatResp.reply.length > 20), 'Gemini returned grounded explanation.');
    assert(Boolean(chatResp.modelUsed), `Model used: ${chatResp.modelUsed}`);
    console.log(`\n  Sample Gemini Output Preview:\n  "${chatResp.reply.slice(0, 160)}..."\n`);
  } else {
    assert(
      chatResp.reply.includes('temporarily unavailable'),
      'Section 38: Friendly fallback message returned without breaking the app.'
    );
    console.log(`  Graceful Fallback Handled: ${chatResp.reply}`);
  }
  assert(Boolean(chatResp.debugContext), 'Debug context generated alongside response.');
  console.log('✓ TEST 14 PASSED.\n');

  console.log('================================================================');
  console.log(`ALL ${passedTests}/${totalTests} STAGE 4 ASSISTANT TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
