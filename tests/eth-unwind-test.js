#!/usr/bin/env node

/**
 * SentryCoin v5.0 - ETH_UNWIND Strategy Test
 * 
 * Tests the ETH_UNWIND macro strategy with realistic market scenarios
 */

import EthUnwindStrategy from '../src/strategies/eth-unwind.js';
import DerivativesMonitor from '../src/services/derivatives-monitor.js';
import OnChainMonitorV2 from '../src/services/onchain-monitor-v2.js';

async function testEthUnwindStrategy() {
  console.log('🎯 ETH_UNWIND Strategy - Comprehensive Test\n');

  const config = {
    enabled: true,
    symbol: 'ETHUSDT',
    supportLevel: 3600,
    resistanceLevel: 3850,
    takeProfit1: 3000,
    takeProfit2: 2800,
    oiThreshold: 24000000000,
    fundingRateSpike: 0.018,
    elrDangerZone: 0.90,
    exchangeInflowThreshold: 50000,
    maxPositionSize: 10000,
    stopLossPercent: 7.0,
    cooldownHours: 12
  };

  let testsPassed = 0;
  let totalTests = 0;

  try {
    console.log('1. Testing Strategy Initialization...');
    totalTests++;
    
    const strategy = new EthUnwindStrategy(config);
    
    if (strategy.state === 'MONITORING' && strategy.symbol === 'ETHUSDT') {
      console.log('   ✅ Strategy initialized correctly');
      testsPassed++;
    } else {
      console.log('   ❌ Strategy initialization failed');
    }

    console.log('\n2. Testing Trigger System...');
    totalTests++;
    
    // Test derivatives trigger
    const derivativesData = {
      openInterest: { ath: true, total: 25000000000 },
      fundingRates: { spike: true, average: 0.02 },
      leverageMetrics: { estimatedLeverageRatio: 0.92 }
    };
    
    const derivativesEval = strategy.triggers.evaluateDerivatives(derivativesData);
    
    if (derivativesEval.triggered && derivativesEval.triggerCount === 3) {
      console.log('   ✅ Derivatives triggers working correctly');
      console.log(`      Evidence: ${derivativesEval.evidence}`);
      testsPassed++;
    } else {
      console.log('   ❌ Derivatives triggers failed');
    }

    console.log('\n3. Testing State Machine...');
    totalTests++;
    
    // Simulate market data with 2/3 triggers
    const marketData = {
      price: 3650,
      derivativesData: derivativesData,
      onChainData: {
        exchangeFlows: { inflowSpike: true, netFlow24h: 60000 },
        supplyMetrics: { isInflationary: true }
      }
    };
    
    strategy.processMarketData(marketData);
    
    if (strategy.state === 'ARMED') {
      console.log('   ✅ State machine transitioned to ARMED');
      testsPassed++;
    } else {
      console.log(`   ❌ State machine failed - current state: ${strategy.state}`);
    }

    console.log('\n4. Testing Position Entry...');
    totalTests++;
    
    // Simulate technical trigger (support break)
    marketData.price = 3590; // Below support level
    strategy.processMarketData(marketData);
    
    if (strategy.state === 'ENGAGED' && strategy.position) {
      console.log('   ✅ Position entered successfully');
      console.log(`      Entry Price: $${strategy.entryPrice}`);
      console.log(`      Stop Loss: $${strategy.stopLossPrice}`);
      console.log(`      Target 1: $${strategy.targetPrices.tp1}`);
      testsPassed++;
    } else {
      console.log('   ❌ Position entry failed');
    }

    console.log('\n5. Testing Position Management...');
    totalTests++;
    
    // Test profit scenario
    marketData.price = 3100; // Near TP1
    strategy.processMarketData(marketData);
    
    // Test stop loss scenario
    marketData.price = 3900; // Above stop loss
    strategy.processMarketData(marketData);
    
    if (strategy.state === 'COOLDOWN') {
      console.log('   ✅ Position management working');
      console.log('   📊 Position closed due to stop loss');
      testsPassed++;
    } else {
      console.log('   ❌ Position management failed');
    }

    console.log('\n6. Testing Performance Tracking...');
    totalTests++;
    
    const stats = strategy.getStats();
    
    if (stats.state && stats.winRate !== undefined && stats.totalPnL !== undefined) {
      console.log('   ✅ Performance tracking working');
      console.log(`      State: ${stats.state}`);
      console.log(`      Positions Opened: ${stats.positionsOpened}`);
      console.log(`      Positions Closed: ${stats.positionsClosed}`);
      testsPassed++;
    } else {
      console.log('   ❌ Performance tracking failed');
    }

    await strategy.shutdown();

  } catch (error) {
    console.error(`❌ ETH_UNWIND test failed: ${error.message}`);
    console.error(error.stack);
  }

  // Results
  console.log('\n📊 ETH_UNWIND Test Results:');
  console.log('============================');
  console.log(`✅ Passed: ${testsPassed}/${totalTests} (${((testsPassed/totalTests)*100).toFixed(1)}%)`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉 ETH_UNWIND Strategy Test PASSED!');
    console.log('🎯 Macro strategy logic operational');
    console.log('📊 State machine functioning correctly');
    console.log('💰 Position management working');
    console.log('📈 Performance tracking active');
    return true;
  } else {
    console.log('\n⚠️ ETH_UNWIND Strategy Test FAILED');
    console.log('🔧 Please review the failed components');
    return false;
  }
}

// Test derivatives monitor integration
async function testDerivativesIntegration() {
  console.log('\n📊 Testing Derivatives Monitor Integration...\n');

  const config = {
    enabled: true,
    updateInterval: 300000,
    symbol: 'ETHUSDT'
  };

  let testsPassed = 0;
  let totalTests = 0;

  try {
    console.log('1. Testing Derivatives Monitor...');
    totalTests++;
    
    const monitor = new DerivativesMonitor(config);
    const data = monitor.getData();
    
    if (data.openInterest && data.fundingRates && data.leverageMetrics) {
      console.log('   ✅ Derivatives Monitor initialized');
      testsPassed++;
    } else {
      console.log('   ❌ Derivatives Monitor failed');
    }

    console.log('\n2. Testing Alert Generation...');
    totalTests++;
    
    // Simulate OI ATH
    data.updateOpenInterest({ total: 25000000000 });
    
    if (data.alerts.length > 0) {
      console.log('   ✅ Alert generation working');
      console.log(`      Alert: ${data.alerts[0].message}`);
      testsPassed++;
    } else {
      console.log('   ❌ Alert generation failed');
    }

    monitor.stop();

  } catch (error) {
    console.error(`❌ Derivatives integration test failed: ${error.message}`);
  }

  console.log('\n📊 Derivatives Integration Results:');
  console.log(`✅ Passed: ${testsPassed}/${totalTests} (${((testsPassed/totalTests)*100).toFixed(1)}%)`);
  
  return testsPassed === totalTests;
}

// Run all tests
async function runAllTests() {
  console.log('🛡️ SentryCoin v5.0 - ETH_UNWIND Comprehensive Test Suite\n');
  
  const strategyTest = await testEthUnwindStrategy();
  const derivativesTest = await testDerivativesIntegration();
  
  console.log('\n🎯 Final Test Summary:');
  console.log('======================');
  
  if (strategyTest && derivativesTest) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('🛡️ ETH_UNWIND strategy is ready for deployment');
    console.log('📊 Derivatives integration functional');
    console.log('🎯 Macro trading capabilities operational');
    return true;
  } else {
    console.log('⚠️ SOME TESTS FAILED');
    console.log('🔧 Please review failed components before deployment');
    return false;
  }
}

// Execute tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
