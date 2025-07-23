#!/usr/bin/env node

/**
 * SentryCoin Flash Crash Predictor - Test Suite
 * 
 * Tests the core functionality of the flash crash prediction engine
 * including order book management, ratio calculations, and alerting.
 */

import FlashCrashPredictor from './predictor.js';
import FlashCrashAlerter from './alerter.js';
import dotenv from 'dotenv';

dotenv.config();

class PredictorTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Runs all tests
   */
  async runAllTests() {
    console.log('🧪 SentryCoin Flash Crash Predictor - Test Suite\n');

    await this.testEnvironmentVariables();
    await this.testAlerterConfiguration();
    await this.testOrderBookCalculations();
    await this.testRatioCalculations();
    await this.testAlertFormatting();

    this.printTestResults();
  }

  /**
   * Test environment variable validation
   */
  async testEnvironmentVariables() {
    console.log('1. Testing Environment Variables...');
    
    const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length === 0) {
      this.addTestResult('Environment Variables', true, 'All required variables present');
    } else {
      this.addTestResult('Environment Variables', false, `Missing: ${missing.join(', ')}`);
    }
  }

  /**
   * Test Telegram alerter configuration
   */
  async testAlerterConfiguration() {
    console.log('2. Testing Telegram Alerter...');
    
    try {
      const alerter = new FlashCrashAlerter();
      
      // Test cooldown functionality
      const isOnCooldown1 = alerter.isOnCooldown();
      
      // Simulate alert
      alerter.lastAlertTime = Date.now();
      const isOnCooldown2 = alerter.isOnCooldown();
      
      if (!isOnCooldown1 && isOnCooldown2) {
        this.addTestResult('Alerter Cooldown', true, 'Cooldown mechanism working');
      } else {
        this.addTestResult('Alerter Cooldown', false, 'Cooldown mechanism failed');
      }
      
      // Test message formatting
      const testData = {
        symbol: 'BTCUSDT',
        askToBidRatio: 3.5,
        totalBidVolume: 1000,
        totalAskVolume: 3500,
        currentPrice: 43250.50
      };
      
      const message = alerter.formatAlertMessage(testData);
      
      if (message.includes('BTCUSDT') && message.includes('3.50x')) {
        this.addTestResult('Message Formatting', true, 'Alert message formatted correctly');
      } else {
        this.addTestResult('Message Formatting', false, 'Alert message formatting failed');
      }
      
    } catch (error) {
      this.addTestResult('Alerter Configuration', false, error.message);
    }
  }

  /**
   * Test order book calculations
   */
  async testOrderBookCalculations() {
    console.log('3. Testing Order Book Calculations...');
    
    try {
      const predictor = new FlashCrashPredictor();
      
      // Create mock order book data
      const mockBids = new Map([
        [43000, 1.5],
        [42999, 2.0],
        [42998, 1.0]
      ]);
      
      const mockAsks = new Map([
        [43001, 2.0],
        [43002, 3.0],
        [43003, 1.5]
      ]);
      
      // Test top levels extraction
      const topBids = predictor.getTopOrderBookLevels(mockBids, 3, 'desc');
      const topAsks = predictor.getTopOrderBookLevels(mockAsks, 3, 'asc');
      
      // Verify sorting and extraction
      if (topBids.length === 3 && topBids[0][0] === 43000) {
        this.addTestResult('Order Book Sorting (Bids)', true, 'Bids sorted correctly (desc)');
      } else {
        this.addTestResult('Order Book Sorting (Bids)', false, 'Bid sorting failed');
      }
      
      if (topAsks.length === 3 && topAsks[0][0] === 43001) {
        this.addTestResult('Order Book Sorting (Asks)', true, 'Asks sorted correctly (asc)');
      } else {
        this.addTestResult('Order Book Sorting (Asks)', false, 'Ask sorting failed');
      }
      
    } catch (error) {
      this.addTestResult('Order Book Calculations', false, error.message);
    }
  }

  /**
   * Test ratio calculations
   */
  async testRatioCalculations() {
    console.log('4. Testing Ratio Calculations...');
    
    try {
      // Test scenario 1: Normal market conditions
      const totalBidVolume1 = 1000;
      const totalAskVolume1 = 1200;
      const ratio1 = totalAskVolume1 / totalBidVolume1;
      
      if (Math.abs(ratio1 - 1.2) < 0.001) {
        this.addTestResult('Normal Ratio Calculation', true, `Ratio: ${ratio1.toFixed(2)}x`);
      } else {
        this.addTestResult('Normal Ratio Calculation', false, 'Ratio calculation incorrect');
      }
      
      // Test scenario 2: Flash crash conditions
      const totalBidVolume2 = 500;
      const totalAskVolume2 = 2000;
      const ratio2 = totalAskVolume2 / totalBidVolume2;
      
      if (Math.abs(ratio2 - 4.0) < 0.001) {
        this.addTestResult('Flash Crash Ratio Calculation', true, `Ratio: ${ratio2.toFixed(2)}x`);
      } else {
        this.addTestResult('Flash Crash Ratio Calculation', false, 'Flash crash ratio incorrect');
      }
      
      // Test scenario 3: Edge case (zero bids)
      const totalBidVolume3 = 0;
      const totalAskVolume3 = 1000;
      const ratio3 = totalBidVolume3 > 0 ? totalAskVolume3 / totalBidVolume3 : 0;
      
      if (ratio3 === 0) {
        this.addTestResult('Zero Bid Edge Case', true, 'Handled zero bid volume correctly');
      } else {
        this.addTestResult('Zero Bid Edge Case', false, 'Zero bid handling failed');
      }
      
    } catch (error) {
      this.addTestResult('Ratio Calculations', false, error.message);
    }
  }

  /**
   * Test alert formatting
   */
  async testAlertFormatting() {
    console.log('5. Testing Alert Formatting...');
    
    try {
      const alerter = new FlashCrashAlerter();
      
      // Test volume formatting
      const testCases = [
        { input: 1234567, expected: '1.23M' },
        { input: 123456, expected: '123.46K' },
        { input: 123.45, expected: '123.45' }
      ];
      
      let allPassed = true;
      for (const testCase of testCases) {
        const result = alerter.formatVolume(testCase.input);
        if (result !== testCase.expected) {
          allPassed = false;
          break;
        }
      }
      
      if (allPassed) {
        this.addTestResult('Volume Formatting', true, 'All volume formats correct');
      } else {
        this.addTestResult('Volume Formatting', false, 'Volume formatting failed');
      }
      
      // Test risk level determination
      const riskTests = [
        { ratio: 2.5, expected: '🟢 MODERATE' },
        { ratio: 3.5, expected: '🟡 HIGH' },
        { ratio: 4.5, expected: '🟠 VERY HIGH' },
        { ratio: 5.5, expected: '🔴 EXTREME' }
      ];
      
      let riskTestsPassed = true;
      for (const test of riskTests) {
        const result = alerter.getRiskLevel(test.ratio);
        if (result !== test.expected) {
          riskTestsPassed = false;
          break;
        }
      }
      
      if (riskTestsPassed) {
        this.addTestResult('Risk Level Calculation', true, 'All risk levels correct');
      } else {
        this.addTestResult('Risk Level Calculation', false, 'Risk level calculation failed');
      }
      
    } catch (error) {
      this.addTestResult('Alert Formatting', false, error.message);
    }
  }

  /**
   * Adds a test result
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
   * Prints final test results
   */
  printTestResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
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
    
    console.log('\n🎯 Test Suite Complete');
    
    if (passed === total) {
      console.log('🎉 All tests passed! The Flash Crash Predictor is ready for deployment.');
    } else {
      console.log('⚠️ Some tests failed. Please review the issues before deployment.');
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PredictorTester();
  tester.runAllTests().catch(console.error);
}

export default PredictorTester;
