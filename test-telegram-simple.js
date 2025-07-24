#!/usr/bin/env node

/**
 * Simple Telegram Test Script
 * 
 * Tests if Telegram bot configuration is working correctly
 * This is a minimal test that can run in any environment
 */

import FlashCrashAlerter from './src/alerter.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTelegramSimple() {
  console.log('🧪 Testing Telegram Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`   TELEGRAM_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log('');
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error('❌ Missing required environment variables');
    console.log('\n💡 To fix this:');
    console.log('1. Set TELEGRAM_BOT_TOKEN in your environment');
    console.log('2. Set TELEGRAM_CHAT_ID in your environment');
    console.log('3. For Azure: Set these in the App Service Configuration');
    console.log('4. For Render: Set these in the Environment Variables section');
    return false;
  }
  
  // Test alerter initialization
  console.log('🚀 Initializing Flash Crash Alerter...');
  const alerter = new FlashCrashAlerter();
  
  // Send test Trifecta alert
  console.log('📤 Sending test Trifecta Conviction alert...');
  try {
    const testAlert = {
      symbol: 'SPKUSDT',
      currentPrice: 0.139879,
      askToBidRatio: 3.54,
      totalBidVolume: 98064,
      totalAskVolume: 347000,
      momentum: -3.08,
      alertType: 'TRIFECTA_CONVICTION',
      confidence: 'VERY_HIGH',
      premiumSignal: true,
      tradingAction: 'SHORT_RECOMMENDED'
    };
    
    const success = await alerter.triggerFlashCrashAlert(testAlert);
    
    if (success) {
      console.log('\n🎉 SUCCESS! Telegram alert sent successfully!');
      console.log('✅ You should have received a Trifecta Conviction alert in Telegram');
      console.log('📱 Check your Telegram for the alert message');
      return true;
    } else {
      console.log('\n❌ FAILED! Test alert could not be sent');
      return false;
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return false;
  }
}

// Run the test
testTelegramSimple()
  .then(success => {
    if (success) {
      console.log('\n✅ Telegram configuration is working correctly!');
      console.log('🎯 SentryCoin v4.0 will now send alerts for all Trifecta signals');
    } else {
      console.log('\n❌ Telegram configuration needs to be fixed');
      console.log('📋 Please check the troubleshooting steps above');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test failed with error:', error.message);
    process.exit(1);
  });
