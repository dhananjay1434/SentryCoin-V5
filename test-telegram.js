#!/usr/bin/env node

/**
 * Telegram Configuration Test Script
 * 
 * Tests if Telegram bot configuration is working correctly
 */

import FlashCrashAlerter from './src/alerter.js';
import dotenv from 'dotenv';

dotenv.config();

async function testTelegramConfiguration() {
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
    console.log('3. Or update your .env file');
    process.exit(1);
  }
  
  // Test alerter initialization
  console.log('🚀 Initializing Flash Crash Alerter...');
  const alerter = new FlashCrashAlerter();
  
  // Send test alert
  console.log('📤 Sending test alert...');
  try {
    const success = await alerter.sendTestAlert();
    
    if (success) {
      console.log('\n🎉 SUCCESS! Telegram configuration is working correctly');
      console.log('✅ You should have received a test message in Telegram');
    } else {
      console.log('\n❌ FAILED! Test alert could not be sent');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
  
  // Test a sample Trifecta alert
  console.log('\n📊 Testing Trifecta Conviction Alert...');
  try {
    const sampleAlert = {
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
    
    const success = await alerter.triggerFlashCrashAlert(sampleAlert);
    
    if (success) {
      console.log('✅ Trifecta alert sent successfully!');
      console.log('🎯 You should have received a Trifecta Conviction alert in Telegram');
    } else {
      console.log('❌ Failed to send Trifecta alert');
    }
  } catch (error) {
    console.error('❌ ERROR sending Trifecta alert:', error.message);
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
testTelegramConfiguration().catch(console.error);
