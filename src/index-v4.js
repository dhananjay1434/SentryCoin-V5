#!/usr/bin/env node

/**
 * SentryCoin v4.0 Entry Point
 * 
 * The final evolution: From failed crash predictor to dual-strategy trading system
 * Based on comprehensive quantitative analysis of live-fire data
 */

import SentryCoinV4 from './sentrycoin-v4.js';
import QuantitativeAPI from './quantitative-api.js';
import MonitoringDashboard from '../monitoring-dashboard.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Global system instance
let sentryCoinSystem = null;

/**
 * Main execution function
 */
async function main() {
  console.log('🛡️ SentryCoin v4.0 - Dual-Strategy Market Engine');
  console.log('📊 Market Microstructure Classification System');
  console.log('🎯 Trifecta Conviction + Absorption Squeeze Strategies\n');

  // Create Express app for monitoring and control
  const app = express();
  const port = process.env.PORT || 3000;
  
  app.use(express.json());
  app.use(cors());

  // Initialize quantitative API and monitoring dashboard
  let quantitativeAPI = null;
  let monitoringDashboard = null;

  // Health check endpoint
  app.get('/', (req, res) => {
    const status = sentryCoinSystem ? sentryCoinSystem.getSystemStatus() : { status: 'initializing' };
    res.json({
      service: 'SentryCoin v4.0 Dual-Strategy Engine',
      version: '4.0',
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
      version: '4.0',
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

  // Classification statistics endpoint
  app.get('/classifications', (req, res) => {
    if (!sentryCoinSystem) {
      return res.status(503).json({ error: 'System not initialized' });
    }
    
    const status = sentryCoinSystem.getSystemStatus();
    res.json({
      classifier: status.classifier,
      totalSignals: (status.trifectaTrader?.signalsReceived || 0) + (status.squeezeTrader?.signalsReceived || 0),
      breakdown: {
        trifectaSignals: status.trifectaTrader?.signalsReceived || 0,
        squeezeSignals: status.squeezeTrader?.signalsReceived || 0
      },
      timestamp: new Date().toISOString()
    });
  });

  // System control endpoints
  app.post('/control/start', async (req, res) => {
    if (sentryCoinSystem?.isRunning) {
      return res.json({ message: 'System already running' });
    }
    
    try {
      if (!sentryCoinSystem) {
        sentryCoinSystem = new SentryCoinV4();
      }
      
      const started = await sentryCoinSystem.start();
      if (started) {
        res.json({ message: 'System started successfully' });
      } else {
        res.status(500).json({ error: 'Failed to start system' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/control/stop', async (req, res) => {
    if (!sentryCoinSystem?.isRunning) {
      return res.json({ message: 'System not running' });
    }
    
    try {
      await sentryCoinSystem.shutdown();
      res.json({ message: 'System stopped successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Configuration update endpoint
  app.post('/config/thresholds', (req, res) => {
    if (!sentryCoinSystem?.classifier) {
      return res.status(503).json({ error: 'Classifier not available' });
    }

    try {
      const { pressureThreshold, liquidityThreshold, strongMomentumThreshold, weakMomentumThreshold } = req.body;

      sentryCoinSystem.classifier.updateThresholds({
        pressureThreshold,
        liquidityThreshold,
        strongMomentumThreshold,
        weakMomentumThreshold
      });

      res.json({ message: 'Thresholds updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports listing endpoint
  app.get('/reports', async (req, res) => {
    try {
      if (!sentryCoinSystem?.reporter) {
        return res.status(503).json({ error: 'Reporter not available' });
      }

      const availableReports = await sentryCoinSystem.reporter.getAvailableReports();
      const reportStats = sentryCoinSystem.reporter.getReportStats();

      res.json({
        availableReports: availableReports,
        totalFiles: availableReports.length,
        reportStats: reportStats,
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

      // Security check - only allow report files
      if (!filename.match(/^(hourly_report|daily_report|session_report|classification|trifecta|squeeze|trade).*\.(json|txt)$/)) {
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

  // Generate and download session report
  app.get('/reports/session', async (req, res) => {
    try {
      if (!sentryCoinSystem?.reporter) {
        return res.status(503).json({ error: 'Reporter not available' });
      }

      const sessionReport = await sentryCoinSystem.reporter.generateSessionReport();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="session_report_${sessionReport.session.id}.json"`);
      res.json(sessionReport);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate and download hourly report
  app.get('/reports/hourly', async (req, res) => {
    try {
      if (!sentryCoinSystem?.reporter) {
        return res.status(503).json({ error: 'Reporter not available' });
      }

      await sentryCoinSystem.reporter.generateHourlyReport();
      res.json({ message: 'Hourly report generated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate and download daily report
  app.get('/reports/daily', async (req, res) => {
    try {
      if (!sentryCoinSystem?.reporter) {
        return res.status(503).json({ error: 'Reporter not available' });
      }

      await sentryCoinSystem.reporter.generateDailyReport();
      res.json({ message: 'Daily report generated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start Express server
  app.listen(port, () => {
    console.log(`🌐 SentryCoin v4.0 API server running on port ${port}`);
    console.log(`📡 Endpoints:`);
    console.log(`   Status: http://localhost:${port}/status`);
    console.log(`   Performance: http://localhost:${port}/performance`);
    console.log(`   Classifications: http://localhost:${port}/classifications`);
  });

  // Initialize and start the SentryCoin system
  try {
    sentryCoinSystem = new SentryCoinV4();
    const started = await sentryCoinSystem.start();
    
    if (started) {
      console.log('\n🎉 SentryCoin v4.0 is fully operational!');
      console.log('🧠 Market Classification: ACTIVE');
      console.log('🎯 Dual-Strategy Trading: MONITORING');
      console.log('📊 Real-time Analysis: RUNNING');

      // Initialize quantitative API endpoints
      quantitativeAPI = new QuantitativeAPI(sentryCoinSystem);
      app.use('/api/quantitative', quantitativeAPI.getRouter());
      console.log('📊 Quantitative API: ACTIVE');

      // Initialize monitoring dashboard
      monitoringDashboard = new MonitoringDashboard(sentryCoinSystem);
      monitoringDashboard.start(3001);
      console.log('📈 Monitoring Dashboard: http://localhost:3001');

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

    if (monitoringDashboard) {
      monitoringDashboard.stop();
      console.log('📈 Monitoring Dashboard: STOPPED');
    }

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

export default main;
