#!/usr/bin/env node

/**
 * SentryCoin v4.0 - Dual-Strategy Market Microstructure Engine
 * 
 * The evolution from failed crash predictor to sophisticated trading system.
 * Implements the dual-model approach discovered through quantitative analysis:
 * 
 * 1. Trifecta Conviction (Short Strategy) - Premium A+ signals
 * 2. Absorption Squeeze (Long Strategy) - Proprietary alpha generation
 */

import FlashCrashPredictor from './predictor.js';
import MarketClassifier from './market-classifier.js';
import TrifectaTrader from './trifecta-trader.js';
import SqueezeTrader from './squeeze-trader.js';
import DetailedReporter from './detailed-reporter.js';
import ShadowTradingEngine from './shadow-trading-engine.js';
import FeaturePipeline from './feature-pipeline.js';
import WaveletAnalyzer from './wavelet-analyzer.js';
import cloudStorage from './cloud-storage.js';
import { validateEnvironmentVariables, getISTTime } from './utils.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

class SentryCoinV4 {
  constructor() {
    this.symbol = process.env.SYMBOL || 'SPKUSDT';
    this.version = '4.0';
    
    // Core components
    this.predictor = null;
    this.classifier = null;
    this.trifectaTrader = null;
    this.squeezeTrader = null;
    this.reporter = null;
    
    // System state
    this.isRunning = false;
    this.startTime = null;
    
    // Statistics
    this.stats = {
      totalClassifications: 0,
      trifectaSignals: 0,
      squeezeSignals: 0,
      systemUptime: 0
    };
    
    console.log(`🛡️ SentryCoin v${this.version} - Dual-Strategy Engine`);
    console.log(`📊 Symbol: ${this.symbol}`);
    console.log(`🧠 Market Microstructure Classification System`);
    console.log(`🎯 Trifecta Conviction (Short) + Absorption Squeeze (Long)`);
  }

  /**
   * Initialize all system components
   */
  async initialize() {
    console.log('\n🚀 Initializing SentryCoin v4.0 components...');
    
    try {
      // Initialize cloud storage
      await cloudStorage.initialize();
      console.log('✅ Cloud storage initialized');
      
      // Initialize market classifier
      this.classifier = new MarketClassifier(this.symbol);
      console.log('✅ Market classifier initialized');
      
      // Initialize trading modules
      this.trifectaTrader = new TrifectaTrader(this.symbol);
      this.squeezeTrader = new SqueezeTrader(this.symbol);
      console.log('✅ Trading modules initialized');

      // Initialize detailed reporter
      this.reporter = new DetailedReporter(this.symbol);
      console.log('✅ Detailed reporter initialized');

      // Initialize quantitative analysis components
      this.shadowTrading = new ShadowTradingEngine(this.symbol);
      console.log('✅ Shadow trading engine initialized');

      this.featurePipeline = new FeaturePipeline(this.symbol);
      console.log('✅ Feature pipeline initialized');

      this.waveletAnalyzer = new WaveletAnalyzer(this.symbol);
      console.log('✅ Wavelet analyzer initialized');
      
      // Set up event listeners
      this.setupEventListeners();
      console.log('✅ Event system configured');
      
      // Initialize the underlying predictor (for order book data)
      this.predictor = new FlashCrashPredictor();
      
      // Override the predictor's analysis method to use our classifier
      this.overridePredictorAnalysis();
      console.log('✅ Predictor integration complete');
      
      console.log('\n🎉 SentryCoin v4.0 initialization complete!');
      return true;
      
    } catch (error) {
      console.error(`❌ Initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Set up event listeners between components
   */
  setupEventListeners() {
    // Connect classifier to trading modules and reporter
    this.classifier.on('TRIFECTA_CONVICTION_SIGNAL', (signal) => {
      this.stats.trifectaSignals++;
      this.trifectaTrader.handleTrifectaSignal(signal);
      this.reporter.recordTrifectaSignal(signal);

      // Execute shadow trade for P&L tracking
      this.executeShadowTrade(signal, 'SHORT');
    });
    });

    this.classifier.on('ABSORPTION_SQUEEZE_SIGNAL', (signal) => {
      this.stats.squeezeSignals++;
      this.squeezeTrader.handleSqueezeSignal(signal);
      this.reporter.recordSqueezeSignal(signal);

      // Execute shadow trade for P&L tracking
      this.executeShadowTrade(signal, 'LONG');
    });

    // Connect wavelet analyzer for predictive signals
    this.waveletAnalyzer.on('predictiveSignal', (signal) => {
      console.log(`🌊 Predictive cascade signal detected - preparing for potential Trifecta`);
      this.reporter.recordPredictiveSignal(signal);
    });

    this.waveletAnalyzer.on('predictionConfirmed', (confirmation) => {
      console.log(`✅ Wavelet prediction confirmed with ${confirmation.leadTime}s lead time`);
    });

    // Connect trading modules to reporter
    this.trifectaTrader.on('positionOpened', (position) => {
      this.reporter.recordTrade(position);
    });

    this.trifectaTrader.on('positionClosed', (position) => {
      this.reporter.recordTrade(position);
    });

    this.squeezeTrader.on('positionOpened', (position) => {
      this.reporter.recordTrade(position);
    });

    this.squeezeTrader.on('positionClosed', (position) => {
      this.reporter.recordTrade(position);
    });

    console.log('🔗 Event listeners configured');
  }

  /**
   * Override the predictor's analysis to use our v4.0 classifier
   */
  overridePredictorAnalysis() {
    const originalAnalyze = this.predictor.analyzeFlashCrashConditions.bind(this.predictor);
    
    this.predictor.analyzeFlashCrashConditions = () => {
      // Get the standard order book analysis
      const topBids = this.predictor.getTopOrderBookLevels(this.predictor.orderBook.bids, this.predictor.orderBookDepth, 'desc');
      const topAsks = this.predictor.getTopOrderBookLevels(this.predictor.orderBook.asks, this.predictor.orderBookDepth, 'asc');
      
      const totalBidVolume = topBids.reduce((sum, [, quantity]) => sum + quantity, 0);
      const totalAskVolume = topAsks.reduce((sum, [, quantity]) => sum + quantity, 0);
      const askToBidRatio = totalBidVolume > 0 ? totalAskVolume / totalBidVolume : 0;
      const currentPrice = this.predictor.getCurrentPrice();
      
      // Update price history and calculate momentum
      this.predictor.updatePriceHistory(currentPrice);
      const momentum = this.predictor.calculateMomentum();
      
      // Update statistics
      this.predictor.stats.lastRatio = askToBidRatio;
      this.predictor.stats.messagesProcessed++;
      this.stats.totalClassifications++;
      
      // Use our v4.0 classifier instead of the old logic
      const marketData = {
        askToBidRatio,
        totalBidVolume,
        totalAskVolume,
        currentPrice,
        momentum,
        symbol: this.symbol,
        timestamp: new Date().toISOString()
      };
      
      const classification = this.classifier.classifyMarketCondition(marketData);

      // Process through feature pipeline for quantitative analysis
      if (this.featurePipeline) {
        const featureVector = this.featurePipeline.processOrderBookUpdate({
          timestamp: Date.now(),
          bids: orderBook.bids,
          asks: orderBook.asks,
          currentPrice,
          symbol: this.symbol
        });

        // Feed features to wavelet analyzer for predictive signals
        if (featureVector && this.waveletAnalyzer) {
          this.waveletAnalyzer.processFeatureVector(featureVector);
        }
      }

      // Record classification in detailed reporter
      if (this.reporter) {
        this.reporter.recordClassification(classification || {
          type: 'NO_SIGNAL',
          symbol: this.symbol,
          currentPrice,
          askToBidRatio,
          totalBidVolume,
          totalAskVolume,
          momentum
        });
      }

      // Update active positions with current price
      if (this.trifectaTrader && this.squeezeTrader) {
        this.updateAllPositions(currentPrice);
      }
      
      // Log periodic updates
      if (this.predictor.stats.messagesProcessed % 1000 === 0) {
        this.logPeriodicUpdate(askToBidRatio, totalBidVolume, totalAskVolume, currentPrice, momentum);
      }
    };
  }

  /**
   * Execute shadow trade for P&L simulation
   */
  async executeShadowTrade(signal, direction) {
    if (!this.shadowTrading) return;

    try {
      const orderSize = parseFloat(process.env.SHADOW_ORDER_SIZE || '1000'); // $1000 default
      const position = await this.shadowTrading.executeOrder(signal, direction, orderSize);

      // Set up automatic position management
      this.manageShadowPosition(position, signal);

    } catch (error) {
      console.error(`❌ Shadow trade execution failed: ${error.message}`);
    }
  }

  /**
   * Manage shadow position lifecycle
   */
  manageShadowPosition(position, signal) {
    // Set up exit conditions based on signal type
    const exitTimeMs = signal.type === 'TRIFECTA_CONVICTION_SIGNAL' ? 120000 : 300000; // 2min vs 5min

    setTimeout(async () => {
      try {
        const marketData = await this.shadowTrading.getMarketDataAtTime(Date.now());
        await this.shadowTrading.closePosition(position.id, 'TIME_EXIT', marketData);
      } catch (error) {
        console.error(`❌ Shadow position close failed: ${error.message}`);
      }
    }, exitTimeMs);
  }

  /**
   * Update all active positions with current price
   */
  updateAllPositions(currentPrice) {
    // Update Trifecta positions
    for (const positionId of this.trifectaTrader.activePositions.keys()) {
      this.trifectaTrader.updatePosition(positionId, currentPrice);
    }

    // Update Squeeze positions
    for (const positionId of this.squeezeTrader.activePositions.keys()) {
      this.squeezeTrader.updatePosition(positionId, currentPrice);
    }

    // Update shadow positions
    if (this.shadowTrading) {
      const marketData = {
        midPrice: currentPrice,
        bidPrice: currentPrice * 0.999,
        askPrice: currentPrice * 1.001,
        bidVolume: 50000,
        askVolume: 50000
      };

      for (const [positionId] of this.shadowTrading.positions) {
        this.shadowTrading.updatePosition(positionId, marketData);
      }
    }
  }

  /**
   * Log periodic system updates
   */
  logPeriodicUpdate(ratio, bidVolume, askVolume, price, momentum) {
    const istTime = getISTTime();
    const classifierStats = this.classifier.getStats();
    
    console.log(`📊 [${istTime}] v4.0 System Status`);
    console.log(`   💰 ${this.symbol}: $${price.toFixed(6)} | Ratio: ${ratio.toFixed(2)}x | Momentum: ${momentum.toFixed(2)}%`);
    console.log(`   🧠 Classifications: ${classifierStats.totalClassifications} | Signals: ${classifierStats.signalRate}%`);
    console.log(`   🎯 Trifecta: ${this.stats.trifectaSignals} | Squeeze: ${this.stats.squeezeSignals}`);
    
    // Show active positions
    const activeTrifecta = this.trifectaTrader.activePositions.size;
    const activeSqueeze = this.squeezeTrader.activePositions.size;
    if (activeTrifecta > 0 || activeSqueeze > 0) {
      console.log(`   📈 Active Positions: ${activeTrifecta} Trifecta, ${activeSqueeze} Squeeze`);
    }
  }

  /**
   * Start the v4.0 system
   */
  async start() {
    console.log('\n🚀 Starting SentryCoin v4.0 Dual-Strategy Engine...');
    
    // Validate environment
    const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
    const missing = validateEnvironmentVariables(required);
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing);
      return false;
    }
    
    // Initialize components
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize system');
      return false;
    }
    
    // Start the underlying predictor
    try {
      await this.predictor.start();
      this.isRunning = true;
      this.startTime = Date.now();
      
      console.log('\n✅ SentryCoin v4.0 is now running!');
      console.log('🧠 Market Classification Engine: ACTIVE');
      console.log('🎯 Trifecta Conviction Trader: MONITORING');
      console.log('🔄 Absorption Squeeze Trader: MONITORING');
      console.log('📊 Detailed Reporter: RECORDING');

      // Start detailed reporting
      this.reporter.startReporting();
      this.reporter.recordSystemEvent('SYSTEM_STARTED', { version: this.version, symbol: this.symbol });

      // Start periodic reporting
      this.startPeriodicReporting();
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to start system: ${error.message}`);
      return false;
    }
  }

  /**
   * Start periodic system reporting
   */
  startPeriodicReporting() {
    setInterval(() => {
      this.generateSystemReport();
    }, 300000); // Every 5 minutes
  }

  /**
   * Generate comprehensive system report
   */
  generateSystemReport() {
    const istTime = getISTTime();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    console.log('\n📋 SENTRYCOIN v4.0 SYSTEM REPORT');
    console.log('═'.repeat(50));
    console.log(`⏰ Time: ${istTime} | Uptime: ${uptime}s`);
    
    // Classification stats
    const classifierStats = this.classifier.getStats();
    console.log(`🧠 Classifier: ${classifierStats.totalClassifications} total, ${classifierStats.signalRate}% signal rate`);
    
    // Trading stats
    const trifectaStats = this.trifectaTrader.getStats();
    const squeezeStats = this.squeezeTrader.getStats();
    
    console.log(`🎯 Trifecta: ${trifectaStats.signalsReceived} signals, ${trifectaStats.winRate} win rate, ${trifectaStats.totalPnL.toFixed(2)} P&L`);
    console.log(`🔄 Squeeze: ${squeezeStats.signalsReceived} signals, ${squeezeStats.winRate} win rate, ${squeezeStats.totalPnL.toFixed(2)} P&L`);
    
    console.log('═'.repeat(50));
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    return {
      version: this.version,
      symbol: this.symbol,
      isRunning: this.isRunning,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      classifier: this.classifier ? this.classifier.getStats() : null,
      trifectaTrader: this.trifectaTrader ? this.trifectaTrader.getStats() : null,
      squeezeTrader: this.squeezeTrader ? this.squeezeTrader.getStats() : null,
      shadowTrading: this.shadowTrading ? this.shadowTrading.getPerformanceStats() : null,
      featurePipeline: this.featurePipeline ? this.featurePipeline.getStats() : null,
      waveletAnalyzer: this.waveletAnalyzer ? this.waveletAnalyzer.getStats() : null,
      cloudStorage: cloudStorage.getStats()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\n🛑 Shutting down SentryCoin v4.0...');

    // Generate final session report
    if (this.reporter) {
      this.reporter.recordSystemEvent('SYSTEM_SHUTDOWN', { uptime: Math.floor((Date.now() - this.startTime) / 1000) });
      await this.reporter.generateSessionReport();
      this.reporter.stopReporting();
      console.log('📊 Final session report generated');
    }

    if (this.predictor) {
      this.predictor.shutdown();
    }

    this.isRunning = false;
    console.log('✅ SentryCoin v4.0 shutdown complete');
  }
}

export default SentryCoinV4;
