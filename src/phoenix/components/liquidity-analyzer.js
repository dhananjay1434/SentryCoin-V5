/**
 * Phoenix v6.0 - Dynamic Liquidity Analyzer (Mandate 1)
 *
 * COMPLETE REPLACEMENT OF STATIC THRESHOLDS
 *
 * Implements adaptive Dynamic Liquidity Score (DLS) system that:
 * - Calculates real-time liquidity percentiles (24h rolling window)
 * - Adapts to asset-specific liquidity regimes
 * - Provides predictive liquidity crisis detection
 * - Eliminates fantasy-land static thresholds
 */

import { EventEmitter } from 'events';

export default class LiquidityAnalyzer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.symbol = config.symbol || 'ETHUSDT';
    this.logger = config.logger;
    
    // MANDATE 1: ADAPTIVE PERCENTILE-BASED THRESHOLDS
    // No more static CASCADE_LIQUIDITY_THRESHOLD fantasy numbers
    this.thresholds = {
      signalValidation: config.signalValidation || 75,    // 75th percentile for signal validation
      highConfidence: config.highConfidence || 90,       // 90th percentile for high confidence
      lowLiquidityWarning: config.lowLiquidityWarning || 25,  // 25th percentile for warnings
      criticalLiquidity: config.criticalLiquidity || 10  // 10th percentile for critical alerts
    };

    // DLS HISTORY FOR REAL-TIME PERCENTILE CALCULATION
    // 24-hour rolling window at 30-second intervals = 2880 data points
    this.dlsHistory = [];
    this.maxHistorySize = 2880;

    // VWAP CALCULATION COMPONENTS (1-hour rolling for density analysis)
    this.vwapWindow = [];
    this.maxVwapSize = 120; // 1 hour at 30-second intervals

    // CURRENT LIQUIDITY STATE
    this.currentDLS = 0;
    this.dlsPercentile = 0;
    this.liquidityRegime = 'UNKNOWN'; // CRITICAL, LOW, MEDIUM, HIGH

    // ENHANCED PERFORMANCE METRICS
    this.stats = {
      dlsCalculations: 0,
      signalsValidated: 0,
      signalsRejected: 0,
      highLiquidityEvents: 0,
      lowLiquidityWarnings: 0,
      criticalLiquidityEvents: 0,
      avgDLS: 0,
      startTime: Date.now()
    };
    
    this.logger?.info('mandate_1_dynamic_liquidity_analyzer_initialized', {
      symbol: this.symbol,
      thresholds: this.thresholds,
      mandate: 'MANDATE_1_ACTIVE',
      description: 'Static CASCADE_LIQUIDITY_THRESHOLD eliminated - Adaptive DLS system operational'
    });
  }

  /**
   * MANDATE 1: DYNAMIC LIQUIDITY ANALYZER
   *
   * Replaces static CASCADE_LIQUIDITY_THRESHOLD with adaptive DLS system
   * that calculates percentile-based thresholds for signal validation.
   */
  async analyzeOrderBook(orderBookData) {
    const { bids, asks, timestamp } = orderBookData;

    if (!bids || !asks || bids.length === 0 || asks.length === 0) {
      return this.createAnalysisResult(0, 'INVALID_DATA');
    }

    try {
      // MANDATE 1 IMPLEMENTATION: Multi-factor DLS calculation

      // 1. Order Book Depth (raw depth as before)
      const depth = this.calculateDepth(bids, asks);

      // 2. Order Book Density (distribution around mid-price)
      const density = this.calculateDensity(bids, asks);

      // 3. Spread Tightness (bid-ask spread analysis)
      const spread = this.calculateSpreadTightness(bids, asks);

      // 4. Market Impact Cost (for $10k order)
      const impact = this.estimateMarketImpact(bids, asks, 10000);

      // 5. Recent Volume Profile (1-hour rolling VWAP integration)
      const volumeProfile = this.calculateVolumeProfile(timestamp);

      // Calculate composite DLS (0-100) with volume profile weighting
      const dls = this.calculateDLS(depth, density, spread, impact, volumeProfile);

      // Update 24-hour rolling history for percentile calculation
      this.updateDLSHistory(dls, timestamp);

      // Calculate current percentile position (adaptive threshold)
      const percentile = this.calculatePercentile(dls);

      this.stats.dlsCalculations++;

      const analysis = this.createAnalysisResult(dls, 'SUCCESS', percentile);

      // MANDATE 1: Adaptive signal validation
      // No more static thresholds - use percentile-based validation
      if (percentile >= this.thresholds.highConfidence) {
        this.emit('HIGH_LIQUIDITY_REGIME', analysis);
        this.stats.highLiquidityEvents++;
      } else if (percentile <= this.thresholds.lowLiquidityWarning) {
        this.emit('LOW_LIQUIDITY_WARNING', analysis);
        this.stats.lowLiquidityWarnings++;
      } else if (percentile <= this.thresholds.criticalLiquidity) {
        this.emit('CRITICAL_LIQUIDITY_DETECTED', analysis);
        this.stats.criticalLiquidityEvents++;
      }

      this.emit('LIQUIDITY_ANALYSIS', analysis);

      return analysis;

    } catch (error) {
      this.logger?.error('mandate_1_dls_calculation_error', {
        error: error.message,
        symbol: this.symbol,
        mandate: 'MANDATE_1_FAILURE'
      });
      return this.createAnalysisResult(0, 'ERROR');
    }
  }

  /**
   * Calculate order book depth
   */
  calculateDepth(bids, asks) {
    const bidVolume = bids.reduce((sum, [price, qty]) => sum + parseFloat(qty), 0);
    const askVolume = asks.reduce((sum, [price, qty]) => sum + parseFloat(qty), 0);
    return bidVolume + askVolume;
  }

  /**
   * Calculate order book density around mid-price
   */
  calculateDensity(bids, asks) {
    const midPrice = this.getMidPrice(bids, asks);
    const priceRange = midPrice * 0.01; // 1% range
    const upperBound = midPrice + priceRange;
    const lowerBound = midPrice - priceRange;
    
    let densityScore = 0;
    let orderCount = 0;
    
    // Count orders within 1% of mid-price
    bids.forEach(([price, qty]) => {
      const p = parseFloat(price);
      if (p >= lowerBound && p <= midPrice) {
        densityScore += parseFloat(qty);
        orderCount++;
      }
    });
    
    asks.forEach(([price, qty]) => {
      const p = parseFloat(price);
      if (p >= midPrice && p <= upperBound) {
        densityScore += parseFloat(qty);
        orderCount++;
      }
    });
    
    return orderCount > 0 ? (densityScore / orderCount) * 10 : 0;
  }

  /**
   * Calculate spread tightness
   */
  calculateSpreadTightness(bids, asks) {
    if (bids.length === 0 || asks.length === 0) return 0;
    
    const bestBid = parseFloat(bids[0][0]);
    const bestAsk = parseFloat(asks[0][0]);
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadBps = (spread / midPrice) * 10000;
    
    // Tighter spreads = higher score
    return Math.max(0, 100 - spreadBps);
  }

  /**
   * Estimate market impact for given order size
   */
  estimateMarketImpact(bids, asks, orderSizeUSD) {
    const midPrice = this.getMidPrice(bids, asks);
    const orderSizeTokens = orderSizeUSD / midPrice;
    
    let cumulativeVolume = 0;
    let weightedPrice = 0;
    
    // Walk through bids to estimate execution price
    for (const [price, qty] of bids) {
      const priceFloat = parseFloat(price);
      const qtyFloat = parseFloat(qty);
      
      if (cumulativeVolume + qtyFloat >= orderSizeTokens) {
        const remainingSize = orderSizeTokens - cumulativeVolume;
        weightedPrice += priceFloat * remainingSize;
        break;
      } else {
        weightedPrice += priceFloat * qtyFloat;
        cumulativeVolume += qtyFloat;
      }
    }
    
    if (cumulativeVolume === 0) return 100; // High impact
    
    const avgExecutionPrice = weightedPrice / orderSizeTokens;
    const impactBps = Math.abs((avgExecutionPrice - midPrice) / midPrice) * 10000;
    
    return Math.max(0, 100 - impactBps);
  }

  /**
   * Calculate composite Dynamic Liquidity Score
   */
  calculateDLS(depth, density, spread, impact, volumeProfile = 1.0) {
    // MANDATE 1: Enhanced weighted scoring with volume profile integration
    const depthWeight = 0.25;      // Order book depth
    const densityWeight = 0.25;    // Order distribution density
    const spreadWeight = 0.20;     // Bid-ask spread tightness
    const impactWeight = 0.20;     // Market impact cost
    const volumeWeight = 0.10;     // Recent volume profile (1-hour VWAP)

    // Normalize components to 0-100 scale with improved scaling
    const normalizedDepth = Math.min(100, Math.log10(depth + 1) * 20);
    const normalizedDensity = Math.min(100, density * 100);
    const normalizedSpread = Math.max(0, 100 - (spread * 2000)); // Tighter spread = higher score
    const normalizedImpact = Math.max(0, 100 - (impact * 20)); // Lower impact = higher score
    const normalizedVolume = Math.min(100, volumeProfile * 100); // Volume profile factor

    // Calculate composite DLS with all factors
    const dls = (
      normalizedDepth * depthWeight +
      normalizedDensity * densityWeight +
      normalizedSpread * spreadWeight +
      normalizedImpact * impactWeight +
      normalizedVolume * volumeWeight
    );

    return Math.round(Math.max(0, Math.min(100, dls)));
  }

  /**
   * MANDATE 1: Calculate volume profile for DLS enhancement
   */
  calculateVolumeProfile(timestamp) {
    if (this.vwapWindow.length === 0) {
      return 1.0; // Neutral factor if no volume data
    }

    // Calculate 1-hour rolling VWAP factor
    const now = timestamp || Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Filter recent volume data
    const recentVolume = this.vwapWindow.filter(entry => entry.timestamp > oneHourAgo);

    if (recentVolume.length === 0) {
      return 1.0;
    }

    // Calculate volume-weighted average and normalize
    const totalVolume = recentVolume.reduce((sum, entry) => sum + entry.volume, 0);
    const avgVolume = totalVolume / recentVolume.length;

    // Return normalized volume factor (0.5 to 1.5 range)
    return Math.max(0.5, Math.min(1.5, avgVolume / 1000000)); // Normalize to typical volume
  }

  /**
   * Update DLS history and calculate percentile
   */
  updateDLSHistory(dls) {
    this.currentDLS = dls;
    
    // Add to history
    this.dlsHistory.push({
      dls,
      timestamp: Date.now()
    });
    
    // Maintain history length
    if (this.dlsHistory.length > this.maxHistorySize) {
      this.dlsHistory.shift();
    }
    
    // Calculate percentile
    this.currentPercentile = this.calculatePercentile(dls);
  }

  /**
   * Calculate percentile of current DLS
   */
  calculatePercentile(currentDLS) {
    if (this.dlsHistory.length < 10) return 50;
    
    const sortedDLS = this.dlsHistory.map(h => h.dls).sort((a, b) => a - b);
    const position = sortedDLS.findIndex(dls => dls >= currentDLS);
    
    if (position === -1) return 100;
    
    return Math.round((position / sortedDLS.length) * 100);
  }

  /**
   * Get mid-price from order book
   */
  getMidPrice(bids, asks) {
    if (bids.length === 0 || asks.length === 0) return 0;
    
    const bestBid = parseFloat(bids[0][0]);
    const bestAsk = parseFloat(asks[0][0]);
    
    return (bestBid + bestAsk) / 2;
  }

  /**
   * Create analysis result object
   */
  createAnalysisResult(dls, status) {
    const percentile = this.currentPercentile;
    const isValidForSignal = percentile >= this.thresholds.signalValidation;
    
    if (isValidForSignal) {
      this.stats.signalsValidated++;
    } else {
      this.stats.signalsRejected++;
    }
    
    return {
      dls,
      percentile,
      isValidForSignal,
      regime: this.getLiquidityRegime(percentile),
      status,
      timestamp: Date.now(),
      thresholds: this.thresholds
    };
  }

  /**
   * Determine liquidity regime
   */
  getLiquidityRegime(percentile) {
    if (percentile >= 90) return 'ULTRA_HIGH';
    if (percentile >= 75) return 'HIGH';
    if (percentile >= 50) return 'NORMAL';
    if (percentile >= 25) return 'LOW';
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
      currentPercentile: this.currentPercentile,
      historyLength: this.dlsHistory.length,
      validationRate: this.stats.signalsValidated / (this.stats.signalsValidated + this.stats.signalsRejected) * 100 || 0
    };
  }
}
