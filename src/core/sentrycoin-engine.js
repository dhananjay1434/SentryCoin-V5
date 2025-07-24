/**
 * SentryCoin v4.1 - Core Market Intelligence Engine
 *
 * Unified market intelligence platform that orchestrates all system components:
 * - Market regime detection and classification
 * - Three-strategy execution (CASCADE_HUNTER + Alert-Only modules)
 * - Risk management and position tracking
 * - Real-time monitoring and comprehensive reporting
 */

import FlashCrashPredictor from './predictor.js';
import MarketClassifier from './market-classifier.js';
import CascadeHunterTrader from '../strategies/cascade-hunter-trader.js';
import CoilWatcher from '../strategies/coil-watcher.js';
import ShakeoutDetector from '../strategies/shakeout-detector.js';
import DetailedReporter from '../reporting/detailed-reporter.js';
import cloudStorage from '../services/cloud-storage.js';
import { getISTTime, formatPrice, formatPriceWithSymbol } from '../utils/index.js';

class SentryCoinEngine {
  constructor(config = null) {
    // Use provided config or fallback to environment variables
    this.config = config;
    this.symbol = config?.trading?.symbol || process.env.SYMBOL || 'SPKUSDT';
    this.version = config?.system?.version || '4.1.0';

    // v4.1 Core components
    this.predictor = null;
    this.classifier = null;
    this.cascadeHunterTrader = null;
    this.coilWatcher = null;
    this.shakeoutDetector = null;
    this.reporter = null;
    
    // System state
    this.isRunning = false;
    this.startTime = null;
    
    // v4.1 Performance statistics
    this.stats = {
      totalClassifications: 0,
      cascadeHunterSignals: 0,
      coilWatcherSignals: 0,
      shakeoutDetectorSignals: 0,
      systemUptime: 0
    };

    console.log(`🛡️ SentryCoin v${this.version} - Market Intelligence Engine`);
    console.log(`📊 Symbol: ${this.symbol}`);
  }

  /**
   * Initialize all system components
   */
  async initialize() {
    console.log('\n🚀 Initializing SentryCoin v4.1 components...');

    try {
      // Initialize cloud storage
      await cloudStorage.initialize();
      console.log('✅ Cloud storage initialized');

      // Initialize market regime classifier with config
      this.classifier = new MarketClassifier(this.symbol, this.config);
      console.log('✅ Market regime classifier initialized');

      // Initialize v4.1 strategy modules
      this.cascadeHunterTrader = new CascadeHunterTrader(this.symbol, this.config);
      this.coilWatcher = new CoilWatcher(this.symbol);
      this.shakeoutDetector = new ShakeoutDetector(this.symbol);
      console.log('✅ v4.1 Strategy modules initialized');

      // Initialize detailed reporter
      this.reporter = new DetailedReporter(this.symbol);
      console.log('✅ Detailed reporter initialized');

      // Set up event listeners
      this.setupEventListeners();
      console.log('✅ Event system configured');

      // Initialize the underlying predictor
      this.predictor = new FlashCrashPredictor();
      this.overridePredictorAnalysis();
      console.log('✅ Predictor integration complete');

      console.log('\n🎉 SentryCoin v4.1 initialization complete!');
      return true;
      
    } catch (error) {
      console.error(`❌ Initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Set up v4.1 event listeners between components
   */
  setupEventListeners() {
    // Connect classifier to v4.1 strategy modules and reporter

    // CASCADE_HUNTER: Active SHORT trading for Distribution Phase
    this.classifier.on('CASCADE_HUNTER_SIGNAL', (signal) => {
      this.stats.cascadeHunterSignals++;
      this.cascadeHunterTrader.handleCascadeSignal(signal);
      this.reporter.recordCascadeSignal(signal);
    });

    // COIL_WATCHER: Alert-only for Accumulation/Manipulation Phase
    this.classifier.on('COIL_WATCHER_SIGNAL', (signal) => {
      this.stats.coilWatcherSignals++;
      this.coilWatcher.handleCoilSignal(signal);
      this.reporter.recordCoilSignal(signal);
    });

    // SHAKEOUT_DETECTOR: Alert-only for Stop Hunt Phase
    this.classifier.on('SHAKEOUT_DETECTOR_SIGNAL', (signal) => {
      this.stats.shakeoutDetectorSignals++;
      this.shakeoutDetector.handleShakeoutSignal(signal);
      this.reporter.recordShakeoutSignal(signal);
    });

    // Connect CASCADE_HUNTER trader to reporter
    this.cascadeHunterTrader.on('positionOpened', (position) => {
      this.reporter.recordTrade(position);
    });

    this.cascadeHunterTrader.on('positionClosed', (position) => {
      this.reporter.recordTrade(position);
    });

    // Legacy event handlers for backward compatibility
    this.classifier.on('TRIFECTA_CONVICTION_SIGNAL', (signal) => {
      // Redirect to CASCADE_HUNTER
      this.stats.cascadeHunterSignals++;
      this.cascadeHunterTrader.handleTrifectaSignal(signal);
      this.reporter.recordCascadeSignal(signal);
    });

    console.log('🔗 v4.1 Event listeners configured');
  }

  /**
   * Override predictor analysis to use v4.0 classifier
   */
  overridePredictorAnalysis() {
    const originalAnalyze = this.predictor.analyzeFlashCrashConditions.bind(this.predictor);
    
    this.predictor.analyzeFlashCrashConditions = () => {
      // Get standard order book analysis
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
      
      // Use v4.0 classifier
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

      // Record classification
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

      // Update positions
      if (this.trifectaTrader && this.squeezeTrader) {
        this.updateAllPositions(currentPrice);
      }
      
      // Periodic logging
      if (this.predictor.stats.messagesProcessed % 1000 === 0) {
        this.logPeriodicUpdate(askToBidRatio, totalBidVolume, totalAskVolume, currentPrice, momentum);
      }
    };
  }

  /**
   * Update all active positions with current price
   * CRITICAL: Implements fault tolerance to prevent system crashes
   */
  updateAllPositions(currentPrice) {
    if (!currentPrice) {
      return;
    }

    const activeTraders = [
      { name: 'TrifectaTrader', instance: this.trifectaTrader },
      { name: 'SqueezeTrader', instance: this.squeezeTrader }
    ];

    for (const trader of activeTraders) {
      try {
        // Defensive programming: Check if trader exists and has the required method
        if (trader.instance && typeof trader.instance.updatePositions === 'function') {
          trader.instance.updatePositions(currentPrice);
        } else if (trader.instance) {
          console.warn(`⚠️ ${trader.name} missing updatePositions method - skipping position updates`);
        }
      } catch (error) {
        // CRITICAL: Log the error but DO NOT re-throw it
        // This prevents a single trader failure from crashing the entire system
        console.error(`❌ CRITICAL ERROR in ${trader.name}. Module will continue but position updates disabled:`, error.message);
        console.error(`   Stack trace:`, error.stack);

        // Optional: Implement trader disabling logic for this session
        // trader.instance._disabled = true;
      }
    }
  }

  /**
   * Log periodic system updates
   */
  logPeriodicUpdate(ratio, bidVolume, askVolume, price, momentum) {
    const istTime = getISTTime();
    console.log(`📊 [${istTime}] Ratio: ${ratio.toFixed(2)}x | Price: ${formatPriceWithSymbol(price)} | Momentum: ${momentum.toFixed(3)}%`);
    console.log(`   💰 Bid: ${bidVolume.toFixed(0)} | Ask: ${askVolume.toFixed(0)} | Signals: T:${this.stats.trifectaSignals} S:${this.stats.squeezeSignals} P:${this.stats.pressureSpikes}`);
  }

  /**
   * Start the trading engine
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ System already running');
      return true;
    }

    const initialized = await this.initialize();
    if (!initialized) {
      return false;
    }

    try {
      await this.predictor.start();
      this.reporter.startReporting();
      
      this.isRunning = true;
      this.startTime = Date.now();
      
      console.log('🎉 SentryCoin v4.1 is fully operational!');
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to start system: ${error.message}`);
      return false;
    }
  }

  /**
   * Shutdown the trading engine
   */
  async shutdown() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Shutting down SentryCoin v4.1...');
    
    try {
      if (this.predictor) {
        await this.predictor.shutdown();
      }
      
      if (this.reporter) {
        this.reporter.stopReporting();
        await this.reporter.generateSessionReport();
      }
      
      this.isRunning = false;
      console.log('✅ Shutdown complete');
      
    } catch (error) {
      console.error(`❌ Error during shutdown: ${error.message}`);
    }
  }

  /**
   * Get comprehensive v4.1 system status
   */
  getSystemStatus() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;

    return {
      version: this.version,
      symbol: this.symbol,
      isRunning: this.isRunning,
      uptime: Math.floor(uptime / 1000),
      stats: this.stats,
      classifier: this.classifier?.getStats(),
      cascadeHunterTrader: this.cascadeHunterTrader?.getStats(),
      coilWatcher: this.coilWatcher?.getStats(),
      shakeoutDetector: this.shakeoutDetector?.getStats(),
      predictor: this.predictor?.stats,
      timestamp: new Date().toISOString()
    };
  }
}

export default SentryCoinEngine;
