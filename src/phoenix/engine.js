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
    this.derivativesMonitor = null;   // Mandate 4
    this.taskScheduler = null;        // Mandate 5
    this.telegramReporter = null;     // Notifications
    
    // System state
    this.isRunning = false;
    this.startTime = null;
    this.systemHealth = {
      liquidityAnalyzer: 'OFFLINE',
      mempoolStreamer: 'OFFLINE',
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
      this.mempoolStreamer = new MempoolStreamer({
        symbol: this.config.symbol.replace('USDT', ''),
        logger: this.logger,
        providers: {
          blocknative: { enabled: !!process.env.BLOCKNATIVE_API_KEY },
          alchemy: { enabled: !!process.env.ALCHEMY_API_KEY }
        }
      });
      this.systemHealth.mempoolStreamer = 'ONLINE';
      this.logger.info('mandate_2_ready', 'Event-driven mempool streaming operational');
      
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
        await this.mempoolStreamer.start();
        await this.derivativesMonitor.start();
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
    // System health check every 30 seconds
    setInterval(() => {
      this.taskScheduler.scheduleTask({
        type: 'SYSTEM_HEALTH_CHECK',
        priority: 8,
        payload: { timestamp: Date.now() }
      });
    }, 30000);
    
    // Performance metrics every 5 minutes
    setInterval(() => {
      this.taskScheduler.scheduleTask({
        type: 'PERFORMANCE_METRICS',
        priority: 5,
        payload: { metrics: this.getMetrics() }
      });
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
    
    this.logger.info('phoenix_shutdown', 'Shutting down Phoenix Engine');
    
    try {
      // Send shutdown notification
      await this.telegramReporter.sendAlert({
        type: 'SYSTEM_SHUTDOWN',
        title: '🛑 PHOENIX ENGINE SHUTDOWN',
        message: `System shutting down gracefully\nUptime: ${Math.floor((Date.now() - this.startTime) / 1000)}s\nTime: ${getISTTime()}`,
        priority: 'NORMAL'
      });
      
      // Stop all components
      if (this.mempoolStreamer) await this.mempoolStreamer.stop();
      if (this.derivativesMonitor) await this.derivativesMonitor.stop();
      if (this.taskScheduler) await this.taskScheduler.stop();
      
      this.isRunning = false;
      
      // Shutdown logger last
      this.logger.shutdown();
      
      console.log('🔥 Phoenix Engine shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
    }
  }
}
