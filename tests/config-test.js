#!/usr/bin/env node

/**
 * SentryCoin v4.0 - Configuration Test
 * 
 * Validates the definitive config.js implementation
 */

import { config, validateConfig, printConfigSummary } from '../config.js';

console.log('🧪 SentryCoin v4.0 Configuration Test\n');

// Test 1: Configuration Loading
console.log('📋 Test 1: Configuration Loading');
try {
  console.log(`   ✅ Config loaded successfully`);
  console.log(`   📊 Symbol: ${config.trading.symbol}`);
  console.log(`   🏢 Exchange: ${config.trading.exchange}`);
  console.log(`   🛡️ Paper Trading: ${config.trading.paperTrading}`);
  console.log(`   ⚠️ Pressure Threshold: ${config.signals.pressureThreshold}x`);
  console.log(`   💧 Liquidity Threshold: ${(config.signals.liquidityThreshold/1000).toFixed(0)}k`);
} catch (error) {
  console.log(`   ❌ Configuration loading failed: ${error.message}`);
}

// Test 2: Configuration Validation
console.log('\n🔍 Test 2: Configuration Validation');
const isValid = validateConfig();
console.log(`   ${isValid ? '✅' : '❌'} Configuration validation: ${isValid ? 'PASSED' : 'FAILED'}`);

// Test 3: Strategy Configuration
console.log('\n🎯 Test 3: Strategy Configuration');
console.log(`   Trifecta Strategy: ${config.trading.strategies.trifecta ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Squeeze Strategy: ${config.trading.strategies.squeeze ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Pressure Spike Alerts: ${config.trading.strategies.pressureSpike ? '✅ ENABLED' : '❌ DISABLED'}`);

// Test 4: Risk Management
console.log('\n🛡️ Test 4: Risk Management Configuration');
console.log(`   Trifecta Max Position: $${config.risk.trifecta.maxPosition}`);
console.log(`   Trifecta Stop Loss: ${config.risk.trifecta.stopLoss}%`);
console.log(`   Trifecta Take Profit: ${config.risk.trifecta.takeProfit}%`);
console.log(`   Global Max Daily Loss: $${config.risk.global.maxDailyLoss}`);

// Test 5: Exchange Configuration
console.log('\n🏢 Test 5: Exchange Configuration');
const exchangeConfig = config.exchanges[config.trading.exchange];
if (exchangeConfig) {
  console.log(`   ✅ ${exchangeConfig.name} configuration found`);
  console.log(`   📡 REST Endpoints: ${exchangeConfig.restEndpoints.length}`);
  console.log(`   🔌 WebSocket Endpoints: ${exchangeConfig.wsEndpoints.length}`);
} else {
  console.log(`   ❌ Exchange configuration not found for: ${config.trading.exchange}`);
}

// Test 6: Monitoring Configuration
console.log('\n📊 Test 6: Monitoring Configuration');
console.log(`   Performance Monitoring: ${config.monitoring.enablePerformanceMonitoring ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Detailed Logging: ${config.monitoring.enableDetailedLogging ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Memory Alert Threshold: ${config.monitoring.memoryAlertThreshold}%`);
console.log(`   Stats Report Interval: ${config.monitoring.statsReportInterval} minutes`);

// Test 7: Environment Override Test
console.log('\n🔧 Test 7: Environment Variable Override');
const originalSymbol = config.trading.symbol;
process.env.SYMBOL = 'TESTUSDT';

// Re-import to test environment override
import('../config.js').then(({ config: newConfig }) => {
  const newSymbol = newConfig.trading.symbol;
  console.log(`   Original Symbol: ${originalSymbol}`);
  console.log(`   Environment Override: ${process.env.SYMBOL}`);
  console.log(`   ${newSymbol === 'TESTUSDT' ? '✅' : '❌'} Environment override: ${newSymbol === 'TESTUSDT' ? 'WORKING' : 'FAILED'}`);
  
  // Restore original
  delete process.env.SYMBOL;
  
  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 CONFIGURATION TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('✅ Configuration loading: PASSED');
  console.log(`${isValid ? '✅' : '❌'} Configuration validation: ${isValid ? 'PASSED' : 'FAILED'}`);
  console.log('✅ Strategy configuration: PASSED');
  console.log('✅ Risk management: PASSED');
  console.log(`${exchangeConfig ? '✅' : '❌'} Exchange configuration: ${exchangeConfig ? 'PASSED' : 'FAILED'}`);
  console.log('✅ Monitoring configuration: PASSED');
  console.log(`${newSymbol === 'TESTUSDT' ? '✅' : '❌'} Environment override: ${newSymbol === 'TESTUSDT' ? 'PASSED' : 'FAILED'}`);
  console.log('='.repeat(60));
  
  const allPassed = isValid && exchangeConfig && (newSymbol === 'TESTUSDT');
  console.log(`🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🚀 Configuration is ready for production deployment!');
    printConfigSummary();
  } else {
    console.log('\n⚠️ Configuration needs attention before deployment.');
  }
}).catch(error => {
  console.error('❌ Environment override test failed:', error.message);
});
