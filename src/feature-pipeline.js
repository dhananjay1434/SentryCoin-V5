/**
 * Feature Pipeline - Real-time Market Microstructure Feature Engineering
 * 
 * Implements the data pipeline architecture for quantitative alpha generation:
 * - Real-time order book reconstruction
 * - Feature vector calculation (OFI, Ratio, Momentum, Depth)
 * - Time-series data persistence for offline analysis
 * - Low-latency feature caching for live trading
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

class FeaturePipeline extends EventEmitter {
  constructor(symbol) {
    super();
    
    this.symbol = symbol;
    this.features = new Map(); // timestamp -> feature vector
    this.maxHistoryLength = parseInt(process.env.FEATURE_HISTORY_LENGTH || '3600'); // 1 hour at 1s intervals
    
    // Feature calculation parameters
    this.momentumWindow = parseInt(process.env.MOMENTUM_WINDOW || '60'); // 60 seconds
    this.depthLevels = parseInt(process.env.DEPTH_LEVELS || '10'); // Top 10 levels
    
    // Data persistence
    this.persistenceEnabled = process.env.FEATURE_PERSISTENCE === 'true';
    this.persistenceInterval = parseInt(process.env.PERSISTENCE_INTERVAL || '300'); // 5 minutes
    this.dataDirectory = process.env.DATA_DIRECTORY || './feature-data';
    
    // Performance tracking
    this.stats = {
      featuresCalculated: 0,
      averageLatency: 0,
      lastFeatureTime: null,
      dataPointsStored: 0
    };
    
    this.initializeDataDirectory();
    this.startPeriodicPersistence();
    
    console.log(`📊 Feature Pipeline initialized for ${symbol}`);
    console.log(`🔄 History Length: ${this.maxHistoryLength} data points`);
    console.log(`📁 Data Directory: ${this.dataDirectory}`);
    console.log(`💾 Persistence: ${this.persistenceEnabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Process raw order book data and generate feature vector
   */
  processOrderBookUpdate(orderBookData) {
    const startTime = Date.now();
    
    try {
      const featureVector = this.calculateFeatureVector(orderBookData);
      const timestamp = featureVector.timestamp;
      
      // Store in memory cache
      this.features.set(timestamp, featureVector);
      
      // Maintain rolling window
      if (this.features.size > this.maxHistoryLength) {
        const oldestKey = this.features.keys().next().value;
        this.features.delete(oldestKey);
      }
      
      // Update statistics
      this.stats.featuresCalculated++;
      this.stats.lastFeatureTime = timestamp;
      this.stats.averageLatency = (this.stats.averageLatency * (this.stats.featuresCalculated - 1) + 
                                   (Date.now() - startTime)) / this.stats.featuresCalculated;
      
      // Emit feature vector for downstream processing
      this.emit('featureVector', featureVector);
      
      return featureVector;
      
    } catch (error) {
      console.error(`❌ Feature calculation error: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate comprehensive feature vector from order book data
   */
  calculateFeatureVector(orderBookData) {
    const {
      timestamp = Date.now(),
      bids,
      asks,
      currentPrice,
      symbol = this.symbol
    } = orderBookData;

    // Basic order book metrics
    const topBids = this.getTopLevels(bids, this.depthLevels, 'desc');
    const topAsks = this.getTopLevels(asks, this.depthLevels, 'asc');
    
    const totalBidVolume = topBids.reduce((sum, [, quantity]) => sum + quantity, 0);
    const totalAskVolume = topAsks.reduce((sum, [, quantity]) => sum + quantity, 0);
    
    // Core features
    const askToBidRatio = totalBidVolume > 0 ? totalAskVolume / totalBidVolume : 0;
    const spread = topAsks[0] ? topAsks[0][0] - topBids[0][0] : 0;
    const midPrice = topBids[0] && topAsks[0] ? (topBids[0][0] + topAsks[0][0]) / 2 : currentPrice;
    
    // Order Flow Imbalance (OFI) - the key feature for wavelet analysis
    const ofi = this.calculateOrderFlowImbalance(topBids, topAsks);
    
    // Momentum calculation
    const momentum = this.calculateMomentum(currentPrice || midPrice, timestamp);
    
    // Depth and liquidity metrics
    const depthMetrics = this.calculateDepthMetrics(topBids, topAsks);
    
    // Microstructure features
    const microstructure = this.calculateMicrostructureFeatures(topBids, topAsks, spread);
    
    const featureVector = {
      timestamp,
      symbol,
      
      // Core SentryCoin features
      askToBidRatio,
      totalBidVolume,
      totalAskVolume,
      currentPrice: currentPrice || midPrice,
      momentum,
      
      // Enhanced quantitative features
      ofi, // Order Flow Imbalance - critical for wavelet analysis
      spread,
      midPrice,
      relativeSpread: midPrice > 0 ? spread / midPrice : 0,
      
      // Depth metrics
      ...depthMetrics,
      
      // Microstructure features
      ...microstructure,
      
      // Metadata
      calculationLatency: Date.now() - timestamp,
      dataQuality: this.assessDataQuality(topBids, topAsks)
    };

    return featureVector;
  }

  /**
   * Calculate Order Flow Imbalance (OFI) - Key feature for predictive analysis
   */
  calculateOrderFlowImbalance(bids, asks) {
    if (!bids.length || !asks.length) return 0;
    
    const bestBid = bids[0];
    const bestAsk = asks[0];
    
    // Weighted OFI based on top 5 levels
    let bidPressure = 0;
    let askPressure = 0;
    
    for (let i = 0; i < Math.min(5, bids.length); i++) {
      const weight = 1 / (i + 1); // Decreasing weight for deeper levels
      bidPressure += bids[i][1] * weight;
    }
    
    for (let i = 0; i < Math.min(5, asks.length); i++) {
      const weight = 1 / (i + 1);
      askPressure += asks[i][1] * weight;
    }
    
    // OFI: positive = buying pressure, negative = selling pressure
    return (bidPressure - askPressure) / (bidPressure + askPressure);
  }

  /**
   * Calculate momentum over specified window
   */
  calculateMomentum(currentPrice, currentTimestamp) {
    if (this.features.size === 0) return 0;
    
    // Find price from momentum window ago
    const windowMs = this.momentumWindow * 1000;
    const targetTimestamp = currentTimestamp - windowMs;
    
    let closestFeature = null;
    let minTimeDiff = Infinity;
    
    for (const [timestamp, feature] of this.features) {
      const timeDiff = Math.abs(timestamp - targetTimestamp);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestFeature = feature;
      }
    }
    
    if (!closestFeature || minTimeDiff > windowMs / 2) return 0;
    
    const oldPrice = closestFeature.currentPrice;
    return oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;
  }

  /**
   * Calculate depth and liquidity metrics
   */
  calculateDepthMetrics(bids, asks) {
    const bidDepth = bids.slice(0, this.depthLevels).reduce((sum, [, qty]) => sum + qty, 0);
    const askDepth = asks.slice(0, this.depthLevels).reduce((sum, [, qty]) => sum + qty, 0);
    
    // Depth imbalance
    const depthImbalance = (bidDepth - askDepth) / (bidDepth + askDepth);
    
    // Weighted average prices
    const vwapBid = this.calculateVWAP(bids.slice(0, 5));
    const vwapAsk = this.calculateVWAP(asks.slice(0, 5));
    
    return {
      bidDepth,
      askDepth,
      depthImbalance,
      vwapBid,
      vwapAsk,
      liquidityRatio: bidDepth > 0 ? askDepth / bidDepth : 0
    };
  }

  /**
   * Calculate microstructure features
   */
  calculateMicrostructureFeatures(bids, asks, spread) {
    // Price level concentration
    const bidConcentration = this.calculateConcentration(bids);
    const askConcentration = this.calculateConcentration(asks);
    
    // Order size distribution
    const avgBidSize = bids.length > 0 ? bids.reduce((sum, [, qty]) => sum + qty, 0) / bids.length : 0;
    const avgAskSize = asks.length > 0 ? asks.reduce((sum, [, qty]) => sum + qty, 0) / asks.length : 0;
    
    return {
      bidConcentration,
      askConcentration,
      avgBidSize,
      avgAskSize,
      sizeImbalance: avgBidSize > 0 ? (avgAskSize - avgBidSize) / avgBidSize : 0
    };
  }

  /**
   * Calculate Volume Weighted Average Price
   */
  calculateVWAP(levels) {
    if (!levels.length) return 0;
    
    let totalValue = 0;
    let totalVolume = 0;
    
    for (const [price, volume] of levels) {
      totalValue += price * volume;
      totalVolume += volume;
    }
    
    return totalVolume > 0 ? totalValue / totalVolume : 0;
  }

  /**
   * Calculate concentration (Herfindahl index) of order book levels
   */
  calculateConcentration(levels) {
    if (!levels.length) return 0;
    
    const totalVolume = levels.reduce((sum, [, qty]) => sum + qty, 0);
    if (totalVolume === 0) return 0;
    
    let herfindahl = 0;
    for (const [, volume] of levels) {
      const share = volume / totalVolume;
      herfindahl += share * share;
    }
    
    return herfindahl;
  }

  /**
   * Get top N levels from order book side
   */
  getTopLevels(levels, count, sortOrder = 'asc') {
    if (!levels || !levels.size) return [];
    
    const sorted = Array.from(levels.entries()).sort((a, b) => {
      return sortOrder === 'asc' ? a[0] - b[0] : b[0] - a[0];
    });
    
    return sorted.slice(0, count);
  }

  /**
   * Assess data quality for feature vector
   */
  assessDataQuality(bids, asks) {
    let score = 1.0;
    
    if (bids.length < 5) score -= 0.2;
    if (asks.length < 5) score -= 0.2;
    if (bids.length === 0 || asks.length === 0) score -= 0.5;
    
    return Math.max(0, score);
  }

  /**
   * Get recent feature vectors for analysis
   */
  getRecentFeatures(count = 100) {
    const recent = Array.from(this.features.entries())
      .sort((a, b) => b[0] - a[0]) // Sort by timestamp descending
      .slice(0, count)
      .map(([timestamp, features]) => features);
    
    return recent;
  }

  /**
   * Get feature vector time series for specific feature
   */
  getFeatureTimeSeries(featureName, count = 300) {
    const timeSeries = Array.from(this.features.values())
      .slice(-count)
      .map(feature => ({
        timestamp: feature.timestamp,
        value: feature[featureName]
      }))
      .filter(point => point.value !== undefined);
    
    return timeSeries;
  }

  /**
   * Initialize data directory for persistence
   */
  async initializeDataDirectory() {
    if (!this.persistenceEnabled) return;
    
    try {
      await fs.mkdir(this.dataDirectory, { recursive: true });
      console.log(`📁 Data directory initialized: ${this.dataDirectory}`);
    } catch (error) {
      console.error(`❌ Failed to create data directory: ${error.message}`);
      this.persistenceEnabled = false;
    }
  }

  /**
   * Start periodic data persistence
   */
  startPeriodicPersistence() {
    if (!this.persistenceEnabled) return;
    
    setInterval(async () => {
      await this.persistFeatureData();
    }, this.persistenceInterval * 1000);
  }

  /**
   * Persist feature data to disk for offline analysis
   */
  async persistFeatureData() {
    if (!this.persistenceEnabled || this.features.size === 0) return;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.symbol}_features_${timestamp}.json`;
      const filepath = path.join(this.dataDirectory, filename);
      
      const data = {
        symbol: this.symbol,
        timestamp: new Date().toISOString(),
        featureCount: this.features.size,
        features: Array.from(this.features.values())
      };
      
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      this.stats.dataPointsStored += this.features.size;
      
      console.log(`💾 Feature data persisted: ${filename} (${this.features.size} points)`);
      
    } catch (error) {
      console.error(`❌ Failed to persist feature data: ${error.message}`);
    }
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentFeatureCount: this.features.size,
      memoryUsageMB: (this.features.size * 1000) / (1024 * 1024), // Rough estimate
      lastUpdate: new Date().toISOString()
    };
  }
}

export default FeaturePipeline;
