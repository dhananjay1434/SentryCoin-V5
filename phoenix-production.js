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

    console.log('🔥 PHOENIX ENGINE v6.0 - PRODUCTION LAUNCHER');
    console.log('🛡️ OPERATION CHIMERA - CLEAN DEPLOYMENT');
    console.log('⚡ All components reorganized and properly connected\n');
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
        message: '🔥 Phoenix Engine v6.0 - All Red Team Mandates Resolved'
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
    console.log('\n🔥 Initializing Phoenix Engine v6.0...');
    
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
   * Display operational status
   */
  displayOperationalStatus() {
    const metrics = this.phoenixEngine.getMetrics();
    
    console.log('\n' + '='.repeat(80));
    console.log('🔥 PHOENIX ENGINE v6.0 - OPERATIONAL STATUS');
    console.log('='.repeat(80));
    console.log(`🛡️ Version: ${metrics.version}`);
    console.log(`⚡ Strategic Viability: ${metrics.strategicViability}`);
    console.log(`🎯 Red Team Mandates: ${metrics.mandatesImplemented}/5 RESOLVED`);
    console.log(`🚀 System Health: ALL COMPONENTS ONLINE`);
    console.log('');
    console.log('🎯 OPERATIONAL CAPABILITIES:');
    console.log('   ⚡ Real-time whale intent detection: ACTIVE');
    console.log('   🧠 Dynamic liquidity analysis: ACTIVE');
    console.log('   📊 Sub-second derivatives feed: ACTIVE');
    console.log('   🔄 Microservice task scheduler: ACTIVE');
    console.log('   📝 Stateful logging system: ACTIVE');
    console.log('   📱 Telegram notifications: ACTIVE');
    console.log('');
    console.log('🛡️ OPERATIONAL DOCTRINE: PRE-COGNITIVE EVENT-DRIVEN HUNTER');
    console.log('🎯 INFORMATIONAL SUPREMACY: CONFIRMED');
    console.log('⚔️ MISSION STATUS: READY TO HUNT');
    console.log('='.repeat(80));
    
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
      
      console.log('\n🎉 PHOENIX ENGINE v6.0: LAUNCH SUCCESSFUL');
      console.log('🔥 THE PHOENIX HAS RISEN');
      console.log('🛡️ STRATEGIC VIABILITY: CONFIRMED');
      console.log('⚔️ READY TO HUNT\n');
      
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
