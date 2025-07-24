#!/usr/bin/env node

/**
 * Real Data Backtester for Flash Crash Predictor
 * 
 * Tests the flash crash prediction algorithm against real historical market data
 * from actual crash events to validate effectiveness and optimize parameters.
 */

import FlashCrashPredictor from './predictor.js';
import HistoricalDataFetcher from './historical-data-fetcher.js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

class RealDataBacktester {
  constructor() {
    this.fetcher = new HistoricalDataFetcher();
    this.results = [];
    this.testConfigs = [
      { dangerRatio: 2.0, name: 'Sensitive' },
      { dangerRatio: 2.5, name: 'Default' },
      { dangerRatio: 3.0, name: 'Conservative' },
      { dangerRatio: 3.5, name: 'Very Conservative' }
    ];
  }

  /**
   * Runs comprehensive backtesting with real historical data
   */
  async runRealDataBacktest() {
    console.log('🧪 SentryCoin Real Data Backtester\n');
    console.log('📊 Testing algorithm against real historical crash events...\n');

    // Fetch real historical data for known crash events
    console.log('📥 Fetching historical data...');
    const crashEvents = await this.fetcher.fetchCrashEventData();
    
    if (crashEvents.length === 0) {
      console.log('❌ No historical data available. Please check your internet connection.');
      return;
    }

    console.log(`✅ Loaded ${crashEvents.length} crash events with real data\n`);

    // Test each configuration against each crash event
    for (const config of this.testConfigs) {
      console.log(`🔧 Testing ${config.name} Configuration (Danger Ratio: ${config.dangerRatio}x)`);
      console.log('='.repeat(70));
      
      const configResults = [];
      
      for (const crashEvent of crashEvents) {
        console.log(`\n📈 Testing: ${crashEvent.name}`);
        console.log(`📅 Period: ${crashEvent.startDate} to ${crashEvent.endDate}`);
        console.log(`💰 Symbol: ${crashEvent.symbol}`);
        
        const result = await this.testCrashEvent(crashEvent, config);
        configResults.push(result);
        
        this.printEventResult(result);
      }
      
      this.printConfigSummary(config, configResults);
      this.results.push({ config, results: configResults });
      console.log('\n' + '='.repeat(70) + '\n');
    }

    // Test enhanced crash scenarios with realistic order book imbalances
    await this.testEnhancedCrashScenarios();

    // Test with high-fidelity simulated crash scenarios
    console.log('\n🎭 Testing High-Fidelity Simulated Flash Crashes\n');
    await this.testHighFidelityCrashScenarios();

    // Generate comprehensive report
    await this.generateComprehensiveReport();
  }

  /**
   * Tests a specific crash event with given configuration
   */
  async testCrashEvent(crashEvent, config) {
    const result = {
      event: crashEvent.name,
      symbol: crashEvent.symbol,
      config: config.name,
      dangerRatio: config.dangerRatio,
      alertsTriggered: 0,
      firstAlertTime: null,
      maxRatio: 0,
      minRatio: Infinity,
      avgRatio: 0,
      priceDropDetected: false,
      earlyWarning: false,
      falsePositives: 0,
      timeline: []
    };

    // Create predictor with test configuration
    // Temporarily override environment variables for testing
    const originalSymbol = process.env.SYMBOL;
    const originalDangerRatio = process.env.DANGER_RATIO;

    process.env.SYMBOL = crashEvent.symbol;
    process.env.DANGER_RATIO = config.dangerRatio.toString();

    const predictor = new FlashCrashPredictor();

    // Restore original environment variables
    process.env.SYMBOL = originalSymbol;
    process.env.DANGER_RATIO = originalDangerRatio;

    console.log(`🔧 Testing ${crashEvent.symbol} with danger ratio: ${config.dangerRatio}x`);

    // Track alerts
    const originalTriggerAlert = predictor.triggerFlashCrashAlert.bind(predictor);
    predictor.triggerFlashCrashAlert = async (alertData) => {
      result.alertsTriggered++;
      if (!result.firstAlertTime) {
        result.firstAlertTime = result.timeline.length;
      }
      
      result.timeline.push({
        step: result.timeline.length,
        type: 'ALERT',
        ratio: alertData.askToBidRatio,
        price: alertData.currentPrice,
        bidVolume: alertData.totalBidVolume,
        askVolume: alertData.totalAskVolume
      });
      
      return true;
    };

    // Process historical order book data
    const orderBookData = crashEvent.orderBookData || [];
    let ratioSum = 0;
    let priceAtStart = null;
    let significantDropDetected = false;

    for (let i = 0; i < orderBookData.length; i++) {
      const dataPoint = orderBookData[i];
      
      if (i === 0) {
        priceAtStart = dataPoint.price;
      }

      // Update predictor's order book
      predictor.orderBook.bids.clear();
      predictor.orderBook.asks.clear();
      
      dataPoint.bids.forEach(([price, quantity]) => {
        predictor.orderBook.bids.set(price, quantity);
      });
      
      dataPoint.asks.forEach(([price, quantity]) => {
        predictor.orderBook.asks.set(price, quantity);
      });

      // Analyze for flash crash conditions
      predictor.analyzeFlashCrashConditions();
      const currentRatio = predictor.stats.lastRatio;
      
      // Track statistics
      result.maxRatio = Math.max(result.maxRatio, currentRatio);
      result.minRatio = Math.min(result.minRatio, currentRatio);
      ratioSum += currentRatio;

      // Check for significant price drop
      const priceDropPercent = ((dataPoint.price - priceAtStart) / priceAtStart) * 100;
      if (priceDropPercent < -5) { // 5% drop
        significantDropDetected = true;
        if (!result.priceDropDetected) {
          result.priceDropDetected = i;
        }
      }

      // Record timeline
      result.timeline.push({
        step: i,
        type: 'DATA',
        ratio: currentRatio,
        price: dataPoint.price,
        priceChange: priceDropPercent,
        timestamp: dataPoint.timestamp
      });
    }

    // Calculate metrics
    result.avgRatio = ratioSum / orderBookData.length;
    
    // Determine if early warning was provided
    if (result.firstAlertTime !== null && result.priceDropDetected !== false) {
      result.earlyWarning = result.firstAlertTime < result.priceDropDetected;
    }

    // Count false positives (alerts without significant price drops)
    if (result.alertsTriggered > 0 && !significantDropDetected) {
      result.falsePositives = result.alertsTriggered;
    }

    return result;
  }

  /**
   * Prints result for a single event
   */
  printEventResult(result) {
    const status = result.earlyWarning ? '✅ SUCCESS' : 
                   result.alertsTriggered > 0 ? '⚠️ PARTIAL' : '❌ MISSED';
    
    console.log(`${status} - ${result.event}`);
    console.log(`   📊 Alerts: ${result.alertsTriggered}`);
    console.log(`   📈 Max Ratio: ${result.maxRatio.toFixed(2)}x`);
    console.log(`   📉 Avg Ratio: ${result.avgRatio.toFixed(2)}x`);
    
    if (result.firstAlertTime !== null) {
      console.log(`   ⏱️ First Alert: Step ${result.firstAlertTime}`);
    }
    
    if (result.priceDropDetected !== false) {
      console.log(`   💥 Price Drop: Step ${result.priceDropDetected}`);
    }
    
    if (result.earlyWarning) {
      console.log(`   🎯 Early Warning: YES`);
    }
    
    if (result.falsePositives > 0) {
      console.log(`   ⚠️ False Positives: ${result.falsePositives}`);
    }
  }

  /**
   * Prints summary for a configuration
   */
  printConfigSummary(config, results) {
    const totalEvents = results.length;
    const successfulPredictions = results.filter(r => r.earlyWarning).length;
    const alertsTriggered = results.filter(r => r.alertsTriggered > 0).length;
    const falsePositives = results.reduce((sum, r) => sum + r.falsePositives, 0);
    
    const successRate = (successfulPredictions / totalEvents * 100).toFixed(1);
    const alertRate = (alertsTriggered / totalEvents * 100).toFixed(1);
    
    console.log(`\n📊 ${config.name} Configuration Summary:`);
    console.log(`   🎯 Success Rate: ${successfulPredictions}/${totalEvents} (${successRate}%)`);
    console.log(`   🚨 Alert Rate: ${alertsTriggered}/${totalEvents} (${alertRate}%)`);
    console.log(`   ⚠️ False Positives: ${falsePositives}`);
    
    const avgMaxRatio = results.reduce((sum, r) => sum + r.maxRatio, 0) / totalEvents;
    console.log(`   📈 Avg Max Ratio: ${avgMaxRatio.toFixed(2)}x`);
  }

  /**
   * Tests high-fidelity simulated crash scenarios with realistic order book data
   */
  async testHighFidelityCrashScenarios() {
    const crashScenarios = [
      {
        name: 'Gradual Liquidity Drain',
        symbol: 'BTCUSDT',
        duration: 100, // 100 updates
        maxRatio: 4.0,
        description: 'Slow buildup of sell pressure over time'
      },
      {
        name: 'Flash Crash Event',
        symbol: 'ETHUSDT',
        duration: 30,
        maxRatio: 8.0,
        description: 'Rapid order book imbalance'
      },
      {
        name: 'Whale Dump Scenario',
        symbol: 'SOLUSDT',
        duration: 15,
        maxRatio: 12.0,
        description: 'Massive sell orders overwhelming bids'
      },
      {
        name: 'Panic Selling Cascade',
        symbol: 'BTCUSDT',
        duration: 50,
        maxRatio: 6.0,
        description: 'Accelerating sell pressure with bid withdrawal'
      }
    ];

    for (const config of this.testConfigs) {
      console.log(`🔧 Testing ${config.name} Configuration (${config.dangerRatio}x) on Simulated Crashes`);
      console.log('─'.repeat(80));

      const configResults = [];

      for (const scenario of crashScenarios) {
        console.log(`\n🎭 Simulating: ${scenario.name} (${scenario.symbol})`);
        console.log(`📊 ${scenario.description}`);

        const result = await this.testHighFidelityScenario(scenario, config);
        configResults.push(result);

        this.printSimulationResult(result);
      }

      this.printSimulationSummary(config, configResults);

      // Add to main results for comprehensive report
      this.results.push({
        config: { ...config, name: config.name + ' (Simulated)' },
        results: configResults
      });

      console.log('\n' + '─'.repeat(80) + '\n');
    }
  }

  /**
   * Tests a high-fidelity crash scenario
   */
  async testHighFidelityScenario(scenario, config) {
    const result = {
      event: scenario.name,
      symbol: scenario.symbol,
      config: config.name,
      dangerRatio: config.dangerRatio,
      alertsTriggered: 0,
      firstAlertTime: null,
      maxRatio: 0,
      avgRatio: 0,
      success: false,
      timeline: []
    };

    // Create predictor with correct configuration
    const originalSymbol = process.env.SYMBOL;
    const originalDangerRatio = process.env.DANGER_RATIO;

    process.env.SYMBOL = scenario.symbol;
    process.env.DANGER_RATIO = config.dangerRatio.toString();

    const predictor = new FlashCrashPredictor();

    // Restore environment
    process.env.SYMBOL = originalSymbol;
    process.env.DANGER_RATIO = originalDangerRatio;

    // Track alerts
    const originalTriggerAlert = predictor.triggerFlashCrashAlert.bind(predictor);
    predictor.triggerFlashCrashAlert = async (alertData) => {
      result.alertsTriggered++;
      if (!result.firstAlertTime) {
        result.firstAlertTime = result.timeline.length;
      }

      console.log(`🚨 ALERT at step ${result.timeline.length}: Ratio ${alertData.askToBidRatio.toFixed(2)}x`);

      result.timeline.push({
        step: result.timeline.length,
        type: 'ALERT',
        ratio: alertData.askToBidRatio,
        bidVolume: alertData.totalBidVolume,
        askVolume: alertData.totalAskVolume
      });

      return true;
    };

    // Simulate realistic crash progression
    let ratioSum = 0;
    const basePrice = this.getBasePriceForSymbol(scenario.symbol);

    for (let step = 0; step < scenario.duration; step++) {
      const progress = step / (scenario.duration - 1);

      // Generate realistic order book during crash
      const orderBook = this.generateRealisticCrashOrderBook(
        basePrice,
        progress,
        scenario.maxRatio,
        scenario.name
      );

      // Update predictor's order book
      predictor.orderBook.bids.clear();
      predictor.orderBook.asks.clear();

      orderBook.bids.forEach(([price, quantity]) => {
        predictor.orderBook.bids.set(price, quantity);
      });

      orderBook.asks.forEach(([price, quantity]) => {
        predictor.orderBook.asks.set(price, quantity);
      });

      // Analyze for flash crash conditions
      predictor.analyzeFlashCrashConditions();
      const currentRatio = predictor.stats.lastRatio;

      result.maxRatio = Math.max(result.maxRatio, currentRatio);
      ratioSum += currentRatio;

      result.timeline.push({
        step,
        type: 'DATA',
        ratio: currentRatio,
        progress: progress * 100
      });

      // Small delay to simulate real-time processing
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    result.avgRatio = ratioSum / scenario.duration;
    result.success = result.alertsTriggered > 0 && result.firstAlertTime < scenario.duration * 0.7;

    return result;
  }

  /**
   * Generates realistic order book data during crash scenarios
   */
  generateRealisticCrashOrderBook(basePrice, progress, maxRatio, scenarioType) {
    const bids = [];
    const asks = [];

    // Different crash patterns
    let bidMultiplier, askMultiplier;

    switch (scenarioType) {
      case 'Gradual Liquidity Drain':
        bidMultiplier = 1 - (progress * 0.8); // Gradual bid reduction
        askMultiplier = 1 + (progress * 2.5); // Moderate ask increase
        break;

      case 'Flash Crash Event':
        bidMultiplier = 1 - (Math.pow(progress, 2) * 0.9); // Accelerating bid loss
        askMultiplier = 1 + (Math.pow(progress, 1.5) * 4); // Rapid ask buildup
        break;

      case 'Whale Dump Scenario':
        bidMultiplier = progress < 0.3 ? 1 : 1 - ((progress - 0.3) * 1.2); // Sudden bid collapse
        askMultiplier = progress < 0.3 ? 1 : 1 + ((progress - 0.3) * 8); // Massive ask wall
        break;

      case 'Panic Selling Cascade':
        bidMultiplier = 1 - (progress * 0.7 * (1 + progress)); // Accelerating panic
        askMultiplier = 1 + (progress * 3 * (1 + progress * 0.5)); // Cascading sells
        break;

      default:
        bidMultiplier = 1 - (progress * 0.6);
        askMultiplier = 1 + (progress * 2);
    }

    // Ensure minimum liquidity
    bidMultiplier = Math.max(bidMultiplier, 0.1);
    askMultiplier = Math.max(askMultiplier, 1);

    // Generate bid levels (decreasing volume as crash progresses)
    for (let i = 0; i < 50; i++) {
      const price = basePrice - (i * basePrice * 0.0005);
      const baseVolume = Math.random() * 10 + 2;
      const volume = baseVolume * bidMultiplier;
      bids.push([price, Math.max(volume, 0.1)]);
    }

    // Generate ask levels (increasing volume as crash progresses)
    for (let i = 0; i < 50; i++) {
      const price = basePrice + (i * basePrice * 0.0005);
      const baseVolume = Math.random() * 10 + 2;
      const volume = baseVolume * askMultiplier;
      asks.push([price, volume]);
    }

    return { bids, asks };
  }

  /**
   * Gets base price for symbol
   */
  getBasePriceForSymbol(symbol) {
    const prices = {
      'BTCUSDT': 43000,
      'ETHUSDT': 2500,
      'SOLUSDT': 100,
      'ADAUSDT': 0.5,
      'DOGEUSDT': 0.08,
      'BNBUSDT': 300
    };

    return prices[symbol] || 100;
  }

  /**
   * Prints simulation result
   */
  printSimulationResult(result) {
    const status = result.success ? '✅ DETECTED' : '❌ MISSED';
    console.log(`${status} - ${result.event} (${result.symbol})`);
    console.log(`   📊 Alerts: ${result.alertsTriggered}`);
    console.log(`   📈 Max Ratio: ${result.maxRatio.toFixed(2)}x`);
    console.log(`   📉 Avg Ratio: ${result.avgRatio.toFixed(2)}x`);

    if (result.firstAlertTime !== null) {
      console.log(`   ⏱️ First Alert: Step ${result.firstAlertTime}`);
    }
  }

  /**
   * Prints simulation summary
   */
  printSimulationSummary(config, results) {
    const totalScenarios = results.length;
    const successfulDetections = results.filter(r => r.success).length;
    const successRate = (successfulDetections / totalScenarios * 100).toFixed(1);

    console.log(`\n📊 ${config.name} Simulation Summary:`);
    console.log(`   🎯 Detection Rate: ${successfulDetections}/${totalScenarios} (${successRate}%)`);
    console.log(`   🚨 Total Alerts: ${results.reduce((sum, r) => sum + r.alertsTriggered, 0)}`);

    const avgMaxRatio = results.reduce((sum, r) => sum + r.maxRatio, 0) / totalScenarios;
    console.log(`   📈 Avg Max Ratio: ${avgMaxRatio.toFixed(2)}x`);
  }

  /**
   * Generates comprehensive backtesting report
   */
  async generateComprehensiveReport() {
    console.log('📋 COMPREHENSIVE BACKTESTING REPORT');
    console.log('='.repeat(80));
    
    // Find best configuration
    const configPerformance = this.results.map(({ config, results }) => {
      const successRate = results.filter(r => r.earlyWarning).length / results.length;
      const falsePositiveRate = results.reduce((sum, r) => sum + r.falsePositives, 0) / results.length;
      const score = successRate - (falsePositiveRate * 0.1); // Penalize false positives
      
      return {
        config: config.name,
        dangerRatio: config.dangerRatio,
        successRate: (successRate * 100).toFixed(1),
        falsePositiveRate: falsePositiveRate.toFixed(1),
        score: score.toFixed(3)
      };
    });
    
    configPerformance.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    
    console.log('\n🏆 Configuration Performance Ranking:');
    configPerformance.forEach((config, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊';
      console.log(`${medal} ${config.config} (${config.dangerRatio}x): ${config.successRate}% success, ${config.falsePositiveRate} false positives, Score: ${config.score}`);
    });
    
    // Recommendations
    const bestConfig = configPerformance[0];
    console.log(`\n💡 Recommendations:`);
    console.log(`   🎯 Optimal Danger Ratio: ${bestConfig.dangerRatio}x`);
    console.log(`   📊 Expected Success Rate: ${bestConfig.successRate}%`);
    
    if (parseFloat(bestConfig.successRate) < 70) {
      console.log(`   ⚠️ Consider lowering danger ratio for better detection`);
    } else if (parseFloat(bestConfig.successRate) > 90) {
      console.log(`   ✅ Excellent performance! Algorithm is well-tuned`);
    }
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalConfigurations: this.testConfigs.length,
        totalEvents: this.results[0]?.results.length || 0,
        bestConfiguration: bestConfig
      },
      configurations: configPerformance,
      detailedResults: this.results
    };
    
    await fs.writeFile('./backtest-report.json', JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Detailed report saved to: ./backtest-report.json`);
    console.log(`🎉 Backtesting complete!`);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const backtester = new RealDataBacktester();
  backtester.runRealDataBacktest().catch(console.error);
}

export default RealDataBacktester;
