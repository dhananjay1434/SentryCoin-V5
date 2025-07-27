#!/usr/bin/env node

/**
 * SentryCoin v6.1 "Project Fortress" - THE GAUNTLET
 * 
 * FINAL VALIDATION PROTOCOL
 * 
 * 48-hour continuous paper-trading run to validate all Fortress mandates.
 * This is the definitive test that determines deployment readiness.
 * 
 * SUCCESS CRITERIA:
 * 1. Zero unhandled exceptions
 * 2. Zero non-zero worker exit codes on final shutdown
 * 3. At least one WHALE_MEMPOOL_TX event logged
 * 4. Continuous stateful DIAGNOSTIC logs from market classifier
 */

import dotenv from 'dotenv';
import PhoenixEngine from './src/phoenix/engine.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

class FortressGauntlet {
  constructor() {
    this.startTime = Date.now();
    this.testDuration = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
    this.phoenixEngine = null;
    this.validationResults = {
      unhandledException: false,
      nonZeroWorkerExits: [],
      whaleTransactionDetected: false,
      diagnosticLogsReceived: 0,
      heartbeatsReceived: 0,
      totalUptime: 0,
      criticalErrors: [],
      testStartTime: new Date().toISOString()
    };
    
    this.logFile = `./logs/fortress-gauntlet-${Date.now()}.log`;
    this.ensureLogDirectory();
    
    console.log('🏰 FORTRESS GAUNTLET - 48-HOUR VALIDATION PROTOCOL');
    console.log('🎯 Testing all Project Fortress mandates under continuous load');
    console.log(`📝 Detailed logs: ${this.logFile}`);
    console.log('⚔️ THERE IS NO MORE ROOM FOR ERROR\n');
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Log to both console and file
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    const fullEntry = data ? `${logEntry} ${JSON.stringify(data)}` : logEntry;
    
    console.log(fullEntry);
    fs.appendFileSync(this.logFile, fullEntry + '\n');
  }

  /**
   * Setup comprehensive error monitoring
   */
  setupErrorMonitoring() {
    // Monitor unhandled exceptions
    process.on('uncaughtException', (error) => {
      this.validationResults.unhandledException = true;
      this.validationResults.criticalErrors.push({
        type: 'uncaughtException',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      this.log('CRITICAL', 'UNHANDLED EXCEPTION DETECTED', {
        error: error.message,
        stack: error.stack
      });
      
      this.emergencyShutdown('UNHANDLED_EXCEPTION');
    });

    // Monitor unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.validationResults.unhandledException = true;
      this.validationResults.criticalErrors.push({
        type: 'unhandledRejection',
        reason: String(reason),
        timestamp: new Date().toISOString()
      });
      
      this.log('CRITICAL', 'UNHANDLED REJECTION DETECTED', {
        reason: String(reason)
      });
      
      this.emergencyShutdown('UNHANDLED_REJECTION');
    });
  }

  /**
   * Initialize Phoenix Engine with monitoring
   */
  async initializePhoenixEngine() {
    this.log('INFO', 'Initializing Phoenix Engine for Gauntlet test');
    
    try {
      this.phoenixEngine = new PhoenixEngine({
        symbol: 'ETHUSDT',
        paperTrading: true,
        enableRealTimeFeeds: true
      });

      // Setup event monitoring
      this.setupPhoenixEventMonitoring();

      const initialized = await this.phoenixEngine.initialize();
      if (!initialized) {
        throw new Error('Phoenix Engine initialization failed');
      }

      this.log('SUCCESS', 'Phoenix Engine initialized successfully');
      return true;

    } catch (error) {
      this.log('ERROR', 'Phoenix Engine initialization failed', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Setup Phoenix Engine event monitoring
   */
  setupPhoenixEventMonitoring() {
    // Monitor whale transactions
    this.phoenixEngine.mempoolStreamer?.on('WHALE_TRANSACTION_DETECTED', (transaction) => {
      this.validationResults.whaleTransactionDetected = true;
      this.log('SUCCESS', 'WHALE_MEMPOOL_TX event detected', {
        whaleAddress: transaction.whaleAddress,
        valueUSD: transaction.valueUSD,
        isNew: transaction.isNew
      });
    });

    // Monitor diagnostic logs
    this.phoenixEngine.marketClassifier?.on('REGIME_DETECTED', (detection) => {
      this.validationResults.diagnosticLogsReceived++;
      this.log('INFO', 'Market regime detected', {
        regime: detection.regime,
        confidence: detection.confidence
      });
    });

    // Monitor worker exits
    this.phoenixEngine.taskScheduler?.on('WORKER_EXIT', (workerId, exitCode) => {
      if (exitCode !== 0) {
        this.validationResults.nonZeroWorkerExits.push({
          workerId,
          exitCode,
          timestamp: new Date().toISOString()
        });
        
        this.log('ERROR', 'NON-ZERO WORKER EXIT DETECTED', {
          workerId,
          exitCode
        });
      }
    });
  }

  /**
   * Start Phoenix Engine
   */
  async startPhoenixEngine() {
    this.log('INFO', 'Starting Phoenix Engine');
    
    const started = await this.phoenixEngine.start();
    if (!started) {
      throw new Error('Phoenix Engine failed to start');
    }

    this.log('SUCCESS', 'Phoenix Engine operational - Gauntlet test begins');
    return true;
  }

  /**
   * Monitor system health during test
   */
  startHealthMonitoring() {
    // Health check every 5 minutes
    setInterval(() => {
      const metrics = this.phoenixEngine.getMetrics();
      const elapsed = Date.now() - this.startTime;
      const remaining = this.testDuration - elapsed;
      
      this.log('INFO', 'Health check', {
        uptime: Math.floor(elapsed / 1000),
        remaining: Math.floor(remaining / 1000),
        whaleIntents: metrics.metrics.whaleIntentsDetected,
        tasksExecuted: metrics.metrics.tasksExecuted,
        systemHealth: metrics.systemHealth
      });

      // Check if test should continue
      if (remaining <= 0) {
        this.completeGauntletTest();
      }

    }, 300000); // Every 5 minutes
  }

  /**
   * Complete the Gauntlet test
   */
  async completeGauntletTest() {
    this.log('INFO', 'Gauntlet test duration complete - initiating shutdown');
    
    try {
      await this.phoenixEngine.shutdown();
      this.validationResults.totalUptime = Date.now() - this.startTime;
      
      this.generateFinalReport();
      
    } catch (error) {
      this.log('ERROR', 'Error during shutdown', {
        error: error.message,
        stack: error.stack
      });
      
      this.validationResults.criticalErrors.push({
        type: 'shutdownError',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(reason) {
    this.log('CRITICAL', 'EMERGENCY SHUTDOWN INITIATED', { reason });
    
    try {
      if (this.phoenixEngine) {
        await this.phoenixEngine.shutdown();
      }
    } catch (error) {
      this.log('ERROR', 'Error during emergency shutdown', {
        error: error.message
      });
    }
    
    this.generateFinalReport();
    process.exit(1);
  }

  /**
   * Generate final validation report
   */
  generateFinalReport() {
    const testDurationHours = (this.validationResults.totalUptime / (1000 * 60 * 60)).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('🏰 FORTRESS GAUNTLET - FINAL VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`📊 Test Duration: ${testDurationHours} hours`);
    console.log(`🎯 Target Duration: 48 hours`);
    console.log('');
    
    // Success Criteria Validation
    console.log('🎯 SUCCESS CRITERIA VALIDATION:');
    
    const criterion1 = !this.validationResults.unhandledException;
    console.log(`   1. Zero unhandled exceptions: ${criterion1 ? '✅ PASS' : '❌ FAIL'}`);
    
    const criterion2 = this.validationResults.nonZeroWorkerExits.length === 0;
    console.log(`   2. Zero non-zero worker exits: ${criterion2 ? '✅ PASS' : '❌ FAIL'} (${this.validationResults.nonZeroWorkerExits.length} detected)`);
    
    const criterion3 = this.validationResults.whaleTransactionDetected;
    console.log(`   3. Whale transaction detected: ${criterion3 ? '✅ PASS' : '❌ FAIL'}`);
    
    const criterion4 = this.validationResults.diagnosticLogsReceived > 0;
    console.log(`   4. Diagnostic logs received: ${criterion4 ? '✅ PASS' : '❌ FAIL'} (${this.validationResults.diagnosticLogsReceived} logs)`);
    
    console.log('');
    
    const allCriteriaMet = criterion1 && criterion2 && criterion3 && criterion4;
    
    if (allCriteriaMet) {
      console.log('🎉 FORTRESS GAUNTLET: PASSED');
      console.log('🏰 SentryCoin v6.1 is ready for production deployment');
      console.log('⚔️ THE FORTRESS IS COMPLETE');
      process.exit(0);
    } else {
      console.log('❌ FORTRESS GAUNTLET: FAILED');
      console.log('🛑 System is NOT ready for production deployment');
      console.log('🔧 Address all failures before proceeding');
      
      if (this.validationResults.criticalErrors.length > 0) {
        console.log('\n🚨 CRITICAL ERRORS:');
        this.validationResults.criticalErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.type}: ${error.error || error.reason}`);
        });
      }
      
      process.exit(1);
    }
  }

  /**
   * Run the complete Gauntlet test
   */
  async runGauntlet() {
    try {
      this.setupErrorMonitoring();
      
      const initialized = await this.initializePhoenixEngine();
      if (!initialized) {
        throw new Error('Failed to initialize Phoenix Engine');
      }
      
      await this.startPhoenixEngine();
      this.startHealthMonitoring();
      
      this.log('INFO', 'Gauntlet test running - monitoring for 48 hours');
      
    } catch (error) {
      this.log('CRITICAL', 'Gauntlet test failed to start', {
        error: error.message,
        stack: error.stack
      });
      
      this.emergencyShutdown('STARTUP_FAILURE');
    }
  }
}

// Run the Gauntlet if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const gauntlet = new FortressGauntlet();
  gauntlet.runGauntlet().catch(error => {
    console.error('❌ Gauntlet execution failed:', error.message);
    process.exit(1);
  });
}

export default FortressGauntlet;
