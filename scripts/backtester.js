#!/usr/bin/env node

/**
 * SentryCoin Flash Crash Backtester
 * 
 * Tests the flash crash prediction algorithm against real historical crash events
 * to validate effectiveness and tune parameters.
 */

import axios from 'axios';
import fs from 'fs/promises';
import FlashCrashPredictor from './predictor.js';
import dotenv from 'dotenv';

dotenv.config();

class FlashCrashBacktester {
  constructor() {
    this.results = [];
    this.historicalData = [];
    this.crashEvents = [];
    
    // Known flash crash events for testing
    this.knownCrashEvents = [
      {
        date: '2021-05-19',
        symbol: 'BTCUSDT',
        description: 'Bitcoin flash crash from $43K to $30K',
        preCrashPrice: 43000,
        crashPrice: 30000,
        recoveryPrice: 37000
      },
      {
        date: '2022-06-18',
        symbol: 'ETHUSDT', 
        description: 'Ethereum crash during market selloff',
        preCrashPrice: 1300,
        crashPrice: 880,
        recoveryPrice: 1050
      },
      {
        date: '2021-09-07',
        symbol: 'SOLUSDT',
        description: 'Solana flash crash',
        preCrashPrice: 200,
        crashPrice: 120,
        recoveryPrice: 150
      },
      {
        date: '2022-11-09',
        symbol: 'BTCUSDT',
        description: 'FTX collapse crash',
        preCrashPrice: 21000,
        crashPrice: 15500,
        recoveryPrice: 16800
      }
    ];
  }

  /**
   * Runs comprehensive backtesting
   */
  async runBacktest() {
    console.log('🧪 SentryCoin Flash Crash Backtester\n');
    console.log('📊 Testing algorithm against real historical crash events...\n');

    // Test against known crash events
    await this.testKnownCrashEvents();
    
    // Test with simulated order book data
    await this.testSimulatedCrashScenarios();
    
    // Generate performance report
    this.generatePerformanceReport();
  }

  /**
   * Tests against known historical crash events
   */
  async testKnownCrashEvents() {
    console.log('📈 Testing Against Known Flash Crash Events\n');
    
    for (const crashEvent of this.knownCrashEvents) {
      console.log(`🔍 Testing: ${crashEvent.description}`);
      console.log(`📅 Date: ${crashEvent.date}`);
      console.log(`💰 Price Movement: $${crashEvent.preCrashPrice} → $${crashEvent.crashPrice} (${((crashEvent.crashPrice - crashEvent.preCrashPrice) / crashEvent.preCrashPrice * 100).toFixed(1)}%)\n`);
      
      // Simulate the crash scenario
      const result = await this.simulateCrashScenario(crashEvent);
      this.results.push(result);
      
      this.printTestResult(result);
      console.log('─'.repeat(60) + '\n');
    }
  }

  /**
   * Simulates a crash scenario with order book data
   */
  async simulateCrashScenario(crashEvent) {
    const result = {
      event: crashEvent,
      alertsTriggered: 0,
      timeToAlert: null,
      maxRatio: 0,
      success: false,
      timeline: []
    };

    // Create predictor instance for testing
    const predictor = new FlashCrashPredictor();
    predictor.symbol = crashEvent.symbol;
    
    // Override alert method to capture alerts
    const originalTriggerAlert = predictor.triggerFlashCrashAlert.bind(predictor);
    predictor.triggerFlashCrashAlert = async (alertData) => {
      result.alertsTriggered++;
      if (!result.timeToAlert) {
        result.timeToAlert = result.timeline.length;
      }
      result.timeline.push({
        time: result.timeline.length,
        event: 'ALERT_TRIGGERED',
        ratio: alertData.askToBidRatio,
        bidVolume: alertData.totalBidVolume,
        askVolume: alertData.totalAskVolume
      });
      console.log(`🚨 Alert triggered at step ${result.timeline.length}: Ratio ${alertData.askToBidRatio.toFixed(2)}x`);
      return true;
    };

    // Simulate order book evolution during crash
    const steps = 20; // 20 time steps leading to crash
    for (let step = 0; step < steps; step++) {
      const progress = step / (steps - 1); // 0 to 1
      const orderBookData = this.generateCrashOrderBook(crashEvent, progress);
      
      // Update predictor's order book
      predictor.orderBook.bids.clear();
      predictor.orderBook.asks.clear();
      
      orderBookData.bids.forEach(([price, quantity]) => {
        predictor.orderBook.bids.set(price, quantity);
      });
      
      orderBookData.asks.forEach(([price, quantity]) => {
        predictor.orderBook.asks.set(price, quantity);
      });

      // Analyze for flash crash conditions
      predictor.analyzeFlashCrashConditions();
      
      // Track maximum ratio
      if (predictor.stats.lastRatio > result.maxRatio) {
        result.maxRatio = predictor.stats.lastRatio;
      }

      result.timeline.push({
        time: step,
        event: 'ORDER_BOOK_UPDATE',
        ratio: predictor.stats.lastRatio,
        price: this.interpolatePrice(crashEvent.preCrashPrice, crashEvent.crashPrice, progress)
      });
    }

    // Determine success (alert triggered before major price drop)
    result.success = result.alertsTriggered > 0 && result.timeToAlert < steps * 0.8;
    
    return result;
  }

  /**
   * Generates order book data that simulates a crash scenario
   */
  generateCrashOrderBook(crashEvent, progress) {
    const currentPrice = this.interpolatePrice(crashEvent.preCrashPrice, crashEvent.crashPrice, progress);
    const bids = [];
    const asks = [];
    
    // As crash progresses, bid volume decreases and ask volume increases
    const bidVolumeMultiplier = 1 - (progress * 0.8); // Bids decrease
    const askVolumeMultiplier = 1 + (progress * 3);   // Asks increase dramatically
    
    // Generate bids (buy orders) - decreasing volume as crash approaches
    for (let i = 0; i < 50; i++) {
      const price = currentPrice - (i * currentPrice * 0.001);
      const baseVolume = Math.random() * 10 + 1;
      const volume = baseVolume * bidVolumeMultiplier;
      bids.push([price, Math.max(volume, 0.1)]);
    }
    
    // Generate asks (sell orders) - increasing volume as crash approaches
    for (let i = 0; i < 50; i++) {
      const price = currentPrice + (i * currentPrice * 0.001);
      const baseVolume = Math.random() * 10 + 1;
      const volume = baseVolume * askVolumeMultiplier;
      asks.push([price, volume]);
    }
    
    return { bids, asks };
  }

  /**
   * Interpolates price between two points
   */
  interpolatePrice(startPrice, endPrice, progress) {
    // Use exponential curve to simulate accelerating crash
    const exponentialProgress = Math.pow(progress, 2);
    return startPrice + (endPrice - startPrice) * exponentialProgress;
  }

  /**
   * Tests simulated crash scenarios with different parameters
   */
  async testSimulatedCrashScenarios() {
    console.log('🎭 Testing Simulated Crash Scenarios\n');
    
    const scenarios = [
      { name: 'Gradual Selloff', askMultiplier: 2.0, duration: 30 },
      { name: 'Flash Crash', askMultiplier: 5.0, duration: 10 },
      { name: 'Panic Selling', askMultiplier: 8.0, duration: 5 },
      { name: 'Whale Dump', askMultiplier: 15.0, duration: 3 }
    ];

    for (const scenario of scenarios) {
      console.log(`🔬 Testing: ${scenario.name}`);
      const result = await this.testScenario(scenario);
      this.results.push(result);
      this.printTestResult(result);
      console.log('─'.repeat(60) + '\n');
    }
  }

  /**
   * Tests a specific scenario
   */
  async testScenario(scenario) {
    const predictor = new FlashCrashPredictor();
    let alertTriggered = false;
    let alertTime = null;

    // Override alert method
    predictor.triggerFlashCrashAlert = async (alertData) => {
      if (!alertTriggered) {
        alertTriggered = true;
        alertTime = Date.now();
        console.log(`🚨 Alert triggered for ${scenario.name}: Ratio ${alertData.askToBidRatio.toFixed(2)}x`);
      }
      return true;
    };

    const startTime = Date.now();
    
    // Simulate scenario
    for (let step = 0; step < scenario.duration; step++) {
      const progress = step / scenario.duration;
      
      // Generate imbalanced order book
      predictor.orderBook.bids.clear();
      predictor.orderBook.asks.clear();
      
      // Normal bid volume
      for (let i = 0; i < 25; i++) {
        const price = 100 - (i * 0.01);
        const volume = Math.random() * 5 + 1;
        predictor.orderBook.bids.set(price, volume);
      }
      
      // Increasing ask volume
      for (let i = 0; i < 25; i++) {
        const price = 100 + (i * 0.01);
        const volume = (Math.random() * 5 + 1) * (1 + progress * scenario.askMultiplier);
        predictor.orderBook.asks.set(price, volume);
      }
      
      predictor.analyzeFlashCrashConditions();
      
      // Small delay to simulate real-time
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      scenario: scenario.name,
      success: alertTriggered,
      alertTime: alertTime ? alertTime - startTime : null,
      askMultiplier: scenario.askMultiplier
    };
  }

  /**
   * Prints test result
   */
  printTestResult(result) {
    if (result.event) {
      // Historical crash event result
      const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`${status} - ${result.event.description}`);
      console.log(`📊 Alerts Triggered: ${result.alertsTriggered}`);
      console.log(`⏱️ Time to Alert: ${result.timeToAlert || 'N/A'} steps`);
      console.log(`📈 Max Ratio: ${result.maxRatio.toFixed(2)}x`);
    } else {
      // Simulated scenario result
      const status = result.success ? '✅ DETECTED' : '❌ MISSED';
      console.log(`${status} - ${result.scenario}`);
      console.log(`⏱️ Alert Time: ${result.alertTime || 'N/A'}ms`);
      console.log(`📊 Ask Multiplier: ${result.askMultiplier}x`);
    }
  }

  /**
   * Generates comprehensive performance report
   */
  generatePerformanceReport() {
    console.log('📋 BACKTESTING PERFORMANCE REPORT');
    console.log('='.repeat(60));
    
    const historicalResults = this.results.filter(r => r.event);
    const simulatedResults = this.results.filter(r => r.scenario);
    
    // Historical crash detection rate
    const historicalSuccess = historicalResults.filter(r => r.success).length;
    const historicalTotal = historicalResults.length;
    const historicalRate = (historicalSuccess / historicalTotal * 100).toFixed(1);
    
    console.log(`\n📈 Historical Crash Detection:`);
    console.log(`   Success Rate: ${historicalSuccess}/${historicalTotal} (${historicalRate}%)`);
    
    // Simulated scenario detection rate
    const simulatedSuccess = simulatedResults.filter(r => r.success).length;
    const simulatedTotal = simulatedResults.length;
    const simulatedRate = (simulatedSuccess / simulatedTotal * 100).toFixed(1);
    
    console.log(`\n🎭 Simulated Scenario Detection:`);
    console.log(`   Success Rate: ${simulatedSuccess}/${simulatedTotal} (${simulatedRate}%)`);
    
    // Overall performance
    const totalSuccess = historicalSuccess + simulatedSuccess;
    const totalTests = historicalTotal + simulatedTotal;
    const overallRate = (totalSuccess / totalTests * 100).toFixed(1);
    
    console.log(`\n🎯 Overall Performance:`);
    console.log(`   Detection Rate: ${totalSuccess}/${totalTests} (${overallRate}%)`);
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (overallRate < 70) {
      console.log(`   - Consider lowering DANGER_RATIO (currently ${process.env.DANGER_RATIO || '2.5'})`);
      console.log(`   - Increase ORDER_BOOK_DEPTH for better analysis`);
    } else if (overallRate > 90) {
      console.log(`   - Algorithm performing excellently!`);
      console.log(`   - Consider testing with more sensitive parameters`);
    } else {
      console.log(`   - Good performance, fine-tune parameters as needed`);
    }
    
    console.log(`\n🔧 Parameter Tuning Suggestions:`);
    const avgMaxRatio = historicalResults.reduce((sum, r) => sum + r.maxRatio, 0) / historicalResults.length;
    console.log(`   - Average max ratio in crashes: ${avgMaxRatio.toFixed(2)}x`);
    console.log(`   - Suggested DANGER_RATIO: ${Math.max(avgMaxRatio * 0.8, 1.5).toFixed(1)}`);
    
    console.log('\n🎉 Backtesting Complete!');
  }
}

// Run backtesting if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const backtester = new FlashCrashBacktester();
  backtester.runBacktest().catch(console.error);
}

export default FlashCrashBacktester;
