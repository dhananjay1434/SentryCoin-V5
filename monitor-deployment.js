#!/usr/bin/env node

/**
 * Deployment Monitoring Script
 * 
 * Monitors the SentryCoin v4.0 Quantitative Framework deployment
 * and provides real-time status updates on all components
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

class DeploymentMonitor {
  constructor() {
    this.baseUrl = process.env.SENTRYCOIN_URL || 'https://sentrycoin-predictor-app.azurewebsites.net';
    this.dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3001';
    this.checkInterval = 30000; // 30 seconds
    this.isMonitoring = false;
    
    this.metrics = {
      systemStatus: null,
      quantitativeAPI: null,
      shadowTrading: null,
      waveletAnalysis: null,
      featurePipeline: null,
      lastUpdate: null,
      errors: []
    };
  }

  async start() {
    console.log('🔍 SentryCoin v4.0 Deployment Monitor Starting...');
    console.log(`📡 Monitoring: ${this.baseUrl}`);
    console.log(`📊 Dashboard: ${this.dashboardUrl}`);
    console.log('═'.repeat(80));
    
    this.isMonitoring = true;
    
    // Initial check
    await this.performHealthCheck();
    
    // Start periodic monitoring
    const interval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }
      await this.performHealthCheck();
    }, this.checkInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping deployment monitor...');
      this.isMonitoring = false;
      process.exit(0);
    });
  }

  async performHealthCheck() {
    const startTime = performance.now();
    
    try {
      console.log(`\n⏰ ${new Date().toISOString()} - Health Check`);
      
      // Check main system status
      await this.checkSystemStatus();
      
      // Check quantitative components
      await this.checkQuantitativeComponents();
      
      // Check dashboard
      await this.checkDashboard();
      
      // Display summary
      this.displaySummary();
      
      const duration = performance.now() - startTime;
      console.log(`✅ Health check completed in ${duration.toFixed(0)}ms`);
      
    } catch (error) {
      console.error(`❌ Health check failed: ${error.message}`);
      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  async checkSystemStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/status`, { timeout: 10000 });
      this.metrics.systemStatus = {
        status: 'healthy',
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
      
      console.log(`🛡️ System Status: ${response.data.status || 'unknown'}`);
      console.log(`   Uptime: ${response.data.uptime || 0}s`);
      console.log(`   Version: ${response.data.version || 'unknown'}`);
      
    } catch (error) {
      this.metrics.systemStatus = {
        status: 'error',
        error: error.message
      };
      console.log(`❌ System Status: ERROR - ${error.message}`);
    }
  }

  async checkQuantitativeComponents() {
    // Check Shadow Trading
    try {
      const response = await axios.get(`${this.baseUrl}/api/quantitative/shadow-trading/performance`, { timeout: 5000 });
      this.metrics.shadowTrading = {
        status: 'healthy',
        data: response.data
      };
      
      const perf = response.data.performance;
      console.log(`💰 Shadow Trading: ACTIVE`);
      console.log(`   Total P&L: $${perf.totalPnL.toFixed(2)}`);
      console.log(`   Win Rate: ${perf.winRate.toFixed(1)}%`);
      console.log(`   Total Trades: ${perf.totalTrades}`);
      
    } catch (error) {
      this.metrics.shadowTrading = {
        status: 'error',
        error: error.message
      };
      console.log(`❌ Shadow Trading: ERROR - ${error.message}`);
    }

    // Check Wavelet Analysis
    try {
      const response = await axios.get(`${this.baseUrl}/api/quantitative/wavelet/signals`, { timeout: 5000 });
      this.metrics.waveletAnalysis = {
        status: 'healthy',
        data: response.data
      };
      
      console.log(`🌊 Wavelet Analysis: ACTIVE`);
      console.log(`   Predictive Signals: ${response.data.predictiveSignals}`);
      console.log(`   Accuracy: ${response.data.accuracy.toFixed(1)}%`);
      console.log(`   Avg Lead Time: ${response.data.averageLeadTime.toFixed(1)}s`);
      
    } catch (error) {
      this.metrics.waveletAnalysis = {
        status: 'error',
        error: error.message
      };
      console.log(`❌ Wavelet Analysis: ERROR - ${error.message}`);
    }

    // Check Feature Pipeline
    try {
      const response = await axios.get(`${this.baseUrl}/api/quantitative/features/statistics`, { timeout: 5000 });
      this.metrics.featurePipeline = {
        status: 'healthy',
        data: response.data
      };
      
      const stats = response.data.statistics;
      console.log(`📊 Feature Pipeline: ACTIVE`);
      console.log(`   Features Calculated: ${stats.featuresCalculated}`);
      console.log(`   Avg Latency: ${stats.averageLatency.toFixed(1)}ms`);
      console.log(`   Data Points: ${stats.currentFeatureCount}`);
      
    } catch (error) {
      this.metrics.featurePipeline = {
        status: 'error',
        error: error.message
      };
      console.log(`❌ Feature Pipeline: ERROR - ${error.message}`);
    }
  }

  async checkDashboard() {
    try {
      const response = await axios.get(`${this.dashboardUrl}/api/dashboard/overview`, { timeout: 5000 });
      this.metrics.dashboard = {
        status: 'healthy',
        data: response.data
      };
      
      console.log(`📈 Dashboard: ACCESSIBLE`);
      console.log(`   URL: ${this.dashboardUrl}`);
      
    } catch (error) {
      this.metrics.dashboard = {
        status: 'error',
        error: error.message
      };
      console.log(`❌ Dashboard: ERROR - ${error.message}`);
    }
  }

  displaySummary() {
    console.log('\n📋 COMPONENT SUMMARY:');
    
    const components = [
      { name: 'System Status', metric: this.metrics.systemStatus },
      { name: 'Shadow Trading', metric: this.metrics.shadowTrading },
      { name: 'Wavelet Analysis', metric: this.metrics.waveletAnalysis },
      { name: 'Feature Pipeline', metric: this.metrics.featurePipeline },
      { name: 'Dashboard', metric: this.metrics.dashboard }
    ];
    
    components.forEach(({ name, metric }) => {
      const status = metric?.status || 'unknown';
      const icon = status === 'healthy' ? '✅' : status === 'error' ? '❌' : '⚠️';
      console.log(`   ${icon} ${name}: ${status.toUpperCase()}`);
    });
    
    // Show recent errors
    if (this.metrics.errors.length > 0) {
      console.log('\n🚨 RECENT ERRORS:');
      this.metrics.errors.slice(-3).forEach(error => {
        console.log(`   ${error.timestamp}: ${error.error}`);
      });
    }
    
    this.metrics.lastUpdate = new Date().toISOString();
  }

  async checkForPredictiveSignals() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/quantitative/analytics/dashboard`, { timeout: 5000 });
      const dashboard = response.data;
      
      if (dashboard.recentFeatures && dashboard.recentFeatures.length > 0) {
        const latestFeature = dashboard.recentFeatures[0];
        console.log(`\n🔬 LATEST ANALYSIS:`);
        console.log(`   OFI: ${latestFeature.ofi?.toFixed(4) || 'N/A'}`);
        console.log(`   Ask/Bid Ratio: ${latestFeature.askToBidRatio?.toFixed(2) || 'N/A'}`);
        console.log(`   Momentum: ${latestFeature.momentum?.toFixed(2) || 'N/A'}%`);
      }
      
      if (dashboard.recentTrades && dashboard.recentTrades.length > 0) {
        console.log(`\n💼 RECENT SHADOW TRADES:`);
        dashboard.recentTrades.slice(-3).forEach(trade => {
          const pnl = trade.realizedPnL > 0 ? `+$${trade.realizedPnL.toFixed(2)}` : `$${trade.realizedPnL.toFixed(2)}`;
          console.log(`   ${trade.type}: ${pnl} (${trade.closeReason})`);
        });
      }
      
    } catch (error) {
      // Silent fail for this optional check
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      deployment: {
        url: this.baseUrl,
        dashboard: this.dashboardUrl
      },
      metrics: this.metrics,
      summary: {
        healthyComponents: Object.values(this.metrics).filter(m => m?.status === 'healthy').length,
        totalComponents: Object.keys(this.metrics).length - 2, // Exclude lastUpdate and errors
        errorCount: this.metrics.errors.length
      }
    };
    
    console.log('\n📊 DEPLOYMENT REPORT:');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new DeploymentMonitor();
  
  const command = process.argv[2];
  
  if (command === 'report') {
    // Generate single report
    await monitor.performHealthCheck();
    await monitor.generateReport();
  } else if (command === 'check') {
    // Single health check
    await monitor.performHealthCheck();
  } else {
    // Continuous monitoring (default)
    await monitor.start();
  }
}

export default DeploymentMonitor;
