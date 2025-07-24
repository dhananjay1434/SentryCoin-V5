#!/usr/bin/env node

/**
 * SentryCoin v4.0 - Production Trading Engine
 *
 * A sophisticated quantitative trading system that combines:
 * - Real-time market microstructure analysis
 * - Dual-strategy classification engine (Trifecta + Absorption Squeeze)
 * - Advanced risk management and position tracking
 * - Comprehensive reporting and monitoring
 *
 * @author SentryCoin Team
 * @version 4.0.0
 * @license MIT
 */

import SentryCoinEngine from './core/sentrycoin-engine.js';
import { config, validateConfig, printConfigSummary } from '../config.js';
import { validateEnvironmentVariables, getISTTime } from './utils/index.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Global system instance
let sentryCoinSystem = null;

/**
 * Validates required environment variables
 */
function validateEnvironment() {
  const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const missing = validateEnvironmentVariables(required);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please set up your environment variables');
    process.exit(1);
  }
}

/**
 * Main application entry point
 */
async function main() {
  console.log('🛡️ SentryCoin v4.0 - Production Trading Engine');
  console.log('📊 Market Microstructure Classification System');
  console.log('🎯 Dual-Strategy Trading Engine\n');

  // Validate configuration first
  if (!validateConfig()) {
    console.error('❌ Configuration validation failed. Exiting...');
    process.exit(1);
  }

  // Display production configuration
  printConfigSummary();

  validateEnvironment();

  // Create Express app for monitoring and control
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/', (req, res) => {
    const status = sentryCoinSystem ? sentryCoinSystem.getSystemStatus() : { status: 'initializing' };
    res.json({
      service: 'SentryCoin v4.0 Production Trading Engine',
      version: '4.0.0',
      status: sentryCoinSystem?.isRunning ? 'running' : 'stopped',
      uptime: status.uptime || 0,
      timestamp: new Date().toISOString(),
      system: status
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'sentrycoin-v4',
      version: '4.0.0',
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

  // Trading performance endpoint
  app.get('/performance', (req, res) => {
    if (!sentryCoinSystem) {
      return res.status(503).json({ error: 'System not initialized' });
    }

    const status = sentryCoinSystem.getSystemStatus();
    res.json({
      trifectaTrading: status.trifectaTrader,
      squeezeTrading: status.squeezeTrader,
      classifier: status.classifier,
      timestamp: new Date().toISOString()
    });
  });

  // Start Express server
  app.listen(port, () => {
    console.log(`🌐 SentryCoin v4.0 API server running on port ${port}`);
    console.log(`📡 Endpoints:`);
    console.log(`   Status: http://localhost:${port}/status`);
    console.log(`   Performance: http://localhost:${port}/performance`);
    console.log(`   Health: http://localhost:${port}/health`);
  });

  // Initialize and start the SentryCoin system with production config
  try {
    sentryCoinSystem = new SentryCoinEngine(config);
    const started = await sentryCoinSystem.start();

    if (started) {
      console.log('\n🎉 SentryCoin v4.0 is fully operational!');
      console.log('🧠 Market Classification: ACTIVE');
      console.log('🎯 Dual-Strategy Trading: MONITORING');
      console.log('📊 Real-time Analysis: RUNNING');
    } else {
      console.error('\n❌ Failed to start SentryCoin v4.0');
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
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    if (sentryCoinSystem) {
      await sentryCoinSystem.shutdown();
    }
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (sentryCoinSystem) {
      await sentryCoinSystem.shutdown();
    }
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (sentryCoinSystem) {
      await sentryCoinSystem.shutdown();
    }
    process.exit(1);
  });
}

// Start the application
main().catch(async (error) => {
  console.error('❌ Fatal startup error:', error);
  if (sentryCoinSystem) {
    await sentryCoinSystem.shutdown();
  }
  process.exit(1);
});
