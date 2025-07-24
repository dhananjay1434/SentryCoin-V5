/**
 * SentryCoin v4.0 - Production Monitoring Dashboard
 * 
 * Real-time monitoring and alerting for live paper trading deployment
 * Tracks key performance metrics and system health
 */

import { EventEmitter } from 'events';

class ProductionDashboard extends EventEmitter {
  constructor() {
    super();
    
    this.startTime = Date.now();
    this.metrics = {
      // Signal Performance
      signals: {
        trifecta: { count: 0, lastFired: null, avgConfidence: 0 },
        squeeze: { count: 0, lastFired: null, avgConfidence: 0 },
        pressureSpike: { count: 0, lastFired: null, avgConfidence: 0 }
      },
      
      // Trading Performance (Paper)
      trading: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        maxDrawdown: 0,
        winRate: 0,
        avgHoldTime: 0
      },
      
      // System Health
      system: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        apiLatency: 0,
        errorRate: 0,
        classificationsPerHour: 0
      },
      
      // Market Conditions
      market: {
        currentPrice: 0,
        avgPressure: 0,
        avgLiquidity: 0,
        avgMomentum: 0,
        volatility: 0,
        lastUpdate: null
      }
    };
    
    this.alerts = [];
    this.performanceLog = [];
    
    console.log('📊 Production Dashboard initialized');
    this.startMonitoring();
  }
  
  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    // Update metrics every minute
    setInterval(() => {
      this.updateSystemMetrics();
      this.checkAlertConditions();
    }, 60000);
    
    // Generate hourly reports
    setInterval(() => {
      this.generateHourlyReport();
    }, 3600000);
    
    console.log('🔍 Production monitoring started');
  }
  
  /**
   * Record a signal event
   */
  recordSignal(signal) {
    const signalType = signal.type.toLowerCase().replace('_signal', '');
    
    if (this.metrics.signals[signalType]) {
      this.metrics.signals[signalType].count++;
      this.metrics.signals[signalType].lastFired = new Date().toISOString();
      
      console.log(`📈 Signal recorded: ${signal.type} (Total: ${this.metrics.signals[signalType].count})`);
    }
  }
  
  /**
   * Record a trade event
   */
  recordTrade(trade) {
    this.metrics.trading.totalTrades++;
    
    if (trade.pnl > 0) {
      this.metrics.trading.winningTrades++;
    } else {
      this.metrics.trading.losingTrades++;
    }
    
    this.metrics.trading.totalPnL += trade.pnl;
    this.metrics.trading.winRate = (this.metrics.trading.winningTrades / this.metrics.trading.totalTrades) * 100;
    
    console.log(`💰 Trade recorded: PnL ${trade.pnl.toFixed(2)} (Total: ${this.metrics.trading.totalPnL.toFixed(2)})`);
  }
  
  /**
   * Update market conditions
   */
  updateMarketConditions(data) {
    this.metrics.market = {
      currentPrice: data.price,
      avgPressure: data.pressure,
      avgLiquidity: data.liquidity,
      avgMomentum: data.momentum,
      volatility: data.volatility || 0,
      lastUpdate: new Date().toISOString()
    };
  }
  
  /**
   * Update system health metrics
   */
  updateSystemMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    this.metrics.system.uptime = uptime;
    
    // Memory usage (if available)
    if (process.memoryUsage) {
      const memory = process.memoryUsage();
      this.metrics.system.memoryUsage = Math.round((memory.heapUsed / memory.heapTotal) * 100);
    }
    
    console.log(`🔧 System metrics updated - Uptime: ${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m`);
  }
  
  /**
   * Check for alert conditions
   */
  checkAlertConditions() {
    const alerts = [];
    
    // High memory usage
    if (this.metrics.system.memoryUsage > 80) {
      alerts.push({
        type: 'SYSTEM_ALERT',
        severity: 'HIGH',
        message: `High memory usage: ${this.metrics.system.memoryUsage}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // No signals for extended period (potential issue)
    const totalSignals = Object.values(this.metrics.signals).reduce((sum, s) => sum + s.count, 0);
    const hoursRunning = this.metrics.system.uptime / 3600;
    
    if (hoursRunning > 2 && totalSignals === 0) {
      alerts.push({
        type: 'SIGNAL_ALERT',
        severity: 'MEDIUM',
        message: `No signals generated in ${hoursRunning.toFixed(1)} hours`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Process new alerts
    alerts.forEach(alert => {
      this.alerts.push(alert);
      console.log(`⚠️ ${alert.severity} ALERT: ${alert.message}`);
    });
  }
  
  /**
   * Generate hourly performance report
   */
  generateHourlyReport() {
    const report = {
      timestamp: new Date().toISOString(),
      period: 'hourly',
      metrics: { ...this.metrics },
      summary: {
        signalsGenerated: Object.values(this.metrics.signals).reduce((sum, s) => sum + s.count, 0),
        tradingPerformance: this.metrics.trading.winRate.toFixed(1) + '%',
        systemHealth: this.metrics.system.memoryUsage < 80 ? 'HEALTHY' : 'WARNING',
        marketActivity: this.metrics.market.avgPressure > 2 ? 'HIGH' : 'NORMAL'
      }
    };
    
    this.performanceLog.push(report);
    
    console.log('📊 HOURLY REPORT GENERATED');
    console.log(`   Signals: ${report.summary.signalsGenerated} | Win Rate: ${report.summary.tradingPerformance} | Health: ${report.summary.systemHealth}`);
    
    return report;
  }
  
  /**
   * Get current dashboard data
   */
  getDashboardData() {
    return {
      status: 'LIVE_PAPER_TRADING',
      version: '4.0.0',
      uptime: this.metrics.system.uptime,
      metrics: this.metrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      lastUpdate: new Date().toISOString()
    };
  }
}

export default ProductionDashboard;
