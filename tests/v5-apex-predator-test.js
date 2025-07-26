#!/usr/bin/env node

/**
 * SentryCoin v5.0 "Apex Predator" - Test Suite
 * 
 * Tests the new multi-strategy orchestration system including:
 * - Strategy Manager functionality
 * - Signal conflict resolution
 * - ETH_UNWIND strategy logic
 * - Derivatives monitoring
 * - Enhanced reporting system
 */

import SentryCoinEngine from '../src/core/sentrycoin-engine.js';
import StrategyManager from '../src/core/strategy-manager.js';
import { StrategySignal, SignalFactory } from '../src/core/strategy-signal.js';
import EthUnwindStrategy from '../src/strategies/eth-unwind.js';
import DerivativesMonitor from '../src/services/derivatives-monitor.js';
import { config } from '../config.js';
import dotenv from 'dotenv';

dotenv.config();

class ApexPredatorTester {
  constructor() {
    this.testResults = [];
    this.testConfig = {
      ...config,
      strategies: {
        enabled: ['CASCADE_HUNTER', 'ETH_UNWIND'],
        ethUnwind: {
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
        }
      },
      dataServices: {
        derivatives: {
          enabled: true,
          updateInterval: 300000,
          symbol: 'ETHUSDT'
        }
      }
    };
  }

  /**
   * Run all v5.0 tests
   */
  async runAllTests() {
    console.log('🛡️ SentryCoin v5.0 "Apex Predator" - Test Suite\n');

    await this.testStrategySignalSystem();
    await this.testStrategyManager();
    await this.testEthUnwindStrategy();
    await this.testDerivativesMonitor();
    await this.testConflictResolution();
    await this.testSentryCoinEngine();

    this.printTestResults();
  }

  /**
   * Test the enhanced Strategy Signal system
   */
  async testStrategySignalSystem() {
    console.log('1. Testing Strategy Signal System v2.0...');
    
    try {
      // Test signal creation
      const signal = new StrategySignal({
        strategyId: 'ETH_UNWIND',
        action: 'ENTER_SHORT',
        confidence: 0.85,
        triggers: ['DERIVATIVES_TRIGGER', 'ONCHAIN_TRIGGER'],
        targetPrice: 3000,
        stopLossPrice: 3850,
        positionSizeFactor: 0.3,
        symbol: 'ETHUSDT',
        currentPrice: 3600,
        reasoning: 'Test signal for ETH_UNWIND strategy'
      });

      // Test signal validation
      if (signal.isActionable() && signal.getStrengthScore() > 0) {
        this.addTestResult('Signal Creation', true, `Signal created with strength score: ${signal.getStrengthScore()}`);
      } else {
        this.addTestResult('Signal Creation', false, 'Signal validation failed');
      }

      // Test signal factory
      const cascadeSignal = SignalFactory.createCascadeSignal({
        confidence: 0.8,
        triggers: ['PRESSURE_SPIKE', 'MOMENTUM_NEGATIVE'],
        targetPrice: 3500,
        stopLossPrice: 3650,
        symbol: 'ETHUSDT',
        currentPrice: 3600,
        reasoning: 'Test CASCADE signal',
        askToBidRatio: 3.2,
        totalBidVolume: 150000,
        momentum: -0.5
      });

      if (cascadeSignal.strategyId === 'CASCADE_HUNTER' && cascadeSignal.action === 'ENTER_SHORT') {
        this.addTestResult('Signal Factory', true, 'CASCADE signal factory working correctly');
      } else {
        this.addTestResult('Signal Factory', false, 'Signal factory failed');
      }

    } catch (error) {
      this.addTestResult('Strategy Signal System', false, error.message);
    }
  }

  /**
   * Test Strategy Manager orchestration
   */
  async testStrategyManager() {
    console.log('2. Testing Strategy Manager...');
    
    try {
      const strategyManager = new StrategyManager(this.testConfig);
      
      // Test strategy registration
      const mockStrategy = {
        on: () => {},
        emit: () => {},
        processMarketData: () => {},
        shutdown: async () => {}
      };
      
      strategyManager.registerStrategy('TEST_STRATEGY', mockStrategy);
      
      if (strategyManager.strategies.has('TEST_STRATEGY')) {
        this.addTestResult('Strategy Registration', true, 'Strategy registered successfully');
      } else {
        this.addTestResult('Strategy Registration', false, 'Strategy registration failed');
      }

      // Test performance summary
      const performance = strategyManager.getPerformanceSummary();
      if (performance.manager && performance.strategies) {
        this.addTestResult('Performance Summary', true, 'Performance tracking working');
      } else {
        this.addTestResult('Performance Summary', false, 'Performance tracking failed');
      }

      await strategyManager.shutdown();

    } catch (error) {
      this.addTestResult('Strategy Manager', false, error.message);
    }
  }

  /**
   * Test ETH_UNWIND strategy
   */
  async testEthUnwindStrategy() {
    console.log('3. Testing ETH_UNWIND Strategy...');
    
    try {
      const ethStrategy = new EthUnwindStrategy(this.testConfig.strategies.ethUnwind);
      
      // Test initial state
      if (ethStrategy.state === 'MONITORING') {
        this.addTestResult('ETH_UNWIND Initial State', true, 'Strategy starts in MONITORING state');
      } else {
        this.addTestResult('ETH_UNWIND Initial State', false, 'Incorrect initial state');
      }

      // Test trigger evaluation
      const mockDerivativesData = {
        openInterest: { ath: true, total: 25000000000 },
        fundingRates: { spike: true, average: 0.02 },
        leverageMetrics: { estimatedLeverageRatio: 0.92 }
      };

      const mockOnChainData = {
        exchangeFlows: { inflowSpike: true, netFlow24h: 60000 },
        supplyMetrics: { isInflationary: true }
      };

      const derivativesEval = ethStrategy.triggers.evaluateDerivatives(mockDerivativesData);
      const onChainEval = ethStrategy.triggers.evaluateOnChain(mockOnChainData);

      if (derivativesEval.triggered && onChainEval.triggered) {
        this.addTestResult('ETH_UNWIND Triggers', true, 'Trigger evaluation working correctly');
      } else {
        this.addTestResult('ETH_UNWIND Triggers', false, 'Trigger evaluation failed');
      }

      // Test statistics
      const stats = ethStrategy.getStats();
      if (stats.state && stats.winRate !== undefined) {
        this.addTestResult('ETH_UNWIND Statistics', true, 'Statistics tracking working');
      } else {
        this.addTestResult('ETH_UNWIND Statistics', false, 'Statistics tracking failed');
      }

      await ethStrategy.shutdown();

    } catch (error) {
      this.addTestResult('ETH_UNWIND Strategy', false, error.message);
    }
  }

  /**
   * Test Derivatives Monitor
   */
  async testDerivativesMonitor() {
    console.log('4. Testing Derivatives Monitor...');
    
    try {
      const derivativesMonitor = new DerivativesMonitor(this.testConfig.dataServices.derivatives);
      
      // Test data structure
      const data = derivativesMonitor.getData();
      if (data.openInterest && data.fundingRates && data.leverageMetrics) {
        this.addTestResult('Derivatives Data Structure', true, 'Data structure correct');
      } else {
        this.addTestResult('Derivatives Data Structure', false, 'Data structure incomplete');
      }

      // Test alert generation
      data.updateOpenInterest({ total: 25000000000 });
      if (data.alerts.length > 0) {
        this.addTestResult('Derivatives Alerts', true, 'Alert generation working');
      } else {
        this.addTestResult('Derivatives Alerts', false, 'Alert generation failed');
      }

      // Test summary
      const summary = data.getSummary();
      if (summary.openInterest && summary.fundingRates && summary.leverage) {
        this.addTestResult('Derivatives Summary', true, 'Summary generation working');
      } else {
        this.addTestResult('Derivatives Summary', false, 'Summary generation failed');
      }

      derivativesMonitor.stop();

    } catch (error) {
      this.addTestResult('Derivatives Monitor', false, error.message);
    }
  }

  /**
   * Test conflict resolution system
   */
  async testConflictResolution() {
    console.log('5. Testing Conflict Resolution...');
    
    try {
      const strategyManager = new StrategyManager(this.testConfig);
      
      // Create conflicting signals
      const signal1 = new StrategySignal({
        strategyId: 'CASCADE_HUNTER',
        action: 'ENTER_SHORT',
        confidence: 0.8,
        priority: 7,
        symbol: 'ETHUSDT',
        currentPrice: 3600,
        positionSizeFactor: 0.2
      });

      const signal2 = new StrategySignal({
        strategyId: 'ETH_UNWIND',
        action: 'ENTER_SHORT',
        confidence: 0.9,
        priority: 10,
        symbol: 'ETHUSDT',
        currentPrice: 3600,
        positionSizeFactor: 0.5
      });

      // Test conflict detection
      const activeSignals = new Map();
      activeSignals.set(signal1.id, signal1);
      
      const conflicts = strategyManager.conflictResolver.findConflicts(signal2, activeSignals);
      
      if (conflicts.length > 0) {
        this.addTestResult('Conflict Detection', true, 'Conflicts detected correctly');
      } else {
        this.addTestResult('Conflict Detection', false, 'Conflict detection failed');
      }

      // Test resolution
      const resolution = await strategyManager.conflictResolver.resolveSignal(signal2, activeSignals);
      
      if (resolution.approved === true) {
        this.addTestResult('Conflict Resolution', true, 'Higher priority signal approved');
      } else {
        this.addTestResult('Conflict Resolution', false, 'Conflict resolution failed');
      }

      await strategyManager.shutdown();

    } catch (error) {
      this.addTestResult('Conflict Resolution', false, error.message);
    }
  }

  /**
   * Test main SentryCoin Engine v5.0
   */
  async testSentryCoinEngine() {
    console.log('6. Testing SentryCoin Engine v5.0...');
    
    try {
      const engine = new SentryCoinEngine(this.testConfig);
      
      // Test version
      if (engine.version === '5.0.0') {
        this.addTestResult('Engine Version', true, 'v5.0.0 version correct');
      } else {
        this.addTestResult('Engine Version', false, `Incorrect version: ${engine.version}`);
      }

      // Test market data structure
      if (engine.marketData && engine.marketData.price !== undefined) {
        this.addTestResult('Market Data Structure', true, 'Market data structure initialized');
      } else {
        this.addTestResult('Market Data Structure', false, 'Market data structure missing');
      }

      // Test system status
      const status = engine.getSystemStatus();
      if (status.version === '5.0.0' && status.marketData) {
        this.addTestResult('System Status v5.0', true, 'Enhanced system status working');
      } else {
        this.addTestResult('System Status v5.0', false, 'System status incomplete');
      }

    } catch (error) {
      this.addTestResult('SentryCoin Engine v5.0', false, error.message);
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, details) {
    this.testResults.push({
      name: testName,
      passed,
      details
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${testName}: ${details}`);
  }

  /**
   * Print final test results
   */
  printTestResults() {
    console.log('\n📊 SentryCoin v5.0 "Apex Predator" Test Results:');
    console.log('================================================');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`);
    
    const failed = this.testResults.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log(`❌ Failed: ${failed.length}`);
      failed.forEach(test => {
        console.log(`   - ${test.name}: ${test.details}`);
      });
    }
    
    console.log('\n🎯 v5.0 Test Suite Complete');
    
    if (passed === total) {
      console.log('🎉 All tests passed! SentryCoin v5.0 "Apex Predator" is ready for deployment.');
      console.log('🛡️ Multi-strategy orchestration system validated');
      console.log('🎯 ETH_UNWIND macro strategy operational');
      console.log('📊 Enhanced intelligence systems functional');
    } else {
      console.log('⚠️ Some tests failed. Please review the issues before deployment.');
      console.log('🔧 Check the failed components and retry testing.');
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url.includes(process.argv[1]) || process.argv[1].includes('v5-apex-predator-test.js')) {
  const tester = new ApexPredatorTester();
  tester.runAllTests().catch(error => {
    console.error('❌ v5.0 Test execution failed:', error);
    process.exit(1);
  });
}

export default ApexPredatorTester;
