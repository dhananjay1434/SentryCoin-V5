/**
 * SentryCoin v4.0 Detailed Reporting System
 * 
 * Generates comprehensive reports for all trading activities, classifications,
 * and performance metrics with downloadable storage capabilities
 */

import fs from 'fs/promises';
import path from 'path';
import { getISTTime, generateSignalId } from '../utils/index.js';
import cloudStorage from '../services/cloud-storage.js';

class DetailedReporter {
  constructor(symbol) {
    this.symbol = symbol;
    this.reportId = generateSignalId();
    this.startTime = Date.now();
    
    // Report data collection
    this.reportData = {
      session: {
        id: this.reportId,
        symbol: this.symbol,
        startTime: new Date().toISOString(),
        version: '4.1',
        algorithm: 'Three-Regime Market Intelligence'
      },
      classifications: [],
      cascadeSignals: [],
      coilSignals: [],
      shakeoutSignals: [],
      trades: [],
      performance: {
        hourly: [],
        daily: [],
        summary: {}
      },
      systemEvents: [],
      errors: []
    };
    
    // Report generation intervals
    this.hourlyReportTimer = null;
    this.dailyReportTimer = null;
    
    console.log(`📊 Detailed Reporter initialized for ${symbol}`);
    console.log(`📁 Report ID: ${this.reportId}`);
  }

  /**
   * Start automated report generation
   */
  startReporting() {
    // Generate hourly reports
    this.hourlyReportTimer = setInterval(() => {
      this.generateHourlyReport();
    }, 3600000); // Every hour
    
    // Generate daily reports
    this.dailyReportTimer = setInterval(() => {
      this.generateDailyReport();
    }, 86400000); // Every 24 hours
    
    console.log('📊 Automated reporting started');
  }

  /**
   * Stop automated reporting
   */
  stopReporting() {
    if (this.hourlyReportTimer) {
      clearInterval(this.hourlyReportTimer);
      this.hourlyReportTimer = null;
    }
    
    if (this.dailyReportTimer) {
      clearInterval(this.dailyReportTimer);
      this.dailyReportTimer = null;
    }
    
    console.log('📊 Automated reporting stopped');
  }

  /**
   * Record a market classification
   */
  recordClassification(classification) {
    const record = {
      timestamp: new Date().toISOString(),
      istTime: getISTTime(),
      type: classification.type || 'NO_SIGNAL',
      symbol: classification.symbol,
      price: classification.currentPrice,
      ratio: classification.askToBidRatio,
      bidVolume: classification.totalBidVolume,
      askVolume: classification.totalAskVolume,
      momentum: classification.momentum,
      confidence: classification.confidence,
      phenomenon: classification.phenomenon,
      expectedOutcome: classification.classification?.expectedOutcome
    };
    
    this.reportData.classifications.push(record);
    
    // Store in cloud for real-time access
    this.saveToCloud(`classification_${Date.now()}`, record);
  }

  /**
   * Record a CASCADE_HUNTER signal (v4.1)
   */
  recordCascadeSignal(signal) {
    const record = {
      id: signal.id || generateSignalId(),
      timestamp: new Date().toISOString(),
      istTime: getISTTime(),
      symbol: signal.symbol,
      price: signal.currentPrice,
      ratio: signal.askToBidRatio,
      momentum: signal.momentum,
      confidence: signal.confidence,
      strategy: 'SHORT',
      type: 'CASCADE_HUNTER',
      regime: signal.regime,
      conditions: signal.classification
    };

    this.reportData.cascadeSignals.push(record);
    this.saveToCloud(`cascade_signal_${record.id}`, record);

    console.log(`📊 CASCADE_HUNTER signal recorded: ${record.id}`);
  }

  /**
   * Record a COIL_WATCHER signal (v4.1)
   */
  recordCoilSignal(signal) {
    const record = {
      id: signal.id || generateSignalId(),
      timestamp: new Date().toISOString(),
      istTime: getISTTime(),
      symbol: signal.symbol,
      price: signal.currentPrice,
      ratio: signal.askToBidRatio,
      momentum: signal.momentum,
      confidence: signal.confidence,
      strategy: 'ALERT_ONLY',
      type: 'COIL_WATCHER',
      regime: signal.regime,
      conditions: signal.classification
    };

    this.reportData.coilSignals.push(record);
    this.saveToCloud(`coil_signal_${record.id}`, record);

    console.log(`📊 COIL_WATCHER signal recorded: ${record.id}`);
  }

  /**
   * Record a SHAKEOUT_DETECTOR signal (v4.1)
   */
  recordShakeoutSignal(signal) {
    const record = {
      id: signal.id || generateSignalId(),
      timestamp: new Date().toISOString(),
      istTime: getISTTime(),
      symbol: signal.symbol,
      price: signal.currentPrice,
      ratio: signal.askToBidRatio,
      momentum: signal.momentum,
      confidence: signal.confidence,
      strategy: 'ALERT_ONLY',
      type: 'SHAKEOUT_DETECTOR',
      regime: signal.regime,
      conditions: signal.classification
    };

    this.reportData.shakeoutSignals.push(record);
    this.saveToCloud(`shakeout_signal_${record.id}`, record);

    console.log(`📊 SHAKEOUT_DETECTOR signal recorded: ${record.id}`);
  }

  /**
   * Legacy method for backward compatibility
   */
  recordTrifectaSignal(signal) {
    // Redirect to CASCADE_HUNTER
    this.recordCascadeSignal(signal);
  }

  /**
   * Legacy method for backward compatibility
   */
  recordSqueezeSignal(signal) {
    // For now, just log - squeeze strategy is deprecated in v4.1
    console.log(`📊 Legacy squeeze signal ignored in v4.1: ${signal.symbol}`);
  }



  /**
   * Record a trade execution
   */
  recordTrade(trade) {
    const record = {
      id: trade.id,
      timestamp: new Date().toISOString(),
      istTime: getISTTime(),
      symbol: trade.symbol,
      type: trade.type,
      strategy: trade.strategy,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      size: trade.size,
      duration: trade.closeTime ? 
        new Date(trade.closeTime) - new Date(trade.openTime) : null,
      pnl: trade.realizedPnL,
      status: trade.status,
      closeReason: trade.closeReason,
      paperTrading: trade.paperTrading
    };
    
    this.reportData.trades.push(record);
    this.saveToCloud(`trade_${record.id}`, record);
    
    console.log(`📊 Trade recorded: ${record.id} (${record.status})`);
  }

  /**
   * Record system events
   */
  recordSystemEvent(event, details = {}) {
    const record = {
      timestamp: new Date().toISOString(),
      istTime: getISTTime(),
      event: event,
      details: details,
      symbol: this.symbol
    };
    
    this.reportData.systemEvents.push(record);
    this.saveToCloud(`system_event_${Date.now()}`, record);
  }

  /**
   * Record errors
   */
  recordError(error, context = '') {
    const record = {
      timestamp: new Date().toISOString(),
      istTime: getISTTime(),
      error: error.message || error,
      stack: error.stack,
      context: context,
      symbol: this.symbol
    };
    
    this.reportData.errors.push(record);
    this.saveToCloud(`error_${Date.now()}`, record);
    
    console.error(`📊 Error recorded: ${record.error}`);
  }

  /**
   * Generate hourly performance report
   */
  async generateHourlyReport() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);
    
    const hourlyData = {
      timestamp: now.toISOString(),
      istTime: getISTTime(),
      period: 'HOURLY',
      startTime: hourAgo.toISOString(),
      endTime: now.toISOString(),
      classifications: this.getDataInPeriod(this.reportData.classifications, hourAgo, now),
      cascadeSignals: this.getDataInPeriod(this.reportData.cascadeSignals, hourAgo, now),
      coilSignals: this.getDataInPeriod(this.reportData.coilSignals, hourAgo, now),
      shakeoutSignals: this.getDataInPeriod(this.reportData.shakeoutSignals, hourAgo, now),
      trades: this.getDataInPeriod(this.reportData.trades, hourAgo, now),
      performance: this.calculatePeriodPerformance(hourAgo, now)
    };
    
    this.reportData.performance.hourly.push(hourlyData);
    
    // Save hourly report
    const filename = `hourly_report_${this.symbol}_${now.getTime()}.json`;
    await this.saveReport(filename, hourlyData);
    
    console.log(`📊 Hourly report generated: ${filename}`);
  }

  /**
   * Generate daily performance report
   */
  async generateDailyReport() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000);
    
    const dailyData = {
      timestamp: now.toISOString(),
      istTime: getISTTime(),
      period: 'DAILY',
      startTime: dayAgo.toISOString(),
      endTime: now.toISOString(),
      classifications: this.getDataInPeriod(this.reportData.classifications, dayAgo, now),
      cascadeSignals: this.getDataInPeriod(this.reportData.cascadeSignals, dayAgo, now),
      coilSignals: this.getDataInPeriod(this.reportData.coilSignals, dayAgo, now),
      shakeoutSignals: this.getDataInPeriod(this.reportData.shakeoutSignals, dayAgo, now),
      trades: this.getDataInPeriod(this.reportData.trades, dayAgo, now),
      performance: this.calculatePeriodPerformance(dayAgo, now),
      summary: this.generateDailySummary(dayAgo, now)
    };
    
    this.reportData.performance.daily.push(dailyData);
    
    // Save daily report
    const filename = `daily_report_${this.symbol}_${now.toISOString().split('T')[0]}.json`;
    await this.saveReport(filename, dailyData);
    
    console.log(`📊 Daily report generated: ${filename}`);
  }

  /**
   * Generate comprehensive session report
   */
  async generateSessionReport() {
    const now = new Date();
    const sessionDuration = now.getTime() - this.startTime;
    
    const sessionReport = {
      ...this.reportData,
      endTime: now.toISOString(),
      sessionDuration: sessionDuration,
      summary: {
        totalClassifications: this.reportData.classifications.length,
        totalCascadeSignals: this.reportData.cascadeSignals.length,
        totalCoilSignals: this.reportData.coilSignals.length,
        totalShakeoutSignals: this.reportData.shakeoutSignals.length,
        totalTrades: this.reportData.trades.length,
        totalErrors: this.reportData.errors.length,
        uptime: Math.floor(sessionDuration / 1000),
        performance: this.calculateOverallPerformance()
      }
    };
    
    // Save session report
    const filename = `session_report_${this.symbol}_${this.reportId}.json`;
    await this.saveReport(filename, sessionReport);
    
    console.log(`📊 Session report generated: ${filename}`);
    return sessionReport;
  }

  /**
   * Get data within a specific time period
   */
  getDataInPeriod(dataArray, startTime, endTime) {
    return dataArray.filter(item => {
      const itemTime = new Date(item.timestamp);
      return itemTime >= startTime && itemTime <= endTime;
    });
  }

  /**
   * Calculate performance metrics for a period
   */
  calculatePeriodPerformance(startTime, endTime) {
    const periodTrades = this.getDataInPeriod(this.reportData.trades, startTime, endTime);
    
    if (periodTrades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnL: 0
      };
    }
    
    const winners = periodTrades.filter(t => t.pnl > 0).length;
    const totalPnL = periodTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      totalTrades: periodTrades.length,
      winRate: (winners / periodTrades.length * 100).toFixed(2),
      totalPnL: totalPnL.toFixed(2),
      avgPnL: (totalPnL / periodTrades.length).toFixed(2),
      winners: winners,
      losers: periodTrades.length - winners
    };
  }

  /**
   * Calculate overall performance
   */
  calculateOverallPerformance() {
    const allTrades = this.reportData.trades;
    
    if (allTrades.length === 0) {
      return { message: 'No trades executed' };
    }
    
    const trifectaTrades = allTrades.filter(t => t.strategy === 'TRIFECTA_CONVICTION');
    const squeezeTrades = allTrades.filter(t => t.strategy === 'ABSORPTION_SQUEEZE');
    
    return {
      overall: this.calculatePeriodPerformance(new Date(0), new Date()),
      trifecta: this.calculateTradeGroupPerformance(trifectaTrades),
      squeeze: this.calculateTradeGroupPerformance(squeezeTrades)
    };
  }

  /**
   * Calculate performance for a group of trades
   */
  calculateTradeGroupPerformance(trades) {
    if (trades.length === 0) return { totalTrades: 0 };
    
    const winners = trades.filter(t => t.pnl > 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      totalTrades: trades.length,
      winRate: (winners / trades.length * 100).toFixed(2),
      totalPnL: totalPnL.toFixed(2),
      avgPnL: (totalPnL / trades.length).toFixed(2)
    };
  }

  /**
   * Generate daily summary
   */
  generateDailySummary(startTime, endTime) {
    const classifications = this.getDataInPeriod(this.reportData.classifications, startTime, endTime);
    const signals = [...this.getDataInPeriod(this.reportData.cascadeSignals, startTime, endTime),
                     ...this.getDataInPeriod(this.reportData.coilSignals, startTime, endTime),
                     ...this.getDataInPeriod(this.reportData.shakeoutSignals, startTime, endTime)];
    
    return {
      classificationsPerHour: (classifications.length / 24).toFixed(1),
      signalsPerHour: (signals.length / 24).toFixed(1),
      signalRate: classifications.length > 0 ? 
        ((signals.length / classifications.length) * 100).toFixed(2) : 0,
      mostActiveHour: this.findMostActiveHour(classifications),
      avgMomentum: this.calculateAverageMomentum(classifications)
    };
  }

  /**
   * Find most active hour
   */
  findMostActiveHour(classifications) {
    const hourCounts = {};
    classifications.forEach(c => {
      const hour = new Date(c.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const maxHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b, '0');
    
    return `${maxHour}:00 (${hourCounts[maxHour]} classifications)`;
  }

  /**
   * Calculate average momentum
   */
  calculateAverageMomentum(classifications) {
    if (classifications.length === 0) return 0;
    
    const totalMomentum = classifications.reduce((sum, c) => sum + (c.momentum || 0), 0);
    return (totalMomentum / classifications.length).toFixed(3);
  }

  /**
   * Save report to file and cloud
   */
  async saveReport(filename, data) {
    try {
      // Save to local file
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      
      // Save to cloud storage
      await this.saveToCloud(filename.replace('.json', ''), data);
      
      console.log(`📁 Report saved: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to save report ${filename}:`, error.message);
    }
  }

  /**
   * Save data to cloud storage
   */
  async saveToCloud(key, data) {
    try {
      await cloudStorage.save(`${this.symbol}_${key}`, data);
    } catch (error) {
      console.warn(`⚠️ Cloud save failed for ${key}:`, error.message);
    }
  }

  /**
   * Get all available reports
   */
  async getAvailableReports() {
    try {
      const files = await fs.readdir('.');
      return files.filter(file => 
        file.includes('report') && 
        file.includes(this.symbol) && 
        file.endsWith('.json')
      );
    } catch (error) {
      console.error('❌ Failed to list reports:', error.message);
      return [];
    }
  }

  /**
   * Get report statistics
   */
  getReportStats() {
    return {
      sessionId: this.reportId,
      symbol: this.symbol,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      dataPoints: {
        classifications: this.reportData.classifications.length,
        cascadeSignals: this.reportData.cascadeSignals.length,
        coilSignals: this.reportData.coilSignals.length,
        shakeoutSignals: this.reportData.shakeoutSignals.length,
        trades: this.reportData.trades.length,
        errors: this.reportData.errors.length
      },
      reportingActive: this.hourlyReportTimer !== null
    };
  }
}

export default DetailedReporter;
