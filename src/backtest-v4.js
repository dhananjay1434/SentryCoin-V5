#!/usr/bin/env node

/**
 * SentryCoin v4.0 Backtesting Engine
 * 
 * Tests the dual-strategy system against historical data to validate
 * the Trifecta Conviction and Absorption Squeeze strategies
 */

import MarketClassifier from './market-classifier.js';
import TrifectaTrader from './trifecta-trader.js';
import SqueezeTrader from './squeeze-trader.js';
import fs from 'fs/promises';

class SentryCoinV4Backtester {
  constructor() {
    this.symbol = 'SPKUSDT';
    this.classifier = new MarketClassifier(this.symbol);
    this.trifectaTrader = new TrifectaTrader(this.symbol);
    this.squeezeTrader = new SqueezeTrader(this.symbol);
    
    // Enable paper trading for backtesting
    this.trifectaTrader.enabled = true;
    this.squeezeTrader.enabled = true;
    this.trifectaTrader.paperTrading = true;
    this.squeezeTrader.paperTrading = true;
    
    // Backtest results
    this.results = {
      totalClassifications: 0,
      trifectaSignals: [],
      squeezeSignals: [],
      trifectaPerformance: null,
      squeezePerformance: null,
      combinedPerformance: null
    };
    
    // Historical validation dataset (from the 19 validated signals)
    this.historicalSignals = [
      // The 3 CORRECT signals (should trigger Trifecta Conviction)
      {
        ratio: 3.2, bidVolume: 85000, momentum: -0.8, result: 'CORRECT',
        priceChange: -4.41, description: 'Strong negative momentum + pressure'
      },
      {
        ratio: 4.1, bidVolume: 75000, momentum: -0.5, result: 'CORRECT',
        priceChange: -3.2, description: 'Extreme pressure + strong bearish momentum'
      },
      {
        ratio: 3.5, bidVolume: 92000, momentum: -0.3, result: 'CORRECT',
        priceChange: -2.8, description: 'High pressure + strong negative momentum'
      },
      
      // The FALSE POSITIVES (should trigger Absorption Squeeze)
      {
        ratio: 3.16, bidVolume: 80742, momentum: 0.5, result: 'INCORRECT',
        priceChange: 2.1, description: 'Strong conditions but bullish momentum'
      },
      {
        ratio: 2.8, bidVolume: 95000, momentum: 0.2, result: 'INCORRECT',
        priceChange: 1.5, description: 'Moderate pressure + bullish momentum'
      },
      {
        ratio: 3.2, bidVolume: 120000, momentum: -0.05, result: 'INCORRECT',
        priceChange: 0.8, description: 'High pressure but strong liquidity'
      },
      {
        ratio: 2.6, bidVolume: 85000, momentum: -0.08, result: 'INCORRECT',
        priceChange: 1.2, description: 'Weak momentum + thin liquidity'
      }
    ];
    
    console.log('🧪 SentryCoin v4.0 Backtesting Engine');
    console.log(`📊 Testing dual-strategy system against ${this.historicalSignals.length} validated signals`);
  }

  /**
   * Run comprehensive backtesting
   */
  async runBacktest() {
    console.log('\n🚀 Starting SentryCoin v4.0 Backtesting...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Test against historical signals
    await this.testHistoricalSignals();
    
    // Calculate performance metrics
    this.calculatePerformance();
    
    // Generate comprehensive report
    await this.generateReport();
    
    console.log('\n🎉 Backtesting complete!');
  }

  /**
   * Set up event listeners for signal capture
   */
  setupEventListeners() {
    this.classifier.on('TRIFECTA_CONVICTION_SIGNAL', (signal) => {
      this.results.trifectaSignals.push(signal);
      console.log(`🎯 Trifecta signal captured: ${signal.momentum.toFixed(2)}% momentum`);
    });
    
    this.classifier.on('ABSORPTION_SQUEEZE_SIGNAL', (signal) => {
      this.results.squeezeSignals.push(signal);
      console.log(`🔄 Squeeze signal captured: ${signal.momentum.toFixed(2)}% momentum`);
    });
  }

  /**
   * Test against historical validated signals
   */
  async testHistoricalSignals() {
    console.log('\n📊 Testing against historical validated signals...');
    
    for (let i = 0; i < this.historicalSignals.length; i++) {
      const signal = this.historicalSignals[i];
      
      console.log(`\n🔍 Testing Signal ${i + 1}/${this.historicalSignals.length}`);
      console.log(`   📈 Ratio: ${signal.ratio}x | Volume: ${signal.bidVolume} | Momentum: ${signal.momentum}%`);
      console.log(`   📊 Historical Result: ${signal.result} (${signal.priceChange > 0 ? '+' : ''}${signal.priceChange}%)`);
      
      // Create market data for classification
      const marketData = {
        askToBidRatio: signal.ratio,
        totalBidVolume: signal.bidVolume,
        totalAskVolume: signal.bidVolume * signal.ratio,
        currentPrice: 100, // Normalized price
        momentum: signal.momentum,
        symbol: this.symbol,
        timestamp: new Date().toISOString(),
        historicalResult: signal.result,
        historicalPriceChange: signal.priceChange
      };
      
      // Classify the signal
      const classification = this.classifier.classifyMarketCondition(marketData);
      this.results.totalClassifications++;
      
      if (classification) {
        console.log(`   🧠 v4.0 Classification: ${classification.type}`);
        console.log(`   🎯 Strategy: ${classification.strategy}`);
        console.log(`   💡 Expected: ${classification.classification.expectedOutcome}`);
        
        // Simulate the trade outcome
        await this.simulateTradeOutcome(classification, signal);
      } else {
        console.log(`   ⚪ No signal generated (normal market conditions)`);
      }
    }
  }

  /**
   * Simulate trade outcome for backtesting
   */
  async simulateTradeOutcome(classification, historicalSignal) {
    const actualPriceChange = historicalSignal.priceChange;
    
    if (classification.type === 'TRIFECTA_CONVICTION_SIGNAL') {
      // Short strategy - profit when price goes down
      const profit = -actualPriceChange; // Negative price change = positive profit for short
      classification.backtestResult = {
        profit: profit,
        correct: profit > 0,
        actualPriceChange: actualPriceChange
      };
      
      console.log(`   📉 Trifecta Short: ${profit > 0 ? 'PROFIT' : 'LOSS'} ${profit.toFixed(2)}%`);
      
    } else if (classification.type === 'ABSORPTION_SQUEEZE_SIGNAL') {
      // Long strategy - profit when price goes up
      const profit = actualPriceChange; // Positive price change = positive profit for long
      classification.backtestResult = {
        profit: profit,
        correct: profit > 0,
        actualPriceChange: actualPriceChange
      };
      
      console.log(`   📈 Squeeze Long: ${profit > 0 ? 'PROFIT' : 'LOSS'} ${profit.toFixed(2)}%`);
    }
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformance() {
    console.log('\n📊 Calculating performance metrics...');
    
    // Trifecta performance
    const trifectaResults = this.results.trifectaSignals.map(s => s.backtestResult).filter(Boolean);
    this.results.trifectaPerformance = this.calculateStrategyPerformance(trifectaResults, 'Trifecta Conviction');
    
    // Squeeze performance
    const squeezeResults = this.results.squeezeSignals.map(s => s.backtestResult).filter(Boolean);
    this.results.squeezePerformance = this.calculateStrategyPerformance(squeezeResults, 'Absorption Squeeze');
    
    // Combined performance
    const allResults = [...trifectaResults, ...squeezeResults];
    this.results.combinedPerformance = this.calculateStrategyPerformance(allResults, 'Combined Strategy');
  }

  /**
   * Calculate performance metrics for a strategy
   */
  calculateStrategyPerformance(results, strategyName) {
    if (results.length === 0) {
      return {
        strategyName,
        totalTrades: 0,
        winRate: 0,
        avgProfit: 0,
        totalProfit: 0,
        maxProfit: 0,
        maxLoss: 0
      };
    }
    
    const totalTrades = results.length;
    const winners = results.filter(r => r.correct).length;
    const winRate = (winners / totalTrades) * 100;
    const profits = results.map(r => r.profit);
    const totalProfit = profits.reduce((sum, p) => sum + p, 0);
    const avgProfit = totalProfit / totalTrades;
    const maxProfit = Math.max(...profits);
    const maxLoss = Math.min(...profits);
    
    return {
      strategyName,
      totalTrades,
      winRate: winRate.toFixed(1),
      avgProfit: avgProfit.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      maxProfit: maxProfit.toFixed(2),
      maxLoss: maxLoss.toFixed(2)
    };
  }

  /**
   * Generate comprehensive backtest report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: '4.0',
      symbol: this.symbol,
      testData: {
        totalSignals: this.historicalSignals.length,
        totalClassifications: this.results.totalClassifications,
        trifectaSignals: this.results.trifectaSignals.length,
        squeezeSignals: this.results.squeezeSignals.length
      },
      performance: {
        trifecta: this.results.trifectaPerformance,
        squeeze: this.results.squeezePerformance,
        combined: this.results.combinedPerformance
      },
      conclusion: this.generateConclusion(),
      detailedResults: {
        trifectaSignals: this.results.trifectaSignals,
        squeezeSignals: this.results.squeezeSignals
      }
    };
    
    // Save report
    await fs.writeFile('sentrycoin-v4-backtest-report.json', JSON.stringify(report, null, 2));
    
    // Print summary
    this.printReportSummary(report);
    
    return report;
  }

  /**
   * Generate conclusion based on results
   */
  generateConclusion() {
    const trifecta = this.results.trifectaPerformance;
    const squeeze = this.results.squeezePerformance;
    const combined = this.results.combinedPerformance;
    
    let conclusion = 'ANALYSIS_COMPLETE';
    
    if (parseFloat(trifecta.winRate) >= 80 && parseFloat(squeeze.winRate) >= 60) {
      conclusion = 'DEPLOY_RECOMMENDED';
    } else if (parseFloat(combined.winRate) >= 70) {
      conclusion = 'PROMISING_CONTINUE_DEVELOPMENT';
    } else {
      conclusion = 'NEEDS_REFINEMENT';
    }
    
    return conclusion;
  }

  /**
   * Print report summary
   */
  printReportSummary(report) {
    console.log('\n📋 SENTRYCOIN v4.0 BACKTEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 TRIFECTA CONVICTION STRATEGY (Short):`);
    console.log(`   Trades: ${report.performance.trifecta.totalTrades}`);
    console.log(`   Win Rate: ${report.performance.trifecta.winRate}%`);
    console.log(`   Avg Profit: ${report.performance.trifecta.avgProfit}%`);
    console.log(`   Total Profit: ${report.performance.trifecta.totalProfit}%`);
    
    console.log(`\n🔄 ABSORPTION SQUEEZE STRATEGY (Long):`);
    console.log(`   Trades: ${report.performance.squeeze.totalTrades}`);
    console.log(`   Win Rate: ${report.performance.squeeze.winRate}%`);
    console.log(`   Avg Profit: ${report.performance.squeeze.avgProfit}%`);
    console.log(`   Total Profit: ${report.performance.squeeze.totalProfit}%`);
    
    console.log(`\n📊 COMBINED PERFORMANCE:`);
    console.log(`   Total Trades: ${report.performance.combined.totalTrades}`);
    console.log(`   Win Rate: ${report.performance.combined.winRate}%`);
    console.log(`   Avg Profit: ${report.performance.combined.avgProfit}%`);
    console.log(`   Total Profit: ${report.performance.combined.totalProfit}%`);
    
    console.log(`\n🎯 CONCLUSION: ${report.conclusion}`);
    console.log(`📁 Detailed report saved: sentrycoin-v4-backtest-report.json`);
  }
}

// Run backtesting if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const backtester = new SentryCoinV4Backtester();
  backtester.runBacktest().catch(console.error);
}

export default SentryCoinV4Backtester;
