/**
 * SentryCoin v5.0 - "Apex Predator" Market Intelligence Engine
 *
 * Advanced multi-strategy orchestration platform that coordinates:
 * - Multiple concurrent trading strategies (CASCADE_HUNTER, ETH_UNWIND, etc.)
 * - Enhanced market regime detection and classification
 * - Sophisticated conflict resolution and signal management
 * - Real-time derivatives and on-chain intelligence
 * - Comprehensive risk management and position tracking
 * - Advanced reporting and forensic analysis
 */

import FlashCrashPredictor from './predictor.js';
import MarketClassifier from './market-classifier.js';
import StrategyManager from './strategy-manager.js';
import CascadeHunterTrader from '../strategies/cascade-hunter-trader.js';
import CoilWatcher from '../strategies/coil-watcher.js';
import ShakeoutDetector from '../strategies/shakeout-detector.js';
import EthUnwindStrategy from '../strategies/eth-unwind.js';
import DetailedReporter from '../reporting/detailed-reporter.js';
import ManipulationDetector from '../services/manipulation-detector.js';
import OnChainMonitor from '../services/onchain-monitor.js';
import WashTradeDetector from '../services/wash-trade-detector.js';
import DerivativesMonitor from '../services/derivatives-monitor.js';
import cloudStorage from '../services/cloud-storage.js';
import { getISTTime, formatPrice, formatPriceWithSymbol } from '../utils/index.js';

class SentryCoinEngine {
  constructor(config = null) {
    // Use provided config or fallback to environment variables
    this.config = config;
    this.symbol = config?.trading?.symbol || process.env.SYMBOL || 'SPKUSDT';
    this.version = '5.0.0'; // Upgraded to v5.0

    // v5.0 Core components - Multi-strategy architecture
    this.predictor = null;
    this.classifier = null;
    this.strategyManager = null;
    this.derivativesMonitor = null;
    this.reporter = null;

    // Legacy strategy components (managed by StrategyManager)
    this.cascadeHunterTrader = null;
    this.coilWatcher = null;
    this.shakeoutDetector = null;
    this.ethUnwindStrategy = null;

    // System state
    this.isRunning = false;
    this.startTime = null;

    // v5.0 Enhanced data aggregation
    this.marketData = {
      price: 0,
      orderBook: null,
      momentum: 0,
      derivativesData: null,
      onChainData: null,
      lastUpdate: 0
    };

    // HFT-OPTIMIZED: Cross-signal validation state (legacy compatibility)
    this.lastShakeoutSignalTime = 0;
    this.enableSignalVeto = process.env.ENABLE_CONFLICT_VETO === 'true';
    this.conflictVetoDurationMs = parseInt(process.env.CONFLICT_VETO_DURATION_MILLISECONDS || '5000');

    // v5.0 Performance statistics
    this.stats = {
      totalClassifications: 0,
      strategiesActive: 0,
      signalsProcessed: 0,
      signalsExecuted: 0,
      conflictsResolved: 0,
      systemUptime: 0,
      // Legacy compatibility
      cascadeHunterSignals: 0,
      coilWatcherSignals: 0,
      shakeoutDetectorSignals: 0
    };

    console.log(`🛡️ SentryCoin v${this.version} - "Apex Predator" Market Intelligence Engine`);
    console.log(`📊 Primary Symbol: ${this.symbol}`);
    console.log(`🎯 Multi-Strategy Orchestration Platform`);
  }

  /**
   * Initialize all system components for v5.0
   */
  async initialize() {
    console.log('\n🚀 Initializing SentryCoin v5.0 "Apex Predator" components...');

    try {
      // Initialize cloud storage
      await cloudStorage.initialize();
      console.log('✅ Cloud storage initialized');

      // Initialize market regime classifier with config
      this.classifier = new MarketClassifier(this.symbol, this.config);
      console.log('✅ Market regime classifier initialized');

      // v5.0 NEW: Initialize Strategy Manager
      this.strategyManager = new StrategyManager(this.config);
      console.log('✅ v5.0 Strategy Manager initialized');

      // v5.0 NEW: Initialize Derivatives Monitor
      if (this.config.dataServices?.derivatives?.enabled) {
        this.derivativesMonitor = new DerivativesMonitor(this.config.dataServices.derivatives);
        await this.derivativesMonitor.start();
        console.log('✅ v5.0 Derivatives Monitor started');
      }

      // Initialize strategy modules and register with Strategy Manager
      await this.initializeStrategies();
      console.log('✅ v5.0 Strategy modules initialized and registered');

      // v4.6 PREDATORY INTELLIGENCE: Always initialize (critical for strategy)
      this.manipulationDetector = new ManipulationDetector({ symbol: this.symbol });
      this.onChainMonitor = new OnChainMonitor({ symbol: this.symbol });
      this.washTradeDetector = new WashTradeDetector({ symbol: this.symbol });
      console.log('✅ v4.6 Predatory intelligence suite initialized');

      // Start predatory whale monitoring (always enabled)
      await this.onChainMonitor.start();
      console.log('✅ Predatory whale monitoring started');

      // Set up wash trade detection events
      this.washTradeDetector.on('WASH_TRADING_DETECTED', (data) => {
        console.log(`🚫 WASH TRADING DETECTED: Score ${data.score}% - Trading temporarily disabled`);
        this.onChainMonitor.enterDefensiveMode('Wash trading detected');
      });

      // Initialize detailed reporter
      this.reporter = new DetailedReporter(this.symbol);
      console.log('✅ Detailed reporter initialized');

      // Set up v5.0 event listeners
      this.setupEventListeners();
      console.log('✅ v5.0 Event system configured');

      // Initialize the underlying predictor
      this.predictor = new FlashCrashPredictor();
      this.overridePredictorAnalysis();
      console.log('✅ Predictor integration complete');

      console.log('\n🎉 SentryCoin v5.0 "Apex Predator" initialization complete!');
      console.log(`🎯 Active Strategies: ${this.stats.strategiesActive}`);
      return true;

    } catch (error) {
      console.error(`❌ v5.0 Initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * v5.0 NEW: Initialize and register strategies with Strategy Manager
   */
  async initializeStrategies() {
    const enabledStrategies = this.config.strategies?.enabled || ['CASCADE_HUNTER'];

    console.log(`🎯 Initializing strategies: ${enabledStrategies.join(', ')}`);

    // Initialize CASCADE_HUNTER (legacy compatibility)
    if (enabledStrategies.includes('CASCADE_HUNTER')) {
      this.cascadeHunterTrader = new CascadeHunterTrader(this.symbol, this.config);
      this.strategyManager.registerStrategy('CASCADE_HUNTER', this.cascadeHunterTrader);
      this.stats.strategiesActive++;
    }

    // Initialize COIL_WATCHER (legacy compatibility)
    if (enabledStrategies.includes('COIL_WATCHER')) {
      this.coilWatcher = new CoilWatcher(this.symbol);
      this.strategyManager.registerStrategy('COIL_WATCHER', this.coilWatcher);
      this.stats.strategiesActive++;
    }

    // Initialize SHAKEOUT_DETECTOR (legacy compatibility)
    if (enabledStrategies.includes('SHAKEOUT_DETECTOR')) {
      this.shakeoutDetector = new ShakeoutDetector(this.symbol);
      this.strategyManager.registerStrategy('SHAKEOUT_DETECTOR', this.shakeoutDetector);
      this.stats.strategiesActive++;
    }

    // v5.0 NEW: Initialize ETH_UNWIND strategy
    if (enabledStrategies.includes('ETH_UNWIND') && this.config.strategies?.ethUnwind?.enabled) {
      this.ethUnwindStrategy = new EthUnwindStrategy(this.config.strategies.ethUnwind);
      this.strategyManager.registerStrategy('ETH_UNWIND', this.ethUnwindStrategy);
      this.stats.strategiesActive++;
      console.log('✅ ETH_UNWIND macro strategy initialized');
    }

    console.log(`✅ ${this.stats.strategiesActive} strategies registered with Strategy Manager`);
  }

  /**
   * Set up v5.0 event listeners for multi-strategy orchestration
   */
  setupEventListeners() {
    // v5.0 NEW: Strategy Manager event listeners
    this.strategyManager.on('signalExecuted', (data) => {
      this.stats.signalsExecuted++;
      console.log(`✅ Signal executed: ${data.signal.strategyId} - ${data.signal.action}`);

      // Update legacy stats for compatibility
      if (data.signal.strategyId === 'CASCADE_HUNTER') {
        this.stats.cascadeHunterSignals++;
      }

      // Record in reporter
      if (this.reporter) {
        this.reporter.recordSignalExecution(data);
      }
    });

    this.strategyManager.on('signalRejected', (data) => {
      this.stats.conflictsResolved++;
      console.log(`🚫 Signal rejected: ${data.signal.strategyId} - ${data.reason}`);

      // Record in reporter
      if (this.reporter) {
        this.reporter.recordSignalRejection(data);
      }
    });

    this.strategyManager.on('strategyError', (data) => {
      console.error(`❌ Strategy error: ${data.strategyId} - ${data.error.message}`);

      // Record in reporter
      if (this.reporter) {
        this.reporter.recordStrategyError(data);
      }
    });

    // v5.0 NEW: Derivatives Monitor event listeners
    if (this.derivativesMonitor) {
      this.derivativesMonitor.on('dataUpdated', (data) => {
        this.marketData.derivativesData = data;
        this.marketData.lastUpdate = Date.now();

        // Distribute to Strategy Manager
        this.strategyManager.distributeMarketData(this.marketData);
      });

      this.derivativesMonitor.on('OI_ATH', (alert) => {
        console.log(`🚨 DERIVATIVES ALERT: ${alert.message}`);
        if (this.reporter) {
          this.reporter.recordAlert('DERIVATIVES', alert);
        }
      });

      this.derivativesMonitor.on('FUNDING_SPIKE', (alert) => {
        console.log(`🚨 FUNDING SPIKE: ${alert.message}`);
        if (this.reporter) {
          this.reporter.recordAlert('DERIVATIVES', alert);
        }
      });

      this.derivativesMonitor.on('ELR_DANGER', (alert) => {
        console.log(`🚨 LEVERAGE DANGER: ${alert.message}`);
        if (this.reporter) {
          this.reporter.recordAlert('DERIVATIVES', alert);
        }
      });
    }

    // Legacy classifier event listeners (for backward compatibility)
    this.classifier.on('CASCADE_HUNTER_SIGNAL', (signal) => {
      // Convert legacy signal to v5.0 format and route through Strategy Manager
      this.handleLegacySignal('CASCADE_HUNTER', signal);
    });

    this.classifier.on('COIL_WATCHER_SIGNAL', (signal) => {
      this.handleLegacySignal('COIL_WATCHER', signal);
    });

    this.classifier.on('SHAKEOUT_DETECTOR_SIGNAL', (signal) => {
      this.handleLegacySignal('SHAKEOUT_DETECTOR', signal);
    });

    // Legacy event handlers for backward compatibility
    this.classifier.on('TRIFECTA_CONVICTION_SIGNAL', (signal) => {
      // Redirect to CASCADE_HUNTER
      this.handleLegacySignal('CASCADE_HUNTER', signal);
    });

    // v4.4 FORENSIC INTELLIGENCE: Manipulation detection event listeners
    if (this.manipulationDetector) {
      this.manipulationDetector.on('SPOOFING_DETECTED', (data) => {
        console.log(`🚨 SPOOFING MANIPULATION DETECTED! Entering defensive mode for ${data.defensiveModeUntil - Date.now()}ms`);
        // Notify all strategies through Strategy Manager
        this.strategyManager.distributeMarketData({
          ...this.marketData,
          manipulationAlert: data
        });
      });
    }

    if (this.onChainMonitor) {
      this.onChainMonitor.on('WHALE_INFLOW', (data) => {
        console.log(`🐋 WHALE INFLOW: ${data.amount} SPK - CASCADE signals now HIGH PRIORITY`);
        this.marketData.onChainData = { ...this.marketData.onChainData, whaleInflow: data };
        this.strategyManager.distributeMarketData(this.marketData);
      });

      this.onChainMonitor.on('WHALE_OUTFLOW', (data) => {
        console.log(`🐋 WHALE OUTFLOW: ${data.amount} SPK - Potentially bullish signal`);
        this.marketData.onChainData = { ...this.marketData.onChainData, whaleOutflow: data };
        this.strategyManager.distributeMarketData(this.marketData);
      });
    }

    console.log('🔗 v5.0 Multi-strategy event listeners configured');
  }

  /**
   * v5.0 NEW: Handle legacy signals and convert to new format
   */
  handleLegacySignal(strategyId, signal) {
    this.stats.signalsProcessed++;
    this.stats.totalClassifications = this.classifier.stats.totalClassifications;

    // Apply legacy validation logic
    const validationResult = this.validateLegacySignal(strategyId, signal);

    if (!validationResult.approved) {
      console.log(`🚫 Legacy ${strategyId} signal blocked: ${validationResult.reason}`);
      if (this.reporter) {
        this.reporter.recordSignalRejection({
          signal: { ...signal, strategyId },
          reason: validationResult.reason
        });
      }
      return;
    }

    // Convert to v5.0 signal format and emit through strategy
    const strategy = this.strategyManager.strategies.get(strategyId);
    if (strategy && strategy.instance) {
      // Emit signal through the strategy instance
      strategy.instance.emit('signal', {
        action: this.mapLegacyAction(strategyId, signal),
        confidence: signal.confidence || 0.8,
        triggers: signal.triggers || [signal.type],
        targetPrice: signal.targetPrice,
        stopLossPrice: signal.stopLossPrice,
        symbol: signal.symbol || this.symbol,
        currentPrice: signal.currentPrice,
        reasoning: signal.reasoning || `Legacy ${strategyId} signal`,
        metadata: signal
      });
    }
  }

  /**
   * Validate legacy signals with existing logic
   */
  validateLegacySignal(strategyId, signal) {
    // v4.6 CRITICAL: Check wash trading first (ignore fake volume)
    const washAssessment = this.washTradeDetector.getWashAssessment();
    if (washAssessment.shouldDisableTrading) {
      return {
        approved: false,
        reason: `Wash trading detected (${washAssessment.washScore.toFixed(1)}%)`
      };
    }

    // v4.6: Check predatory system state (only trade in HUNTING mode)
    const systemState = this.onChainMonitor.getSystemState();
    if (!systemState.allowTrading) {
      return {
        approved: false,
        reason: `System in ${systemState.state} mode - no whale activity`
      };
    }

    // CRITICAL FIX: Check for conflicting signals before trading
    if (strategyId === 'CASCADE_HUNTER' && this.shouldVetoCascadeSignal()) {
      return {
        approved: false,
        reason: 'Recent SHAKEOUT signal detected'
      };
    }

    // v4.4 FORENSIC INTELLIGENCE: Validate against manipulation patterns
    if (this.manipulationDetector) {
      const manipulationAssessment = this.manipulationDetector.getManipulationAssessment();

      // Block trades during active spoofing
      if (manipulationAssessment.spoofingDetected) {
        return {
          approved: false,
          reason: `Active spoofing detected (${manipulationAssessment.spoofCount} spoofs)`
        };
      }

      // Enhance signal confidence with whale inflow data
      if (manipulationAssessment.whaleInflowActive) {
        signal.confidence = 'VERY_HIGH';
        signal.whaleInflowConfirmed = true;
      } else if (process.env.REQUIRE_WHALE_CONFIRMATION === 'true') {
        return {
          approved: false,
          reason: 'No whale inflow confirmation'
        };
      }

      // Add manipulation risk to signal
      signal.manipulationRisk = manipulationAssessment.riskLevel;
    }

    return { approved: true, reason: 'Validation passed' };
  }

  /**
   * Map legacy signal types to v5.0 actions
   */
  mapLegacyAction(strategyId, signal) {
    if (strategyId === 'CASCADE_HUNTER' || strategyId === 'TRIFECTA_CONVICTION') {
      return 'ENTER_SHORT';
    }
    if (strategyId === 'COIL_WATCHER' || strategyId === 'SHAKEOUT_DETECTOR') {
      return 'ALERT_ONLY';
    }
    return 'ALERT_ONLY';
  }

  /**
   * HFT-OPTIMIZED: Smart conflict resolution (not blanket blocking)
   */
  shouldVetoCascadeSignal() {
    if (!this.enableSignalVeto) {
      return false;
    }

    const now = Date.now();
    const timeSinceShakeout = now - this.lastShakeoutSignalTime;

    if (timeSinceShakeout < this.conflictVetoDurationMs) {
      const remainingVeto = Math.ceil((this.conflictVetoDurationMs - timeSinceShakeout) / 1000);
      console.log(`⚠️ CONFLICT VETO active (${remainingVeto} seconds remaining) - CASCADE signals blocked`);
      return true;
    }

    return false;
  }

  /**
   * Override predictor analysis to use v5.0 multi-strategy architecture
   */
  overridePredictorAnalysis() {
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

      // v5.0 NEW: Update market data structure
      this.marketData.price = currentPrice;
      this.marketData.orderBook = {
        bids: this.predictor.orderBook.bids,
        asks: this.predictor.orderBook.asks,
        totalBidVolume,
        totalAskVolume,
        askToBidRatio
      };
      this.marketData.momentum = momentum;
      this.marketData.lastUpdate = Date.now();

      // v4.4 FORENSIC INTELLIGENCE: Analyze for manipulation patterns
      if (this.manipulationDetector) {
        const orderBookData = {
          bids: this.predictor.orderBook.bids,
          asks: this.predictor.orderBook.asks,
          timestamp: Date.now()
        };
        this.manipulationDetector.analyzeOrderBookForSpoofing(orderBookData);
      }

      // Use classifier for legacy signal generation
      const classificationData = {
        askToBidRatio,
        totalBidVolume,
        totalAskVolume,
        currentPrice,
        momentum,
        symbol: this.symbol,
        timestamp: new Date().toISOString()
      };

      const classification = this.classifier.classifyMarketCondition(classificationData);

      // v5.0 NEW: Distribute market data to Strategy Manager
      if (this.strategyManager) {
        this.strategyManager.distributeMarketData(this.marketData);
      }

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

      // Update positions (legacy compatibility)
      this.updateAllPositions(currentPrice);

      // Periodic logging
      if (this.predictor.stats.messagesProcessed % 1000 === 0) {
        this.logPeriodicUpdate(askToBidRatio, totalBidVolume, totalAskVolume, currentPrice, momentum);
      }
    };
  }

  /**
   * Update all active positions with current price (v4.1)
   * CRITICAL: Implements fault tolerance to prevent system crashes
   */
  updateAllPositions(currentPrice) {
    if (!currentPrice) {
      return;
    }

    const activeTraders = [
      { name: 'CascadeHunterTrader', instance: this.cascadeHunterTrader }
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
   * Log periodic system updates (v4.1)
   */
  logPeriodicUpdate(ratio, bidVolume, askVolume, price, momentum) {
    const istTime = getISTTime();
    console.log(`📊 [${istTime}] Ratio: ${ratio.toFixed(2)}x | Price: ${formatPriceWithSymbol(price)} | Momentum: ${momentum.toFixed(3)}%`);
    console.log(`   💰 Bid: ${bidVolume.toFixed(0)} | Ask: ${askVolume.toFixed(0)} | Signals: CASCADE:${this.stats.cascadeHunterSignals} COIL:${this.stats.coilWatcherSignals} SHAKEOUT:${this.stats.shakeoutDetectorSignals}`);
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
   * Shutdown the trading engine v5.0
   */
  async shutdown() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Shutting down SentryCoin v5.0 "Apex Predator"...');

    try {
      // v5.0 NEW: Shutdown Strategy Manager first
      if (this.strategyManager) {
        await this.strategyManager.shutdown();
        console.log('✅ Strategy Manager shutdown complete');
      }

      // v5.0 NEW: Stop Derivatives Monitor
      if (this.derivativesMonitor) {
        this.derivativesMonitor.stop();
        console.log('✅ Derivatives Monitor stopped');
      }

      // Shutdown predictor
      if (this.predictor) {
        this.predictor.shutdown();
        console.log('✅ Predictor shutdown complete');
      }

      // Stop reporter and generate final report
      if (this.reporter) {
        this.reporter.stopReporting();
        await this.reporter.generateSessionReport();
        console.log('✅ Final session report generated');
      }

      // Stop on-chain monitoring
      if (this.onChainMonitor) {
        await this.onChainMonitor.stop();
        console.log('✅ On-chain monitoring stopped');
      }

      this.isRunning = false;
      console.log('✅ SentryCoin v5.0 shutdown complete');

    } catch (error) {
      console.error(`❌ Error during v5.0 shutdown: ${error.message}`);
    }
  }

  /**
   * Get comprehensive v5.0 system status
   */
  getSystemStatus() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;

    return {
      version: this.version,
      symbol: this.symbol,
      isRunning: this.isRunning,
      uptime: Math.floor(uptime / 1000),
      stats: this.stats,

      // v5.0 NEW: Multi-strategy status
      strategyManager: this.strategyManager?.getPerformanceSummary(),
      derivativesMonitor: this.derivativesMonitor?.getStats(),

      // Core components
      classifier: this.classifier?.getStats(),
      predictor: this.predictor?.stats,

      // Legacy strategy compatibility
      cascadeHunterTrader: this.cascadeHunterTrader?.getStats(),
      coilWatcher: this.coilWatcher?.getStats(),
      shakeoutDetector: this.shakeoutDetector?.getStats(),
      ethUnwindStrategy: this.ethUnwindStrategy?.getStats(),

      // Market data status
      marketData: {
        lastUpdate: this.marketData.lastUpdate,
        price: this.marketData.price,
        hasDerivativesData: !!this.marketData.derivativesData,
        hasOnChainData: !!this.marketData.onChainData
      },

      timestamp: new Date().toISOString()
    };
  }
}

export default SentryCoinEngine;
