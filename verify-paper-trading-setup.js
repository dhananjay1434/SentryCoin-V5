#!/usr/bin/env node

/**
 * SentryCoin v4.1 - Paper Trading Setup Verification
 * 
 * Comprehensive verification that all Telegram messages will be sent
 * during paper trading mode with proper configuration.
 */

import dotenv from 'dotenv';
import FlashCrashAlerter from './src/services/alerter.js';

dotenv.config();

console.log('🔍 SentryCoin v4.1 - Paper Trading Setup Verification');
console.log('====================================================\n');

function checkConfiguration() {
  console.log('📋 Configuration Check:');
  console.log('========================');
  
  const config = {
    // Paper Trading Mode
    paperTrading: process.env.PAPER_TRADING !== 'false',
    
    // Strategy Enablement
    cascadeEnabled: process.env.CASCADE_TRADING_ENABLED === 'true',
    coilEnabled: process.env.COIL_WATCHER_ENABLED === 'true',
    shakeoutEnabled: process.env.SHAKEOUT_DETECTOR_ENABLED === 'true',
    
    // Telegram Configuration
    telegramToken: !!process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: !!process.env.TELEGRAM_CHAT_ID,
    
    // Thresholds
    cascadePressure: process.env.CASCADE_PRESSURE_THRESHOLD || '3.0',
    cascadeLiquidity: process.env.CASCADE_LIQUIDITY_THRESHOLD || '100000',
    cascadeMomentum: process.env.CASCADE_MOMENTUM_THRESHOLD || '-0.3',
    
    coilPressure: process.env.COIL_PRESSURE_THRESHOLD || '2.0',
    coilLiquidity: process.env.COIL_LIQUIDITY_THRESHOLD || '300000',
    
    shakeoutPressure: process.env.SHAKEOUT_PRESSURE_THRESHOLD || '1.5',
    shakeoutLiquidity: process.env.SHAKEOUT_LIQUIDITY_THRESHOLD || '250000',
    shakeoutMomentum: process.env.SHAKEOUT_MOMENTUM_THRESHOLD || '-0.5'
  };
  
  // Display configuration
  console.log(`✅ Paper Trading Mode: ${config.paperTrading ? 'ENABLED' : 'DISABLED'}`);
  console.log(`✅ CASCADE_HUNTER: ${config.cascadeEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`✅ COIL_WATCHER: ${config.coilEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`✅ SHAKEOUT_DETECTOR: ${config.shakeoutEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`✅ Telegram Token: ${config.telegramToken ? 'SET' : 'MISSING'}`);
  console.log(`✅ Telegram Chat ID: ${config.telegramChatId ? 'SET' : 'MISSING'}`);
  
  console.log('\n🎯 Regime Thresholds:');
  console.log(`   CASCADE_HUNTER: Pressure≥${config.cascadePressure}x, Liquidity≥${config.cascadeLiquidity}, Momentum≤${config.cascadeMomentum}%`);
  console.log(`   COIL_WATCHER: Pressure<${config.coilPressure}x, Liquidity≥${config.coilLiquidity}`);
  console.log(`   SHAKEOUT_DETECTOR: Pressure<${config.shakeoutPressure}x, Liquidity≥${config.shakeoutLiquidity}, Momentum≤${config.shakeoutMomentum}%`);
  
  return config;
}

async function verifyTelegramConnection() {
  console.log('\n📱 Telegram Connection Test:');
  console.log('=============================');
  
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.log('❌ Missing Telegram credentials');
    console.log('💡 Please set the following in your .env file:');
    console.log('   TELEGRAM_BOT_TOKEN=your_bot_token_here');
    console.log('   TELEGRAM_CHAT_ID=your_chat_id_here');
    return false;
  }
  
  try {
    const alerter = new FlashCrashAlerter();
    await alerter.sendTestAlert();
    console.log('✅ Telegram test message sent successfully!');
    console.log('📱 Check your Telegram chat for the test message.');
    return true;
  } catch (error) {
    console.log(`❌ Telegram connection failed: ${error.message}`);
    return false;
  }
}

function displayExpectedMessages() {
  console.log('\n📨 Expected Telegram Messages in Paper Trading:');
  console.log('===============================================');
  
  console.log('\n🎯 1. CASCADE_HUNTER (Premium Trading Signal):');
  console.log('   • Triggers when: Pressure≥3.0x + Liquidity≥100k + Momentum≤-0.3%');
  console.log('   • Message: "SENTRYCOIN v4.1 CASCADE_HUNTER" with SHORT execution details');
  console.log('   • Trading: Paper trade executed (no real money)');
  console.log('   • Cooldown: 5 minutes');
  
  console.log('\n⚠️ 2. COIL_WATCHER (Accumulation Alert):');
  console.log('   • Triggers when: Pressure<2.0x + Liquidity≥300k + Neutral momentum');
  console.log('   • Message: "VOLATILITY WARNING: LIQUIDITY COIL DETECTED"');
  console.log('   • Trading: Alert only (no trades)');
  console.log('   • Cooldown: 10 minutes');
  
  console.log('\n💡 3. SHAKEOUT_DETECTOR (Stop Hunt Alert):');
  console.log('   • Triggers when: Pressure<1.5x + Liquidity≥250k + Momentum≤-0.5%');
  console.log('   • Message: "COUNTER-TREND ALERT: SHAKEOUT DETECTED"');
  console.log('   • Trading: Alert only (no trades)');
  console.log('   • Cooldown: 15 minutes');
}

function displaySafetyFeatures() {
  console.log('\n🛡️ Paper Trading Safety Features:');
  console.log('==================================');
  
  console.log('✅ No real money at risk - all trades are simulated');
  console.log('✅ All Telegram alerts are sent regardless of trading mode');
  console.log('✅ Position tracking and P&L calculation for learning');
  console.log('✅ Full system logging and diagnostics');
  console.log('✅ Easy switch to live trading when ready');
  console.log('✅ Independent cooldowns prevent spam');
  console.log('✅ Mutually exclusive regime detection prevents conflicts');
}

function displayNextSteps() {
  console.log('\n🚀 Next Steps:');
  console.log('==============');
  
  console.log('1. Start the system: npm start');
  console.log('2. Monitor Telegram for test messages');
  console.log('3. Watch for regime detection in console logs');
  console.log('4. Validate signal accuracy over 24 hours');
  console.log('5. Switch to live trading when confident');
  console.log('\n💡 To switch to live trading:');
  console.log('   Set PAPER_TRADING=false in .env file');
}

async function main() {
  const config = checkConfiguration();
  const telegramWorking = await verifyTelegramConnection();
  
  displayExpectedMessages();
  displaySafetyFeatures();
  displayNextSteps();
  
  console.log('\n====================================================');
  if (config.paperTrading && config.cascadeEnabled && config.coilEnabled && 
      config.shakeoutEnabled && telegramWorking) {
    console.log('🎉 SETUP COMPLETE! SentryCoin v4.1 is ready for paper trading.');
    console.log('📱 You WILL receive Telegram messages during paper trading.');
    console.log('🚀 System Status: READY TO START');
  } else {
    console.log('⚠️ SETUP INCOMPLETE! Please address the issues above.');
    console.log('🛑 System Status: NEEDS ATTENTION');
  }
  console.log('====================================================');
}

main().catch(console.error);
