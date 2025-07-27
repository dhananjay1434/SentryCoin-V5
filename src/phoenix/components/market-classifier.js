/**
 * Phoenix v6.1 - Market Classifier - PROJECT FORTRESS HARDENING
 * 
 * MANDATE 2: RESTORE & ENHANCE CORE LOGIC OBSERVABILITY
 * 
 * Implements high-fidelity diagnostic logging for the entire decision-making
 * pipeline with structured JSON output and stateful logging integration.
 */

import { EventEmitter } from 'events';

export default class MarketClassifier extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.symbol = config.symbol || 'ETHUSDT';
    this.logger = config.logger;
    
    // Classification thresholds
    this.thresholds = {
      cascade: {
        pressure: 3.0,
        liquidity: 100000,
        momentum: -0.3
      },
      coil: {
        pressure: 2.0,
        liquidity: 300000,
        momentumMin: -0.1,
        momentumMax: 0.1
      },
      shakeout: {
        pressure: 1.5,
        liquidity: 250000,
        momentum: -0.5
      }
    };
    
    // Performance metrics
    this.stats = {
      totalClassifications: 0,
      regimeDetections: 0,
      noRegimeCount: 0,
      lastClassification: null
    };
    
    this.logger?.info('market_classifier_initialized', {
      symbol: this.symbol,
      thresholds: this.thresholds
    });
  }

  /**
   * FORTRESS v6.1: Main classification method with comprehensive diagnostic logging
   */
  classifyMarketCondition(marketData) {
    const {
      price,
      dlsScore,
      pressure,
      momentum,
      timestamp = Date.now()
    } = marketData;

    this.stats.totalClassifications++;

    // Evaluate all regime conditions
    const cascadeCheck = this.evaluateCascadeConditions(pressure, dlsScore, momentum);
    const coilCheck = this.evaluateCoilConditions(pressure, dlsScore, momentum);
    const shakeoutCheck = this.evaluateShakeoutConditions(pressure, dlsScore, momentum);

    // Determine regime (mutually exclusive, priority order)
    let regime = 'NO_REGIME';
    let reason = 'No conditions met';

    if (cascadeCheck.isValid) {
      regime = 'CASCADE_HUNTER';
      reason = 'All CASCADE conditions satisfied';
      this.stats.regimeDetections++;
    } else if (coilCheck.isValid) {
      regime = 'COIL_WATCHER';
      reason = 'All COIL conditions satisfied';
      this.stats.regimeDetections++;
    } else if (shakeoutCheck.isValid) {
      regime = 'SHAKEOUT_DETECTOR';
      reason = 'All SHAKEOUT conditions satisfied';
      this.stats.regimeDetections++;
    } else {
      this.stats.noRegimeCount++;
      
      // Determine primary failure reason
      if (dlsScore < 75) {
        reason = `Liquidity score (${dlsScore}) below validation threshold (75)`;
      } else if (Math.abs(pressure - this.thresholds.cascade.pressure) < 0.5) {
        reason = `Pressure (${pressure}) close to CASCADE threshold but insufficient`;
      } else if (Math.abs(momentum) < 0.1) {
        reason = `Momentum (${momentum}) too weak for any regime`;
      } else {
        reason = 'Multiple conditions failed';
      }
    }

    // FORTRESS v6.1: Structured diagnostic log
    const diagnosticLog = {
      logType: 'DIAGNOSTIC',
      timestamp: new Date().toISOString(),
      symbol: this.symbol,
      inputs: {
        price: parseFloat(price?.toFixed(2) || 0),
        dlsScore: parseFloat(dlsScore?.toFixed(1) || 0),
        pressure: parseFloat(pressure?.toFixed(2) || 0),
        momentum: parseFloat(momentum?.toFixed(3) || 0)
      },
      classifierOutput: {
        regime,
        reason,
        checks: {
          CASCADE: cascadeCheck.isValid ? 'PASS' : `FAIL (${cascadeCheck.failures.join(', ')})`,
          COIL: coilCheck.isValid ? 'PASS' : `FAIL (${coilCheck.failures.join(', ')})`,
          SHAKEOUT: shakeoutCheck.isValid ? 'PASS' : `FAIL (${shakeoutCheck.failures.join(', ')})`
        }
      },
      stats: {
        totalClassifications: this.stats.totalClassifications,
        regimeDetections: this.stats.regimeDetections
      }
    };

    // Log via stateful logger (only logs if regime or reason changes)
    const logKey = `classifier_${this.symbol}`;
    const logValue = {
      regime: diagnosticLog.classifierOutput.regime,
      reason: diagnosticLog.classifierOutput.reason
    };

    this.logger?.info(logKey, diagnosticLog);

    // Store last classification
    this.stats.lastClassification = diagnosticLog;

    // Emit events for regime detection
    if (regime !== 'NO_REGIME') {
      this.emit('REGIME_DETECTED', {
        regime,
        marketData,
        diagnosticLog,
        timestamp
      });
    }

    return regime !== 'NO_REGIME' ? {
      type: regime,
      regime,
      confidence: this.calculateConfidence(regime, marketData),
      diagnosticLog,
      timestamp
    } : null;
  }

  /**
   * Evaluate CASCADE_HUNTER conditions
   */
  evaluateCascadeConditions(pressure, dlsScore, momentum) {
    const failures = [];
    
    if (pressure < this.thresholds.cascade.pressure) {
      failures.push('Pressure');
    }
    if (dlsScore < 75) { // DLS validation threshold
      failures.push('Liquidity');
    }
    if (momentum > this.thresholds.cascade.momentum) {
      failures.push('Momentum');
    }

    return {
      isValid: failures.length === 0,
      failures,
      details: {
        pressure: { value: pressure, threshold: this.thresholds.cascade.pressure, pass: pressure >= this.thresholds.cascade.pressure },
        liquidity: { value: dlsScore, threshold: 75, pass: dlsScore >= 75 },
        momentum: { value: momentum, threshold: this.thresholds.cascade.momentum, pass: momentum <= this.thresholds.cascade.momentum }
      }
    };
  }

  /**
   * Evaluate COIL_WATCHER conditions
   */
  evaluateCoilConditions(pressure, dlsScore, momentum) {
    const failures = [];
    
    if (pressure > this.thresholds.coil.pressure) {
      failures.push('Pressure');
    }
    if (dlsScore < 85) { // Higher threshold for COIL
      failures.push('Liquidity');
    }
    if (momentum < this.thresholds.coil.momentumMin || momentum > this.thresholds.coil.momentumMax) {
      failures.push('Momentum');
    }

    return {
      isValid: failures.length === 0,
      failures,
      details: {
        pressure: { value: pressure, threshold: this.thresholds.coil.pressure, pass: pressure <= this.thresholds.coil.pressure },
        liquidity: { value: dlsScore, threshold: 85, pass: dlsScore >= 85 },
        momentum: { value: momentum, thresholdMin: this.thresholds.coil.momentumMin, thresholdMax: this.thresholds.coil.momentumMax, pass: momentum >= this.thresholds.coil.momentumMin && momentum <= this.thresholds.coil.momentumMax }
      }
    };
  }

  /**
   * Evaluate SHAKEOUT_DETECTOR conditions
   */
  evaluateShakeoutConditions(pressure, dlsScore, momentum) {
    const failures = [];
    
    if (pressure > this.thresholds.shakeout.pressure) {
      failures.push('Pressure');
    }
    if (dlsScore < 80) { // Medium threshold for SHAKEOUT
      failures.push('Liquidity');
    }
    if (momentum > this.thresholds.shakeout.momentum) {
      failures.push('Momentum');
    }

    return {
      isValid: failures.length === 0,
      failures,
      details: {
        pressure: { value: pressure, threshold: this.thresholds.shakeout.pressure, pass: pressure <= this.thresholds.shakeout.pressure },
        liquidity: { value: dlsScore, threshold: 80, pass: dlsScore >= 80 },
        momentum: { value: momentum, threshold: this.thresholds.shakeout.momentum, pass: momentum <= this.thresholds.shakeout.momentum }
      }
    };
  }

  /**
   * Calculate confidence score for detected regime
   */
  calculateConfidence(regime, marketData) {
    const { pressure, dlsScore, momentum } = marketData;
    
    switch (regime) {
      case 'CASCADE_HUNTER':
        return Math.min(100, 
          (pressure / this.thresholds.cascade.pressure) * 30 +
          (dlsScore / 100) * 40 +
          (Math.abs(momentum) / Math.abs(this.thresholds.cascade.momentum)) * 30
        );
      case 'COIL_WATCHER':
        return Math.min(100, 
          ((this.thresholds.coil.pressure - pressure) / this.thresholds.coil.pressure) * 40 +
          (dlsScore / 100) * 40 +
          (1 - Math.abs(momentum) / 0.1) * 20
        );
      case 'SHAKEOUT_DETECTOR':
        return Math.min(100,
          ((this.thresholds.shakeout.pressure - pressure) / this.thresholds.shakeout.pressure) * 30 +
          (dlsScore / 100) * 40 +
          (Math.abs(momentum) / Math.abs(this.thresholds.shakeout.momentum)) * 30
        );
      default:
        return 0;
    }
  }

  /**
   * Get classifier statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalClassifications > 0 ? 
        (this.stats.regimeDetections / this.stats.totalClassifications * 100).toFixed(2) : 0
    };
  }

  /**
   * Get last diagnostic log
   */
  getLastDiagnostic() {
    return this.stats.lastClassification;
  }
}
