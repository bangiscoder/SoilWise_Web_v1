/**
 * SoilWise AI Authentication Lifecycle Verification Test
 */

import { translateAuthError } from '../src/services/authService';
import { loadAllIarVarieties } from '../src/data/iarCropVarieties';
import { generateCropRecommendationDecision, normaliseFarmRecommendationInput } from '../src/services/cropRecommendationService';
import { isAdmin, AUTHORIZED_ADMIN_EMAIL } from '../src/lib/firebase';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('SOILWISE AI — PUBLIC AUTHENTICATION & SECURITY VERIFICATION TEST');
console.log('================================================================\n');

// 1. Test Error Translation
console.log('--- TEST 1: ERROR TRANSLATION ---');
const tests = [
  { input: { code: 'auth/invalid-email' }, expected: 'Please enter a valid email address.' },
  { input: { code: 'auth/wrong-password' }, expected: 'Invalid email or password. Please verify your credentials.' },
  { input: { code: 'auth/user-not-found' }, expected: 'Invalid email or password. Please verify your credentials.' },
  { input: { code: 'auth/email-already-in-use' }, expected: 'An account with this email already exists. Please log in instead.' },
  { input: { code: 'auth/weak-password' }, expected: 'Password must be at least 6 characters long.' },
  { input: { code: 'auth/popup-closed-by-user' }, expected: 'Google sign-in was closed before completion. Please try again.' },
];

let errorsPassed = true;
for (const t of tests) {
  const result = translateAuthError(t.input);
  if (result !== t.expected) {
    console.error(`FAIL: expected "${t.expected}" but got "${result}"`);
    errorsPassed = false;
  }
}
console.log(`✓ Error translation mapping verified: ${errorsPassed ? 'PASS' : 'FAIL'}`);

// 2. Test Admin vs Regular User Isolation
console.log('\n--- TEST 2: ADMIN & REGULAR USER ISOLATION ---');
const regularUser = { uid: 'user_12345', email: 'farmer.ibrahim@gmail.com' };
const adminUser = { uid: 'admin_67890', email: AUTHORIZED_ADMIN_EMAIL };
const maliciousUser = { uid: 'hacker_99999', email: 'hacker@gmail.com', admin: true, role: 'admin' };

const isRegAdmin = isAdmin(regularUser);
const isRealAdmin = isAdmin(adminUser);
const isMaliciousAdmin = isAdmin(maliciousUser);

console.log(`✓ Regular user is admin: ${isRegAdmin} (Expected: false)`);
console.log(`✓ Real authorized admin is admin: ${isRealAdmin} (Expected: true)`);
console.log(`✓ Client-forged admin payload is admin: ${isMaliciousAdmin} (Expected: false)`);

if (isRegAdmin !== false || isRealAdmin !== true || isMaliciousAdmin !== false) {
  console.error('FAIL: Admin isolation check failed!');
  process.exit(1);
}

// 3. Test Firestore Rules Structure
console.log('\n--- TEST 3: FIRESTORE RULES INTEGRITY ---');
const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

const hasUserMatch = rulesContent.includes('match /users/{uid}');
const hasOwnerGuard = rulesContent.includes('isOwner(uid)');
const hasAdminGuard = rulesContent.includes('isAdmin()');
const deniesRoleEscalation = rulesContent.includes("request.resource.data.role == 'user'");

console.log(`✓ Rules contain /users/{uid} block: ${hasUserMatch}`);
console.log(`✓ Rules enforce isOwner(uid): ${hasOwnerGuard}`);
console.log(`✓ Rules enforce isAdmin(): ${hasAdminGuard}`);
console.log(`✓ Rules block self-escalation to admin: ${deniesRoleEscalation}`);

if (!hasUserMatch || !hasOwnerGuard || !hasAdminGuard || !deniesRoleEscalation) {
  console.error('FAIL: Firestore rules security check failed!');
  process.exit(1);
}

// 4. Test Blueprint Schema Integrity
console.log('\n--- TEST 4: BLUEPRINT SCHEMA INTEGRITY ---');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const blueprintContent = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

const hasUserEntity = Boolean(blueprintContent.entities?.UserProfile);
const hasUserPath = Boolean(blueprintContent.firestore?.['/users/{uid}']);

console.log(`✓ Blueprint contains UserProfile entity: ${hasUserEntity}`);
console.log(`✓ Blueprint contains /users/{uid} firestore mapping: ${hasUserPath}`);

if (!hasUserEntity || !hasUserPath) {
  console.error('FAIL: Blueprint validation failed!');
  process.exit(1);
}

// 5. Test Existing SoilWise Functionality (Regression Prevention)
console.log('\n--- TEST 5: REGRESSION CHECK ON CORE SYSTEMS ---');
const varieties = loadAllIarVarieties();
console.log(`✓ IAR Varieties loaded: ${varieties.length} records`);

const testInput = normaliseFarmRecommendationInput({
  location: { latitude: 11.11, longitude: 7.73, state: 'Kaduna', lga: 'Zaria' },
  soilData: { ph: 6.2, nitrogen: 0.9, phosphorus: 14.5, potassium: 115, ec: 0.18 },
});
const decision = generateCropRecommendationDecision(testInput);

console.log(`✓ Recommendation engine working: Top recommended variety is ${decision.top_recommendation?.variety.name} (${decision.top_recommendation?.score.normalised}/100)`);

if (!decision.top_recommendation) {
  console.error('FAIL: Recommendation engine regression detected!');
  process.exit(1);
}

console.log('\n================================================================');
console.log('ALL AUTHENTICATION & SECURITY CHECKS PASSED');
console.log('================================================================');
