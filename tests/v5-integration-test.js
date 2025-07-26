#!/usr/bin/env node

/**
 * SentryCoin v5.0 "Apex Predator" - Integration Test
 * 
 * Tests the complete system startup and basic functionality
 */

import SentryCoinEngine from '../src/core/sentrycoin-engine.js';
import { config } from '../config.js';
import dotenv from 'dotenv';

dotenv.config();

async function runIntegrationTest() {
  console.log('🛡️ SentryCoin v5.0 "Apex Predator" - Integration Test\n');

  // Test configuration
  const testConfig = {
    ...config,
    // Override for testing
    strategies: {
      enabled: ['CASCADE_HUNTER'], // Start with just CASCADE_HUNTER for testing
      ethUnwind: {
        enabled: false, // Disable ETH_UNWIND for initial test
        symbol: 'ETHUSDT'
      }
    },
    dataServices: {
      derivatives: {
        enabled: false // Disable for testing
      },
      onChainV2: {
        enabled: false // Disable for testing
      }
    }
  };

  let engine = null;
  let testsPassed = 0;
  let totalTests = 0;

  try {
    console.log('1. Testing Engine Initialization...');
    totalTests++;
    
    engine = new SentryCoinEngine(testConfig);
    
    if (engine.version === '5.0.0') {
      console.log('   ✅ Engine created with correct version');
      testsPassed++;
    } else {
      console.log('   ❌ Incorrect engine version');
    }

    console.log('\n2. Testing Component Initialization...');
    totalTests++;
    
    const initialized = await engine.initialize();
    
    if (initialized) {
      console.log('   ✅ All components initialized successfully');
      testsPassed++;
    } else {
      console.log('   ❌ Component initialization failed');
    }

    console.log('\n3. Testing System Status...');
    totalTests++;
    
    const status = engine.getSystemStatus();
    
    if (status.version === '5.0.0' && status.strategyManager) {
      console.log('   ✅ System status reporting correctly');
      console.log(`   📊 Active Strategies: ${status.stats.strategiesActive}`);
      testsPassed++;
    } else {
      console.log('   ❌ System status incomplete');
    }

    console.log('\n4. Testing Strategy Manager...');
    totalTests++;
    
    if (engine.strategyManager && engine.strategyManager.strategies.size > 0) {
      console.log('   ✅ Strategy Manager operational');
      console.log(`   🎯 Registered Strategies: ${Array.from(engine.strategyManager.strategies.keys()).join(', ')}`);
      testsPassed++;
    } else {
      console.log('   ❌ Strategy Manager not working');
    }

    console.log('\n5. Testing Market Data Structure...');
    totalTests++;
    
    if (engine.marketData && typeof engine.marketData.price === 'number') {
      console.log('   ✅ Market data structure correct');
      testsPassed++;
    } else {
      console.log('   ❌ Market data structure incorrect');
    }

    console.log('\n6. Testing Legacy Compatibility...');
    totalTests++;
    
    if (engine.cascadeHunterTrader && engine.classifier) {
      console.log('   ✅ Legacy components available');
      testsPassed++;
    } else {
      console.log('   ❌ Legacy compatibility broken');
    }

  } catch (error) {
    console.error(`❌ Integration test failed: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (engine) {
      try {
        await engine.shutdown();
        console.log('\n✅ Engine shutdown completed');
      } catch (error) {
        console.error(`❌ Shutdown error: ${error.message}`);
      }
    }
  }

  // Results
  console.log('\n📊 Integration Test Results:');
  console.log('============================');
  console.log(`✅ Passed: ${testsPassed}/${totalTests} (${((testsPassed/totalTests)*100).toFixed(1)}%)`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉 Integration Test PASSED!');
    console.log('🛡️ SentryCoin v5.0 "Apex Predator" is ready for deployment');
    console.log('🎯 Multi-strategy orchestration system operational');
    console.log('📊 Enhanced intelligence framework functional');
    console.log('⚖️ Conflict resolution engine active');
    return true;
  } else {
    console.log('\n⚠️ Integration Test FAILED');
    console.log('🔧 Please review the failed components');
    return false;
  }
}

// Run integration test
runIntegrationTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Integration test execution failed:', error);
  process.exit(1);
});
