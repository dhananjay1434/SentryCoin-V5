#!/usr/bin/env node

/**
 * SentryCoin Flash Crash Predictor
 * 
 * A quantitative engine that analyzes real-time order book data
 * to predict and alert on potential flash crashes in cryptocurrency markets.
 * 
 * Core Algorithm:
 * - Monitors order book imbalances in real-time
 * - Calculates ask/bid volume ratios
 * - Triggers alerts when liquidity crisis conditions are detected
 * 
 * Author: SentryCoin Team
 * Version: 1.0.0
 */

import FlashCrashPredictor from './predictor.js';
import { validateEnvironmentVariables } from './utils.js';
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvironment() {
  const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const missing = validateEnvironmentVariables(required);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please copy .env.example to .env and fill in the values');
    process.exit(1);
  }
}

// Main execution function
async function main() {
  console.log('🛡️ SentryCoin Flash Crash Predictor v1.0.0');
  console.log('📊 Real-time order book imbalance detection engine\n');

  // Validate environment
  validateEnvironment();

  // Create Express app for Web Service compatibility
  const app = express();
  const port = process.env.PORT || 3000;

  // Health check endpoint to keep service alive
  app.get('/', (req, res) => {
    res.json({
      status: 'SentryCoin Flash Crash Predictor is running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      monitoring: process.env.SYMBOL || 'SOLUSDT',
      version: '1.0.0',
      webServer: 'Active',
      predictor: predictor ? 'Initialized' : 'Starting...'
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'flash-crash-predictor',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/status', (req, res) => {
    res.json({
      service: 'SentryCoin Flash Crash Predictor',
      version: '1.0.0',
      status: 'Running',
      symbol: process.env.SYMBOL || 'SOLUSDT',
      dangerRatio: process.env.DANGER_RATIO || '2.5',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        status: '/status',
        home: '/',
        reports: '/reports',
        download: '/download'
      }
    });
  });

  // Reports listing endpoint
  app.get('/reports', async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir('.');

      const reportFiles = files.filter(file =>
        file.includes('validation-report') ||
        file.includes('signal-validation') ||
        file.includes('backtest-results') ||
        file.includes('trifecta-backtest')
      );

      res.json({
        availableReports: reportFiles,
        totalFiles: reportFiles.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download specific report file
  app.get('/download/:filename', async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const filename = req.params.filename;

      // Security check - only allow specific file patterns
      if (!filename.match(/^(validation-report|signal-validation|backtest-results|trifecta-backtest).*\.(json|txt)$/)) {
        return res.status(400).json({ error: 'Invalid file type' });
      }

      const fileContent = await fs.readFile(filename, 'utf8');

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'File not found' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Start Express server
  app.listen(port, () => {
    console.log(`🌐 Web server running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
  });

  // Create and start the predictor
  const predictor = new FlashCrashPredictor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    predictor.shutdown();
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    predictor.shutdown();
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    predictor.shutdown();
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    predictor.shutdown();
  });
  
  try {
    // Start the prediction engine
    await predictor.start();

    // Keep the process running
    console.log('🔄 Engine running... Press Ctrl+C to stop\n');

  } catch (error) {
    console.error('❌ Failed to start Flash Crash Predictor:', error.message);
    console.log('🌐 Web server will continue running for health checks');
    // Don't exit - keep web server running for Render
  }
}

// Start the application
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
