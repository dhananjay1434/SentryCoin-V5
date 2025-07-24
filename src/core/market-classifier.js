/**
 * SentryCoin v4.0 - Market Microstructure Classification Engine
 * 
 * Transforms the failed "crash predictor" into a sophisticated dual-strategy
 * market classification system that identifies two distinct tradable phenomena:
 * 
 * 1. TRIFECTA_CONVICTION: Liquidity Cascade (Short Strategy)
 * 2. ABSORPTION_SQUEEZE: Forced Absorption (Long Strategy)
 */

import { EventEmitter } from 'events';
import { getISTTime, parseFloatEnv, parseIntEnv } from '../utils/index.js';
import cloudStorage from '../services/cloud-storage.js';

class MarketClassifier extends EventEmitter {
  constructor(symbol) {
    super();
    
    this.symbol = symbol;
    
    // Configurable thresholds for independent tuning
    this.pressureThreshold = parseFloatEnv('PRESSURE_THRESHOLD', 3.0);
    this.liquidityThreshold = parseIntEnv('LIQUIDITY_THRESHOLD', 100000);
    this.strongMomentumThreshold = parseFloatEnv('STRONG_MOMENTUM_THRESHOLD', -0.3);
    this.weakMomentumThreshold = parseFloatEnv('WEAK_MOMENTUM_THRESHOLD', -0.1);
    
    // Classification statistics
    this.stats = {
      totalClassifications: 0,
      trifectaConvictions: 0,
      absorptionSqueezes: 0,
      noSignals: 0,
      startTime: Date.now()
    };
    
    console.log(`🧠 Market Classifier v4.0 initialized for ${symbol}`);
    console.log(`⚙️ Pressure Threshold: ${this.pressureThreshold}x`);
    console.log(`⚙️ Liquidity Threshold: ${this.liquidityThreshold}`);
    console.log(`⚙️ Strong Momentum: ≤${this.strongMomentumThreshold}%`);
    console.log(`⚙️ Weak Momentum: ≤${this.weakMomentumThreshold}%`);
  }

  /**
   * Core classification logic - the heart of v4.0
   * 
   * @param {Object} marketData - Current market microstructure data
   * @returns {Object|null} Classification result or null if no signal
   */
  classifyMarketCondition(marketData) {
    const {
      askToBidRatio,
      totalBidVolume,
      totalAskVolume,
      currentPrice,
      momentum,
      timestamp = new Date().toISOString()
    } = marketData;

    this.stats.totalClassifications++;

    // Step 1: Check if basic Trifecta conditions are met
    const pressureCondition = askToBidRatio > this.pressureThreshold;
    const liquidityCondition = totalBidVolume < this.liquidityThreshold;

    if (!pressureCondition || !liquidityCondition) {
      // No signal - market conditions are normal
      this.stats.noSignals++;
      return null;
    }

    // Step 2: Classify based on momentum (the critical differentiator)
    const classification = this.classifyByMomentum(momentum, {
      askToBidRatio,
      totalBidVolume,
      totalAskVolume,
      currentPrice,
      timestamp,
      pressureCondition,
      liquidityCondition
    });

    if (classification) {
      // Emit the appropriate event for the trading modules
      this.emit(classification.type, classification);
      
      // Log the classification
      this.logClassification(classification);
      
      // Save to cloud storage for analysis
      this.saveClassification(classification);
    }

    return classification;
  }

  /**
   * The momentum-based classification logic
   * This is where the magic happens - the key insight from the data analysis
   */
  classifyByMomentum(momentum, marketData) {
    if (momentum <= this.strongMomentumThreshold) {
      // PHENOMENON A: Liquidity Cascade
      // Strong negative momentum + pressure + thin liquidity = True flash crash
      this.stats.trifectaConvictions++;
      
      return {
        type: 'TRIFECTA_CONVICTION_SIGNAL',
        strategy: 'SHORT',
        confidence: 'HIGH',
        phenomenon: 'LIQUIDITY_CASCADE',
        description: 'Active panic selling with strong downward momentum',
        ...marketData,
        momentum,
        classification: {
          pressure: marketData.pressureCondition,
          liquidity: marketData.liquidityCondition,
          momentum: 'STRONG_NEGATIVE',
          expectedOutcome: 'CONTINUED_DECLINE'
        }
      };
      
    } else if (momentum <= this.weakMomentumThreshold) {
      // PHENOMENON B: Forced Absorption (Weak Negative Momentum)
      // Weak negative momentum + pressure + thin liquidity = Absorption squeeze
      this.stats.absorptionSqueezes++;
      
      return {
        type: 'ABSORPTION_SQUEEZE_SIGNAL',
        strategy: 'LONG',
        confidence: 'MEDIUM',
        phenomenon: 'FORCED_ABSORPTION',
        description: 'Large sellers being absorbed by resilient buyers',
        ...marketData,
        momentum,
        classification: {
          pressure: marketData.pressureCondition,
          liquidity: marketData.liquidityCondition,
          momentum: 'WEAK_NEGATIVE',
          expectedOutcome: 'MEAN_REVERSION_UP'
        }
      };
      
    } else {
      // PHENOMENON B: Forced Absorption (Positive/Neutral Momentum)
      // Positive momentum + pressure + thin liquidity = Strong absorption squeeze
      this.stats.absorptionSqueezes++;
      
      return {
        type: 'ABSORPTION_SQUEEZE_SIGNAL',
        strategy: 'LONG',
        confidence: 'HIGH',
        phenomenon: 'FORCED_ABSORPTION',
        description: 'Strong buying pressure overwhelming sell walls',
        ...marketData,
        momentum,
        classification: {
          pressure: marketData.pressureCondition,
          liquidity: marketData.liquidityCondition,
          momentum: momentum > 0 ? 'POSITIVE' : 'NEUTRAL',
          expectedOutcome: 'STRONG_SQUEEZE_UP'
        }
      };
    }
  }

  /**
   * Log classification for monitoring
   */
  logClassification(classification) {
    const istTime = getISTTime();
    const { type, strategy, confidence, momentum, askToBidRatio, totalBidVolume } = classification;
    
    console.log(`🧠 MARKET CLASSIFICATION [${istTime}]`);
    console.log(`   🎯 Signal: ${type}`);
    console.log(`   📈 Strategy: ${strategy} (${confidence} confidence)`);
    console.log(`   📊 Ratio: ${askToBidRatio.toFixed(2)}x | Volume: ${totalBidVolume.toFixed(0)} | Momentum: ${momentum.toFixed(2)}%`);
    console.log(`   🔬 Phenomenon: ${classification.phenomenon}`);
    console.log(`   💡 Expected: ${classification.classification.expectedOutcome}`);
  }

  /**
   * Save classification to cloud storage for analysis
   */
  async saveClassification(classification) {
    try {
      const key = `classification_${this.symbol}_${Date.now()}`;
      await cloudStorage.save(key, classification);
    } catch (error) {
      console.warn(`⚠️ Failed to save classification: ${error.message}`);
    }
  }

  /**
   * Get classification statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const classificationsPerHour = (this.stats.totalClassifications / uptime) * 3600000;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      classificationsPerHour: classificationsPerHour.toFixed(2),
      trifectaRate: ((this.stats.trifectaConvictions / this.stats.totalClassifications) * 100).toFixed(2),
      absorptionRate: ((this.stats.absorptionSqueezes / this.stats.totalClassifications) * 100).toFixed(2),
      signalRate: (((this.stats.trifectaConvictions + this.stats.absorptionSqueezes) / this.stats.totalClassifications) * 100).toFixed(2)
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalClassifications: 0,
      trifectaConvictions: 0,
      absorptionSqueezes: 0,
      noSignals: 0,
      startTime: Date.now()
    };
    console.log(`📊 Classification statistics reset for ${this.symbol}`);
  }

  /**
   * Update thresholds dynamically
   */
  updateThresholds(newThresholds) {
    if (newThresholds.pressureThreshold) this.pressureThreshold = newThresholds.pressureThreshold;
    if (newThresholds.liquidityThreshold) this.liquidityThreshold = newThresholds.liquidityThreshold;
    if (newThresholds.strongMomentumThreshold) this.strongMomentumThreshold = newThresholds.strongMomentumThreshold;
    if (newThresholds.weakMomentumThreshold) this.weakMomentumThreshold = newThresholds.weakMomentumThreshold;
    
    console.log(`⚙️ Thresholds updated for ${this.symbol}:`, newThresholds);
  }
}

export default MarketClassifier;
