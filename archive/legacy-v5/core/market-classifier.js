/**
 * SentryCoin v4.1 - Market Regime Detection Engine
 *
 * Comprehensive market intelligence platform that identifies three distinct,
 * mutually exclusive market regimes based on forensic log analysis:
 *
 * 1. CASCADE_HUNTER: Distribution Phase (Active SHORT Trading)
 * 2. COIL_WATCHER: Accumulation/Manipulation Phase (Informational ALERT)
 * 3. SHAKEOUT_DETECTOR: Stop Hunt Phase (Potential LONG Setup ALERT)
 */

import { EventEmitter } from 'events';
import { getISTTime, parseFloatEnv, parseIntEnv, formatPrice, formatPriceWithSymbol } from '../utils/index.js';
import cloudStorage from '../services/cloud-storage.js';

class MarketClassifier extends EventEmitter {
  constructor(symbol, config = null) {
    super();

    this.symbol = symbol;
    this.config = config;

    // v4.1 Regime Detection Thresholds - calibrated from forensic log analysis
    // CASCADE_HUNTER thresholds (validated TRIFECTA conditions)
    this.cascadePressureThreshold = config?.signals?.cascadePressureThreshold || parseFloatEnv('CASCADE_PRESSURE_THRESHOLD', 3.0);
    this.cascadeLiquidityThreshold = config?.signals?.cascadeLiquidityThreshold || parseIntEnv('CASCADE_LIQUIDITY_THRESHOLD', 100000);
    this.cascadeMomentumThreshold = config?.signals?.cascadeMomentumThreshold || parseFloatEnv('CASCADE_MOMENTUM_THRESHOLD', -0.3);

    // COIL_WATCHER thresholds (accumulation/manipulation detection)
    this.coilPressureThreshold = config?.signals?.coilPressureThreshold || parseFloatEnv('COIL_PRESSURE_THRESHOLD', 2.0);
    this.coilLiquidityThreshold = config?.signals?.coilLiquidityThreshold || parseIntEnv('COIL_LIQUIDITY_THRESHOLD', 300000);
    this.coilMomentumMin = config?.signals?.coilMomentumMin || parseFloatEnv('COIL_MOMENTUM_MIN', -0.1);
    this.coilMomentumMax = config?.signals?.coilMomentumMax || parseFloatEnv('COIL_MOMENTUM_MAX', 0.1);

    // SHAKEOUT_DETECTOR thresholds (stop hunt detection)
    this.shakeoutPressureThreshold = config?.signals?.shakeoutPressureThreshold || parseFloatEnv('SHAKEOUT_PRESSURE_THRESHOLD', 1.5);
    this.shakeoutLiquidityThreshold = config?.signals?.shakeoutLiquidityThreshold || parseIntEnv('SHAKEOUT_LIQUIDITY_THRESHOLD', 250000);
    this.shakeoutMomentumThreshold = config?.signals?.shakeoutMomentumThreshold || parseFloatEnv('SHAKEOUT_MOMENTUM_THRESHOLD', -0.5);
    
    // v4.1 Regime Detection Statistics
    this.stats = {
      totalClassifications: 0,
      cascadeHunterSignals: 0,
      coilWatcherSignals: 0,
      shakeoutDetectorSignals: 0,
      noSignals: 0,
      startTime: Date.now()
    };
    
    console.log(`🧠 Market Regime Detector v4.1 initialized for ${symbol}`);
    console.log(`🎯 CASCADE_HUNTER: Pressure≥${this.cascadePressureThreshold}x, Liquidity≥${this.cascadeLiquidityThreshold}, Momentum≤${this.cascadeMomentumThreshold}%`);
    console.log(`⚠️ COIL_WATCHER: Pressure<${this.coilPressureThreshold}x, Liquidity≥${this.coilLiquidityThreshold}, Momentum ${this.coilMomentumMin}% to ${this.coilMomentumMax}%`);
    console.log(`💡 SHAKEOUT_DETECTOR: Pressure<${this.shakeoutPressureThreshold}x, Liquidity≥${this.shakeoutLiquidityThreshold}, Momentum≤${this.shakeoutMomentumThreshold}%`);
  }

  /**
   * Core regime detection logic - the heart of v4.1
   *
   * Implements three mutually exclusive market regime detection strategies
   * based on forensic log analysis of pump-and-dump lifecycle patterns.
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

    // 🔍 ENHANCED DIAGNOSTIC LOGGING - Show conditions for all three regimes
    const cascadeConditions = this.evaluateCascadeConditions(askToBidRatio, totalBidVolume, momentum);
    const coilConditions = this.evaluateCoilConditions(askToBidRatio, totalBidVolume, momentum);
    const shakeoutConditions = this.evaluateShakeoutConditions(askToBidRatio, totalBidVolume, momentum);

    const diagnosticLog = `[DIAGNOSTIC v4.1] Market Regime Analysis:\n` +
                         `   CASCADE:  Pressure ${cascadeConditions.pressureCheck} (${askToBidRatio.toFixed(2)}x vs ${this.cascadePressureThreshold}x), ` +
                         `Liquidity ${cascadeConditions.liquidityCheck} (${(totalBidVolume/1000).toFixed(1)}k ≥ ${(this.cascadeLiquidityThreshold/1000).toFixed(1)}k), ` +
                         `Momentum ${cascadeConditions.momentumCheck} (${momentum.toFixed(3)}% ≤ ${this.cascadeMomentumThreshold}%)\n` +
                         `   COIL:     Pressure ${coilConditions.pressureCheck} (${askToBidRatio.toFixed(2)}x < ${this.coilPressureThreshold}x), ` +
                         `Liquidity ${coilConditions.liquidityCheck} (${(totalBidVolume/1000).toFixed(1)}k ≥ ${(this.coilLiquidityThreshold/1000).toFixed(1)}k), ` +
                         `Momentum ${coilConditions.momentumCheck} (${this.coilMomentumMin}% < ${momentum.toFixed(3)}% < ${this.coilMomentumMax}%)\n` +
                         `   SHAKEOUT: Pressure ${shakeoutConditions.pressureCheck} (${askToBidRatio.toFixed(2)}x < ${this.shakeoutPressureThreshold}x), ` +
                         `Liquidity ${shakeoutConditions.liquidityCheck} (${(totalBidVolume/1000).toFixed(1)}k ≥ ${(this.shakeoutLiquidityThreshold/1000).toFixed(1)}k), ` +
                         `Momentum ${shakeoutConditions.momentumCheck} (${momentum.toFixed(3)}% ≤ ${this.shakeoutMomentumThreshold}%)`;

    // Log every 10th classification or when any conditions are close to triggering
    const shouldLog = this.stats.totalClassifications % 10 === 0 ||
                     askToBidRatio > (this.cascadePressureThreshold * 0.8) ||
                     totalBidVolume >= (this.cascadeLiquidityThreshold * 0.8) ||
                     totalBidVolume >= (this.coilLiquidityThreshold * 0.8) ||
                     totalBidVolume >= (this.shakeoutLiquidityThreshold * 0.8) ||
                     Math.abs(momentum) > 0.1;

    if (shouldLog) {
      console.log(diagnosticLog);
    }

    // Step 1: Evaluate regimes in priority order (mutually exclusive)
    const classification = this.classifyMarketRegime({
      askToBidRatio,
      totalBidVolume,
      totalAskVolume,
      currentPrice,
      momentum,
      timestamp,
      symbol: this.symbol
    });

    if (classification) {
      console.log(`🚨 REGIME DETECTED: ${classification.type} - ${classification.description}`);

      // Emit the appropriate event for the trading/alert modules
      this.emit(classification.type, classification);

      // Log the classification
      this.logClassification(classification);

      // Save to cloud storage for analysis
      this.saveClassification(classification);
    } else {
      this.stats.noSignals++;
      if (shouldLog) {
        console.log(`🔍 No regime detected: Market conditions do not match any defined patterns`);
      }
    }

    return classification;
  }

  /**
   * Helper method to evaluate CASCADE_HUNTER conditions
   */
  evaluateCascadeConditions(askToBidRatio, totalBidVolume, momentum) {
    return {
      pressure: askToBidRatio >= this.cascadePressureThreshold,
      liquidity: totalBidVolume >= this.cascadeLiquidityThreshold,
      momentum: momentum <= this.cascadeMomentumThreshold,
      pressureCheck: askToBidRatio >= this.cascadePressureThreshold ? '✅' : '❌',
      liquidityCheck: totalBidVolume >= this.cascadeLiquidityThreshold ? '✅' : '❌',
      momentumCheck: momentum <= this.cascadeMomentumThreshold ? '✅' : '❌'
    };
  }

  /**
   * Helper method to evaluate COIL_WATCHER conditions
   */
  evaluateCoilConditions(askToBidRatio, totalBidVolume, momentum) {
    return {
      pressure: askToBidRatio < this.coilPressureThreshold,
      liquidity: totalBidVolume >= this.coilLiquidityThreshold,
      momentum: momentum > this.coilMomentumMin && momentum < this.coilMomentumMax,
      pressureCheck: askToBidRatio < this.coilPressureThreshold ? '✅' : '❌',
      liquidityCheck: totalBidVolume >= this.coilLiquidityThreshold ? '✅' : '❌',
      momentumCheck: (momentum > this.coilMomentumMin && momentum < this.coilMomentumMax) ? '✅' : '❌'
    };
  }

  /**
   * Helper method to evaluate SHAKEOUT_DETECTOR conditions
   */
  evaluateShakeoutConditions(askToBidRatio, totalBidVolume, momentum) {
    return {
      pressure: askToBidRatio < this.shakeoutPressureThreshold,
      liquidity: totalBidVolume >= this.shakeoutLiquidityThreshold,
      momentum: momentum <= this.shakeoutMomentumThreshold,
      pressureCheck: askToBidRatio < this.shakeoutPressureThreshold ? '✅' : '❌',
      liquidityCheck: totalBidVolume >= this.shakeoutLiquidityThreshold ? '✅' : '❌',
      momentumCheck: momentum <= this.shakeoutMomentumThreshold ? '✅' : '❌'
    };
  }

  /**
   * v4.1 REGIME CLASSIFICATION: Three mutually exclusive market regimes
   * Evaluated in priority order to ensure no conflicts
   */
  classifyMarketRegime(marketData) {
    const { askToBidRatio, totalBidVolume, momentum } = marketData;

    // 🎯 STRATEGY 1: CASCADE_HUNTER (Active SHORT Trading)
    // Regime: Distribution Phase - Validated TRIFECTA conditions
    const cascadeConditions = this.evaluateCascadeConditions(askToBidRatio, totalBidVolume, momentum);
    const isCascadeSignal = cascadeConditions.pressure && cascadeConditions.liquidity && cascadeConditions.momentum;

    if (isCascadeSignal) {
      console.log(`✅ CASCADE_HUNTER CONDITIONS MET: Pressure=${askToBidRatio.toFixed(2)}x, Liquidity=${(totalBidVolume/1000).toFixed(1)}k, Momentum=${momentum.toFixed(3)}%`);
      this.stats.cascadeHunterSignals++;

      return {
        type: 'CASCADE_HUNTER_SIGNAL',
        strategy: 'SHORT',
        confidence: 'HIGH',
        regime: 'DISTRIBUTION_PHASE',
        phenomenon: 'LIQUIDITY_CASCADE',
        description: 'High liquidity being overwhelmed by massive sell pressure - Active dumping detected',
        symbol: marketData.symbol || this.symbol || 'UNKNOWN',
        exchange: 'BINANCE',
        currentPrice: marketData.currentPrice,
        askToBidRatio: marketData.askToBidRatio,
        totalBidVolume: marketData.totalBidVolume,
        totalAskVolume: marketData.totalAskVolume,
        timestamp: marketData.timestamp,
        momentum,
        classification: {
          pressure: cascadeConditions.pressure,
          liquidity: cascadeConditions.liquidity,
          momentum: 'STRONG_NEGATIVE',
          expectedOutcome: 'CONTINUED_DECLINE',
          tradingAction: 'LIVE_SHORT_ENABLED'
        }
      };
    }

    // ⚠️ STRATEGY 2: COIL_WATCHER (Informational ALERT - Neutral)
    // Regime: Accumulation/Manipulation Phase - High liquidity, low volatility
    const coilConditions = this.evaluateCoilConditions(askToBidRatio, totalBidVolume, momentum);
    const isCoilSignal = coilConditions.pressure && coilConditions.liquidity && coilConditions.momentum;

    if (isCoilSignal) {
      console.log(`⚠️ COIL_WATCHER CONDITIONS MET: Pressure=${askToBidRatio.toFixed(2)}x, Liquidity=${(totalBidVolume/1000).toFixed(1)}k, Momentum=${momentum.toFixed(3)}%`);
      this.stats.coilWatcherSignals++;

      return {
        type: 'COIL_WATCHER_SIGNAL',
        strategy: 'ALERT_ONLY',
        confidence: 'HIGH',
        regime: 'ACCUMULATION_PHASE',
        phenomenon: 'LIQUIDITY_COIL',
        description: 'High-liquidity, low-volatility state detected - Prepare for significant breakout',
        symbol: marketData.symbol || this.symbol || 'UNKNOWN',
        exchange: 'BINANCE',
        currentPrice: marketData.currentPrice,
        askToBidRatio: marketData.askToBidRatio,
        totalBidVolume: marketData.totalBidVolume,
        totalAskVolume: marketData.totalAskVolume,
        timestamp: marketData.timestamp,
        momentum,
        classification: {
          pressure: coilConditions.pressure,
          liquidity: coilConditions.liquidity,
          momentum: 'NEUTRAL',
          expectedOutcome: 'VOLATILITY_BREAKOUT_PENDING',
          tradingAction: 'ALERT_ONLY'
        }
      };
    }

    // 💡 STRATEGY 3: SHAKEOUT_DETECTOR (Informational ALERT - Potential LONG Setup)
    // Regime: Accumulation via Stop Hunt - Strong negative momentum without sell pressure
    const shakeoutConditions = this.evaluateShakeoutConditions(askToBidRatio, totalBidVolume, momentum);
    const isShakeoutSignal = shakeoutConditions.pressure && shakeoutConditions.liquidity && shakeoutConditions.momentum;

    if (isShakeoutSignal) {
      console.log(`💡 SHAKEOUT_DETECTOR CONDITIONS MET: Pressure=${askToBidRatio.toFixed(2)}x, Liquidity=${(totalBidVolume/1000).toFixed(1)}k, Momentum=${momentum.toFixed(3)}%`);
      this.stats.shakeoutDetectorSignals++;

      return {
        type: 'SHAKEOUT_DETECTOR_SIGNAL',
        strategy: 'ALERT_ONLY',
        confidence: 'MEDIUM',
        regime: 'STOP_HUNT_PHASE',
        phenomenon: 'ARTIFICIAL_SUPPRESSION',
        description: 'Strong negative momentum with no corresponding sell pressure - Possible stop hunt detected',
        symbol: marketData.symbol || this.symbol || 'UNKNOWN',
        exchange: 'BINANCE',
        currentPrice: marketData.currentPrice,
        askToBidRatio: marketData.askToBidRatio,
        totalBidVolume: marketData.totalBidVolume,
        totalAskVolume: marketData.totalAskVolume,
        timestamp: marketData.timestamp,
        momentum,
        classification: {
          pressure: shakeoutConditions.pressure,
          liquidity: shakeoutConditions.liquidity,
          momentum: 'STRONG_NEGATIVE',
          expectedOutcome: 'POTENTIAL_REVERSAL_LONG',
          tradingAction: 'ALERT_ONLY'
        }
      };
    }

    // 🚫 NO REGIME DETECTED - Conditions not met for any of the three strategies
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
    const totalSignals = this.stats.cascadeHunterSignals + this.stats.coilWatcherSignals + this.stats.shakeoutDetectorSignals;

    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      classificationsPerHour: classificationsPerHour.toFixed(2),
      cascadeRate: ((this.stats.cascadeHunterSignals / this.stats.totalClassifications) * 100).toFixed(2),
      coilRate: ((this.stats.coilWatcherSignals / this.stats.totalClassifications) * 100).toFixed(2),
      shakeoutRate: ((this.stats.shakeoutDetectorSignals / this.stats.totalClassifications) * 100).toFixed(2),
      totalSignalRate: ((totalSignals / this.stats.totalClassifications) * 100).toFixed(2)
    };
  }

  /**
   * Reset v4.1 regime detection statistics
   */
  resetStats() {
    this.stats = {
      totalClassifications: 0,
      cascadeHunterSignals: 0,
      coilWatcherSignals: 0,
      shakeoutDetectorSignals: 0,
      noSignals: 0,
      startTime: Date.now()
    };
    console.log(`📊 v4.1 Regime detection statistics reset for ${this.symbol}`);
  }

  /**
   * Update v4.1 regime detection thresholds dynamically
   */
  updateThresholds(newThresholds) {
    // CASCADE_HUNTER thresholds
    if (newThresholds.cascadePressureThreshold) this.cascadePressureThreshold = newThresholds.cascadePressureThreshold;
    if (newThresholds.cascadeLiquidityThreshold) this.cascadeLiquidityThreshold = newThresholds.cascadeLiquidityThreshold;
    if (newThresholds.cascadeMomentumThreshold) this.cascadeMomentumThreshold = newThresholds.cascadeMomentumThreshold;

    // COIL_WATCHER thresholds
    if (newThresholds.coilPressureThreshold) this.coilPressureThreshold = newThresholds.coilPressureThreshold;
    if (newThresholds.coilLiquidityThreshold) this.coilLiquidityThreshold = newThresholds.coilLiquidityThreshold;
    if (newThresholds.coilMomentumMin) this.coilMomentumMin = newThresholds.coilMomentumMin;
    if (newThresholds.coilMomentumMax) this.coilMomentumMax = newThresholds.coilMomentumMax;

    // SHAKEOUT_DETECTOR thresholds
    if (newThresholds.shakeoutPressureThreshold) this.shakeoutPressureThreshold = newThresholds.shakeoutPressureThreshold;
    if (newThresholds.shakeoutLiquidityThreshold) this.shakeoutLiquidityThreshold = newThresholds.shakeoutLiquidityThreshold;
    if (newThresholds.shakeoutMomentumThreshold) this.shakeoutMomentumThreshold = newThresholds.shakeoutMomentumThreshold;

    console.log(`⚙️ v4.1 Regime thresholds updated for ${this.symbol}:`, newThresholds);
  }
}

export default MarketClassifier;
