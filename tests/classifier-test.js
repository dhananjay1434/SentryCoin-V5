#!/usr/bin/env node

/**
 * SentryCoin v4.0 - Market Classifier Test Suite
 * 
 * Comprehensive testing of the MarketClassifier logic in isolation
 * Tests all signal conditions and edge cases deterministically
 */

import MarketClassifier from '../src/core/market-classifier.js';

console.log('🧪 SentryCoin v4.0 - Market Classifier Test Suite');
console.log('=' .repeat(60));

// Test configuration (matching production settings)
const testConfig = {
  symbol: 'SPKUSDT',
  pressureThreshold: 3.0,
  liquidityThreshold: 100000,
  strongMomentumThreshold: -0.3,
  weakMomentumThreshold: -0.1
};

const classifier = new MarketClassifier(testConfig.symbol);

// Test counter
let testCount = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Test helper function
 */
function runTest(testName, marketData, expectedResult, expectedType = null) {
  testCount++;
  console.log(`\n🧪 Test ${testCount}: ${testName}`);
  console.log('-'.repeat(50));
  
  try {
    const result = classifier.classifyMarketCondition(marketData);
    
    if (expectedResult === null) {
      // Expecting no signal
      if (result === null) {
        console.log('✅ PASS - No signal generated as expected');
        passedTests++;
      } else {
        console.log(`❌ FAIL - Expected no signal, got: ${result?.type}`);
        failedTests++;
      }
    } else {
      // Expecting a specific signal
      if (result && result.type === expectedType) {
        console.log(`✅ PASS - Generated expected signal: ${result.type}`);
        console.log(`   Confidence: ${result.confidence}, Phenomenon: ${result.phenomenon}`);
        passedTests++;
      } else {
        console.log(`❌ FAIL - Expected ${expectedType}, got: ${result?.type || 'null'}`);
        failedTests++;
      }
    }
  } catch (error) {
    console.log(`❌ ERROR - Test failed with exception: ${error.message}`);
    failedTests++;
  }
}

/**
 * Test Suite Execution
 */
console.log('\n🚀 Starting Market Classifier Tests...\n');

// Test 1: Perfect Trifecta Conditions (SHOULD FIRE)
runTest(
  'Perfect Trifecta Signal',
  {
    askToBidRatio: 4.5,           // Well above 3.0 threshold
    totalBidVolume: 50000,        // Well below 100k threshold
    totalAskVolume: 225000,       // High ask volume
    currentPrice: 0.162,
    momentum: -0.5,               // Well below -0.3% threshold
    symbol: 'SPKUSDT'
  },
  'SIGNAL',
  'TRIFECTA_CONVICTION_SIGNAL'
);

// Test 2: Perfect Absorption Squeeze Conditions (SHOULD FIRE)
runTest(
  'Perfect Absorption Squeeze Signal',
  {
    askToBidRatio: 3.5,           // Above 3.0 threshold
    totalBidVolume: 80000,        // Below 100k threshold
    totalAskVolume: 280000,       // High ask volume
    currentPrice: 0.162,
    momentum: -0.15,              // Between -0.1% and -0.3%
    symbol: 'SPKUSDT'
  },
  'SIGNAL',
  'ABSORPTION_SQUEEZE_SIGNAL'
);

// Test 3: Pressure Too Low (SHOULD NOT FIRE)
runTest(
  'Pressure Below Threshold',
  {
    askToBidRatio: 2.5,           // Below 3.0 threshold
    totalBidVolume: 50000,        // Below 100k threshold
    totalAskVolume: 125000,
    currentPrice: 0.162,
    momentum: -0.5,               // Strong momentum but pressure insufficient
    symbol: 'SPKUSDT'
  },
  null
);

// Test 4: Liquidity Too High (SHOULD NOT FIRE)
runTest(
  'Liquidity Above Threshold',
  {
    askToBidRatio: 4.0,           // Above 3.0 threshold
    totalBidVolume: 150000,       // Above 100k threshold
    totalAskVolume: 600000,
    currentPrice: 0.162,
    momentum: -0.5,               // Strong momentum but liquidity too high
    symbol: 'SPKUSDT'
  },
  null
);

// Test 5: Momentum Too Weak (SHOULD NOT FIRE)
runTest(
  'Momentum Insufficient',
  {
    askToBidRatio: 4.0,           // Above 3.0 threshold
    totalBidVolume: 50000,        // Below 100k threshold
    totalAskVolume: 200000,
    currentPrice: 0.162,
    momentum: -0.05,              // Too weak (above -0.1%)
    symbol: 'SPKUSDT'
  },
  null
);

// Test 6: Edge Case - Exactly at Thresholds
runTest(
  'Exactly at Thresholds',
  {
    askToBidRatio: 3.0,           // Exactly at threshold
    totalBidVolume: 100000,       // Exactly at threshold
    totalAskVolume: 300000,
    currentPrice: 0.162,
    momentum: -0.3,               // Exactly at threshold
    symbol: 'SPKUSDT'
  },
  null  // Should not fire (needs to be > threshold, not =)
);

// Test 7: Just Above Thresholds (SHOULD FIRE)
runTest(
  'Just Above Thresholds',
  {
    askToBidRatio: 3.01,          // Just above threshold
    totalBidVolume: 99999,        // Just below threshold
    totalAskVolume: 300000,
    currentPrice: 0.162,
    momentum: -0.31,              // Just below threshold
    symbol: 'SPKUSDT'
  },
  'SIGNAL',
  'TRIFECTA_CONVICTION_SIGNAL'
);

// Test 8: Extreme Conditions (SHOULD FIRE)
runTest(
  'Extreme Flash Crash Conditions',
  {
    askToBidRatio: 10.0,          // Extreme pressure
    totalBidVolume: 10000,        // Very thin liquidity
    totalAskVolume: 100000,
    currentPrice: 0.162,
    momentum: -2.0,               // Extreme momentum
    symbol: 'SPKUSDT'
  },
  'SIGNAL',
  'TRIFECTA_CONVICTION_SIGNAL'
);

// Test 9: Missing Data (SHOULD HANDLE GRACEFULLY)
runTest(
  'Missing Data Fields',
  {
    askToBidRatio: 4.0,
    totalBidVolume: 50000,
    // Missing totalAskVolume
    currentPrice: 0.162,
    momentum: -0.5,
    symbol: 'SPKUSDT'
  },
  null  // Should handle gracefully
);

// Test 10: Invalid Data (SHOULD HANDLE GRACEFULLY)
runTest(
  'Invalid Data Types',
  {
    askToBidRatio: 'invalid',     // String instead of number
    totalBidVolume: 50000,
    totalAskVolume: 200000,
    currentPrice: 0.162,
    momentum: -0.5,
    symbol: 'SPKUSDT'
  },
  null  // Should handle gracefully
);

// Test Results Summary
console.log('\n' + '='.repeat(60));
console.log('🏁 TEST RESULTS SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${testCount}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📊 Success Rate: ${((passedTests / testCount) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Market Classifier is working correctly.');
  process.exit(0);
} else {
  console.log(`\n⚠️ ${failedTests} test(s) failed. Please review the classifier logic.`);
  process.exit(1);
}
