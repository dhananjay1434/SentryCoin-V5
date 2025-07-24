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
import { getISTTime, parseFloatEnv, parseIntEnv, formatPrice, formatPriceWithSymbol } from '../utils/index.js';
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

    // Step 1: Check if basic pressure condition is met (required for both signals)
    const pressureCondition = askToBidRatio > this.pressureThreshold;

    // 🔍 ENHANCED DIAGNOSTIC LOGGING - Show conditions for both signal types
    const pressureCheck = pressureCondition ? '✅' : '❌';

    // Trifecta conditions (HIGH liquidity + STRONG momentum)
    const trifectaLiquidityCheck = totalBidVolume >= this.liquidityThreshold ? '✅' : '❌';
    const trifectaMomentumCheck = momentum <= this.strongMomentumThreshold ? '✅' : '❌';

    // Squeeze conditions (LOW liquidity + WEAK momentum)
    const squeezeLiquidityCheck = totalBidVolume < (this.liquidityThreshold * 0.5) ? '✅' : '❌';
    const squeezeMomentumCheck = (momentum > -0.2 && momentum < 0.2) ? '✅' : '❌';

    const diagnosticLog = `[DIAGNOSTIC] Pressure ${pressureCheck} (${askToBidRatio.toFixed(2)}x vs ${this.pressureThreshold}x)\n` +
                         `   TRIFECTA:  Liquidity ${trifectaLiquidityCheck} (${(totalBidVolume/1000).toFixed(1)}k ≥ ${(this.liquidityThreshold/1000).toFixed(1)}k), ` +
                         `Momentum ${trifectaMomentumCheck} (${momentum.toFixed(3)}% ≤ ${this.strongMomentumThreshold}%)\n` +
                         `   SQUEEZE:   Liquidity ${squeezeLiquidityCheck} (${(totalBidVolume/1000).toFixed(1)}k < ${(this.liquidityThreshold * 0.5/1000).toFixed(1)}k), ` +
                         `Momentum ${squeezeMomentumCheck} (-0.2% < ${momentum.toFixed(3)}% < 0.2%)`;

    // Log every 10th classification or when conditions are close to triggering
    const shouldLog = this.stats.totalClassifications % 10 === 0 ||
                     askToBidRatio > (this.pressureThreshold * 0.8) ||
                     totalBidVolume >= (this.liquidityThreshold * 0.8) ||
                     totalBidVolume < (this.liquidityThreshold * 0.6) ||
                     Math.abs(momentum) > 0.1;

    if (shouldLog) {
      console.log(diagnosticLog);
    }

    if (!pressureCondition) {
      // No signal - pressure condition not met (required for both signals)
      this.stats.noSignals++;

      if (shouldLog) {
        console.log(`🔍 Signal blocked: PRESSURE_TOO_LOW (${askToBidRatio.toFixed(2)}x < ${this.pressureThreshold}x)`);
      }

      return null;
    }

    // Step 2: Classify based on momentum (the critical differentiator)
    console.log(`🎯 PASSED basic conditions! Checking momentum: ${momentum.toFixed(3)}% (need ≤${this.strongMomentumThreshold}%)`);

    const classification = this.classifyByMomentum(momentum, {
      askToBidRatio,
      totalBidVolume,
      totalAskVolume,
      currentPrice,
      timestamp,
      pressureCondition,
      symbol: this.symbol
    });

    if (classification) {
      console.log(`🚨 SIGNAL GENERATED: ${classification.type} - ${classification.phenomenon}`);

      // Emit the appropriate event for the trading modules
      this.emit(classification.type, classification);

      // Log the classification
      this.logClassification(classification);

      // Save to cloud storage for analysis
      this.saveClassification(classification);
    } else {
      console.log(`🔍 No signal: Momentum insufficient (${momentum.toFixed(3)}% > ${this.strongMomentumThreshold}%)`);
    }

    return classification;
  }

  /**
   * COMPLETELY REWRITTEN: Mutually exclusive signal classification
   * Each signal type has distinct, non-overlapping conditions based on liquidity AND momentum
   */
  classifyByMomentum(momentum, marketData) {
    const { askToBidRatio, totalBidVolume, totalAskVolume } = marketData;

    // 🎯 TRIFECTA CONVICTION SIGNAL (SHORT Strategy)
    // Requires: HIGH pressure + HIGH liquidity + STRONG negative momentum
    const trifectaConditions = {
      pressure: askToBidRatio >= this.pressureThreshold,           // > 3.0x
      liquidity: totalBidVolume >= this.liquidityThreshold,       // >= 100k (HIGH liquidity)
      momentum: momentum <= this.strongMomentumThreshold          // <= -0.3% (STRONG negative)
    };

    const isTrifectaSignal = trifectaConditions.pressure && trifectaConditions.liquidity && trifectaConditions.momentum;

    if (isTrifectaSignal) {
      console.log(`✅ TRIFECTA CONDITIONS MET: Pressure=${askToBidRatio.toFixed(2)}x, Liquidity=${(totalBidVolume/1000).toFixed(1)}k, Momentum=${momentum.toFixed(3)}%`);
      this.stats.trifectaConvictions++;

      return {
        type: 'TRIFECTA_CONVICTION_SIGNAL',
        strategy: 'SHORT',
        confidence: 'HIGH',
        phenomenon: 'LIQUIDITY_CASCADE',
        description: 'High liquidity being overwhelmed by massive sell pressure',
        symbol: marketData.symbol || this.symbol || 'UNKNOWN',
        exchange: 'BINANCE',
        currentPrice: marketData.currentPrice,
        askToBidRatio: marketData.askToBidRatio,
        totalBidVolume: marketData.totalBidVolume,
        totalAskVolume: marketData.totalAskVolume,
        timestamp: marketData.timestamp,
        momentum,
        classification: {
          pressure: trifectaConditions.pressure,
          liquidity: trifectaConditions.liquidity,
          momentum: 'STRONG_NEGATIVE',
          expectedOutcome: 'CONTINUED_DECLINE'
        }
      };
    }

    // 🔄 ABSORPTION SQUEEZE SIGNAL (LONG Strategy)
    // Requires: HIGH pressure + LOW liquidity + WEAK/NEUTRAL momentum
    const lowLiquidityThreshold = this.liquidityThreshold * 0.5; // 50k for LOW liquidity
    const squeezeConditions = {
      pressure: askToBidRatio >= this.pressureThreshold,           // > 3.0x
      liquidity: totalBidVolume < lowLiquidityThreshold,          // < 50k (LOW liquidity)
      momentum: momentum > -0.2 && momentum < 0.2                 // Weak/neutral momentum range
    };

    const isSqueezeSignal = squeezeConditions.pressure && squeezeConditions.liquidity && squeezeConditions.momentum;

    if (isSqueezeSignal) {
      console.log(`✅ ABSORPTION SQUEEZE CONDITIONS MET: Pressure=${askToBidRatio.toFixed(2)}x, Liquidity=${(totalBidVolume/1000).toFixed(1)}k, Momentum=${momentum.toFixed(3)}%`);
      this.stats.absorptionSqueezes++;

      return {
        type: 'ABSORPTION_SQUEEZE_SIGNAL',
        strategy: 'LONG',
        confidence: 'MEDIUM',
        phenomenon: 'FORCED_ABSORPTION',
        description: 'Thin liquidity absorbing sell pressure with weak momentum',
        symbol: marketData.symbol || this.symbol || 'UNKNOWN',
        exchange: 'BINANCE',
        currentPrice: marketData.currentPrice,
        askToBidRatio: marketData.askToBidRatio,
        totalBidVolume: marketData.totalBidVolume,
        totalAskVolume: marketData.totalAskVolume,
        timestamp: marketData.timestamp,
        momentum,
        classification: {
          pressure: squeezeConditions.pressure,
          liquidity: squeezeConditions.liquidity,
          momentum: momentum > 0 ? 'WEAK_POSITIVE' : 'WEAK_NEGATIVE',
          expectedOutcome: 'MEAN_REVERSION_UP'
        }
      };
    }

    // 🚫 NO SIGNAL - Conditions not met for either strategy
    console.log(`❌ NO SIGNAL: Neither Trifecta nor Absorption conditions met`);
    console.log(`   Trifecta: P=${trifectaConditions.pressure ? '✅' : '❌'} L=${trifectaConditions.liquidity ? '✅' : '❌'} M=${trifectaConditions.momentum ? '✅' : '❌'} (need P>3x, L≥100k, M≤-0.3%)`);
    console.log(`   Squeeze:  P=${squeezeConditions.pressure ? '✅' : '❌'} L=${squeezeConditions.liquidity ? '✅' : '❌'} M=${squeezeConditions.momentum ? '✅' : '❌'} (need P>3x, L<50k, -0.2%<M<0.2%)`);
    return null;
  }

  /**
   * Log classification for monitoring
   */
  logClassification(classification) {
    const istTime = getISTTime();
    const { type, strategy, confidence, momentum, askToBidRatio, totalBidVolume, currentPrice, symbol } = classification;

    console.log(`🧠 MARKET CLASSIFICATION [${istTime}]`);
    console.log(`   🎯 Signal: ${type}`);
    console.log(`   📈 Strategy: ${strategy} (${confidence} confidence)`);
    console.log(`   💰 Price: ${formatPriceWithSymbol(currentPrice)} (${symbol || 'UNKNOWN'})`);
    console.log(`   📊 Ratio: ${askToBidRatio.toFixed(2)}x | Volume: ${totalBidVolume.toFixed(0)} | Momentum: ${momentum.toFixed(3)}%`);
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
