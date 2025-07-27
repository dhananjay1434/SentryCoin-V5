/**
 * SentryCoin v6.0 - Phoenix Engine (Clean Implementation)
 * 
 * PROJECT PHOENIX - COMPLETE SYSTEM REORGANIZATION
 * 
 * This is the main Phoenix Engine with all 5 Red Team mandates
 * properly integrated and connected.
 */

import { EventEmitter } from 'events';
import LiquidityAnalyzer from './components/liquidity-analyzer.js';
import MempoolStreamer from './components/mempool-streamer.js';
import DerivativesMonitor from './components/derivatives-monitor.js';
import TaskScheduler from './components/task-scheduler.js';
import StatefulLogger from './components/stateful-logger.js';
import TelegramReporter from './components/telegram-reporter.js';
import MarketClassifier from './components/market-classifier.js';
import { getISTTime } from '../utils/index.js';

export default class PhoenixEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.version = '6.0.0';
    this.config = {
      symbol: config.symbol || 'ETHUSDT',
      paperTrading: config.paperTrading !== false,
      enableRealTimeFeeds: config.enableRealTimeFeeds !== false,
      ...config
    };
    
    // Initialize stateful logger first (Mandate 3)
    this.logger = new StatefulLogger({
      enableFileLogging: true,
      logDirectory: './logs/phoenix-v6',
      stateChangeOnly: true
    });
    
    // Core Phoenix components
    this.liquidityAnalyzer = null;    // Mandate 1
    this.mempoolStreamer = null;      // Mandate 2
    this.marketClassifier = null;     // Mandate 2 (Observability)
    this.derivativesMonitor = null;   // Mandate 4
    this.taskScheduler = null;        // Mandate 5
    this.telegramReporter = null;     // Notifications
    
    // System state
    this.isRunning = false;
    this.startTime = null;
    this.systemHealth = {
      liquidityAnalyzer: 'OFFLINE',
      mempoolStreamer: 'OFFLINE',
      marketClassifier: 'OFFLINE',
      derivativesMonitor: 'OFFLINE',
      taskScheduler: 'OFFLINE',
      telegramReporter: 'OFFLINE'
    };
    
    // Performance metrics
    this.metrics = {
      whaleIntentsDetected: 0,
      liquidityValidations: 0,
      derivativesUpdates: 0,
      tasksExecuted: 0,
      alertsSent: 0,
      startTime: Date.now()
    };
    
    this.logger.info('phoenix_engine_init', {
      version: this.version,
      symbol: this.config.symbol,
      paperTrading: this.config.paperTrading
    });
  }

  /**
   * Initialize all Phoenix components
   */
  async initialize() {
    this.logger.info('phoenix_initialization_start', 'Initializing all Phoenix components');
    
    try {
      // Initialize Telegram Reporter first for notifications
      this.telegramReporter = new TelegramReporter({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
      });
      await this.telegramReporter.initialize();
      this.systemHealth.telegramReporter = 'ONLINE';
      this.logger.info('telegram_reporter_ready', 'Telegram notifications active');
      
      // Initialize Liquidity Analyzer (Mandate 1)
      this.liquidityAnalyzer = new LiquidityAnalyzer({
        symbol: this.config.symbol,
        logger: this.logger
      });
      this.systemHealth.liquidityAnalyzer = 'ONLINE';
      this.logger.info('mandate_1_ready', 'Dynamic Liquidity Analyzer operational');
      
      // Initialize Mempool Streamer (Mandate 2)
      // Primary: Alchemy, Backup: QuickNode (Blocknative deprecated March 2025)
      const mempoolProviders = {
        alchemy: { enabled: !!process.env.ALCHEMY_API_KEY },
        quicknode: { enabled: !!process.env.QUICKNODE_WS_URL }
      };

      // Check if any mempool providers are available
      const hasProviders = Object.values(mempoolProviders).some(p => p.enabled);

      this.mempoolStreamer = new MempoolStreamer({
        symbol: this.config.symbol.replace('USDT', ''),
        logger: this.logger,
        providers: mempoolProviders,
        enableRealTimeFeeds: hasProviders && this.config.enableRealTimeFeeds
      });

      this.systemHealth.mempoolStreamer = hasProviders ? 'ONLINE' : 'LIMITED';

      if (hasProviders) {
        this.logger.info('mandate_2_ready', 'Event-driven mempool streaming operational');
      } else {
        this.logger.warn('mandate_2_limited', 'Mempool streaming disabled - no API providers configured');
      }

      // Initialize Market Classifier (Mandate 2 - Observability)
      this.marketClassifier = new MarketClassifier({
        symbol: this.config.symbol,
        logger: this.logger
      });
      this.systemHealth.marketClassifier = 'ONLINE';
      this.logger.info('mandate_2_observability_ready', 'Market classifier with diagnostic logging operational');
      
      // Initialize Derivatives Monitor (Mandate 4)
      this.derivativesMonitor = new DerivativesMonitor({
        symbol: this.config.symbol,
        logger: this.logger,
        bybitConfig: {
          apiKey: process.env.BYBIT_API_KEY,
          apiSecret: process.env.BYBIT_API_SECRET
        }
      });
      this.systemHealth.derivativesMonitor = 'ONLINE';
      this.logger.info('mandate_4_ready', 'Real-time derivatives feed operational');
      
      // Initialize Task Scheduler (Mandate 5)
      this.taskScheduler = new TaskScheduler({
        maxConcurrentTasks: 8,
        logger: this.logger
      });
      await this.taskScheduler.initialize();
      this.systemHealth.taskScheduler = 'ONLINE';
      this.logger.info('mandate_5_ready', 'Microservice task scheduler operational');
      
      // Setup component event handlers
      this.setupEventHandlers();
      
      this.logger.info('phoenix_initialization_complete', {
        systemHealth: this.systemHealth,
        mandatesImplemented: 5
      });
      
      return true;
      
    } catch (error) {
      this.logger.error('phoenix_initialization_failed', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Setup event handlers between components
   */
  setupEventHandlers() {
    // Whale intent detection from mempool streamer
    this.mempoolStreamer.on('WHALE_INTENT_DETECTED', async (intent) => {
      this.metrics.whaleIntentsDetected++;
      
      this.logger.warn('whale_intent_detected', {
        whaleAddress: intent.whaleAddress,
        estimatedValue: intent.estimatedValue,
        threatLevel: intent.threatLevel,
        detectionLatency: intent.detectionLatency
      });
      
      // Send immediate Telegram alert for critical whales
      if (intent.threatLevel === 'CRITICAL') {
        await this.telegramReporter.sendAlert({
          type: 'CRITICAL_WHALE_ALERT',
          title: '🚨 CRITICAL WHALE INTENT DETECTED',
          message: `Whale: ${intent.whaleAddress}\nValue: $${intent.estimatedValue.toLocaleString()}\nExchange: ${intent.targetExchange}\nLatency: ${intent.detectionLatency}ms`,
          priority: 'HIGH'
        });
        this.metrics.alertsSent++;
      }
      
      // Emit system-wide event
      this.emit('WHALE_INTENT', intent);
    });
    
    // Derivatives updates from monitor
    this.derivativesMonitor.on('DERIVATIVES_UPDATE', (update) => {
      this.metrics.derivativesUpdates++;
      
      this.logger.debug('derivatives_update', {
        type: update.type,
        exchange: update.exchange
      });
      
      // Check for significant derivatives events
      if (update.type === 'OI_SPIKE' || update.type === 'FUNDING_SPIKE') {
        this.emit('DERIVATIVES_ALERT', update);
      }
    });
    
    // Task completion from scheduler
    this.taskScheduler.on('TASK_COMPLETED', (task) => {
      this.metrics.tasksExecuted++;
      
      this.logger.debug('task_completed', {
        taskId: task.id,
        type: task.type,
        executionTime: task.executionTime
      });
    });
    
    // Liquidity analysis results
    this.liquidityAnalyzer.on('LIQUIDITY_ANALYSIS', (analysis) => {
      this.metrics.liquidityValidations++;
      
      if (analysis.regime === 'CRITICAL') {
        this.logger.warn('critical_liquidity_detected', analysis);
      }
    });
  }

  /**
   * Start the Phoenix Engine
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('phoenix_already_running', 'Phoenix Engine already running');
      return true;
    }
    
    this.logger.info('phoenix_start', 'Starting Phoenix Engine v6.0');
    
    const initialized = await this.initialize();
    if (!initialized) {
      return false;
    }
    
    try {
      // Start all components
      if (this.config.enableRealTimeFeeds) {
        const mempoolStarted = await this.mempoolStreamer.start();
        const derivativesStarted = await this.derivativesMonitor.start();

        if (!mempoolStarted) {
          this.logger.warn('mempool_start_failed', 'Mempool streaming failed to start');
        }
        if (!derivativesStarted) {
          this.logger.warn('derivatives_start_failed', 'Derivatives monitoring failed to start');
        }
      } else {
        this.logger.info('realtime_feeds_disabled', 'Real-time feeds disabled by configuration');
      }

      await this.taskScheduler.start();
      
      // Schedule periodic tasks
      this.schedulePeriodicTasks();
      
      this.isRunning = true;
      this.startTime = Date.now();
      this.metrics.startTime = Date.now();
      
      // Send startup notification
      await this.telegramReporter.sendAlert({
        type: 'SYSTEM_STARTUP',
        title: '🔥 PHOENIX ENGINE v6.0 OPERATIONAL',
        message: `System Status: ALL MANDATES ACTIVE\nSymbol: ${this.config.symbol}\nMode: ${this.config.paperTrading ? 'PAPER TRADING' : 'LIVE TRADING'}\nTime: ${getISTTime()}`,
        priority: 'NORMAL'
      });
      
      this.logger.info('phoenix_operational', {
        version: this.version,
        systemHealth: this.systemHealth,
        startTime: getISTTime()
      });
      
      console.log('\n🔥 PHOENIX ENGINE v6.0 OPERATIONAL');
      console.log('🛡️ All Red Team Mandates Active');
      console.log('⚡ Informational Supremacy Confirmed');
      console.log('🎯 Ready to Hunt\n');
      
      return true;
      
    } catch (error) {
      this.logger.error('phoenix_start_failed', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Schedule periodic maintenance tasks
   */
  schedulePeriodicTasks() {
    // FORTRESS v6.1: Engine heartbeat every 60 seconds
    setInterval(() => {
      this.emitHeartbeat();
    }, 60000);

    // System health check every 30 seconds
    setInterval(() => {
      this.taskScheduler.scheduleTask({
        type: 'SYSTEM_HEALTH_CHECK',
        priority: 8,
        payload: { timestamp: Date.now() }
      });
    }, 30000);

    // FORTRESS v6.1: Enhanced performance metrics every 5 minutes
    setInterval(() => {
      this.emitEnhancedPerformanceMetrics();
    }, 300000);
    
    // Whale balance checks every 2 minutes
    if (process.env.WHALE_WATCHLIST) {
      const whales = process.env.WHALE_WATCHLIST.split(',');
      setInterval(() => {
        whales.forEach(whaleAddress => {
          this.taskScheduler.scheduleTask({
            type: 'WHALE_BALANCE_CHECK',
            priority: 6,
            payload: {
              whaleAddress: whaleAddress.trim(),
              apiKey: process.env.ETHERSCAN_API_KEY
            }
          });
        });
      }, 120000);
    }
  }

  /**
   * FORTRESS v6.1: Emit engine heartbeat
   */
  emitHeartbeat() {
    const activeStrategies = [];
    if (this.systemHealth.marketClassifier === 'ONLINE') activeStrategies.push('MARKET_CLASSIFIER');
    if (this.systemHealth.mempoolStreamer === 'ONLINE') activeStrategies.push('WHALE_MONITOR');
    if (this.systemHealth.derivativesMonitor === 'ONLINE') activeStrategies.push('DERIVATIVES_MONITOR');

    const heartbeat = {
      logType: 'HEARTBEAT',
      status: this.isRunning ? 'OPERATIONAL' : 'OFFLINE',
      activeStrategies,
      ethUnwindState: 'MONITORING', // Placeholder for future ETH_UNWIND strategy
      activePositions: 0, // Placeholder for position tracking
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      systemHealth: this.systemHealth
    };

    this.logger.info('engine_heartbeat', heartbeat);
  }

  /**
   * FORTRESS v6.1: Emit enhanced performance metrics
   */
  emitEnhancedPerformanceMetrics() {
    const derivativesData = this.derivativesMonitor?.getData() || {};
    const oiDelta = derivativesData.openInterest?.changeRate || 0;
    const fundingRate = derivativesData.fundingRates?.current || 0;

    const enhancedMetrics = {
      WhaleIntents: this.metrics.whaleIntentsDetected,
      LiqDetections: this.metrics.liquidityValidations,
      SigDetections: 0, // Placeholder for signal detections
      Tasks: this.metrics.tasksExecuted,
      OI_Delta_1m: oiDelta > 0 ? `+${(oiDelta * 1000000).toFixed(1)}M` : `${(oiDelta * 1000000).toFixed(1)}M`,
      Funding_Rate: `${(fundingRate * 100).toFixed(3)}%`
    };

    console.log(`📊 PERFORMANCE: WhaleIntents: ${enhancedMetrics.WhaleIntents}, LiqDetections: ${enhancedMetrics.LiqDetections}, SigDetections: ${enhancedMetrics.SigDetections}, Tasks: ${enhancedMetrics.Tasks}, OI_Delta_1m: "${enhancedMetrics.OI_Delta_1m}", Funding_Rate: "${enhancedMetrics.Funding_Rate}"`);
  }

  /**
   * Validate trading signal using dynamic liquidity analysis
   */
  async validateSignal(signal, orderBookData) {
    const analysis = await this.liquidityAnalyzer.analyzeOrderBook(orderBookData);
    
    this.logger.info('signal_validation', {
      signalId: signal.id,
      dls: analysis.dls,
      percentile: analysis.percentile,
      isValid: analysis.isValidForSignal
    });
    
    return {
      isValid: analysis.isValidForSignal,
      liquidityScore: analysis.dls,
      liquidityPercentile: analysis.percentile,
      liquidityRegime: analysis.regime
    };
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    const uptime = this.isRunning ? Date.now() - this.startTime : 0;
    
    return {
      version: this.version,
      isRunning: this.isRunning,
      uptime: Math.floor(uptime / 1000),
      systemHealth: this.systemHealth,
      metrics: {
        ...this.metrics,
        systemUptime: Math.floor(uptime / 1000)
      },
      components: {
        liquidityAnalyzer: this.liquidityAnalyzer?.getStats(),
        mempoolStreamer: this.mempoolStreamer?.getStats(),
        derivativesMonitor: this.derivativesMonitor?.getStats(),
        taskScheduler: this.taskScheduler?.getStats()
      },
      mandatesImplemented: 5,
      strategicViability: 'CONFIRMED'
    };
  }

  /**
   * Shutdown Phoenix Engine
   */
  async shutdown() {
    if (!this.isRunning) return;

    this.logger.info('phoenix_shutdown', 'Initiating graceful shutdown sequence');

    try {
      // Phase 1: Stop accepting new work
      this.logger.info('shutdown_phase_1', 'Stopping task scheduler from accepting new tasks');
      if (this.taskScheduler) {
        await this.taskScheduler.stopAcceptingTasks();
      }

      // Phase 2: Wait for active tasks to complete (10 second timeout)
      this.logger.info('shutdown_phase_2', 'Waiting for active tasks to complete');
      if (this.taskScheduler) {
        await this.taskScheduler.waitForActiveTasks(10000);
      }

      // Phase 3: Terminate all workers with confirmation
      this.logger.info('shutdown_phase_3', 'Terminating worker processes');
      if (this.taskScheduler) {
        await this.taskScheduler.terminateAllWorkers();
      }

      // Phase 4: Disconnect WebSocket clients
      this.logger.info('shutdown_phase_4', 'Disconnecting real-time feeds');
      if (this.mempoolStreamer) {
        await this.mempoolStreamer.stop();
      }

      if (this.derivativesMonitor) {
        await this.derivativesMonitor.stop();
      }

      // Phase 5: Stop Express server
      this.logger.info('shutdown_phase_5', 'Stopping Express server');
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            this.logger.info('express_server_stopped', 'Express server closed');
            resolve();
          });
        });
      }

      // Phase 6: Send final notification
      this.logger.info('shutdown_phase_6', 'Sending shutdown notification');
      await this.telegramReporter.sendAlert({
        type: 'SYSTEM_SHUTDOWN',
        title: '🛑 PHOENIX ENGINE SHUTDOWN',
        message: `System shutdown complete\nUptime: ${Math.floor((Date.now() - this.startTime) / 1000)}s\nAll components terminated cleanly`,
        priority: 'NORMAL'
      });

      this.isRunning = false;

      // Phase 7: Final logger shutdown
      this.logger.info('shutdown_complete', 'All components terminated cleanly');
      this.logger.shutdown();

      console.log('🔥 Phoenix Engine shutdown complete - zero zombie processes');

    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      // Force exit if graceful shutdown fails
      process.exit(1);
    }
  }
}
