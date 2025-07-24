#!/usr/bin/env node

/**
 * SentryCoin v4.5 - Whale Watchlist Intelligence Test
 * 
 * Tests the new whale monitoring system based on top 50 holders analysis
 * Validates threat level assessment and CASCADE_HUNTER integration
 */

import OnChainMonitor from '../src/services/onchain-monitor.js';
import CascadeHunterTrader from '../src/strategies/cascade-hunter-trader.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🐋 SentryCoin v4.5 - Whale Watchlist Intelligence Test');
console.log('=' .repeat(60));

async function testWhaleWatchlistSystem() {
  let allTestsPassed = true;
  const issues = [];

  try {
    console.log('\n1️⃣ Testing Whale Watchlist Configuration...');
    
    // Test 1: Whale watchlist initialization
    const onChainMonitor = new OnChainMonitor({ symbol: 'SPKUSDT' });
    
    if (onChainMonitor.whaleWatchlist.size === 0) {
      issues.push('No whale addresses configured in watchlist');
      allTestsPassed = false;
    } else {
      console.log(`✅ Whale watchlist loaded: ${onChainMonitor.whaleWatchlist.size} addresses`);
      
      // Display configured whale addresses
      let addressIndex = 1;
      for (const address of onChainMonitor.whaleWatchlist) {
        console.log(`   🐋 Whale ${addressIndex}: ${address}`);
        addressIndex++;
      }
    }

    // Test 2: Threat level thresholds
    if (onChainMonitor.whaleDumpThresholdHigh < 500000) {
      issues.push(`HIGH threat threshold too low: ${onChainMonitor.whaleDumpThresholdHigh} (should be ≥500k)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ HIGH threat threshold: ${(onChainMonitor.whaleDumpThresholdHigh/1000).toFixed(0)}k SPK`);
    }

    if (onChainMonitor.whaleDumpThresholdMedium < 3000000) {
      issues.push(`MEDIUM threat threshold too low: ${onChainMonitor.whaleDumpThresholdMedium} (should be ≥3M)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ MEDIUM threat threshold: ${(onChainMonitor.whaleDumpThresholdMedium/1000000).toFixed(1)}M SPK`);
    }

    console.log('\n2️⃣ Testing Threat Level Assessment...');
    
    // Test 3: Default threat level
    const initialThreatLevel = onChainMonitor.getThreatLevel();
    if (initialThreatLevel.level !== 'LOW') {
      issues.push(`Initial threat level should be LOW, got ${initialThreatLevel.level}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Initial threat level: ${initialThreatLevel.level}`);
    }

    // Test 4: Simulate HIGH threat scenario
    const mockHighThreatDump = {
      amount: 600000, // 600k SPK from watchlist
      from: Array.from(onChainMonitor.whaleWatchlist)[0] || '0xtest',
      to: '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance
      timestamp: Date.now(),
      hash: '0xtest123',
      threatLevel: 'HIGH',
      isWatchlistWhale: true,
      source: 'TEST'
    };

    onChainMonitor.recentDumps.push(mockHighThreatDump);
    onChainMonitor.updateThreatLevel();

    const highThreatLevel = onChainMonitor.getThreatLevel();
    if (highThreatLevel.level !== 'HIGH') {
      issues.push(`Expected HIGH threat level after watchlist dump, got ${highThreatLevel.level}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ HIGH threat level correctly detected after watchlist whale dump`);
    }

    console.log('\n3️⃣ Testing CASCADE_HUNTER Integration...');
    
    // Test 5: CASCADE_HUNTER whale threat assessment
    const cascadeTrader = new CascadeHunterTrader('SPKUSDT');
    
    // Test HIGH threat assessment (should allow trade)
    const highThreatAssessment = cascadeTrader.assessWhaleThreat(onChainMonitor);
    if (!highThreatAssessment.allowTrade) {
      issues.push('HIGH threat should allow CASCADE_HUNTER trades');
      allTestsPassed = false;
    } else {
      console.log(`✅ HIGH threat assessment: ${highThreatAssessment.reason}`);
    }

    // Test 6: Reset to LOW threat and test veto
    onChainMonitor.recentDumps = []; // Clear dumps
    onChainMonitor.updateThreatLevel();

    const lowThreatAssessment = cascadeTrader.assessWhaleThreat(onChainMonitor);
    if (lowThreatAssessment.allowTrade) {
      issues.push('LOW threat should VETO CASCADE_HUNTER trades');
      allTestsPassed = false;
    } else {
      console.log(`✅ LOW threat veto: ${lowThreatAssessment.reason}`);
    }

    console.log('\n4️⃣ Testing Exchange Address Detection...');
    
    // Test 7: Exchange address recognition
    const knownExchanges = [
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance 14
      '0x77696bb39917c91a0c3908d577d5e322095425ca', // Gate.io 1
      '0xfe9e8709d3215310075d67e3ed32a380ccf451c8', // Coinbase 6
    ];

    let exchangeDetectionPassed = true;
    for (const exchangeAddress of knownExchanges) {
      if (!onChainMonitor.exchangeAddresses.has(exchangeAddress)) {
        issues.push(`Exchange address not recognized: ${exchangeAddress}`);
        exchangeDetectionPassed = false;
        allTestsPassed = false;
      }
    }

    if (exchangeDetectionPassed) {
      console.log(`✅ Exchange address detection: ${onChainMonitor.exchangeAddresses.size} addresses configured`);
    }

    console.log('\n5️⃣ Testing API Configuration...');
    
    // Test 8: API key availability
    if (!onChainMonitor.etherscanApiKey) {
      issues.push('ETHERSCAN_API_KEY not configured');
      allTestsPassed = false;
    } else {
      console.log(`✅ Etherscan API key configured`);
    }

    // Test 9: Monitoring interval
    if (onChainMonitor.monitoringInterval > 60000) {
      issues.push(`Monitoring interval too slow: ${onChainMonitor.monitoringInterval}ms (should be ≤60s for whale tracking)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Monitoring interval: ${onChainMonitor.monitoringInterval/1000}s`);
    }

    console.log('\n6️⃣ Testing Statistics and Reporting...');
    
    // Test 10: Statistics collection
    const stats = onChainMonitor.getStats();
    const requiredFields = ['threatLevel', 'whaleWatchlistSize', 'recentDumpCount', 'hasHighThreat'];
    
    for (const field of requiredFields) {
      if (!(field in stats)) {
        issues.push(`Missing stats field: ${field}`);
        allTestsPassed = false;
      }
    }

    if (issues.length === 0) {
      console.log(`✅ Statistics collection complete: ${Object.keys(stats).length} fields`);
    }

  } catch (error) {
    console.error(`❌ Test execution failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 ALL WHALE WATCHLIST TESTS PASSED!');
    console.log('✅ Whale intelligence system is ready for deployment');
    console.log('🎯 CASCADE_HUNTER now has predictive whale intelligence');
  } else {
    console.log('❌ WHALE WATCHLIST TESTS FAILED');
    console.log('\n🚨 Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n🔧 Please fix these issues before deployment');
  }
  console.log('='.repeat(60));

  return allTestsPassed;
}

// Run the test
testWhaleWatchlistSystem().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
