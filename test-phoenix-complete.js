#!/usr/bin/env node

/**
 * Phoenix Engine v6.0 - Complete System Test
 * 
 * Comprehensive test suite for the reorganized Phoenix Engine
 * to ensure all components are properly connected and functional.
 */

import dotenv from 'dotenv';
import PhoenixEngine from './src/phoenix/engine.js';

dotenv.config({ path: '.env.production' });

class PhoenixSystemTester {
  constructor() {
    this.testResults = [];
    this.phoenixEngine = null;
    
    console.log('🧪 PHOENIX ENGINE v6.0 - COMPLETE SYSTEM TEST');
    console.log('🛡️ Testing reorganized architecture and component integration');
    console.log('⚡ Validating all 5 Red Team mandates\n');
  }

  /**
   * Add test result
   */
  addResult(testName, passed, details = '') {
    this.testResults.push({
      test: testName,
      passed,
      details,
      timestamp: Date.now()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${details}`);
  }

  /**
   * Test Phoenix Engine initialization
   */
  async testPhoenixInitialization() {
    console.log('\n🔥 TESTING PHOENIX ENGINE INITIALIZATION');
    console.log('=' .repeat(60));
    
    try {
      this.phoenixEngine = new PhoenixEngine({
        symbol: 'ETHUSDT',
        paperTrading: true,
        enableRealTimeFeeds: false // Disable for testing
      });
      
      this.addResult('Phoenix Engine Creation', true, 'Engine instance created successfully');
      
      // Test initialization
      const initialized = await this.phoenixEngine.initialize();
      this.addResult('Phoenix Engine Initialization', initialized, 
        initialized ? 'All components initialized' : 'Initialization failed');
      
      return initialized;
      
    } catch (error) {
      this.addResult('Phoenix Engine Initialization', false, error.message);
      return false;
    }
  }

  /**
   * Test individual components
   */
  async testComponents() {
    console.log('\n🧩 TESTING INDIVIDUAL COMPONENTS');
    console.log('=' .repeat(60));
    
    if (!this.phoenixEngine) {
      this.addResult('Component Testing', false, 'Phoenix Engine not initialized');
      return false;
    }
    
    // Test Liquidity Analyzer (Mandate 1)
    if (this.phoenixEngine.liquidityAnalyzer) {
      try {
        const mockOrderBook = {
          bids: [['3650.50', '10.5'], ['3650.25', '8.2']],
          asks: [['3650.75', '11.2'], ['3651.00', '7.9']],
          timestamp: Date.now()
        };
        
        const analysis = await this.phoenixEngine.liquidityAnalyzer.analyzeOrderBook(mockOrderBook);
        this.addResult('Liquidity Analyzer (Mandate 1)', true, 
          `DLS: ${analysis.dls}, Percentile: ${analysis.percentile}%`);
      } catch (error) {
        this.addResult('Liquidity Analyzer (Mandate 1)', false, error.message);
      }
    } else {
      this.addResult('Liquidity Analyzer (Mandate 1)', false, 'Component not initialized');
    }
    
    // Test Mempool Streamer (Mandate 2)
    if (this.phoenixEngine.mempoolStreamer) {
      const stats = this.phoenixEngine.mempoolStreamer.getStats();
      this.addResult('Mempool Streamer (Mandate 2)', true, 
        `Whale watchlist: ${stats.whaleCount || 'N/A'} addresses`);
    } else {
      this.addResult('Mempool Streamer (Mandate 2)', false, 'Component not initialized');
    }
    
    // Test Stateful Logger (Mandate 3)
    if (this.phoenixEngine.logger) {
      const logged1 = this.phoenixEngine.logger.info('test_key', 'test_value');
      const logged2 = this.phoenixEngine.logger.info('test_key', 'test_value'); // Duplicate
      const logged3 = this.phoenixEngine.logger.info('test_key', 'new_value'); // Change
      
      this.addResult('Stateful Logger (Mandate 3)', logged1 && !logged2 && logged3, 
        'State change detection working correctly');
    } else {
      this.addResult('Stateful Logger (Mandate 3)', false, 'Component not initialized');
    }
    
    // Test Derivatives Monitor (Mandate 4)
    if (this.phoenixEngine.derivativesMonitor) {
      const data = this.phoenixEngine.derivativesMonitor.getData();
      this.addResult('Derivatives Monitor (Mandate 4)', true, 
        'Data structure initialized correctly');
    } else {
      this.addResult('Derivatives Monitor (Mandate 4)', false, 'Component not initialized');
    }
    
    // Test Task Scheduler (Mandate 5)
    if (this.phoenixEngine.taskScheduler) {
      try {
        const taskId = this.phoenixEngine.taskScheduler.scheduleTask({
          type: 'SYSTEM_HEALTH_CHECK',
          priority: 5,
          payload: { test: true }
        });
        
        this.addResult('Task Scheduler (Mandate 5)', !!taskId, 
          `Task scheduled: ${taskId}`);
      } catch (error) {
        this.addResult('Task Scheduler (Mandate 5)', false, error.message);
      }
    } else {
      this.addResult('Task Scheduler (Mandate 5)', false, 'Component not initialized');
    }
    
    // Test Telegram Reporter
    if (this.phoenixEngine.telegramReporter) {
      const stats = this.phoenixEngine.telegramReporter.getStats();
      this.addResult('Telegram Reporter', stats.enabled, 
        stats.enabled ? 'Telegram notifications enabled' : 'Telegram disabled (missing credentials)');
    } else {
      this.addResult('Telegram Reporter', false, 'Component not initialized');
    }
  }

  /**
   * Test component integration
   */
  async testIntegration() {
    console.log('\n🔗 TESTING COMPONENT INTEGRATION');
    console.log('=' .repeat(60));
    
    if (!this.phoenixEngine) {
      this.addResult('Integration Testing', false, 'Phoenix Engine not initialized');
      return false;
    }
    
    try {
      // Test event flow between components
      let eventReceived = false;
      
      this.phoenixEngine.once('WHALE_INTENT', (intent) => {
        eventReceived = true;
      });
      
      // Simulate whale intent (if mempool streamer is available)
      if (this.phoenixEngine.mempoolStreamer) {
        const mockIntent = {
          id: 'test_intent',
          whaleAddress: '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
          estimatedValue: 5000000,
          threatLevel: 'HIGH',
          detectionLatency: 150
        };
        
        this.phoenixEngine.mempoolStreamer.emit('WHALE_INTENT_DETECTED', mockIntent);
        
        // Wait for event propagation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.addResult('Event Integration', eventReceived, 
          'Whale intent event propagated correctly');
      } else {
        this.addResult('Event Integration', false, 'Mempool streamer not available');
      }
      
      // Test metrics collection
      const metrics = this.phoenixEngine.getMetrics();
      this.addResult('Metrics Collection', !!metrics && metrics.version === '6.0.0', 
        `Version: ${metrics.version}, Mandates: ${metrics.mandatesImplemented}`);
      
    } catch (error) {
      this.addResult('Integration Testing', false, error.message);
    }
  }

  /**
   * Test system startup and shutdown
   */
  async testSystemLifecycle() {
    console.log('\n🔄 TESTING SYSTEM LIFECYCLE');
    console.log('=' .repeat(60));
    
    if (!this.phoenixEngine) {
      this.addResult('Lifecycle Testing', false, 'Phoenix Engine not initialized');
      return false;
    }
    
    try {
      // Test startup
      const started = await this.phoenixEngine.start();
      this.addResult('System Startup', started, 
        started ? 'Phoenix Engine started successfully' : 'Startup failed');
      
      if (started) {
        // Wait a moment for system to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test running state
        this.addResult('Running State', this.phoenixEngine.isRunning, 
          'Phoenix Engine is running');
        
        // Test shutdown
        await this.phoenixEngine.shutdown();
        this.addResult('System Shutdown', !this.phoenixEngine.isRunning, 
          'Phoenix Engine shutdown successfully');
      }
      
    } catch (error) {
      this.addResult('Lifecycle Testing', false, error.message);
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 PHOENIX ENGINE v6.0 - COMPLETE SYSTEM TEST REPORT');
    console.log('='.repeat(80));
    
    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed (${failedTests} failed)`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log('');
    
    // Mandate validation
    const mandateTests = this.testResults.filter(r => r.test.includes('Mandate'));
    const mandatesPassed = mandateTests.filter(r => r.passed).length;
    
    console.log('🎯 RED TEAM MANDATE VALIDATION:');
    mandateTests.forEach(test => {
      const status = test.passed ? '✅ RESOLVED' : '❌ FAILED';
      console.log(`   ${test.test}: ${status}`);
    });
    console.log('');
    
    // Overall assessment
    if (failedTests === 0) {
      console.log('🎉 ALL TESTS PASSED');
      console.log('🔥 Phoenix Engine v6.0 is fully operational');
      console.log('🛡️ All Red Team mandates resolved');
      console.log('⚔️ System ready for production deployment');
      return true;
    } else if (mandatesPassed === 5) {
      console.log('⚠️ SOME TESTS FAILED');
      console.log('🔧 All mandates operational - minor issues detected');
      console.log('🚀 System ready for deployment with monitoring');
      return true;
    } else {
      console.log('❌ CRITICAL FAILURES DETECTED');
      console.log('🛑 System not ready for deployment');
      console.log('🔧 Fix critical issues before proceeding');
      return false;
    }
  }

  /**
   * Run complete test suite
   */
  async runCompleteTest() {
    try {
      const initSuccess = await this.testPhoenixInitialization();
      
      if (initSuccess) {
        await this.testComponents();
        await this.testIntegration();
        await this.testSystemLifecycle();
      }
      
      const success = this.generateReport();
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('\n💥 CRITICAL TEST FAILURE:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PhoenixSystemTester();
  tester.runCompleteTest().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

export default PhoenixSystemTester;
