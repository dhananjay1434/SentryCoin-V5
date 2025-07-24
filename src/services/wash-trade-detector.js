/**
 * SentryCoin v4.6 - Wash Trading Detection Module
 * 
 * Detects artificial volume manipulation based on forensic analysis:
 * - 13.79x turnover ratio (Bitcoin: 0.1-0.5x) indicates massive wash trading
 * - Round number trades and millisecond timing patterns
 * - Provides wash trading score to filter unreliable volume data
 */

import { EventEmitter } from 'events';
import { getISTTime, parseFloatEnv, parseIntEnv } from '../utils/index.js';

export default class WashTradeDetector extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.symbol = config.symbol || 'SPKUSDT';
    this.enabled = parseIntEnv('ENABLE_WASH_TRADE_DETECTION', 1) === 1;
    
    // Detection thresholds
    this.roundNumberThreshold = parseFloatEnv('ROUND_NUMBER_THRESHOLD', 75); // 75% round numbers = suspicious
    this.rapidTradeThreshold = parseIntEnv('RAPID_TRADE_THRESHOLD', 100);    // <100ms between trades = suspicious
    this.washScoreThreshold = parseFloatEnv('WASH_SCORE_THRESHOLD', 75);     // 75% wash score = disable trading
    this.detectionWindowMs = parseIntEnv('WASH_DETECTION_WINDOW', 300000);   // 5 minute analysis window
    
    // Trade analysis data
    this.recentTrades = [];
    this.washScore = 0;
    this.lastWashScoreUpdate = 0;
    this.suspiciousPatterns = [];
    
    // Statistics
    this.stats = {
      totalTradesAnalyzed: 0,
      roundNumberTrades: 0,
      rapidTrades: 0,
      suspiciousSequences: 0,
      washScoreHistory: [],
      tradingDisabledCount: 0
    };
    
    console.log(`🔍 Wash Trade Detector v4.6 initialized for ${this.symbol}`);
    console.log(`   📊 Round number threshold: ${this.roundNumberThreshold}%`);
    console.log(`   ⚡ Rapid trade threshold: ${this.rapidTradeThreshold}ms`);
    console.log(`   🚫 Wash score threshold: ${this.washScoreThreshold}%`);
    console.log(`   ⏰ Detection window: ${this.detectionWindowMs/1000}s`);
  }

  /**
   * Analyze incoming trade data for wash trading patterns
   */
  analyzeTrade(trade) {
    if (!this.enabled) return;

    const now = Date.now();
    
    // Add trade to analysis window
    this.recentTrades.push({
      timestamp: now,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.quantity),
      value: parseFloat(trade.price) * parseFloat(trade.quantity),
      tradeId: trade.id || `${now}_${Math.random()}`,
      isBuy: trade.isBuy || trade.side === 'buy'
    });

    this.stats.totalTradesAnalyzed++;

    // Clean old trades outside detection window
    this.cleanOldTrades();

    // Update wash score every 30 seconds
    if (now - this.lastWashScoreUpdate > 30000) {
      this.updateWashScore();
      this.lastWashScoreUpdate = now;
    }
  }

  /**
   * Calculate wash trading score based on suspicious patterns
   */
  updateWashScore() {
    if (this.recentTrades.length < 10) {
      this.washScore = 0;
      return;
    }

    let suspiciousScore = 0;
    const totalTrades = this.recentTrades.length;

    // Pattern 1: Round number analysis
    const roundNumberScore = this.analyzeRoundNumbers();
    suspiciousScore += roundNumberScore * 0.4; // 40% weight

    // Pattern 2: Rapid trade timing
    const rapidTradeScore = this.analyzeRapidTrades();
    suspiciousScore += rapidTradeScore * 0.3; // 30% weight

    // Pattern 3: Volume concentration
    const volumeConcentrationScore = this.analyzeVolumeConcentration();
    suspiciousScore += volumeConcentrationScore * 0.2; // 20% weight

    // Pattern 4: Price manipulation patterns
    const priceManipulationScore = this.analyzePriceManipulation();
    suspiciousScore += priceManipulationScore * 0.1; // 10% weight

    this.washScore = Math.min(100, Math.max(0, suspiciousScore));

    // Log significant changes
    if (Math.abs(this.washScore - (this.stats.washScoreHistory[this.stats.washScoreHistory.length - 1] || 0)) > 10) {
      console.log(`🔍 Wash Score Updated: ${this.washScore.toFixed(1)}% (${totalTrades} trades analyzed)`);
      
      if (this.washScore > this.washScoreThreshold) {
        console.log(`🚫 HIGH WASH TRADING DETECTED - Trading temporarily disabled`);
        this.stats.tradingDisabledCount++;
        this.emit('WASH_TRADING_DETECTED', {
          score: this.washScore,
          threshold: this.washScoreThreshold,
          patterns: this.suspiciousPatterns.slice(-5)
        });
      }
    }

    // Store score history
    this.stats.washScoreHistory.push({
      timestamp: Date.now(),
      score: this.washScore,
      tradeCount: totalTrades
    });

    // Keep only last 100 scores
    if (this.stats.washScoreHistory.length > 100) {
      this.stats.washScoreHistory = this.stats.washScoreHistory.slice(-100);
    }
  }

  /**
   * Analyze round number patterns (e.g., exactly 10,000.00 SPK)
   */
  analyzeRoundNumbers() {
    const roundNumbers = this.recentTrades.filter(trade => {
      const quantity = trade.quantity;
      const value = trade.value;
      
      // Check if quantity or value is suspiciously round
      return (
        quantity % 1000 === 0 ||  // Round thousands
        quantity % 10000 === 0 || // Round ten-thousands
        value % 100 === 0 ||      // Round hundred dollar values
        value % 1000 === 0        // Round thousand dollar values
      );
    });

    this.stats.roundNumberTrades += roundNumbers.length;
    const roundNumberPercentage = (roundNumbers.length / this.recentTrades.length) * 100;

    if (roundNumberPercentage > 50) {
      this.suspiciousPatterns.push({
        type: 'ROUND_NUMBERS',
        severity: roundNumberPercentage > 75 ? 'HIGH' : 'MEDIUM',
        percentage: roundNumberPercentage,
        timestamp: Date.now()
      });
    }

    return Math.min(100, roundNumberPercentage);
  }

  /**
   * Analyze rapid trade timing patterns
   */
  analyzeRapidTrades() {
    let rapidTradeCount = 0;
    
    for (let i = 1; i < this.recentTrades.length; i++) {
      const timeDiff = this.recentTrades[i].timestamp - this.recentTrades[i-1].timestamp;
      if (timeDiff < this.rapidTradeThreshold) {
        rapidTradeCount++;
      }
    }

    this.stats.rapidTrades += rapidTradeCount;
    const rapidTradePercentage = (rapidTradeCount / (this.recentTrades.length - 1)) * 100;

    if (rapidTradePercentage > 30) {
      this.suspiciousPatterns.push({
        type: 'RAPID_TRADES',
        severity: rapidTradePercentage > 50 ? 'HIGH' : 'MEDIUM',
        percentage: rapidTradePercentage,
        timestamp: Date.now()
      });
    }

    return Math.min(100, rapidTradePercentage);
  }

  /**
   * Analyze volume concentration patterns
   */
  analyzeVolumeConcentration() {
    if (this.recentTrades.length < 5) return 0;

    const totalVolume = this.recentTrades.reduce((sum, trade) => sum + trade.value, 0);
    const sortedTrades = this.recentTrades.sort((a, b) => b.value - a.value);
    
    // Check if top 20% of trades account for >80% of volume
    const top20PercentCount = Math.ceil(this.recentTrades.length * 0.2);
    const top20PercentVolume = sortedTrades.slice(0, top20PercentCount)
      .reduce((sum, trade) => sum + trade.value, 0);
    
    const concentrationPercentage = (top20PercentVolume / totalVolume) * 100;

    if (concentrationPercentage > 80) {
      this.suspiciousPatterns.push({
        type: 'VOLUME_CONCENTRATION',
        severity: concentrationPercentage > 90 ? 'HIGH' : 'MEDIUM',
        percentage: concentrationPercentage,
        timestamp: Date.now()
      });
    }

    return Math.max(0, concentrationPercentage - 60); // Normal concentration ~60%
  }

  /**
   * Analyze price manipulation patterns
   */
  analyzePriceManipulation() {
    if (this.recentTrades.length < 10) return 0;

    const prices = this.recentTrades.map(trade => trade.price);
    const priceChanges = [];
    
    for (let i = 1; i < prices.length; i++) {
      priceChanges.push(Math.abs(prices[i] - prices[i-1]) / prices[i-1]);
    }

    // Check for artificial price stability (too many tiny changes)
    const tinyChanges = priceChanges.filter(change => change < 0.0001).length;
    const tinyChangePercentage = (tinyChanges / priceChanges.length) * 100;

    return Math.min(100, tinyChangePercentage);
  }

  /**
   * Check if trading should be disabled due to wash trading
   */
  shouldDisableTrading() {
    return this.enabled && this.washScore > this.washScoreThreshold;
  }

  /**
   * Get current wash trading assessment
   */
  getWashAssessment() {
    return {
      enabled: this.enabled,
      washScore: this.washScore,
      threshold: this.washScoreThreshold,
      shouldDisableTrading: this.shouldDisableTrading(),
      recentTradeCount: this.recentTrades.length,
      suspiciousPatterns: this.suspiciousPatterns.slice(-3),
      lastUpdate: this.lastWashScoreUpdate
    };
  }

  /**
   * Clean trades outside detection window
   */
  cleanOldTrades() {
    const cutoff = Date.now() - this.detectionWindowMs;
    this.recentTrades = this.recentTrades.filter(trade => trade.timestamp > cutoff);
    this.suspiciousPatterns = this.suspiciousPatterns.filter(pattern => pattern.timestamp > cutoff);
  }

  /**
   * Get detection statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentWashScore: this.washScore,
      tradingDisabled: this.shouldDisableTrading(),
      recentTradeCount: this.recentTrades.length,
      detectionWindow: this.detectionWindowMs / 1000
    };
  }
}
