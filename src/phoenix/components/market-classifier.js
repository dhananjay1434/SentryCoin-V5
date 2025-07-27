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
    
    // RED TEAM MANDATE 1: Calibrated thresholds based on market reality
    this.thresholds = {
      cascade: {
        pressure: 1.002,    // Reduced from 3.0 - more realistic for actual market conditions
        liquidity: 50000,   // Reduced from 100000 - lower barrier for signal detection
        momentum: -0.15     // Reduced from -0.3 - capture smaller but significant moves
      },
      coil: {
        pressure: 1.001,    // Reduced from 2.0 - detect subtle accumulation phases
        liquidity: 150000,  // Reduced from 300000 - more achievable threshold
        momentumMin: -0.05, // Reduced from -0.1 - tighter range for neutral momentum
        momentumMax: 0.05   // Reduced from 0.1 - tighter range for neutral momentum
      },
      shakeout: {
        pressure: 1.0005,   // Reduced from 1.5 - detect subtle stop hunts
        liquidity: 100000,  // Reduced from 250000 - lower barrier for detection
        momentum: -0.25     // Reduced from -0.5 - capture moderate shakeouts
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
      calibrationNote: 'RED TEAM MANDATE 1: Thresholds calibrated for market reality - reduced from theoretical values'
    });
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
   * RED TEAM MANDATE 3: Get current DLS threshold with derivatives adjustments
   */
  getCurrentDLSThreshold(baseThreshold = 45) { // RED TEAM MANDATE 1: Reduced from 75 to 45 for realistic detection
    const now = Date.now();
    let adjustedThreshold = baseThreshold;
    let activeAdjustments = [];

    // Clean up expired alerts and apply active ones
    for (const [alertId, alert] of this.derivativesAlerts.activeAlerts) {
      if (now > alert.expiryTime) {
        this.derivativesAlerts.activeAlerts.delete(alertId);
      } else {
        // Apply threshold reduction for active OI_SPIKE alerts
        if (alert.type === 'OI_SPIKE') {
          adjustedThreshold -= this.derivativesAlerts.thresholdAdjustments.dlsReduction;
          activeAdjustments.push({
            type: alert.type,
            reduction: this.derivativesAlerts.thresholdAdjustments.dlsReduction,
            remainingTime: alert.expiryTime - now
          });
        }
      }
    }

    return {
      threshold: Math.max(30, adjustedThreshold), // Minimum threshold of 30
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

    if (pressure < this.thresholds.cascade.pressure) {
      failures.push('Pressure');
    }
    if (dlsScore < dlsThreshold) { // RED TEAM MANDATE 3: Dynamic DLS threshold
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
        liquidity: { value: dlsScore, threshold: dlsThreshold, pass: dlsScore >= dlsThreshold },
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
