/**
 * Phoenix v6.0 - Real-Time Derivatives Monitor (Mandate 4)
 * 
 * Persistent WebSocket connections for sub-second derivatives updates.
 * Replaces polling-based approach with real-time streaming.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import axios from 'axios';

export default class DerivativesMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.symbol = config.symbol || 'ETHUSDT';
    this.logger = config.logger;
    this.bybitConfig = config.bybitConfig || {};
    
    // Current derivatives data
    this.data = {
      openInterest: {
        total: 0,
        change24h: 0,
        changeRate: 0,
        ath: false,
        lastUpdate: 0
      },
      fundingRates: {
        binance: 0,
        bybit: 0,
        average: 0,
        spike: false,
        trend: 'NEUTRAL',
        lastUpdate: 0
      },
      markPrice: {
        current: 0,
        change1m: 0,
        change5m: 0,
        volatility: 0,
        lastUpdate: 0
      }
    };
    
    // WebSocket connections
    this.connections = new Map();
    this.isStreaming = false;
    
    // Performance stats
    this.stats = {
      totalUpdates: 0,
      oiUpdates: 0,
      fundingUpdates: 0,
      markPriceUpdates: 0,
      alertsGenerated: 0,
      avgUpdateLatency: 0,
      startTime: Date.now()
    };
    
    this.logger?.info('derivatives_monitor_init', {
      symbol: this.symbol,
      bybitEnabled: !!this.bybitConfig.apiKey
    });
  }

  /**
   * Start derivatives monitoring
   */
  async start() {
    this.logger?.info('derivatives_monitoring_start', 'Starting real-time derivatives monitoring');

    try {
      let connectionsAttempted = 0;

      // Connect to Bybit if configured
      if (this.bybitConfig.apiKey) {
        try {
          await this.connectBybit();
          connectionsAttempted++;
        } catch (error) {
          this.logger?.warn('bybit_connection_failed', error.message);
        }
      }

      // Connect to Binance public streams
      try {
        await this.connectBinance();
        connectionsAttempted++;
      } catch (error) {
        this.logger?.warn('binance_connection_failed', error.message);
      }

      if (this.connections.size === 0) {
        if (connectionsAttempted > 0) {
          this.logger?.warn('derivatives_monitoring_limited', 'No derivatives connections established - running in limited mode');
        } else {
          this.logger?.info('derivatives_monitoring_disabled', 'No derivatives providers configured');
        }
        return true; // Don't fail the entire system
      }

      this.isStreaming = true;
      this.stats.startTime = Date.now();

      // Start periodic analysis
      this.startPeriodicAnalysis();

      this.logger?.info('derivatives_monitoring_active', {
        activeConnections: this.connections.size,
        symbol: this.symbol
      });

      return true;

    } catch (error) {
      this.logger?.error('derivatives_monitoring_failed', {
        error: error.message
      });
      // Don't fail the entire system
      this.logger?.info('derivatives_monitoring_fallback', 'Continuing without real-time derivatives monitoring');
      return true;
    }
  }

  /**
   * Connect to Bybit WebSocket
   */
  async connectBybit() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Bybit connection timeout'));
      }, 15000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        
        // Subscribe to relevant streams
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [
            `tickers.${this.symbol}`,
            `orderbook.1.${this.symbol}`,
            `publicTrade.${this.symbol}`
          ]
        }));
        
        this.connections.set('bybit', ws);
        this.logger?.info('bybit_connected', 'Bybit derivatives stream active');
        resolve();
      });
      
      ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.processBybitEvent(event);
        } catch (error) {
          this.logger?.error('bybit_message_error', error.message);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.logger?.error('bybit_error', error.message);
        reject(error);
      });
      
      ws.on('close', () => {
        this.handleConnectionClose('bybit');
      });
    });
  }

  /**
   * Connect to Binance Futures WebSocket
   */
  async connectBinance() {
    const symbol = this.symbol.toLowerCase();
    const streamUrl = `wss://fstream.binance.com/ws/${symbol}@markPrice@1s/${symbol}@ticker`;
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(streamUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Binance connection timeout'));
      }, 15000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        this.connections.set('binance', ws);
        this.logger?.info('binance_connected', 'Binance futures stream active');
        resolve();
      });
      
      ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.processBinanceEvent(event);
        } catch (error) {
          this.logger?.error('binance_message_error', error.message);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.logger?.error('binance_error', error.message);
        reject(error);
      });
      
      ws.on('close', () => {
        this.handleConnectionClose('binance');
      });
    });
  }

  /**
   * Process Bybit events
   */
  processBybitEvent(event) {
    if (!event.data) return;
    
    const startTime = Date.now();
    
    if (event.topic && event.topic.includes('tickers')) {
      this.processTickerUpdate(event.data, 'bybit');
    }
    
    this.stats.totalUpdates++;
    this.updateAverageLatency(Date.now() - startTime);
  }

  /**
   * Process Binance events
   */
  processBinanceEvent(event) {
    const startTime = Date.now();
    
    if (event.stream && event.data) {
      const { stream, data } = event;
      
      if (stream.includes('@markPrice')) {
        this.updateMarkPrice(parseFloat(data.p), 'binance');
        this.stats.markPriceUpdates++;
      }
      
      if (stream.includes('@ticker')) {
        this.processTickerUpdate(data, 'binance');
      }
    }
    
    this.stats.totalUpdates++;
    this.updateAverageLatency(Date.now() - startTime);
  }

  /**
   * Process ticker updates
   */
  processTickerUpdate(data, exchange) {
    // Update funding rate if available
    if (data.fundingRate !== undefined) {
      this.updateFundingRate(parseFloat(data.fundingRate), exchange);
      this.stats.fundingUpdates++;
    }
    
    // Update open interest if available
    if (data.openInterest !== undefined) {
      this.updateOpenInterest(parseFloat(data.openInterest), exchange);
      this.stats.oiUpdates++;
    }
    
    // Update mark price if available
    if (data.markPrice !== undefined) {
      this.updateMarkPrice(parseFloat(data.markPrice), exchange);
      this.stats.markPriceUpdates++;
    }
    
    this.emit('DERIVATIVES_UPDATE', {
      type: 'TICKER_UPDATE',
      exchange,
      data: this.data,
      timestamp: Date.now()
    });
  }

  /**
   * Update mark price data
   */
  updateMarkPrice(newPrice, exchange) {
    const previousPrice = this.data.markPrice.current;
    const timeDiff = Date.now() - this.data.markPrice.lastUpdate;
    
    this.data.markPrice.current = newPrice;
    
    // Calculate short-term changes
    if (previousPrice > 0) {
      const changePercent = ((newPrice - previousPrice) / previousPrice) * 100;
      
      if (timeDiff <= 60000) { // 1 minute
        this.data.markPrice.change1m = changePercent;
      }
      
      if (timeDiff <= 300000) { // 5 minutes
        this.data.markPrice.change5m = changePercent;
      }
      
      // Update volatility
      this.data.markPrice.volatility = Math.abs(changePercent);
    }
    
    this.data.markPrice.lastUpdate = Date.now();
  }

  /**
   * Update funding rate data
   */
  updateFundingRate(rate, exchange) {
    const previousAverage = this.data.fundingRates.average;
    
    this.data.fundingRates[exchange] = rate;
    
    // Calculate average
    const rates = [this.data.fundingRates.binance, this.data.fundingRates.bybit];
    const validRates = rates.filter(r => r !== 0);
    
    if (validRates.length > 0) {
      this.data.fundingRates.average = validRates.reduce((sum, r) => sum + r, 0) / validRates.length;
    }
    
    // Detect spikes (>1.8% daily)
    this.data.fundingRates.spike = Math.abs(this.data.fundingRates.average) > 0.018;
    
    // Determine trend
    if (this.data.fundingRates.average > previousAverage + 0.001) {
      this.data.fundingRates.trend = 'INCREASING';
    } else if (this.data.fundingRates.average < previousAverage - 0.001) {
      this.data.fundingRates.trend = 'DECREASING';
    } else {
      this.data.fundingRates.trend = 'NEUTRAL';
    }
    
    this.data.fundingRates.lastUpdate = Date.now();
    
    // Generate alert for funding spikes
    if (this.data.fundingRates.spike) {
      this.generateAlert('FUNDING_SPIKE', {
        rate: this.data.fundingRates.average,
        exchange,
        trend: this.data.fundingRates.trend
      });
    }
  }

  /**
   * Update open interest data
   */
  updateOpenInterest(newOI, exchange) {
    const previousTotal = this.data.openInterest.total;
    const timeDiff = Date.now() - this.data.openInterest.lastUpdate;
    
    this.data.openInterest.total = newOI;
    
    // Calculate rate of change
    if (previousTotal > 0 && timeDiff > 0) {
      const changeAmount = newOI - previousTotal;
      this.data.openInterest.changeRate = (changeAmount / previousTotal) * (60000 / timeDiff); // Per minute
    }
    
    // Check for ATH
    if (newOI > this.data.openInterest.total) {
      this.data.openInterest.ath = true;
    } else {
      this.data.openInterest.ath = false;
    }
    
    this.data.openInterest.lastUpdate = Date.now();
    
    // Generate alert for rapid OI changes
    if (Math.abs(this.data.openInterest.changeRate) > 0.05) { // 5% per minute
      this.generateAlert('OI_SPIKE', {
        changeRate: this.data.openInterest.changeRate,
        total: newOI,
        exchange
      });
    }
  }

  /**
   * Generate alert
   */
  generateAlert(alertType, data) {
    const alert = {
      type: alertType,
      data,
      timestamp: Date.now(),
      symbol: this.symbol
    };
    
    this.stats.alertsGenerated++;
    
    this.logger?.warn('derivatives_alert', alert);
    this.emit('DERIVATIVES_UPDATE', {
      type: alertType,
      exchange: data.exchange,
      data: alert,
      timestamp: Date.now()
    });
  }

  /**
   * Start periodic analysis
   */
  startPeriodicAnalysis() {
    setInterval(() => {
      this.analyzeDerivativesData();
    }, 10000); // Every 10 seconds
  }

  /**
   * Analyze derivatives data for patterns
   */
  analyzeDerivativesData() {
    const analysis = {
      oiChangeRate: this.data.openInterest.changeRate,
      fundingSpike: this.data.fundingRates.spike,
      markPriceVolatility: this.data.markPrice.volatility,
      timestamp: Date.now()
    };
    
    // Check for high volatility
    if (analysis.markPriceVolatility > 2.0) { // 2% volatility
      this.generateAlert('HIGH_VOLATILITY', analysis);
    }
    
    this.logger?.debug('derivatives_analysis', analysis);
  }

  /**
   * Update average latency
   */
  updateAverageLatency(newLatency) {
    if (this.stats.avgUpdateLatency === 0) {
      this.stats.avgUpdateLatency = newLatency;
    } else {
      this.stats.avgUpdateLatency = (this.stats.avgUpdateLatency + newLatency) / 2;
    }
  }

  /**
   * Handle connection close
   */
  handleConnectionClose(exchangeName) {
    this.connections.delete(exchangeName);
    
    if (this.connections.size === 0) {
      this.isStreaming = false;
    }
    
    this.logger?.warn('derivatives_connection_closed', exchangeName);
  }

  /**
   * Get current derivatives data
   */
  getData() {
    return this.data;
  }

  /**
   * Stop derivatives monitoring
   */
  async stop() {
    this.logger?.info('derivatives_monitoring_stop', 'Stopping derivatives monitoring');
    
    for (const [exchangeName, connection] of this.connections) {
      connection.close();
      this.logger?.info('derivatives_exchange_disconnected', exchangeName);
    }
    
    this.connections.clear();
    this.isStreaming = false;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      isStreaming: this.isStreaming,
      activeConnections: this.connections.size,
      updatesPerSecond: Math.round((this.stats.totalUpdates / (uptime / 1000)) * 100) / 100,
      avgUpdateLatency: Math.round(this.stats.avgUpdateLatency)
    };
  }
}
