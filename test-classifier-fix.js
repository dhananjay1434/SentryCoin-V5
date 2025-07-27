#!/usr/bin/env node

/**
 * RED TEAM MANDATE 1: Unit Test for Classifier Logic Fix
 * 
 * This test proves the classifier fires correctly after fixing
 * the floating-point precision comparison bug.
 */

import MarketClassifier from './src/phoenix/components/market-classifier.js';

console.log('🧪 RED TEAM MANDATE 1: Testing Classifier Logic Fix');
console.log('=' .repeat(60));

// Create classifier instance
const classifier = new MarketClassifier({
  symbol: 'ETHUSDT',
  logger: {
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {}
  }
});

// Test Case 1: CASCADE condition that should PASS
console.log('\n📊 Test Case 1: CASCADE Condition (Should PASS)');
const cascadeTest = {
  price: 3500,
  dlsScore: 50,  // Above threshold of 25
  pressure: 1.000015,  // Above threshold of 1.00001
  momentum: -0.06  // Below threshold of -0.05
};

console.log('Input:', cascadeTest);
const cascadeResult = classifier.classifyMarketCondition(cascadeTest);
const cascadeRegime = cascadeResult?.regime || cascadeResult?.type;
console.log('Result:', cascadeRegime);
console.log('Expected: CASCADE_HUNTER');
console.log('✅ PASS:', cascadeRegime === 'CASCADE_HUNTER' ? 'YES' : 'NO');
if (cascadeResult) {
  console.log('Debug:', cascadeResult.diagnosticLog?.classifierOutput);
}

// Test Case 2: COIL condition that should PASS
console.log('\n📊 Test Case 2: COIL Condition (Should PASS)');
const coilTest = {
  price: 3500,
  dlsScore: 90,  // Above threshold of 85
  pressure: 1.000003,  // Below threshold of 1.000005
  momentum: 0.01  // Within range of -0.02 to 0.02
};

console.log('Input:', coilTest);
const coilResult = classifier.classifyMarketCondition(coilTest);
const coilRegime = coilResult?.regime || coilResult?.type;
console.log('Result:', coilRegime);
console.log('Expected: COIL_WATCHER');
console.log('✅ PASS:', coilRegime === 'COIL_WATCHER' ? 'YES' : 'NO');

// Test Case 3: SHAKEOUT condition that should PASS
console.log('\n📊 Test Case 3: SHAKEOUT Condition (Should PASS)');
const shakeoutTest = {
  price: 3500,
  dlsScore: 85,  // Above threshold of 80
  pressure: 1.0000005,  // Below threshold of 1.000001
  momentum: -0.15  // Below threshold of -0.1
};

console.log('Input:', shakeoutTest);
const shakeoutResult = classifier.classifyMarketCondition(shakeoutTest);
const shakeoutRegime = shakeoutResult?.regime || shakeoutResult?.type;
console.log('Result:', shakeoutRegime);
console.log('Expected: SHAKEOUT_DETECTOR');
console.log('✅ PASS:', shakeoutRegime === 'SHAKEOUT_DETECTOR' ? 'YES' : 'NO');

// Test Case 4: Edge case - slightly above threshold
console.log('\n📊 Test Case 4: Edge Case - Slightly above CASCADE threshold');
const edgeTest = {
  price: 3500,
  dlsScore: 26,  // Slightly above threshold of 25
  pressure: 1.000011,  // Slightly above threshold of 1.00001
  momentum: -0.051  // Slightly below threshold of -0.05
};

console.log('Input:', edgeTest);
const edgeResult = classifier.classifyMarketCondition(edgeTest);
const edgeRegime = edgeResult?.regime || edgeResult?.type;
console.log('Result:', edgeRegime);
console.log('Expected: CASCADE_HUNTER');
console.log('✅ PASS:', edgeRegime === 'CASCADE_HUNTER' ? 'YES' : 'NO');
if (edgeResult) {
  console.log('Debug:', edgeResult.diagnosticLog?.classifierOutput);
} else {
  console.log('Debug: Result is null - no regime detected');
}

// Summary
console.log('\n' + '=' .repeat(60));
console.log('🎯 RED TEAM MANDATE 1: CLASSIFIER LOGIC FIX VALIDATION');

const allTests = [
  (cascadeResult?.regime || cascadeResult?.type) === 'CASCADE_HUNTER',
  (coilResult?.regime || coilResult?.type) === 'COIL_WATCHER',
  (shakeoutResult?.regime || shakeoutResult?.type) === 'SHAKEOUT_DETECTOR',
  (edgeResult?.regime || edgeResult?.type) === 'CASCADE_HUNTER'
];

const passedTests = allTests.filter(Boolean).length;
const totalTests = allTests.length;

console.log(`📈 Tests Passed: ${passedTests}/${totalTests}`);
console.log(`🔥 Classifier Status: ${passedTests === totalTests ? 'FIXED' : 'STILL BROKEN'}`);

if (passedTests === totalTests) {
  console.log('✅ SUCCESS: Floating-point precision bug fixed - classifier fires correctly');
} else {
  console.log('❌ FAILURE: Classifier logic still broken - requires further investigation');
}
