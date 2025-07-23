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
    const predictor = new FlashCrashPredictor();
    predictor.dangerRatio = config.dangerRatio;
    predictor.symbol = crashEvent.symbol;

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
