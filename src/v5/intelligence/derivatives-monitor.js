/**
 * SentryCoin v5.0 - Derivatives Market Monitor
 * 
 * Real-time monitoring of derivatives markets including:
 * - Open Interest tracking across major exchanges
 * - Funding rate analysis and spike detection
 * - Leverage metrics and risk assessment
 * - Long/Short ratio monitoring
 */

import { EventEmitter } from 'events';
import axios from 'axios';
import { getISTTime, parseFloatEnv, parseIntEnv } from '../utils/index.js';

/**
 * Derivatives data structure
 */
export class DerivativesData {
  constructor() {
    this.openInterest = {
      total: 0,           // Total OI in USD
      change24h: 0,       // 24h change percentage
      ath: false,         // All-time high flag
      athValue: 0,        // ATH value for comparison
      exchanges: {}       // Per-exchange breakdown
    };
    
    this.fundingRates = {
      binance: 0,
      bybit: 0,
      okx: 0,
      average: 0,
      spike: false,       // Funding rate spike detected
      spikeThreshold: 0.018 // 0.018% daily threshold
    };
    
    this.leverageMetrics = {
      estimatedLeverageRatio: 0,
      longShortRatio: 0,
      topTraderPositions: {
        longPercentage: 0,
        shortPercentage: 0
      }
    };
    
    this.alerts = [];     // Generated alerts
    this.lastUpdate = Date.now();
    this.symbol = 'ETHUSDT';
  }

  /**
   * Update open interest data
   */
  updateOpenInterest(data) {
    const previousTotal = this.openInterest.total;
    this.openInterest.total = data.total || 0;
    this.openInterest.exchanges = data.exchanges || {};
    
    // Calculate 24h change
    if (previousTotal > 0) {
      this.openInterest.change24h = ((this.openInterest.total - previousTotal) / previousTotal) * 100;
    }
    
    // Check for ATH
    if (this.openInterest.total > this.openInterest.athValue) {
      this.openInterest.athValue = this.openInterest.total;
      this.openInterest.ath = true;
      this.generateAlert('OI_ATH', `Open Interest reached new ATH: $${(this.openInterest.total / 1e9).toFixed(2)}B`);
    } else {
      this.openInterest.ath = false;
    }
  }

  /**
   * Update funding rates
   */
  updateFundingRates(rates) {
    this.fundingRates.binance = rates.binance || 0;
    this.fundingRates.bybit = rates.bybit || 0;
    this.fundingRates.okx = rates.okx || 0;
    
    // Calculate average
    const validRates = [this.fundingRates.binance, this.fundingRates.bybit, this.fundingRates.okx]
      .filter(rate => rate !== 0);
    
    if (validRates.length > 0) {
      this.fundingRates.average = validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length;
    }
    
    // Check for spike
    const avgFunding = Math.abs(this.fundingRates.average);
    if (avgFunding > this.fundingRates.spikeThreshold) {
      this.fundingRates.spike = true;
      this.generateAlert('FUNDING_SPIKE', 
        `Funding rate spike detected: ${(this.fundingRates.average * 100).toFixed(4)}% (>${(this.fundingRates.spikeThreshold * 100).toFixed(4)}%)`);
    } else {
      this.fundingRates.spike = false;
    }
  }

  /**
   * Update leverage metrics
   */
  updateLeverageMetrics(metrics) {
    this.leverageMetrics.estimatedLeverageRatio = metrics.elr || 0;
    this.leverageMetrics.longShortRatio = metrics.longShortRatio || 0;
    this.leverageMetrics.topTraderPositions = metrics.topTraderPositions || {
      longPercentage: 0,
      shortPercentage: 0
    };
    
    // Check for dangerous leverage levels
    if (this.leverageMetrics.estimatedLeverageRatio > 0.90) {
      this.generateAlert('ELR_DANGER', 
        `Estimated Leverage Ratio in danger zone: ${(this.leverageMetrics.estimatedLeverageRatio * 100).toFixed(1)}%`);
    }
    
    // Check for extreme long/short ratios
    if (this.leverageMetrics.longShortRatio > 3.0 || this.leverageMetrics.longShortRatio < 0.33) {
      this.generateAlert('LONG_SHORT_EXTREME', 
        `Extreme Long/Short ratio detected: ${this.leverageMetrics.longShortRatio.toFixed(2)}`);
    }
  }

  /**
   * Generate alert
   */
  generateAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: Date.now(),
      istTime: getISTTime()
    };
    
    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Get summary for logging
   */
  getSummary() {
    return {
      openInterest: {
        total: `$${(this.openInterest.total / 1e9).toFixed(2)}B`,
        change24h: `${this.openInterest.change24h >= 0 ? '+' : ''}${this.openInterest.change24h.toFixed(2)}%`,
        ath: this.openInterest.ath
      },
      fundingRates: {
        average: `${(this.fundingRates.average * 100).toFixed(4)}%`,
        spike: this.fundingRates.spike
      },
      leverage: {
        elr: `${(this.leverageMetrics.estimatedLeverageRatio * 100).toFixed(1)}%`,
        longShortRatio: this.leverageMetrics.longShortRatio.toFixed(2)
      },
      alertCount: this.alerts.length
    };
  }
}

/**
 * Derivatives Monitor Service
 */
export class DerivativesMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = config;
    this.symbol = config.symbol || 'ETHUSDT';
    this.updateInterval = config.updateInterval || 300000; // 5 minutes
    this.enabled = config.enabled !== false;
    
    // Data storage
    this.data = new DerivativesData();
    this.data.symbol = this.symbol;
    
    // API configurations
    this.apis = {
      binance: config.apis?.binance || 'https://fapi.binance.com',
      bybit: config.apis?.bybit || 'https://api.bybit.com',
      coinglass: config.apis?.coinglass || 'https://open-api.coinglass.com'
    };
    
    // Update timer
    this.updateTimer = null;
    this.isRunning = false;
    
    // Statistics
    this.stats = {
      updatesCompleted: 0,
      updatesFailed: 0,
      lastSuccessfulUpdate: null,
      startTime: Date.now()
    };
    
    console.log(`📊 Derivatives Monitor initialized for ${this.symbol}`);
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Derivatives Monitor already running');
      return;
    }
    
    if (!this.enabled) {
      console.log('⚠️ Derivatives Monitor disabled in config');
      return;
    }
    
    console.log('🚀 Starting Derivatives Monitor...');
    
    try {
      // Initial data fetch
      await this.updateAllData();
      
      // Set up periodic updates
      this.updateTimer = setInterval(() => {
        this.updateAllData().catch(error => {
          console.error('❌ Derivatives update error:', error.message);
        });
      }, this.updateInterval);
      
      this.isRunning = true;
      console.log(`✅ Derivatives Monitor started (${this.updateInterval / 1000}s intervals)`);
      
    } catch (error) {
      console.error('❌ Failed to start Derivatives Monitor:', error.message);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Derivatives Monitor stopped');
  }

  /**
   * Update all derivatives data
   */
  async updateAllData() {
    try {
      console.log(`📊 Updating derivatives data for ${this.symbol}...`);
      
      // Fetch data from multiple sources
      const [oiData, fundingData, leverageData] = await Promise.allSettled([
        this.fetchOpenInterest(),
        this.fetchFundingRates(),
        this.fetchLeverageMetrics()
      ]);
      
      // Update data
      if (oiData.status === 'fulfilled') {
        this.data.updateOpenInterest(oiData.value);
      }
      
      if (fundingData.status === 'fulfilled') {
        this.data.updateFundingRates(fundingData.value);
      }
      
      if (leverageData.status === 'fulfilled') {
        this.data.updateLeverageMetrics(leverageData.value);
      }
      
      this.data.lastUpdate = Date.now();
      this.stats.updatesCompleted++;
      this.stats.lastSuccessfulUpdate = Date.now();
      
      // Emit update event
      this.emit('dataUpdated', this.data);
      
      // Emit specific alerts
      const newAlerts = this.data.alerts.filter(alert => 
        alert.timestamp > (this.stats.lastSuccessfulUpdate - this.updateInterval)
      );
      
      newAlerts.forEach(alert => {
        this.emit(alert.type, alert);
      });
      
      // Log summary
      const summary = this.data.getSummary();
      console.log(`📊 Derivatives Update: OI ${summary.openInterest.total} (${summary.openInterest.change24h}) | ` +
                 `Funding ${summary.fundingRates.average} | ELR ${summary.leverage.elr}`);
      
    } catch (error) {
      this.stats.updatesFailed++;
      console.error('❌ Derivatives data update failed:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * Fetch open interest data
   */
  async fetchOpenInterest() {
    // This would integrate with real APIs
    // For now, return mock data structure
    return {
      total: 24500000000, // $24.5B
      exchanges: {
        binance: 12000000000,
        bybit: 8000000000,
        okx: 4500000000
      }
    };
  }

  /**
   * Fetch funding rates
   */
  async fetchFundingRates() {
    // This would integrate with real APIs
    return {
      binance: 0.0125,  // 1.25% daily
      bybit: 0.0118,
      okx: 0.0132
    };
  }

  /**
   * Fetch leverage metrics
   */
  async fetchLeverageMetrics() {
    // This would integrate with real APIs
    return {
      elr: 0.87,  // 87% leverage ratio
      longShortRatio: 2.3,
      topTraderPositions: {
        longPercentage: 65,
        shortPercentage: 35
      }
    };
  }

  /**
   * Get current data
   */
  getData() {
    return this.data;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      isRunning: this.isRunning,
      lastUpdate: this.data.lastUpdate
    };
  }
}

export default DerivativesMonitor;
