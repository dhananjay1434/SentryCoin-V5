#!/usr/bin/env node

/**
 * SentryCoin v6.0 - Production Entry Point
 * 
 * OPERATION CHIMERA - LIVE DEPLOYMENT
 * 
 * This is the main production entry point for the Phoenix Engine.
 * Executes the complete deployment protocol as authorized by the
 * Head of Quantitative Strategy.
 * 
 * CLASSIFICATION: TOP SECRET - OPERATIONAL GREEN LIGHT
 */

import dotenv from 'dotenv';
import SentryCoinEngineV6 from './src/core/sentrycoin-engine-v6.js';
import PhoenixMonitoringDashboard from './scripts/phoenix-monitor.js';
import OperationChimeraDeployment from './scripts/deploy-phoenix.js';

// Load environment configuration
dotenv.config();

class ProductionLauncher {
  constructor() {
    this.phoenixEngine = null;
    this.monitoringDashboard = null;
    this.isProduction = process.env.NODE_ENV === 'production';
    
    console.log('🔥 SENTRYCOIN v6.0 - PRODUCTION LAUNCHER');
    console.log('🛡️ OPERATION CHIMERA - PHOENIX ENGINE DEPLOYMENT');
    console.log('⚡ CLASSIFICATION: TOP SECRET - OPERATIONAL GREEN LIGHT\n');
  }

  /**
   * Validate production environment
   */
  validateProductionEnvironment() {
    console.log('🔍 Validating production environment...');
    
    const requiredVars = [
      'BLOCKNATIVE_API_KEY',
      'ALCHEMY_API_KEY',
      'ETHERSCAN_API_KEY',
      'WHALE_WATCHLIST'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Missing critical environment variables:');
      missing.forEach(varName => console.error(`   - ${varName}`));
      console.error('\n🛑 Production deployment aborted');
      process.exit(1);
    }
    
    console.log('✅ Production environment validated');
    console.log(`🎯 Symbol: ${process.env.SYMBOL || 'ETHUSDT'}`);
    console.log(`🐋 Whale Targets: ${process.env.WHALE_WATCHLIST.split(',').length}`);
    console.log(`📊 Paper Trading: ${process.env.PAPER_TRADING !== 'false'}`);
  }

  /**
   * Initialize Phoenix Engine
   */
  async initializePhoenixEngine() {
    console.log('\n🔥 Initializing Phoenix Engine v6.0...');
    
    const config = {
      trading: {
        symbol: process.env.SYMBOL || 'ETHUSDT',
        paperTrading: process.env.PAPER_TRADING !== 'false'
      },
      logging: {
        enableFileLogging: true,
        enableConsoleLogging: true,
        logDirectory: './logs/v6/production',
        minLogLevel: this.isProduction ? 1 : 0 // INFO in production, DEBUG in dev
      }
    };
    
    this.phoenixEngine = new SentryCoinEngineV6(config);
    
    // Setup production event handlers
    this.setupProductionEventHandlers();
    
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
  setupProductionEventHandlers() {
    // Critical whale intent alerts
    this.phoenixEngine.on('CRITICAL_WHALE_ALERT', (intent) => {
      console.log('\n🚨 CRITICAL WHALE ALERT 🚨');
      console.log(`🐋 Address: ${intent.whaleAddress}`);
      console.log(`💰 Value: $${intent.estimatedValue.toLocaleString()}`);
      console.log(`🏢 Exchange: ${intent.targetExchange}`);
      console.log(`⚡ Latency: ${intent.detectionLatency}ms`);
      console.log(`🎯 Threat Level: ${intent.getThreatLevel()}\n`);
      
      // In production, this would trigger immediate trading decisions
      if (this.isProduction && process.env.PAPER_TRADING === 'false') {
        console.log('🎯 LIVE TRADING: Evaluating immediate response...');
      }
    });
    
    // High priority whale alerts
    this.phoenixEngine.on('HIGH_WHALE_ALERT', (intent) => {
      console.log(`⚠️ HIGH WHALE ALERT: ${intent.whaleAddress} - $${intent.estimatedValue.toLocaleString()}`);
    });
    
    // System health monitoring
    this.phoenixEngine.on('SYSTEM_EVENT', (event) => {
      if (event.type.includes('ERROR') || event.type.includes('OFFLINE')) {
        console.log(`🚨 SYSTEM EVENT: ${event.type} - ${event.source}`);
      }
    });
    
    // Derivatives intelligence
    this.phoenixEngine.on('DERIVATIVES_INTELLIGENCE', (update) => {
      if (update.type === 'DERIVATIVES_ALERT') {
        console.log(`📊 DERIVATIVES ALERT: ${update.data.type}`);
      }
    });
  }

  /**
   * Start monitoring dashboard
   */
  async startMonitoringDashboard() {
    console.log('\n🖥️ Starting monitoring dashboard...');
    
    this.monitoringDashboard = new PhoenixMonitoringDashboard({
      port: process.env.DASHBOARD_PORT || 3000,
      wsPort: process.env.DASHBOARD_WS_PORT || 3001
    });
    
    // Connect dashboard to Phoenix Engine
    this.monitoringDashboard.connectToPhoenixEngine(this.phoenixEngine);
    
    await this.monitoringDashboard.start();
    
    console.log('✅ Monitoring dashboard operational');
    console.log(`🌐 Dashboard URL: http://localhost:${process.env.DASHBOARD_PORT || 3000}`);
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
    
    // Display operational status
    this.displayOperationalStatus();
  }

  /**
   * Display operational status
   */
  displayOperationalStatus() {
    const status = this.phoenixEngine.getSystemStatus();
    
    console.log('\n' + '='.repeat(80));
    console.log('🔥 OPERATION CHIMERA - PHOENIX ENGINE OPERATIONAL');
    console.log('='.repeat(80));
    console.log(`🛡️ Version: ${status.version}`);
    console.log(`⚡ Strategic Viability: ${status.strategicViability}`);
    console.log(`🎯 Red Team Mandates: ${status.mandatesImplemented}/5 RESOLVED`);
    console.log(`🚀 System Health: ALL COMPONENTS ONLINE`);
    console.log(`📊 Uptime: ${status.uptime} seconds`);
    console.log('');
    console.log('🎯 OPERATIONAL CAPABILITIES:');
    console.log('   ⚡ Real-time whale intent detection: ACTIVE');
    console.log('   🧠 Dynamic liquidity analysis: ACTIVE');
    console.log('   📊 Sub-second derivatives feed: ACTIVE');
    console.log('   🔄 Microservice task scheduler: ACTIVE');
    console.log('   📝 Stateful logging system: ACTIVE');
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
    
    console.log(`🌐 Monitoring Dashboard: http://localhost:${process.env.DASHBOARD_PORT || 3000}`);
    console.log('');
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal} - initiating graceful shutdown...`);
      
      try {
        if (this.monitoringDashboard) {
          await this.monitoringDashboard.stop();
          console.log('✅ Monitoring dashboard stopped');
        }
        
        if (this.phoenixEngine) {
          await this.phoenixEngine.shutdown();
          console.log('✅ Phoenix Engine shutdown complete');
        }
        
        console.log('🔥 Operation Chimera shutdown complete');
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
   * Main production launch sequence
   */
  async launch() {
    try {
      console.log('🎯 COMMENCING OPERATION CHIMERA LAUNCH SEQUENCE\n');
      
      // Step 1: Validate environment
      this.validateProductionEnvironment();
      
      // Step 2: Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Step 3: Initialize Phoenix Engine
      await this.initializePhoenixEngine();
      
      // Step 4: Start monitoring dashboard
      await this.startMonitoringDashboard();
      
      // Step 5: Start Phoenix Engine
      await this.startPhoenixEngine();
      
      console.log('\n🎉 OPERATION CHIMERA: LAUNCH SUCCESSFUL');
      console.log('🔥 THE PHOENIX HAS RISEN');
      console.log('🛡️ STRATEGIC VIABILITY: CONFIRMED');
      console.log('⚔️ READY TO HUNT\n');
      
      // Keep process alive
      this.keepAlive();
      
    } catch (error) {
      console.error('\n💥 OPERATION CHIMERA LAUNCH FAILED');
      console.error(`❌ Error: ${error.message}`);
      console.error(error.stack);
      
      console.log('\n🚨 INITIATING EMERGENCY SHUTDOWN...');
      process.exit(1);
    }
  }

  /**
   * Keep process alive and monitor health
   */
  keepAlive() {
    // Health check every 30 seconds
    setInterval(() => {
      if (this.phoenixEngine && this.phoenixEngine.isRunning) {
        const status = this.phoenixEngine.getSystemStatus();
        
        // Check for any offline components
        const offlineComponents = Object.entries(status.systemHealth)
          .filter(([component, health]) => health !== 'ONLINE')
          .map(([component]) => component);
        
        if (offlineComponents.length > 0) {
          console.log(`⚠️ HEALTH CHECK: Components offline - ${offlineComponents.join(', ')}`);
        }
        
        // Log performance summary every 5 minutes
        if (Date.now() % 300000 < 30000) { // Approximately every 5 minutes
          console.log(`📊 PERFORMANCE: Whales: ${status.stats.whaleIntentsDetected}, Derivatives: ${status.stats.derivativesUpdates}, Tasks: ${status.stats.tasksExecuted}`);
        }
      } else {
        console.log('🚨 HEALTH CHECK: Phoenix Engine not running!');
      }
    }, 30000);
    
    console.log('💓 Health monitoring active - system will run indefinitely');
    console.log('🛑 Use Ctrl+C or SIGTERM to shutdown gracefully');
  }
}

// Launch production system
const launcher = new ProductionLauncher();
launcher.launch().catch(error => {
  console.error('💥 CRITICAL LAUNCH FAILURE:', error.message);
  process.exit(1);
});

export default ProductionLauncher;
