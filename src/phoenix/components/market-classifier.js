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
    
    // RED TEAM MANDATE 1: AGGRESSIVE CALIBRATION - Fix paralyzed classifier
    this.thresholds = {
      cascade: {
        pressure: 1.00001,  // ULTRA-LOW: Detect any pressure above baseline
        liquidity: 25000,   // ULTRA-LOW: Minimal liquidity requirement
        momentum: -0.05     // ULTRA-LOW: Capture any negative momentum
      },
      coil: {
        pressure: 1.000005, // ULTRA-LOW: Detect minimal accumulation pressure
        liquidity: 30000,   // ULTRA-LOW: Minimal liquidity for coil detection
        momentumMin: -0.02, // ULTRA-TIGHT: Very narrow neutral range
        momentumMax: 0.02   // ULTRA-TIGHT: Very narrow neutral range
      },
      shakeout: {
        pressure: 1.000001, // ULTRA-LOW: Detect minimal shakeout pressure
        liquidity: 20000,   // ULTRA-LOW: Minimal liquidity for shakeout
        momentum: -0.1      // MODERATE: Capture moderate shakeouts
      }
    };
    
    // Performance metrics
    this.stats = {
      totalClassifications: 0,
      regimeDetections: 0,
      noRegimeCount: 0,
      lastClassification: null,
      lastLogTime: 0,
      silentPeriods: 0
    };

    // RED TEAM MANDATE 3: Intelligence feed integration
    this.derivativesAlerts = {
      activeAlerts: new Map(),
      thresholdAdjustments: {
        dlsReduction: 15, // Reduce DLS threshold by 15 points during OI_SPIKE
        windowDuration: 60000 // 60 second window
      }
    };

    // CRUCIBLE MANDATE 2: Glass Box Doctrine - Force periodic logging
    this.diagnosticInterval = setInterval(() => {
      this.forceDiagnosticLog();
    }, 60000); // Every 60 seconds as mandated
    
    this.logger?.info('market_classifier_initialized', {
      symbol: this.symbol,
      thresholds: this.thresholds,
      calibrationNote: 'RED TEAM MANDATE 1: ULTRA-AGGRESSIVE CALIBRATION - Thresholds set to force signal generation'
    });
  }

  /**
   * RED TEAM MANDATE 1: Fix floating-point precision comparison
   */
  floatCompare(a, b, epsilon = 1e-10) {
    return Math.abs(a - b) < epsilon;
  }

  floatGreaterEqual(a, b, epsilon = 1e-10) {
    return a > b || this.floatCompare(a, b, epsilon);
  }

  floatLessEqual(a, b, epsilon = 1e-10) {
    return a < b || this.floatCompare(a, b, epsilon);
  }

  /**
   * RED TEAM MANDATE 3: Process derivatives alert to adjust thresholds
   */
  processDerivativesAlert(alert) {
    const { type, data, timestamp } = alert;

    if (type === 'OI_SPIKE') {
      const alertId = `${type}_${timestamp}`;
      const expiryTime = timestamp + this.derivativesAlerts.thresholdAdjustments.windowDuration;

      this.derivativesAlerts.activeAlerts.set(alertId, {
        type,
        data,
        timestamp,
        expiryTime,
        applied: false
      });

      this.logger?.info('derivatives_alert_processed', {
        alertType: type,
        changeRate: data.changeRate,
        windowDuration: this.derivativesAlerts.thresholdAdjustments.windowDuration,
        dlsReduction: this.derivativesAlerts.thresholdAdjustments.dlsReduction,
        expiryTime: new Date(expiryTime).toISOString()
      });
    }
  }

  /**
   * RED TEAM MANDATE 3: Process whale transaction to adjust thresholds
   */
  processWhaleTransaction(transaction) {
    const { type, data, timestamp } = transaction;

    if (type === 'WHALE_TRANSACTION' && data.value >= 10000) {
      const alertId = `WHALE_${timestamp}`;
      const expiryTime = timestamp + 30000; // 30-second window for whale transactions

      this.derivativesAlerts.activeAlerts.set(alertId, {
        type: 'WHALE_SPIKE',
        data: {
          value: data.value,
          address: data.address,
          threatLevel: data.threatLevel
        },
        timestamp,
        expiryTime,
        applied: false
      });

      this.logger?.info('whale_transaction_processed', {
        alertType: 'WHALE_SPIKE',
        value: data.value,
        address: data.address,
        windowDuration: 30000,
        dlsReduction: this.derivativesAlerts.thresholdAdjustments.dlsReduction,
        expiryTime: new Date(expiryTime).toISOString(),
        message: 'High-value whale transaction triggers temporary threshold reduction'
      });
    }
  }

  /**
   * RED TEAM MANDATE 3: Get current DLS threshold with derivatives adjustments
   */
  getCurrentDLSThreshold(baseThreshold = 25) { // RED TEAM MANDATE 1: ULTRA-LOW - Force signal generation
    const now = Date.now();
    let adjustedThreshold = baseThreshold;
    let activeAdjustments = [];

    // Clean up expired alerts and apply active ones
    for (const [alertId, alert] of this.derivativesAlerts.activeAlerts) {
      if (now > alert.expiryTime) {
        this.derivativesAlerts.activeAlerts.delete(alertId);
      } else {
        // Apply threshold reduction for active alerts
        if (alert.type === 'OI_SPIKE' || alert.type === 'WHALE_SPIKE') {
          adjustedThreshold -= this.derivativesAlerts.thresholdAdjustments.dlsReduction;
          activeAdjustments.push({
            type: alert.type,
            reduction: this.derivativesAlerts.thresholdAdjustments.dlsReduction,
            remainingTime: alert.expiryTime - now,
            data: alert.data
          });
        }
      }
    }

    return {
      threshold: Math.max(10, adjustedThreshold), // Minimum threshold of 10 (allow aggressive reduction)
      baseThreshold,
      adjustments: activeAdjustments,
      totalReduction: baseThreshold - adjustedThreshold
    };
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

    // RED TEAM MANDATE 3: Get dynamic DLS threshold with derivatives adjustments
    const dlsThresholdInfo = this.getCurrentDLSThreshold();

    // Evaluate all regime conditions with dynamic threshold
    const cascadeCheck = this.evaluateCascadeConditions(pressure, dlsScore, momentum, dlsThresholdInfo.threshold);
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
      if (dlsScore < dlsThresholdInfo.threshold) {
        reason = `Liquidity score (${dlsScore}) below validation threshold (${dlsThresholdInfo.threshold})`;
        if (dlsThresholdInfo.adjustments.length > 0) {
          reason += ` [Adjusted from ${dlsThresholdInfo.baseThreshold} due to derivatives alerts]`;
        }
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
      // RED TEAM MANDATE 3: Include derivatives integration status
      derivativesIntegration: {
        dlsThreshold: dlsThresholdInfo.threshold,
        baseThreshold: dlsThresholdInfo.baseThreshold,
        activeAdjustments: dlsThresholdInfo.adjustments,
        totalReduction: dlsThresholdInfo.totalReduction
      },
      stats: {
        totalClassifications: this.stats.totalClassifications,
        regimeDetections: this.stats.regimeDetections
      }
    };

    // CRUCIBLE MANDATE 2: Glass Box Doctrine - Always log with state tracking
    const logKey = `classifier_${this.symbol}`;
    const currentState = {
      regime: diagnosticLog.classifierOutput.regime,
      reason: diagnosticLog.classifierOutput.reason
    };

    // Force logging for Glass Box Doctrine compliance
    this.logger?.info(logKey, diagnosticLog);
    this.stats.lastLogTime = Date.now();

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
  evaluateCascadeConditions(pressure, dlsScore, momentum, dlsThreshold = 75) {
    const failures = [];

    // RED TEAM MANDATE 1: Fix floating-point precision comparison
    const pressurePass = this.floatGreaterEqual(pressure, this.thresholds.cascade.pressure);
    const liquidityPass = dlsScore >= dlsThreshold;
    const momentumPass = momentum <= this.thresholds.cascade.momentum;

    if (!pressurePass) {
      failures.push('Pressure');
    }
    if (!liquidityPass) {
      failures.push('Liquidity');
    }
    if (!momentumPass) {
      failures.push('Momentum');
    }

    // Enhanced debugging for floating-point issues
    this.logger?.debug('cascade_evaluation_debug', {
      pressure: { value: pressure, threshold: this.thresholds.cascade.pressure, pass: pressurePass, diff: pressure - this.thresholds.cascade.pressure },
      liquidity: { value: dlsScore, threshold: dlsThreshold, pass: liquidityPass },
      momentum: { value: momentum, threshold: this.thresholds.cascade.momentum, pass: momentumPass },
      failures: failures
    });

    return {
      isValid: failures.length === 0,
      failures,
      details: {
        pressure: { value: pressure, threshold: this.thresholds.cascade.pressure, pass: pressurePass },
        liquidity: { value: dlsScore, threshold: dlsThreshold, pass: liquidityPass },
        momentum: { value: momentum, threshold: this.thresholds.cascade.momentum, pass: momentumPass }
      }
    };
  }

  /**
   * Evaluate COIL_WATCHER conditions
   */
  evaluateCoilConditions(pressure, dlsScore, momentum) {
    const failures = [];

    // RED TEAM MANDATE 1: Fix floating-point precision comparison
    const pressurePass = this.floatLessEqual(pressure, this.thresholds.coil.pressure);
    const liquidityPass = dlsScore >= 85;
    const momentumPass = momentum >= this.thresholds.coil.momentumMin && momentum <= this.thresholds.coil.momentumMax;

    if (!pressurePass) {
      failures.push('Pressure');
    }
    if (!liquidityPass) {
      failures.push('Liquidity');
    }
    if (!momentumPass) {
      failures.push('Momentum');
    }

    return {
      isValid: failures.length === 0,
      failures,
      details: {
        pressure: { value: pressure, threshold: this.thresholds.coil.pressure, pass: pressurePass },
        liquidity: { value: dlsScore, threshold: 85, pass: liquidityPass },
        momentum: { value: momentum, thresholdMin: this.thresholds.coil.momentumMin, thresholdMax: this.thresholds.coil.momentumMax, pass: momentumPass }
      }
    };
  }

  /**
   * Evaluate SHAKEOUT_DETECTOR conditions
   */
  evaluateShakeoutConditions(pressure, dlsScore, momentum) {
    const failures = [];

    // RED TEAM MANDATE 1: Fix floating-point precision comparison
    const pressurePass = this.floatLessEqual(pressure, this.thresholds.shakeout.pressure);
    const liquidityPass = dlsScore >= 80;
    const momentumPass = momentum <= this.thresholds.shakeout.momentum;

    if (!pressurePass) {
      failures.push('Pressure');
    }
    if (!liquidityPass) {
      failures.push('Liquidity');
    }
    if (!momentumPass) {
      failures.push('Momentum');
    }

    return {
      isValid: failures.length === 0,
      failures,
      details: {
        pressure: { value: pressure, threshold: this.thresholds.shakeout.pressure, pass: pressurePass },
        liquidity: { value: dlsScore, threshold: 80, pass: liquidityPass },
        momentum: { value: momentum, threshold: this.thresholds.shakeout.momentum, pass: momentumPass }
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

  /**
   * CRUCIBLE MANDATE 2: Force diagnostic log every 60 seconds for Glass Box Doctrine
   */
  forceDiagnosticLog() {
    const timeSinceLastLog = Date.now() - this.stats.lastLogTime;

    if (timeSinceLastLog >= 60000) { // 60 seconds
      this.stats.silentPeriods++;

      const forcedDiagnostic = {
        logType: 'FORCED_DIAGNOSTIC',
        timestamp: new Date().toISOString(),
        symbol: this.symbol,
        status: 'CLASSIFIER_SILENT',
        reason: 'No market data received for classification',
        silentDuration: timeSinceLastLog,
        silentPeriods: this.stats.silentPeriods,
        stats: {
          totalClassifications: this.stats.totalClassifications,
          regimeDetections: this.stats.regimeDetections,
          noRegimeCount: this.stats.noRegimeCount
        },
        mandateCompliance: 'GLASS_BOX_DOCTRINE_ENFORCED'
      };

      this.logger?.warn('classifier_forced_diagnostic', forcedDiagnostic);
      this.stats.lastLogTime = Date.now();
    }
  }

  /**
   * CRUCIBLE MANDATE 2: Cleanup method for graceful shutdown
   */
  shutdown() {
    if (this.diagnosticInterval) {
      clearInterval(this.diagnosticInterval);
      this.diagnosticInterval = null;
    }
  }
}
