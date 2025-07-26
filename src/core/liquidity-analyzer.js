/**
 * SentryCoin v6.0 - Dynamic Liquidity Analyzer
 * 
 * PROJECT PHOENIX - MANDATE 1 IMPLEMENTATION
 * 
 * Replaces static CASCADE_LIQUIDITY_THRESHOLD with adaptive Dynamic Liquidity Score (DLS)
 * that adjusts to current market regime and asset-specific characteristics.
 * 
 * RED TEAM MANDATE: "Decommission static thresholds. Implement adaptive liquidity scoring."
 */

import { EventEmitter } from 'events';
import { getISTTime } from '../utils/index.js';

/**
 * Dynamic Liquidity Score Components
 */
export class LiquidityMetrics {
  constructor() {
    this.orderBookDepth = 0;        // Raw depth (existing)
    this.orderBookDensity = 0;      // Distribution around mid-price
    this.volumeProfile = 0;         // 1-hour rolling VWAP
    this.spreadTightness = 0;       // Bid-ask spread quality
    this.marketImpactCost = 0;      // Estimated slippage for standard size
    this.timestamp = Date.now();
  }

  /**
   * Calculate composite Dynamic Liquidity Score (0-100)
   */
  calculateDLS() {
    // Weighted scoring algorithm
    const depthWeight = 0.30;      // 30% - Raw liquidity depth
    const densityWeight = 0.25;    // 25% - Order distribution quality
    const volumeWeight = 0.20;     // 20% - Recent volume activity
    const spreadWeight = 0.15;     // 15% - Spread tightness
    const impactWeight = 0.10;     // 10% - Market impact cost

    const normalizedDepth = Math.min(100, (this.orderBookDepth / 1000000) * 100);
    const normalizedDensity = Math.min(100, this.orderBookDensity);
    const normalizedVolume = Math.min(100, this.volumeProfile);
    const normalizedSpread = Math.min(100, (1 / this.spreadTightness) * 100);
    const normalizedImpact = Math.min(100, (1 / this.marketImpactCost) * 100);

    const dls = (
      normalizedDepth * depthWeight +
      normalizedDensity * densityWeight +
      normalizedVolume * volumeWeight +
      normalizedSpread * spreadWeight +
      normalizedImpact * impactWeight
    );

    return Math.round(Math.max(0, Math.min(100, dls)));
  }
}

/**
 * Adaptive Liquidity Analyzer - Core Engine
 */
export default class LiquidityAnalyzer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.symbol = config.symbol || 'ETHUSDT';
    this.config = config;
    
    // Historical DLS tracking for percentile calculations
    this.dlsHistory = [];
    this.maxHistoryLength = 1440; // 24 hours of minute-level data
    
    // Current market state
    this.currentMetrics = new LiquidityMetrics();
    this.currentDLS = 0;
    this.dlsPercentile = 0;
    
    // Adaptive thresholds
    this.adaptiveThresholds = {
      signal_validation: 75,    // 75th percentile for signal validation
      high_confidence: 90,      // 90th percentile for high confidence
      low_liquidity_warning: 25 // 25th percentile for warnings
    };
    
    // Performance tracking
    this.stats = {
      dlsCalculations: 0,
      signalsValidated: 0,
      signalsRejected: 0,
      adaptiveAdjustments: 0,
      startTime: Date.now()
    };
    
    console.log(`🔬 Dynamic Liquidity Analyzer v6.0 initialized for ${this.symbol}`);
    console.log(`📊 Adaptive thresholds: Signal=${this.adaptiveThresholds.signal_validation}th percentile`);
  }

  /**
   * Analyze order book and calculate Dynamic Liquidity Score
   */
  analyzeOrderBook(orderBookData) {
    const { bids, asks, timestamp } = orderBookData;
    
    // Calculate order book depth (existing logic)
    const totalBidVolume = bids.reduce((sum, [price, quantity]) => sum + parseFloat(quantity), 0);
    const totalAskVolume = asks.reduce((sum, [price, quantity]) => sum + parseFloat(quantity), 0);
    
    // NEW: Calculate order book density
    const midPrice = this.calculateMidPrice(bids, asks);
    const density = this.calculateOrderBookDensity(bids, asks, midPrice);
    
    // NEW: Calculate spread tightness
    const spreadTightness = this.calculateSpreadTightness(bids, asks, midPrice);
    
    // NEW: Estimate market impact cost
    const marketImpact = this.estimateMarketImpact(bids, asks, 10000); // $10k order
    
    // Update current metrics
    this.currentMetrics.orderBookDepth = totalBidVolume + totalAskVolume;
    this.currentMetrics.orderBookDensity = density;
    this.currentMetrics.spreadTightness = spreadTightness;
    this.currentMetrics.marketImpactCost = marketImpact;
    this.currentMetrics.timestamp = timestamp || Date.now();
    
    // Calculate new DLS
    const newDLS = this.currentMetrics.calculateDLS();
    this.updateDLS(newDLS);
    
    this.stats.dlsCalculations++;
    
    return {
      dls: this.currentDLS,
      percentile: this.dlsPercentile,
      metrics: this.currentMetrics,
      isValidForSignal: this.isValidForSignalGeneration()
    };
  }

  /**
   * Calculate order book density around mid-price
   */
  calculateOrderBookDensity(bids, asks, midPrice) {
    const priceRange = midPrice * 0.01; // 1% around mid-price
    const upperBound = midPrice + priceRange;
    const lowerBound = midPrice - priceRange;
    
    let densityScore = 0;
    let totalOrders = 0;
    
    // Count orders within 1% of mid-price
    bids.forEach(([price, quantity]) => {
      const priceFloat = parseFloat(price);
      if (priceFloat >= lowerBound && priceFloat <= midPrice) {
        densityScore += parseFloat(quantity);
        totalOrders++;
      }
    });
    
    asks.forEach(([price, quantity]) => {
      const priceFloat = parseFloat(price);
      if (priceFloat >= midPrice && priceFloat <= upperBound) {
        densityScore += parseFloat(quantity);
        totalOrders++;
      }
    });
    
    // Normalize density score (orders per price level)
    return totalOrders > 0 ? (densityScore / totalOrders) * 10 : 0;
  }

  /**
   * Calculate spread tightness metric
   */
  calculateSpreadTightness(bids, asks, midPrice) {
    if (bids.length === 0 || asks.length === 0) return 0;
    
    const bestBid = parseFloat(bids[0][0]);
    const bestAsk = parseFloat(asks[0][0]);
    const spread = bestAsk - bestBid;
    const spreadBps = (spread / midPrice) * 10000; // Basis points
    
    // Tighter spreads = higher score
    return Math.max(0, 100 - spreadBps);
  }

  /**
   * Estimate market impact for given order size
   */
  estimateMarketImpact(bids, asks, orderSizeUSD) {
    // Simplified market impact calculation
    // In production, this would use more sophisticated models
    
    const midPrice = this.calculateMidPrice(bids, asks);
    const orderSizeTokens = orderSizeUSD / midPrice;
    
    let cumulativeVolume = 0;
    let weightedPrice = 0;
    
    // Walk through order book to estimate execution price
    for (const [price, quantity] of bids) {
      const priceFloat = parseFloat(price);
      const quantityFloat = parseFloat(quantity);
      
      if (cumulativeVolume + quantityFloat >= orderSizeTokens) {
        const remainingSize = orderSizeTokens - cumulativeVolume;
        weightedPrice += priceFloat * remainingSize;
        break;
      } else {
        weightedPrice += priceFloat * quantityFloat;
        cumulativeVolume += quantityFloat;
      }
    }
    
    const avgExecutionPrice = weightedPrice / orderSizeTokens;
    const impactBps = Math.abs((avgExecutionPrice - midPrice) / midPrice) * 10000;
    
    return impactBps;
  }

  /**
   * Calculate mid-price from order book
   */
  calculateMidPrice(bids, asks) {
    if (bids.length === 0 || asks.length === 0) return 0;
    
    const bestBid = parseFloat(bids[0][0]);
    const bestAsk = parseFloat(asks[0][0]);
    
    return (bestBid + bestAsk) / 2;
  }

  /**
   * Update DLS and historical tracking
   */
  updateDLS(newDLS) {
    this.currentDLS = newDLS;
    
    // Add to history
    this.dlsHistory.push({
      dls: newDLS,
      timestamp: Date.now()
    });
    
    // Maintain history length
    if (this.dlsHistory.length > this.maxHistoryLength) {
      this.dlsHistory.shift();
    }
    
    // Calculate current percentile
    this.dlsPercentile = this.calculatePercentile(newDLS);
    
    // Emit events for significant changes
    if (this.dlsPercentile >= this.adaptiveThresholds.high_confidence) {
      this.emit('HIGH_LIQUIDITY_REGIME', {
        dls: newDLS,
        percentile: this.dlsPercentile,
        timestamp: Date.now()
      });
    } else if (this.dlsPercentile <= this.adaptiveThresholds.low_liquidity_warning) {
      this.emit('LOW_LIQUIDITY_WARNING', {
        dls: newDLS,
        percentile: this.dlsPercentile,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Calculate percentile of current DLS vs historical data
   */
  calculatePercentile(currentDLS) {
    if (this.dlsHistory.length < 10) return 50; // Default to median if insufficient data
    
    const sortedDLS = this.dlsHistory.map(h => h.dls).sort((a, b) => a - b);
    const position = sortedDLS.findIndex(dls => dls >= currentDLS);
    
    if (position === -1) return 100; // Higher than all historical values
    
    return Math.round((position / sortedDLS.length) * 100);
  }

  /**
   * Validate if current liquidity is sufficient for signal generation
   */
  isValidForSignalGeneration() {
    const isValid = this.dlsPercentile >= this.adaptiveThresholds.signal_validation;
    
    if (isValid) {
      this.stats.signalsValidated++;
    } else {
      this.stats.signalsRejected++;
    }
    
    return isValid;
  }

  /**
   * Update volume profile (called by external volume tracker)
   */
  updateVolumeProfile(vwap1h) {
    this.currentMetrics.volumeProfile = vwap1h;
  }

  /**
   * Get current liquidity assessment
   */
  getLiquidityAssessment() {
    return {
      dls: this.currentDLS,
      percentile: this.dlsPercentile,
      isValidForSignal: this.isValidForSignalGeneration(),
      regime: this.getCurrentLiquidityRegime(),
      metrics: {
        depth: this.currentMetrics.orderBookDepth,
        density: this.currentMetrics.orderBookDensity,
        volume: this.currentMetrics.volumeProfile,
        spread: this.currentMetrics.spreadTightness,
        impact: this.currentMetrics.marketImpactCost
      },
      thresholds: this.adaptiveThresholds,
      timestamp: Date.now()
    };
  }

  /**
   * Determine current liquidity regime
   */
  getCurrentLiquidityRegime() {
    if (this.dlsPercentile >= 90) return 'ULTRA_HIGH';
    if (this.dlsPercentile >= 75) return 'HIGH';
    if (this.dlsPercentile >= 50) return 'NORMAL';
    if (this.dlsPercentile >= 25) return 'LOW';
    return 'CRITICAL';
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      currentDLS: this.currentDLS,
      currentPercentile: this.dlsPercentile,
      historyLength: this.dlsHistory.length,
      validationRate: this.stats.signalsValidated / (this.stats.signalsValidated + this.stats.signalsRejected) * 100
    };
  }
}
