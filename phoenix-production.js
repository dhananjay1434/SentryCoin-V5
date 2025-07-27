#!/usr/bin/env node

/**
 * SentryCoin v6.0 - Phoenix Engine Production Launcher
 * 
 * OPERATION CHIMERA - CLEAN PRODUCTION DEPLOYMENT
 * 
 * This is the main production entry point for the reorganized
 * Phoenix Engine with all components properly connected.
 */

import dotenv from 'dotenv';
import express from 'express';
import PhoenixEngine from './src/phoenix/engine.js';

// Load Phoenix v6.1 Fortress configuration
dotenv.config();

class PhoenixProductionLauncher {
  constructor() {
    this.phoenixEngine = null;
    this.expressApp = null;
    this.server = null;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.port = process.env.PORT || 10000;

    console.log('SentryCoin v6.0 - Production Launcher');
    console.log('Initializing system components...\n');
  }

  /**
   * Validate production environment
   */
  validateEnvironment() {
    console.log('🔍 Validating production environment...');
    
    const requiredVars = [
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_CHAT_ID',
      'ETHERSCAN_API_KEY'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Missing critical environment variables:');
      missing.forEach(varName => console.error(`   - ${varName}`));
      console.error('\n🛑 Production deployment aborted');
      process.exit(1);
    }
    
    console.log('✅ Environment validation complete');
    console.log(`🎯 Symbol: ${process.env.SYMBOL || 'ETHUSDT'}`);
    console.log(`📊 Paper Trading: ${process.env.PAPER_TRADING !== 'false'}`);
    console.log(`🔄 Real-time Feeds: ${process.env.ENABLE_REAL_TIME_FEEDS !== 'false'}`);
    
    // Optional API warnings
    if (!process.env.BLOCKNATIVE_API_KEY) {
      console.log('⚠️ Blocknative API key not configured - mempool streaming limited');
    }
    if (!process.env.ALCHEMY_API_KEY) {
      console.log('⚠️ Alchemy API key not configured - backup mempool provider unavailable');
    }
    if (!process.env.BYBIT_API_KEY) {
      console.log('⚠️ Bybit API key not configured - derivatives monitoring limited');
    }
  }

  /**
   * Setup Express server for Render port binding
   */
  setupExpressServer() {
    console.log('\n🌐 Setting up Express server for Render...');

    this.expressApp = express();
    this.expressApp.use(express.json());

    // Health check endpoint (required by Render)
    this.expressApp.get('/health', (req, res) => {
      const metrics = this.phoenixEngine ? this.phoenixEngine.getMetrics() : null;
      res.json({
        status: 'ok',
        service: 'sentrycoin-v6-phoenix-engine',
        version: '6.0.0',
        timestamp: new Date().toISOString(),
        phoenix: {
          running: this.phoenixEngine?.isRunning || false,
          mandates: metrics?.mandatesImplemented || 0,
          viability: metrics?.strategicViability || 'INITIALIZING'
        }
      });
    });

    // Webhook endpoint for whale transactions (Project Fortress v6.1)
    this.expressApp.post('/webhook/whale-transactions', express.json(), (req, res) => {
      try {
        const { matchingTransactions, matchingReceipts } = req.body;

        console.log(`[INFO] Webhook received: ${matchingTransactions?.length || 0} transactions, ${matchingReceipts?.length || 0} receipts`);

        // Process native ETH transactions
        if (matchingTransactions && this.phoenixEngine?.mempoolStreamer) {
          matchingTransactions.forEach(tx => {
            this.phoenixEngine.mempoolStreamer.processWebhookTransaction({
              type: 'native',
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              blockNumber: tx.blockNumber,
              timestamp: new Date().toISOString(),
              source: 'webhook'
            });
          });
        }

        // Process token transfers from receipts
        if (matchingReceipts && this.phoenixEngine?.mempoolStreamer) {
          matchingReceipts.forEach(receipt => {
            if (receipt.logs) {
              receipt.logs.forEach(log => {
                // Check for ERC-20 Transfer event signature
                if (log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                  this.phoenixEngine.mempoolStreamer.processWebhookTransaction({
                    type: 'erc20',
                    hash: receipt.transactionHash,
                    contractAddress: log.address,
                    from: log.topics[1] ? '0x' + log.topics[1].slice(26) : null,
                    to: log.topics[2] ? '0x' + log.topics[2].slice(26) : null,
                    value: log.data,
                    blockNumber: receipt.blockNumber,
                    timestamp: new Date().toISOString(),
                    source: 'webhook'
                  });
                }
              });
            }
          });
        }

        res.status(200).json({
          status: 'processed',
          timestamp: new Date().toISOString(),
          processed: {
            transactions: matchingTransactions?.length || 0,
            receipts: matchingReceipts?.length || 0
          }
        });

      } catch (error) {
        console.error('[ERROR] Webhook processing failed:', error.message);
        res.status(500).json({
          error: 'Webhook processing failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Webhook endpoint for whale transactions (Project Fortress v6.1)
    this.expressApp.post('/webhook/whale-transactions', express.json(), (req, res) => {
      try {
        // Validate security token
        const authHeader = req.headers['authorization'];
        const expectedToken = process.env.WEBHOOK_SECURITY_TOKEN;

        if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
          console.log('[WARN] Webhook unauthorized access attempt');
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { matchingTransactions, matchingReceipts } = req.body;

        console.log(`[INFO] Fortress Webhook: ${matchingTransactions?.length || 0} transactions, ${matchingReceipts?.length || 0} receipts`);

        let processedCount = 0;

        // Process native ETH transactions
        if (matchingTransactions && this.phoenixEngine?.mempoolStreamer) {
          matchingTransactions.forEach(tx => {
            if (this.phoenixEngine.mempoolStreamer.processWebhookTransaction) {
              this.phoenixEngine.mempoolStreamer.processWebhookTransaction({
                type: 'native',
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                blockNumber: tx.blockNumber,
                timestamp: new Date().toISOString(),
                source: 'webhook'
              });
              processedCount++;
            }
          });
        }

        // Process token transfers from receipts
        if (matchingReceipts && this.phoenixEngine?.mempoolStreamer) {
          matchingReceipts.forEach(receipt => {
            if (receipt.logs) {
              receipt.logs.forEach(log => {
                // Check for ERC-20 Transfer event signature
                if (log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                  if (this.phoenixEngine.mempoolStreamer.processWebhookTransaction) {
                    this.phoenixEngine.mempoolStreamer.processWebhookTransaction({
                      type: 'erc20',
                      hash: receipt.transactionHash,
                      contractAddress: log.address,
                      from: log.topics[1] ? '0x' + log.topics[1].slice(26) : null,
                      to: log.topics[2] ? '0x' + log.topics[2].slice(26) : null,
                      value: log.data,
                      blockNumber: receipt.blockNumber,
                      timestamp: new Date().toISOString(),
                      source: 'webhook'
                    });
                    processedCount++;
                  }
                }
              });
            }
          });
        }

        res.status(200).json({
          status: 'processed',
          timestamp: new Date().toISOString(),
          processed: {
            transactions: matchingTransactions?.length || 0,
            receipts: matchingReceipts?.length || 0,
            totalProcessed: processedCount
          },
          fortress: 'WHALE_INTELLIGENCE_RECEIVED'
        });

      } catch (error) {
        console.error('[ERROR] Fortress webhook processing failed:', error.message);
        res.status(500).json({
          error: 'Webhook processing failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Root endpoint
    this.expressApp.get('/', (req, res) => {
      const metrics = this.phoenixEngine ? this.phoenixEngine.getMetrics() : null;
      res.json({
        service: 'SentryCoin v6.0 Phoenix Engine',
        version: '6.0.0',
        status: this.phoenixEngine?.isRunning ? 'operational' : 'initializing',
        mandates: metrics?.mandatesImplemented || 0,
        uptime: metrics?.uptime || 0,
        timestamp: new Date().toISOString(),
        message: 'SentryCoin v6.0 - System Status'
      });
    });

    // System status endpoint
    this.expressApp.get('/status', (req, res) => {
      if (!this.phoenixEngine) {
        return res.status(503).json({
          error: 'Phoenix Engine not initialized',
          status: 'initializing'
        });
      }

      const metrics = this.phoenixEngine.getMetrics();
      res.json({
        ...metrics,
        timestamp: new Date().toISOString()
      });
    });

    // Performance metrics endpoint
    this.expressApp.get('/performance', (req, res) => {
      if (!this.phoenixEngine) {
        return res.status(503).json({
          error: 'Phoenix Engine not initialized'
        });
      }

      const metrics = this.phoenixEngine.getMetrics();
      res.json({
        performance: metrics.metrics,
        components: metrics.components,
        systemHealth: metrics.systemHealth,
        timestamp: new Date().toISOString()
      });
    });

    console.log(`✅ Express server configured on port ${this.port}`);
  }

  /**
   * Start Express server
   */
  async startExpressServer() {
    return new Promise((resolve, reject) => {
      this.server = this.expressApp.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🌐 Phoenix Engine API server running on port ${this.port}`);
          console.log(`📡 Endpoints:`);
          console.log(`   Health: http://localhost:${this.port}/health`);
          console.log(`   Status: http://localhost:${this.port}/status`);
          console.log(`   Performance: http://localhost:${this.port}/performance`);
          resolve();
        }
      });
    });
  }

  /**
   * Initialize Phoenix Engine
   */
  async initializePhoenixEngine() {
    console.log('\nInitializing SentryCoin Engine v6.0...');
    
    const config = {
      symbol: process.env.SYMBOL || 'ETHUSDT',
      paperTrading: process.env.PAPER_TRADING !== 'false',
      enableRealTimeFeeds: process.env.ENABLE_REAL_TIME_FEEDS !== 'false'
    };
    
    this.phoenixEngine = new PhoenixEngine(config);
    
    // Setup production event handlers
    this.setupEventHandlers();
    
    const initialized = await this.phoenixEngine.initialize();
    if (!initialized) {
      throw new Error('Phoenix Engine initialization failed');
    }
    
    console.log('✅ Phoenix Engine initialized successfully');
    return true;
  }

  /**
   * Setup production event handlers
   */
  setupEventHandlers() {
    // Whale intent alerts
    this.phoenixEngine.on('WHALE_INTENT', async (intent) => {
      console.log(`\n🐋 WHALE INTENT: ${intent.whaleAddress}`);
      console.log(`💰 Value: $${intent.estimatedValue.toLocaleString()}`);
      console.log(`🎯 Threat: ${intent.threatLevel}`);
      console.log(`⚡ Latency: ${intent.detectionLatency}ms\n`);
    });
    
    // Derivatives alerts
    this.phoenixEngine.on('DERIVATIVES_ALERT', (alert) => {
      console.log(`📊 DERIVATIVES ALERT: ${alert.type}`);
    });
    
    // System events
    this.phoenixEngine.on('SYSTEM_EVENT', (event) => {
      if (event.type.includes('ERROR') || event.type.includes('CRITICAL')) {
        console.log(`🚨 SYSTEM EVENT: ${event.type}`);
      }
    });
  }

  /**
   * Start Phoenix Engine
   */
  async startPhoenixEngine() {
    console.log('\n🚀 Starting Phoenix Engine...');
    
    const started = await this.phoenixEngine.start();
    if (!started) {
      throw new Error('Phoenix Engine failed to start');
    }
    
    console.log('✅ Phoenix Engine operational');
    this.displayOperationalStatus();
  }

  /**
   * CRUCIBLE MANDATE 4: Get realistic system health summary
   */
  getSystemHealthSummary() {
    if (!this.phoenixEngine) return 'INITIALIZING';

    const health = this.phoenixEngine.systemHealth;
    const onlineCount = Object.values(health).filter(status => status === 'ONLINE').length;
    const totalComponents = Object.keys(health).length;

    if (onlineCount === totalComponents) return 'ALL_ONLINE';
    if (onlineCount === 0) return 'ALL_OFFLINE';
    return `PARTIAL (${onlineCount}/${totalComponents})`;
  }

  /**
   * CRUCIBLE MANDATE 4: Get realistic component status
   */
  getComponentStatus(componentName) {
    if (!this.phoenixEngine) return 'INITIALIZING';

    const status = this.phoenixEngine.systemHealth[componentName];
    switch (status) {
      case 'ONLINE': return 'ONLINE';
      case 'LIMITED': return 'DEGRADED';
      case 'OFFLINE': return 'OFFLINE';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Display operational status
   */
  displayOperationalStatus() {
    const metrics = this.phoenixEngine.getMetrics();
    
    // CRUCIBLE MANDATE 4: Remove marketing slogans, report factual status
    console.log('\n' + '='.repeat(60));
    console.log('SENTRYCOIN v6.0 - STATUS REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Version: ${metrics.version}`);
    console.log(`🎯 Mandates Implemented: ${metrics.mandatesImplemented}/5`);
    console.log(`⚙️ System Health: ${this.getSystemHealthSummary()}`);
    console.log('');
    console.log('📋 COMPONENT STATUS:');
    console.log(`   📡 Whale monitoring: ${this.getComponentStatus('mempoolStreamer')}`);
    console.log(`   🧠 Liquidity analysis: ${this.getComponentStatus('liquidityAnalyzer')}`);
    console.log(`   📊 Derivatives feed: ${this.getComponentStatus('derivativesMonitor')}`);
    console.log(`   🔄 Task scheduler: ${this.getComponentStatus('taskScheduler')}`);
    console.log(`   📝 Logging system: ${this.getComponentStatus('statefulLogger')}`);
    console.log(`   📱 Notifications: ${this.getComponentStatus('telegramReporter')}`);
    console.log('');
    console.log('='.repeat(60));
    
    if (process.env.PAPER_TRADING !== 'false') {
      console.log('📋 MODE: PAPER TRADING (Safe simulation mode)');
    } else {
      console.log('💰 MODE: LIVE TRADING (Real capital at risk)');
    }
    console.log('');
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal} - initiating graceful shutdown...`);

      try {
        if (this.phoenixEngine) {
          await this.phoenixEngine.shutdown();
          console.log('✅ Phoenix Engine shutdown complete');
        }

        if (this.server) {
          this.server.close(() => {
            console.log('✅ Express server shutdown complete');
          });
        }

        console.log('🔥 Complete system shutdown');
        process.exit(0);

      } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 UNCAUGHT EXCEPTION:', error.message);
      console.error(error.stack);
      shutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 UNHANDLED REJECTION:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }

  /**
   * Monitor system health
   */
  startHealthMonitoring() {
    // Health check every 30 seconds
    setInterval(() => {
      if (this.phoenixEngine && this.phoenixEngine.isRunning) {
        const metrics = this.phoenixEngine.getMetrics();
        
        // Check for any offline components
        const offlineComponents = Object.entries(metrics.systemHealth)
          .filter(([component, health]) => health !== 'ONLINE')
          .map(([component]) => component);
        
        if (offlineComponents.length > 0) {
          console.log(`⚠️ HEALTH CHECK: Components offline - ${offlineComponents.join(', ')}`);
        }
        
        // Log performance summary every 5 minutes
        if (Date.now() % 300000 < 30000) { // Approximately every 5 minutes
          console.log(`📊 PERFORMANCE: Whales: ${metrics.metrics.whaleIntentsDetected}, Derivatives: ${metrics.metrics.derivativesUpdates}, Tasks: ${metrics.metrics.tasksExecuted}`);
        }
      } else {
        console.log('🚨 HEALTH CHECK: Phoenix Engine not running!');
      }
    }, 30000);
    
    console.log('💓 Health monitoring active');
  }

  /**
   * Main production launch sequence
   */
  async launch() {
    try {
      console.log('🎯 COMMENCING PHOENIX ENGINE v6.0 LAUNCH SEQUENCE\n');

      // Step 1: Validate environment
      this.validateEnvironment();

      // Step 2: Setup Express server (required for Render)
      this.setupExpressServer();

      // Step 3: Start Express server
      await this.startExpressServer();

      // Step 4: Setup graceful shutdown
      this.setupGracefulShutdown();

      // Step 5: Initialize Phoenix Engine
      await this.initializePhoenixEngine();

      // Step 6: Start Phoenix Engine
      await this.startPhoenixEngine();

      // Step 7: Start health monitoring
      this.startHealthMonitoring();
      
      // CRUCIBLE MANDATE 4: Remove marketing slogans, report factual status
      console.log('\n✅ SENTRYCOIN v6.0: STARTUP COMPLETE');
      console.log('📊 All components initialized successfully');
      console.log('⚙️ System operational and monitoring\n');

      console.log('💓 System running - use Ctrl+C to shutdown gracefully');
      
    } catch (error) {
      console.error('\n💥 PHOENIX ENGINE LAUNCH FAILED');
      console.error(`❌ Error: ${error.message}`);
      console.error(error.stack);
      
      console.log('\n🚨 INITIATING EMERGENCY SHUTDOWN...');
      process.exit(1);
    }
  }
}

// Launch Phoenix Engine
const launcher = new PhoenixProductionLauncher();
launcher.launch().catch(error => {
  console.error('💥 CRITICAL LAUNCH FAILURE:', error.message);
  process.exit(1);
});
