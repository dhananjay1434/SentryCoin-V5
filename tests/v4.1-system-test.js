#!/usr/bin/env node

/**
 * SentryCoin v4.1 System Test
 * 
 * Quick verification that all v4.1 components load and initialize correctly
 */

import MarketClassifier from '../src/core/market-classifier.js';
import CascadeHunterTrader from '../src/strategies/cascade-hunter-trader.js';
import CoilWatcher from '../src/strategies/coil-watcher.js';
import ShakeoutDetector from '../src/strategies/shakeout-detector.js';
import SentryCoinEngine from '../src/core/sentrycoin-engine.js';
import DetailedReporter from '../src/reporting/detailed-reporter.js';

console.log('🧪 SentryCoin v4.1 System Test');
console.log('===============================\n');

async function testSystemComponents() {
  const symbol = 'SPKUSDT';
  let allTestsPassed = true;

  try {
    // Test 1: Market Classifier v4.1
    console.log('1️⃣ Testing Market Classifier v4.1...');
    const classifier = new MarketClassifier(symbol);
    
    // Test regime detection with mock data
    const mockMarketData = {
      askToBidRatio: 3.5,
      totalBidVolume: 150000,
      totalAskVolume: 200000,
      currentPrice: 0.001234,
      momentum: -0.4,
      timestamp: new Date().toISOString()
    };
    
    const classification = classifier.classifyMarketCondition(mockMarketData);
    if (classification && classification.type === 'CASCADE_HUNTER_SIGNAL') {
      console.log('✅ CASCADE_HUNTER detection working');
    } else {
      console.log('❌ CASCADE_HUNTER detection failed');
      allTestsPassed = false;
    }

    // Test 2: CASCADE_HUNTER Trader
    console.log('\n2️⃣ Testing CASCADE_HUNTER Trader...');
    const cascadeTrader = new CascadeHunterTrader(symbol);
    console.log('✅ CASCADE_HUNTER Trader initialized');

    // Test 3: COIL_WATCHER
    console.log('\n3️⃣ Testing COIL_WATCHER...');
    const coilWatcher = new CoilWatcher(symbol);
    console.log('✅ COIL_WATCHER initialized');

    // Test 4: SHAKEOUT_DETECTOR
    console.log('\n4️⃣ Testing SHAKEOUT_DETECTOR...');
    const shakeoutDetector = new ShakeoutDetector(symbol);
    console.log('✅ SHAKEOUT_DETECTOR initialized');

    // Test 5: Detailed Reporter v4.1
    console.log('\n5️⃣ Testing Detailed Reporter v4.1...');
    const reporter = new DetailedReporter(symbol);
    const stats = reporter.getReportStats();
    if (stats.sessionId && stats.symbol === symbol) {
      console.log('✅ Detailed Reporter v4.1 working');
    } else {
      console.log('❌ Detailed Reporter v4.1 failed');
      allTestsPassed = false;
    }

    // Test 6: SentryCoin Engine v4.1
    console.log('\n6️⃣ Testing SentryCoin Engine v4.1...');
    const engine = new SentryCoinEngine();
    if (engine.version === '4.1.0') {
      console.log('✅ SentryCoin Engine v4.1 version correct');
    } else {
      console.log(`❌ Version mismatch: expected 4.1.0, got ${engine.version}`);
      allTestsPassed = false;
    }

    // Test 7: Configuration validation
    console.log('\n7️⃣ Testing v4.1 Configuration...');
    const requiredEnvVars = [
      'CASCADE_PRESSURE_THRESHOLD',
      'COIL_LIQUIDITY_THRESHOLD', 
      'SHAKEOUT_MOMENTUM_THRESHOLD'
    ];
    
    let configValid = true;
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.log(`❌ Missing environment variable: ${envVar}`);
        configValid = false;
        allTestsPassed = false;
      }
    }
    
    if (configValid) {
      console.log('✅ v4.1 Configuration valid');
    }

    // Test 8: Event system simulation
    console.log('\n8️⃣ Testing Event System...');
    let eventReceived = false;
    
    classifier.on('CASCADE_HUNTER_SIGNAL', (signal) => {
      eventReceived = true;
      console.log('✅ CASCADE_HUNTER event received');
    });
    
    // Trigger a signal
    classifier.classifyMarketCondition(mockMarketData);
    
    if (!eventReceived) {
      console.log('❌ Event system failed');
      allTestsPassed = false;
    }

  } catch (error) {
    console.error('❌ System test failed with error:', error.message);
    allTestsPassed = false;
  }

  // Final result
  console.log('\n===============================');
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! SentryCoin v4.1 is ready for deployment.');
    console.log('🚀 System Status: OPERATIONAL');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED! Please review the issues above.');
    console.log('🛑 System Status: NEEDS ATTENTION');
    process.exit(1);
  }
}

// Run the test
testSystemComponents().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
