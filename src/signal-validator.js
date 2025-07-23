import fs from 'fs';
import path from 'path';

/**
 * Signal Validator - Tracks and validates flash crash predictions
 * Monitors price movements after each alert to measure accuracy
 */
class SignalValidator {
  constructor(symbol, onSignalCompleted = null) {
    this.symbol = symbol;
    this.signals = [];
    this.validationResults = [];
    this.dataFile = `signal-validation-${symbol}.json`;
    this.onSignalCompleted = onSignalCompleted; // Callback when signal validation completes
    this.loadExistingData();
  }

  /**
   * Records a new flash crash signal
   * @param {Object} signalData - Signal information
   */
  recordSignal(signalData) {
    const signal = {
      id: this.generateSignalId(),
      timestamp: new Date().toISOString(),
      istTime: this.toIST(new Date()),
      symbol: this.symbol,
      signalPrice: signalData.currentPrice,
      askBidRatio: signalData.askToBidRatio,
      bidVolume: signalData.totalBidVolume,
      askVolume: signalData.totalAskVolume,
      riskLevel: this.getRiskLevel(signalData.askToBidRatio),
      priceTracking: {
        t0: signalData.currentPrice, // Price at signal
        t10sec: null, // Price after 10 seconds
        t30sec: null, // Price after 30 seconds
        t1min: null,  // Price after 1 minute
        t2min: null,  // Price after 2 minutes
        t3min: null,  // Price after 3 minutes
        t5min: null,  // Price after 5 minutes
      },
      validation: {
        isValidated: false,
        accuracy10sec: null,
        accuracy30sec: null,
        accuracy1min: null,
        accuracy2min: null,
        accuracy3min: null,
        accuracy5min: null,
        maxDrop: null,
        predictionCorrect: null,
        fastestDrop: null, // How quickly the drop occurred
        dropTiming: null,  // When the maximum drop happened
        immediateReaction: null // Price change within first 10 seconds
      }
    };

    this.signals.push(signal);
    this.saveData();
    
    console.log(`📊 Signal recorded: ${signal.id} at $${signal.signalPrice.toFixed(6)}`);
    
    // Schedule price tracking
    this.scheduleValidation(signal.id);
    
    return signal.id;
  }

  /**
   * Updates price data for a signal at specific intervals
   * @param {string} signalId - Signal ID to update
   * @param {number} currentPrice - Current market price
   */
  updatePriceTracking(signalId, currentPrice) {
    const signal = this.signals.find(s => s.id === signalId);
    if (!signal) return;

    const signalTime = new Date(signal.timestamp);
    const now = new Date();
    const secondsElapsed = (now - signalTime) / 1000;
    const minutesElapsed = secondsElapsed / 60;

    // Update price tracking based on time elapsed
    if (secondsElapsed >= 10 && signal.priceTracking.t10sec === null) {
      signal.priceTracking.t10sec = currentPrice;
      const change = ((currentPrice - signal.priceTracking.t0) / signal.priceTracking.t0) * 100;
      console.log(`⚡ 10sec update for ${signalId}: $${currentPrice.toFixed(6)} (${change.toFixed(2)}%)`);
    }

    if (secondsElapsed >= 30 && signal.priceTracking.t30sec === null) {
      signal.priceTracking.t30sec = currentPrice;
      const change = ((currentPrice - signal.priceTracking.t0) / signal.priceTracking.t0) * 100;
      console.log(`📈 30sec update for ${signalId}: $${currentPrice.toFixed(6)} (${change.toFixed(2)}%)`);
    }

    if (minutesElapsed >= 1 && signal.priceTracking.t1min === null) {
      signal.priceTracking.t1min = currentPrice;
      const change = ((currentPrice - signal.priceTracking.t0) / signal.priceTracking.t0) * 100;
      console.log(`📈 1min update for ${signalId}: $${currentPrice.toFixed(6)} (${change.toFixed(2)}%)`);
    }

    if (minutesElapsed >= 2 && signal.priceTracking.t2min === null) {
      signal.priceTracking.t2min = currentPrice;
      const change = ((currentPrice - signal.priceTracking.t0) / signal.priceTracking.t0) * 100;
      console.log(`📈 2min update for ${signalId}: $${currentPrice.toFixed(6)} (${change.toFixed(2)}%)`);
    }

    if (minutesElapsed >= 3 && signal.priceTracking.t3min === null) {
      signal.priceTracking.t3min = currentPrice;
      const change = ((currentPrice - signal.priceTracking.t0) / signal.priceTracking.t0) * 100;
      console.log(`📈 3min update for ${signalId}: $${currentPrice.toFixed(6)} (${change.toFixed(2)}%)`);
    }

    if (minutesElapsed >= 5 && signal.priceTracking.t5min === null) {
      signal.priceTracking.t5min = currentPrice;
      const change = ((currentPrice - signal.priceTracking.t0) / signal.priceTracking.t0) * 100;
      console.log(`📈 5min update for ${signalId}: $${currentPrice.toFixed(6)} (${change.toFixed(2)}%)`);

      // Perform final validation
      this.validateSignal(signalId);
    }

    this.saveData();
  }

  /**
   * Validates a signal's accuracy after 5 minutes
   * @param {string} signalId - Signal to validate
   */
  validateSignal(signalId) {
    const signal = this.signals.find(s => s.id === signalId);
    if (!signal || signal.validation.isValidated) return;

    const { t0, t10sec, t30sec, t1min, t2min, t3min, t5min } = signal.priceTracking;

    // Calculate price changes (negative = drop, positive = rise)
    const change10sec = t10sec ? ((t10sec - t0) / t0) * 100 : null;
    const change30sec = t30sec ? ((t30sec - t0) / t0) * 100 : null;
    const change1min = t1min ? ((t1min - t0) / t0) * 100 : null;
    const change2min = t2min ? ((t2min - t0) / t0) * 100 : null;
    const change3min = t3min ? ((t3min - t0) / t0) * 100 : null;
    const change5min = t5min ? ((t5min - t0) / t0) * 100 : null;

    // Find maximum drop and when it occurred
    const pricePoints = [
      { time: '0sec', price: t0, change: 0 },
      { time: '10sec', price: t10sec, change: change10sec },
      { time: '30sec', price: t30sec, change: change30sec },
      { time: '1min', price: t1min, change: change1min },
      { time: '2min', price: t2min, change: change2min },
      { time: '3min', price: t3min, change: change3min },
      { time: '5min', price: t5min, change: change5min }
    ].filter(p => p.price !== null);

    const minPoint = pricePoints.reduce((min, point) =>
      point.price < min.price ? point : min, pricePoints[0]);

    const maxDrop = minPoint.change;
    const dropTiming = minPoint.time;

    // Find fastest significant drop (first time it dropped >1%)
    const fastestDrop = pricePoints.find(p => p.change < -1);

    // Determine if prediction was correct (expecting a drop)
    const significantDrop = maxDrop < -2; // 2% drop threshold
    const predictionCorrect = significantDrop;

    signal.validation = {
      isValidated: true,
      accuracy10sec: change10sec,
      accuracy30sec: change30sec,
      accuracy1min: change1min,
      accuracy2min: change2min,
      accuracy3min: change3min,
      accuracy5min: change5min,
      maxDrop: maxDrop,
      predictionCorrect: predictionCorrect,
      fastestDrop: fastestDrop ? fastestDrop.time : null,
      dropTiming: dropTiming,
      immediateReaction: change10sec, // Track immediate market reaction
      validatedAt: new Date().toISOString()
    };

    this.validationResults.push({
      signalId: signalId,
      symbol: this.symbol,
      timestamp: signal.timestamp,
      signalPrice: t0,
      maxDrop: maxDrop,
      correct: predictionCorrect,
      riskLevel: signal.riskLevel,
      askBidRatio: signal.askBidRatio
    });

    console.log(`✅ Signal ${signalId} validated: ${predictionCorrect ? 'CORRECT' : 'INCORRECT'}`);
    console.log(`   Max drop: ${maxDrop.toFixed(2)}% at ${dropTiming}`);
    console.log(`   Immediate reaction (10s): ${change10sec?.toFixed(2) || 'N/A'}%`);
    if (fastestDrop) {
      console.log(`   Fastest drop: >1% within ${fastestDrop.time}`);
    }
    console.log(`   Timeline: 10s(${change10sec?.toFixed(2) || 'N/A'}%) → 30s(${change30sec?.toFixed(2) || 'N/A'}%) → 1m(${change1min?.toFixed(2) || 'N/A'}%) → 2m(${change2min?.toFixed(2) || 'N/A'}%) → 3m(${change3min?.toFixed(2) || 'N/A'}%) → 5m(${change5min?.toFixed(2) || 'N/A'}%)`);

    this.saveData();
    this.generateReport();

    // Notify predictor that this signal is completed
    if (this.onSignalCompleted) {
      this.onSignalCompleted(signalId);
    }
  }

  /**
   * Schedules validation checks for a signal
   * @param {string} signalId - Signal to track
   */
  scheduleValidation(signalId) {
    // Note: In a real implementation, you'd need to continuously feed price data
    // This is a framework for validation - actual price updates come from your main predictor
    console.log(`⏰ Validation scheduled for signal ${signalId}`);
  }

  /**
   * Generates accuracy report
   */
  generateReport() {
    if (this.validationResults.length === 0) return;

    const totalSignals = this.validationResults.length;
    const correctPredictions = this.validationResults.filter(r => r.correct).length;
    const accuracy = (correctPredictions / totalSignals) * 100;

    const report = {
      symbol: this.symbol,
      totalSignals: totalSignals,
      correctPredictions: correctPredictions,
      accuracy: accuracy,
      generatedAt: new Date().toISOString(),
      istTime: this.toIST(new Date()),
      breakdown: {
        byRiskLevel: this.getAccuracyByRiskLevel(),
        averageMaxDrop: this.getAverageMaxDrop(),
        recentPerformance: this.getRecentPerformance()
      }
    };

    // Save report
    fs.writeFileSync(`validation-report-${this.symbol}.json`, JSON.stringify(report, null, 2));
    
    console.log(`📊 Validation Report Generated:`);
    console.log(`   Total Signals: ${totalSignals}`);
    console.log(`   Correct Predictions: ${correctPredictions}`);
    console.log(`   Accuracy: ${accuracy.toFixed(2)}%`);
    console.log(`   Average Max Drop: ${report.breakdown.averageMaxDrop.toFixed(2)}%`);

    return report;
  }

  /**
   * Gets accuracy breakdown by risk level
   */
  getAccuracyByRiskLevel() {
    const breakdown = {};
    const riskLevels = ['🟢 MODERATE', '🟡 HIGH', '🟠 VERY HIGH', '🔴 EXTREME'];
    
    riskLevels.forEach(level => {
      const signals = this.validationResults.filter(r => r.riskLevel === level);
      const correct = signals.filter(r => r.correct).length;
      breakdown[level] = {
        total: signals.length,
        correct: correct,
        accuracy: signals.length > 0 ? (correct / signals.length) * 100 : 0
      };
    });
    
    return breakdown;
  }

  /**
   * Gets average maximum drop across all signals
   */
  getAverageMaxDrop() {
    const drops = this.validationResults.map(r => r.maxDrop);
    return drops.length > 0 ? drops.reduce((a, b) => a + b, 0) / drops.length : 0;
  }

  /**
   * Gets recent performance (last 10 signals)
   */
  getRecentPerformance() {
    const recent = this.validationResults.slice(-10);
    const correct = recent.filter(r => r.correct).length;
    return {
      total: recent.length,
      correct: correct,
      accuracy: recent.length > 0 ? (correct / recent.length) * 100 : 0
    };
  }

  /**
   * Utility functions
   */
  generateSignalId() {
    return `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toIST(date) {
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString().replace('T', ' ').substring(0, 19) + ' IST';
  }

  getRiskLevel(ratio) {
    if (ratio >= 5.0) return '🔴 EXTREME';
    if (ratio >= 4.0) return '🟠 VERY HIGH';
    if (ratio >= 3.0) return '🟡 HIGH';
    return '🟢 MODERATE';
  }

  loadExistingData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.signals = data.signals || [];
        this.validationResults = data.validationResults || [];
      }
    } catch (error) {
      console.log(`📁 Creating new validation data file for ${this.symbol}`);
    }
  }

  saveData() {
    const data = {
      signals: this.signals,
      validationResults: this.validationResults,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }

  /**
   * Gets current validation statistics
   */
  getStats() {
    return {
      totalSignals: this.signals.length,
      validatedSignals: this.validationResults.length,
      pendingValidation: this.signals.filter(s => !s.validation.isValidated).length,
      accuracy: this.validationResults.length > 0 ? 
        (this.validationResults.filter(r => r.correct).length / this.validationResults.length) * 100 : 0
    };
  }
}

export default SignalValidator;
