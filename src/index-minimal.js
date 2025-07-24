/**
 * SentryCoin Minimal - Bulletproof Telegram Alerts
 * 
 * This is a minimal version that focuses on:
 * 1. Starting successfully in Azure
 * 2. Sending Telegram alerts for Trifecta signals
 * 3. Basic market monitoring
 */

import FlashCrashPredictor from './predictor.js';
import MarketClassifier from './market-classifier.js';
import TrifectaTrader from './trifecta-trader.js';
import DetailedReporter from './detailed-reporter.js';
import cloudStorage from './cloud-storage.js';
import { validateEnvironmentVariables, getISTTime } from './utils.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Global system instance
let sentryCoinSystem = null;

/**
 * Minimal SentryCoin System - Focused on Telegram Alerts
 */
class SentryCoinMinimal {
  constructor() {
    this.symbol = process.env.SYMBOL || 'SPKUSDT';
    this.isRunning = false;
    this.startTime = Date.now();
    
    // Core components only
    this.predictor = null;
    this.classifier = null;
    this.trifectaTrader = null;
    this.reporter = null;
    
    // Stats
    this.stats = {
      messagesProcessed: 0,
      alertsSent: 0,
      trifectaSignals: 0,
      startTime: Date.now()
    };
  }

  async initialize() {
    console.log('🛡️ SentryCoin Minimal - Telegram Alert System');
    console.log('📱 Focused on reliable Telegram notifications');
    console.log('═'.repeat(60));
    
    try {
      // Validate environment
      const validation = validateEnvironmentVariables();
      if (!validation.isValid) {
        console.warn('⚠️ Some environment variables missing, using defaults');
      }

      // Initialize core components
      this.predictor = new FlashCrashPredictor(this.symbol);
      console.log('✅ Flash crash predictor initialized');

      this.classifier = new MarketClassifier(this.symbol);
      console.log('✅ Market classifier initialized');

      this.trifectaTrader = new TrifectaTrader(this.symbol);
      console.log('✅ Trifecta trader initialized (Telegram alerts enabled)');

      this.reporter = new DetailedReporter(this.symbol);
      console.log('✅ Reporter initialized');

      // Set up event listeners
      this.setupEventListeners();
      console.log('✅ Event listeners configured');

      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  setupEventListeners() {
    // Connect classifier to trifecta trader for alerts
    this.classifier.on('TRIFECTA_CONVICTION_SIGNAL', async (signal) => {
      this.stats.trifectaSignals++;
      console.log(`🚨 TRIFECTA CONVICTION SIGNAL #${this.stats.trifectaSignals} [${getISTTime()}]`);
      console.log(`   📊 ${signal.symbol}: $${signal.currentPrice.toFixed(6)}`);
      console.log(`   ⚡ Ratio: ${signal.askToBidRatio.toFixed(2)}x | Momentum: ${signal.momentum.toFixed(2)}%`);
      
      // Send Telegram alert (this is the key functionality)
      await this.trifectaTrader.handleTrifectaSignal(signal);
      this.stats.alertsSent++;
      
      // Log for analysis
      this.reporter.recordTrifectaSignal(signal);
    });

    // Connect predictor to classifier
    this.predictor.on('orderBookUpdate', (orderBook) => {
      this.stats.messagesProcessed++;
      this.classifier.processOrderBook(orderBook);
    });

    // Periodic stats
    setInterval(() => {
      const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
      console.log(`📊 Stats [${getISTTime()}]: ${this.stats.messagesProcessed} msgs | ${this.stats.alertsSent} alerts | ${this.stats.trifectaSignals} signals | ${uptime}s uptime`);
    }, 30000); // Every 30 seconds
  }

  async start() {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('System initialization failed');
      }

      // Start the predictor (WebSocket connection)
      await this.predictor.start();
      this.isRunning = true;
      
      console.log('\n🎉 SentryCoin Minimal is operational!');
      console.log('📱 Telegram alerts: ACTIVE');
      console.log('🎯 Monitoring for Trifecta signals...');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start system:', error.message);
      this.isRunning = false;
      return false;
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down SentryCoin Minimal...');
    
    this.isRunning = false;
    
    if (this.predictor) {
      await this.predictor.stop();
    }
    
    // Generate final report
    if (this.reporter) {
      try {
        const sessionReport = await this.reporter.generateSessionReport();
        console.log('📊 Final session report generated');
      } catch (error) {
        console.warn('⚠️ Failed to generate final report:', error.message);
      }
    }
    
    console.log('✅ Shutdown complete');
  }

  getSystemStatus() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    return {
      status: this.isRunning ? 'running' : 'stopped',
      uptime,
      symbol: this.symbol,
      stats: this.stats,
      components: {
        predictor: !!this.predictor,
        classifier: !!this.classifier,
        trifectaTrader: !!this.trifectaTrader,
        reporter: !!this.reporter
      },
      telegramEnabled: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting SentryCoin Minimal System...\n');

  // Create Express app for health checks
  const app = express();
  const port = process.env.PORT || 10000;
  
  app.use(express.json());

  // Health check endpoint
  app.get('/', (req, res) => {
    const status = sentryCoinSystem ? sentryCoinSystem.getSystemStatus() : { status: 'initializing' };
    res.json({
      service: 'SentryCoin Minimal - Telegram Alert System',
      version: 'minimal-v1.0',
      status: sentryCoinSystem?.isRunning ? 'running' : 'stopped',
      uptime: status.uptime || 0,
      timestamp: new Date().toISOString(),
      system: status
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'sentrycoin-minimal',
      timestamp: new Date().toISOString()
    });
  });

  // System status endpoint
  app.get('/status', (req, res) => {
    if (!sentryCoinSystem) {
      return res.status(503).json({ error: 'System not initialized' });
    }
    res.json(sentryCoinSystem.getSystemStatus());
  });

  // Start Express server
  app.listen(port, () => {
    console.log(`🌐 SentryCoin Minimal API server running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
    console.log(`📊 Status: http://localhost:${port}/status`);
  });

  // Initialize and start the SentryCoin system
  try {
    sentryCoinSystem = new SentryCoinMinimal();
    const started = await sentryCoinSystem.start();
    
    if (started) {
      console.log('\n🎉 SentryCoin Minimal is fully operational!');
      console.log('📱 Telegram alerts: ENABLED');
      console.log('🎯 Monitoring: ACTIVE');
      console.log('⚡ Ready to send alerts for Trifecta signals!');
    } else {
      console.error('\n❌ Failed to start SentryCoin Minimal');
      console.log('🌐 API server will continue running for diagnostics');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during startup:', error.message);
    console.log('🌐 API server will continue running for diagnostics');
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    if (sentryCoinSystem) {
      await sentryCoinSystem.shutdown();
    }
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    if (sentryCoinSystem) {
      await sentryCoinSystem.shutdown();
    }
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  });
}

// Start the application
main().catch(error => {
  console.error('💥 Application failed to start:', error.message);
  process.exit(1);
});
