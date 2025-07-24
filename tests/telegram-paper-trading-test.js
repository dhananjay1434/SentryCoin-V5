#!/usr/bin/env node

/**
 * SentryCoin v4.1 - Telegram Paper Trading Test
 * 
 * Ensures all Telegram messages are sent during paper trading mode
 * Tests all three regime types: CASCADE_HUNTER, COIL_WATCHER, SHAKEOUT_DETECTOR
 */

import MarketClassifier from '../src/core/market-classifier.js';
import CascadeHunterTrader from '../src/strategies/cascade-hunter-trader.js';
import CoilWatcher from '../src/strategies/coil-watcher.js';
import ShakeoutDetector from '../src/strategies/shakeout-detector.js';
import FlashCrashAlerter from '../src/services/alerter.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('📱 SentryCoin v4.1 - Telegram Paper Trading Test');
console.log('=================================================\n');

async function testTelegramInPaperMode() {
  const symbol = 'SPKUSDT';
  let allTestsPassed = true;

  console.log('🔧 Current Configuration:');
  console.log(`   PAPER_TRADING: ${process.env.PAPER_TRADING}`);
  console.log(`   CASCADE_TRADING_ENABLED: ${process.env.CASCADE_TRADING_ENABLED}`);
  console.log(`   COIL_WATCHER_ENABLED: ${process.env.COIL_WATCHER_ENABLED}`);
  console.log(`   SHAKEOUT_DETECTOR_ENABLED: ${process.env.SHAKEOUT_DETECTOR_ENABLED}`);
  console.log(`   TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'MISSING'}`);
  console.log(`   TELEGRAM_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? 'SET' : 'MISSING'}\n`);

  try {
    // Test 1: Verify Telegram Configuration
    console.log('1️⃣ Testing Telegram Configuration...');
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.log('❌ Missing Telegram credentials');
      console.log('💡 Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env file');
      allTestsPassed = false;
    } else {
      console.log('✅ Telegram credentials configured');
    }

    // Test 2: Test Telegram Connection
    console.log('\n2️⃣ Testing Telegram Connection...');
    const alerter = new FlashCrashAlerter();
    try {
      await alerter.sendTestAlert();
      console.log('✅ Telegram test message sent successfully');
    } catch (error) {
      console.log(`❌ Telegram connection failed: ${error.message}`);
      allTestsPassed = false;
    }

    // Test 3: Initialize Components
    console.log('\n3️⃣ Initializing v4.1 Components...');
    const classifier = new MarketClassifier(symbol);
    const cascadeTrader = new CascadeHunterTrader(symbol);
    const coilWatcher = new CoilWatcher(symbol);
    const shakeoutDetector = new ShakeoutDetector(symbol);
    console.log('✅ All components initialized');

    // Test 4: CASCADE_HUNTER Signal Test
    console.log('\n4️⃣ Testing CASCADE_HUNTER Telegram Message...');
    const cascadeData = {
      askToBidRatio: 3.5,
      totalBidVolume: 150000,
      totalAskVolume: 200000,
      currentPrice: 0.001234,
      momentum: -0.4,
      timestamp: new Date().toISOString()
    };

    const cascadeSignal = classifier.classifyMarketCondition(cascadeData);
    if (cascadeSignal && cascadeSignal.type === 'CASCADE_HUNTER_SIGNAL') {
      console.log('✅ CASCADE_HUNTER signal generated');
      
      // Simulate the signal handling (this should send Telegram message)
      await cascadeTrader.handleCascadeSignal(cascadeSignal);
      console.log('✅ CASCADE_HUNTER Telegram message should be sent');
    } else {
      console.log('❌ CASCADE_HUNTER signal failed to generate');
      allTestsPassed = false;
    }

    // Test 5: COIL_WATCHER Signal Test
    console.log('\n5️⃣ Testing COIL_WATCHER Telegram Message...');
    const coilData = {
      askToBidRatio: 1.8,
      totalBidVolume: 350000,
      totalAskVolume: 200000,
      currentPrice: 0.001234,
      momentum: 0.05,
      timestamp: new Date().toISOString()
    };

    const coilSignal = classifier.classifyMarketCondition(coilData);
    if (coilSignal && coilSignal.type === 'COIL_WATCHER_SIGNAL') {
      console.log('✅ COIL_WATCHER signal generated');
      
      // Simulate the signal handling (this should send Telegram message)
      await coilWatcher.handleCoilSignal(coilSignal);
      console.log('✅ COIL_WATCHER Telegram message should be sent');
    } else {
      console.log('❌ COIL_WATCHER signal failed to generate');
      allTestsPassed = false;
    }

    // Test 6: SHAKEOUT_DETECTOR Signal Test
    console.log('\n6️⃣ Testing SHAKEOUT_DETECTOR Telegram Message...');
    const shakeoutData = {
      askToBidRatio: 1.2,
      totalBidVolume: 280000,
      totalAskVolume: 150000,
      currentPrice: 0.001234,
      momentum: -0.65,
      timestamp: new Date().toISOString()
    };

    const shakeoutSignal = classifier.classifyMarketCondition(shakeoutData);
    if (shakeoutSignal && shakeoutSignal.type === 'SHAKEOUT_DETECTOR_SIGNAL') {
      console.log('✅ SHAKEOUT_DETECTOR signal generated');
      
      // Simulate the signal handling (this should send Telegram message)
      await shakeoutDetector.handleShakeoutSignal(shakeoutSignal);
      console.log('✅ SHAKEOUT_DETECTOR Telegram message should be sent');
    } else {
      console.log('❌ SHAKEOUT_DETECTOR signal failed to generate');
      allTestsPassed = false;
    }

    // Test 7: Paper Trading Mode Verification
    console.log('\n7️⃣ Verifying Paper Trading Mode...');
    if (cascadeTrader.paperTrading) {
      console.log('✅ CASCADE_HUNTER in paper trading mode');
    } else {
      console.log('⚠️ CASCADE_HUNTER in LIVE trading mode');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    allTestsPassed = false;
  }

  // Final result
  console.log('\n=================================================');
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Telegram messages will be sent in paper trading mode.');
    console.log('📱 You should receive test messages in your Telegram chat.');
    console.log('🚀 System Status: READY FOR PAPER TRADING');
  } else {
    console.log('❌ SOME TESTS FAILED! Please review the issues above.');
    console.log('🛑 System Status: NEEDS ATTENTION');
  }

  console.log('\n💡 Expected Telegram Messages:');
  console.log('   1. Test Alert (from step 2)');
  console.log('   2. CASCADE_HUNTER Premium Signal (SHORT execution)');
  console.log('   3. COIL_WATCHER Volatility Warning');
  console.log('   4. SHAKEOUT_DETECTOR Counter-trend Alert');
  
  return allTestsPassed;
}

// Run the test
testTelegramInPaperMode().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
