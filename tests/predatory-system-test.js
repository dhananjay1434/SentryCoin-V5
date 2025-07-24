#!/usr/bin/env node

/**
 * SentryCoin v4.6 - Predatory System Intelligence Test
 * 
 * Tests the complete predatory trading system:
 * - 4-state system (PATIENT → HUNTING → STRIKE → DEFENSIVE)
 * - Wash trade detection (13.79x turnover ratio analysis)
 * - Whale watchlist intelligence
 * - CASCADE_HUNTER integration with predatory logic
 */

import OnChainMonitor from '../src/services/onchain-monitor.js';
import WashTradeDetector from '../src/services/wash-trade-detector.js';
import CascadeHunterTrader from '../src/strategies/cascade-hunter-trader.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🎯 SentryCoin v4.6 - Predatory System Intelligence Test');
console.log('=' .repeat(70));

async function testPredatorySystem() {
  let allTestsPassed = true;
  const issues = [];

  try {
    console.log('\n1️⃣ Testing 4-State Predatory System...');
    
    // Test 1: Initialize predatory components
    const onChainMonitor = new OnChainMonitor({ symbol: 'SPKUSDT' });
    const washTradeDetector = new WashTradeDetector({ symbol: 'SPKUSDT' });
    const cascadeTrader = new CascadeHunterTrader('SPKUSDT');
    
    // Test initial state
    const initialState = onChainMonitor.getSystemState();
    if (initialState.state !== 'PATIENT') {
      issues.push(`Initial state should be PATIENT, got ${initialState.state}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Initial state: ${initialState.state}`);
    }

    console.log('\n2️⃣ Testing Wash Trade Detection (13.79x Turnover Analysis)...');
    
    // Test 2: Simulate wash trading patterns
    const mockWashTrades = [
      { price: '0.001000', quantity: '10000.00', id: '1', isBuy: true },  // Round numbers
      { price: '0.001001', quantity: '10000.00', id: '2', isBuy: false }, // Round numbers
      { price: '0.001000', quantity: '5000.00', id: '3', isBuy: true },   // Round numbers
      { price: '0.001002', quantity: '15000.00', id: '4', isBuy: false }, // Round numbers
      { price: '0.001001', quantity: '20000.00', id: '5', isBuy: true },  // Round numbers
    ];

    // Analyze wash trades
    mockWashTrades.forEach(trade => {
      washTradeDetector.analyzeTrade(trade);
    });

    // Force wash score update
    washTradeDetector.updateWashScore();
    
    const washAssessment = washTradeDetector.getWashAssessment();
    if (washAssessment.washScore < 50) {
      issues.push(`Wash score too low for obvious wash trading: ${washAssessment.washScore}%`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Wash trading detected: ${washAssessment.washScore.toFixed(1)}% score`);
    }

    console.log('\n3️⃣ Testing State Transitions (PATIENT → HUNTING)...');
    
    // Test 3: Simulate whale dump to trigger HUNTING mode
    const mockWhaleDump = {
      amount: 3500000, // 3.5M SPK (above threshold)
      from: Array.from(onChainMonitor.whaleWatchlist)[0] || '0xtest',
      to: '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance
      timestamp: Date.now(),
      hash: '0xtest123',
      threatLevel: 'HIGH',
      isWatchlistWhale: true,
      source: 'TEST'
    };

    onChainMonitor.recentDumps.push(mockWhaleDump);
    onChainMonitor.updateSystemState();

    const huntingState = onChainMonitor.getSystemState();
    if (huntingState.state !== 'HUNTING') {
      issues.push(`Expected HUNTING state after whale dump, got ${huntingState.state}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ State transition: PATIENT → HUNTING (${Math.floor(huntingState.huntModeTimeRemaining/60)} min remaining)`);
    }

    console.log('\n4️⃣ Testing CASCADE_HUNTER Predatory Logic...');
    
    // Test 4: Test CASCADE_HUNTER with HUNTING mode (should allow)
    const huntingAssessment = cascadeTrader.assessWhaleThreat(onChainMonitor);
    if (!huntingAssessment.allowTrade) {
      issues.push('HUNTING mode should allow CASCADE_HUNTER trades');
      allTestsPassed = false;
    } else {
      console.log(`✅ HUNTING mode assessment: ${huntingAssessment.reason}`);
    }

    // Test 5: Reset to PATIENT mode and test veto
    onChainMonitor.recentDumps = []; // Clear dumps
    onChainMonitor.updateSystemState();

    const patientAssessment = cascadeTrader.assessWhaleThreat(onChainMonitor);
    if (patientAssessment.allowTrade) {
      issues.push('PATIENT mode should VETO CASCADE_HUNTER trades');
      allTestsPassed = false;
    } else {
      console.log(`✅ PATIENT mode veto: ${patientAssessment.reason}`);
    }

    console.log('\n5️⃣ Testing Wash Trade Veto Logic...');
    
    // Test 6: High wash score should block trades even in HUNTING mode
    onChainMonitor.recentDumps.push(mockWhaleDump); // Re-add whale dump
    onChainMonitor.updateSystemState(); // Back to HUNTING

    // Force high wash score
    washTradeDetector.washScore = 85; // Above threshold

    if (!washTradeDetector.shouldDisableTrading()) {
      issues.push('High wash score should disable trading');
      allTestsPassed = false;
    } else {
      console.log(`✅ Wash trade veto: ${washTradeDetector.washScore}% score blocks trading`);
    }

    console.log('\n6️⃣ Testing Defensive Mode Activation...');
    
    // Test 7: Manual defensive mode
    onChainMonitor.enterDefensiveMode('SHAKEOUT signal detected');
    
    const defensiveState = onChainMonitor.getSystemState();
    if (defensiveState.state !== 'DEFENSIVE') {
      issues.push(`Expected DEFENSIVE state, got ${defensiveState.state}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Defensive mode activated: ${defensiveState.state}`);
    }

    console.log('\n7️⃣ Testing Forensic Intelligence Integration...');
    
    // Test 8: Whale watchlist configuration
    if (onChainMonitor.whaleWatchlist.size === 0) {
      issues.push('No whale addresses configured in watchlist');
      allTestsPassed = false;
    } else {
      console.log(`✅ Whale watchlist: ${onChainMonitor.whaleWatchlist.size} addresses monitored`);
    }

    // Test 9: Exchange address detection
    const testExchanges = [
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance
      '0x77696bb39917c91a0c3908d577d5e322095425ca', // Gate.io
    ];

    let exchangeDetectionPassed = true;
    for (const exchange of testExchanges) {
      if (!onChainMonitor.exchangeAddresses.has(exchange)) {
        issues.push(`Exchange address not detected: ${exchange}`);
        exchangeDetectionPassed = false;
        allTestsPassed = false;
      }
    }

    if (exchangeDetectionPassed) {
      console.log(`✅ Exchange detection: ${onChainMonitor.exchangeAddresses.size} addresses configured`);
    }

    console.log('\n8️⃣ Testing System Statistics and Monitoring...');
    
    // Test 10: Statistics collection
    const systemStats = onChainMonitor.getStats();
    const washStats = washTradeDetector.getStats();
    
    const requiredSystemFields = ['systemState', 'huntModeActive', 'whaleWatchlistSize'];
    const requiredWashFields = ['currentWashScore', 'tradingDisabled', 'totalTradesAnalyzed'];
    
    for (const field of requiredSystemFields) {
      if (!(field in systemStats)) {
        issues.push(`Missing system stats field: ${field}`);
        allTestsPassed = false;
      }
    }

    for (const field of requiredWashFields) {
      if (!(field in washStats)) {
        issues.push(`Missing wash stats field: ${field}`);
        allTestsPassed = false;
      }
    }

    if (issues.length === 0) {
      console.log(`✅ Statistics collection: System (${Object.keys(systemStats).length} fields), Wash (${Object.keys(washStats).length} fields)`);
    }

    console.log('\n9️⃣ Testing Predatory Configuration Values...');
    
    // Test 11: Critical thresholds
    const huntTrigger = onChainMonitor.whaleHuntTriggerThreshold;
    const huntDuration = onChainMonitor.whaleHuntModeDurationHours;
    const washThreshold = washTradeDetector.washScoreThreshold;

    if (huntTrigger < 3000000) {
      issues.push(`Hunt trigger too low: ${huntTrigger} (should be ≥3M)`);
      allTestsPassed = false;
    }

    if (huntDuration < 12) {
      issues.push(`Hunt duration too short: ${huntDuration}h (should be ≥12h)`);
      allTestsPassed = false;
    }

    if (washThreshold < 75) {
      issues.push(`Wash threshold too low: ${washThreshold}% (should be ≥75%)`);
      allTestsPassed = false;
    }

    if (issues.length === 0) {
      console.log(`✅ Predatory thresholds: Hunt=${huntTrigger/1000000}M, Duration=${huntDuration}h, Wash=${washThreshold}%`);
    }

  } catch (error) {
    console.error(`❌ Test execution failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Print results
  console.log('\n' + '='.repeat(70));
  if (allTestsPassed) {
    console.log('🎉 ALL PREDATORY SYSTEM TESTS PASSED!');
    console.log('✅ Predatory intelligence system is ready for deployment');
    console.log('🎯 SentryCoin v4.6 now ignores fake volume and hunts whale movements');
    console.log('🐋 System will only trade when whales show their hand');
    console.log('🚫 Wash trading detection protects against volume manipulation');
  } else {
    console.log('❌ PREDATORY SYSTEM TESTS FAILED');
    console.log('\n🚨 Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n🔧 Please fix these issues before deployment');
  }
  console.log('='.repeat(70));

  return allTestsPassed;
}

// Run the test
testPredatorySystem().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
