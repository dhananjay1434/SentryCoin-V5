/**
 * Wavelet Analysis Engine - Predictive Cascade Detection
 * 
 * Implements Complex Morlet Wavelet Transform for detecting pre-cascade signatures
 * in Order Flow Imbalance (OFI) time series. This transforms the system from
 * reactive to predictive by identifying high-frequency anomalies that precede
 * liquidity cascades.
 * 
 * Key Innovation: Detects the "crackling before the avalanche" in market microstructure
 */

import { EventEmitter } from 'events';
import { getISTTime } from './utils.js';

class WaveletAnalyzer extends EventEmitter {
  constructor(symbol) {
    super();
    
    this.symbol = symbol;
    
    // Wavelet parameters
    this.samplingRate = 1.0; // 1 Hz (1 second intervals)
    this.minScale = 2; // Minimum scale (2 seconds)
    this.maxScale = 15; // Maximum scale (15 seconds)
    this.scaleSteps = 20; // Number of scales to analyze
    this.windowSize = parseInt(process.env.WAVELET_WINDOW || '300'); // 5 minutes
    
    // Detection thresholds
    this.energyThreshold = parseFloat(process.env.WAVELET_ENERGY_THRESHOLD || '3.5'); // Z-score
    this.confirmationWindow = parseInt(process.env.CONFIRMATION_WINDOW || '60'); // 60 seconds
    
    // Data storage
    this.ofiTimeSeries = []; // Order Flow Imbalance time series
    this.energyScores = []; // Wavelet energy scores
    this.scalogram = new Map(); // timestamp -> scale -> coefficient
    
    // Performance tracking
    this.stats = {
      predictiveSignals: 0,
      confirmedPredictions: 0,
      falsePositives: 0,
      averageLeadTime: 0,
      lastAnalysisTime: null
    };
    
    console.log(`🌊 Wavelet Analyzer initialized for ${symbol}`);
    console.log(`📊 Analysis Window: ${this.windowSize}s | Scales: ${this.minScale}-${this.maxScale}s`);
    console.log(`⚡ Energy Threshold: ${this.energyThreshold} σ`);
  }

  /**
   * Process new feature vector and update OFI time series
   */
  processFeatureVector(featureVector) {
    const { timestamp, ofi } = featureVector;
    
    // Add to OFI time series
    this.ofiTimeSeries.push({ timestamp, ofi });
    
    // Maintain rolling window
    const cutoffTime = timestamp - (this.windowSize * 1000);
    this.ofiTimeSeries = this.ofiTimeSeries.filter(point => point.timestamp >= cutoffTime);
    
    // Perform wavelet analysis if we have enough data
    if (this.ofiTimeSeries.length >= this.minScale * 2) {
      this.performWaveletAnalysis(timestamp);
    }
  }

  /**
   * Perform Continuous Wavelet Transform on OFI time series
   */
  performWaveletAnalysis(currentTimestamp) {
    const startTime = Date.now();
    
    try {
      // Extract OFI values for analysis
      const ofiValues = this.ofiTimeSeries.map(point => point.ofi);
      
      // Calculate scales (periods in seconds)
      const scales = this.generateScales();
      
      // Perform CWT for each scale
      const coefficients = new Map();
      for (const scale of scales) {
        const scaleCoeffs = this.calculateCWTAtScale(ofiValues, scale);
        coefficients.set(scale, scaleCoeffs);
      }
      
      // Store scalogram
      this.scalogram.set(currentTimestamp, coefficients);
      
      // Calculate energy score for high-frequency band
      const energyScore = this.calculateHighFrequencyEnergy(coefficients);
      this.energyScores.push({ timestamp: currentTimestamp, energy: energyScore });
      
      // Maintain rolling window for energy scores
      const cutoffTime = currentTimestamp - (this.windowSize * 1000);
      this.energyScores = this.energyScores.filter(point => point.timestamp >= cutoffTime);
      
      // Check for predictive signal
      this.checkForPredictiveSignal(currentTimestamp, energyScore);
      
      this.stats.lastAnalysisTime = currentTimestamp;
      
    } catch (error) {
      console.error(`❌ Wavelet analysis error: ${error.message}`);
    }
  }

  /**
   * Generate scale array for wavelet analysis
   */
  generateScales() {
    const scales = [];
    const logMinScale = Math.log(this.minScale);
    const logMaxScale = Math.log(this.maxScale);
    const step = (logMaxScale - logMinScale) / (this.scaleSteps - 1);
    
    for (let i = 0; i < this.scaleSteps; i++) {
      const scale = Math.exp(logMinScale + i * step);
      scales.push(scale);
    }
    
    return scales;
  }

  /**
   * Calculate Continuous Wavelet Transform at specific scale
   * Using Complex Morlet wavelet
   */
  calculateCWTAtScale(signal, scale) {
    const coefficients = [];
    const signalLength = signal.length;
    
    // Morlet wavelet parameters
    const omega0 = 6; // Central frequency parameter
    const dt = 1.0; // Time step (1 second)
    
    for (let n = 0; n < signalLength; n++) {
      let realPart = 0;
      let imagPart = 0;
      
      // Convolution with scaled and translated Morlet wavelet
      for (let k = 0; k < signalLength; k++) {
        const t = (k - n) * dt / scale;
        
        // Complex Morlet wavelet
        const envelope = Math.exp(-0.5 * t * t);
        const oscillation = Math.cos(omega0 * t);
        const phase = Math.sin(omega0 * t);
        
        const waveletReal = envelope * oscillation;
        const waveletImag = envelope * phase;
        
        realPart += signal[k] * waveletReal;
        imagPart += signal[k] * waveletImag;
      }
      
      // Normalization factor
      const normFactor = Math.sqrt(dt / scale);
      realPart *= normFactor;
      imagPart *= normFactor;
      
      // Magnitude of complex coefficient
      const magnitude = Math.sqrt(realPart * realPart + imagPart * imagPart);
      coefficients.push(magnitude);
    }
    
    return coefficients;
  }

  /**
   * Calculate energy score for high-frequency band (2-10 seconds)
   */
  calculateHighFrequencyEnergy(coefficients) {
    let totalEnergy = 0;
    let count = 0;
    
    // Focus on high-frequency scales (2-10 seconds)
    for (const [scale, scaleCoeffs] of coefficients) {
      if (scale >= 2 && scale <= 10) {
        // Sum energy from most recent coefficients
        const recentCoeffs = scaleCoeffs.slice(-10); // Last 10 time points
        const scaleEnergy = recentCoeffs.reduce((sum, coeff) => sum + coeff * coeff, 0);
        totalEnergy += scaleEnergy;
        count++;
      }
    }
    
    return count > 0 ? totalEnergy / count : 0;
  }

  /**
   * Check for predictive cascade signal based on energy anomaly
   */
  checkForPredictiveSignal(timestamp, energyScore) {
    if (this.energyScores.length < 60) return; // Need at least 1 minute of data
    
    // Calculate Z-score of current energy relative to recent history
    const recentEnergies = this.energyScores.slice(-60).map(point => point.energy);
    const mean = recentEnergies.reduce((sum, val) => sum + val, 0) / recentEnergies.length;
    const variance = recentEnergies.reduce((sum, val) => sum + (val - mean) ** 2, 0) / recentEnergies.length;
    const stdDev = Math.sqrt(variance);
    
    const zScore = stdDev > 0 ? (energyScore - mean) / stdDev : 0;
    
    // Trigger predictive signal if energy anomaly exceeds threshold
    if (zScore > this.energyThreshold) {
      this.triggerPredictiveSignal(timestamp, energyScore, zScore);
    }
  }

  /**
   * Trigger predictive cascade alert
   */
  triggerPredictiveSignal(timestamp, energyScore, zScore) {
    this.stats.predictiveSignals++;
    
    const signal = {
      type: 'PREDICTIVE_CASCADE_ALERT',
      timestamp,
      symbol: this.symbol,
      energyScore,
      zScore,
      confidence: this.calculateConfidence(zScore),
      expectedDirection: 'DOWN', // High energy typically precedes selling pressure
      leadTimeEstimate: this.estimateLeadTime(energyScore),
      waveletAnalysis: {
        scales: Array.from(this.scalogram.get(timestamp)?.keys() || []),
        energyDistribution: this.getEnergyDistribution(timestamp)
      }
    };
    
    console.log(`🌊 PREDICTIVE CASCADE ALERT [${getISTTime()}]`);
    console.log(`   🎯 Symbol: ${this.symbol}`);
    console.log(`   ⚡ Energy Z-Score: ${zScore.toFixed(2)}σ`);
    console.log(`   🔮 Confidence: ${signal.confidence}`);
    console.log(`   ⏱️ Estimated Lead Time: ${signal.leadTimeEstimate}s`);
    
    this.emit('predictiveSignal', signal);
    
    // Schedule confirmation check
    setTimeout(() => {
      this.checkPredictionConfirmation(signal);
    }, this.confirmationWindow * 1000);
  }

  /**
   * Calculate confidence based on energy anomaly strength
   */
  calculateConfidence(zScore) {
    if (zScore > 5.0) return 'VERY_HIGH';
    if (zScore > 4.0) return 'HIGH';
    if (zScore > 3.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Estimate lead time based on energy characteristics
   */
  estimateLeadTime(energyScore) {
    // Higher energy typically means more imminent cascade
    // This is a simplified model - could be enhanced with ML
    const baseLeadTime = 30; // 30 seconds base
    const energyFactor = Math.max(0.1, 1.0 / Math.log(energyScore + 1));
    return Math.round(baseLeadTime * energyFactor);
  }

  /**
   * Get energy distribution across scales
   */
  getEnergyDistribution(timestamp) {
    const coefficients = this.scalogram.get(timestamp);
    if (!coefficients) return {};
    
    const distribution = {};
    for (const [scale, scaleCoeffs] of coefficients) {
      const energy = scaleCoeffs.reduce((sum, coeff) => sum + coeff * coeff, 0);
      distribution[`scale_${scale.toFixed(1)}s`] = energy;
    }
    
    return distribution;
  }

  /**
   * Check if prediction was confirmed by subsequent Trifecta signal
   */
  checkPredictionConfirmation(predictiveSignal) {
    // This would be called by the main system when a Trifecta signal occurs
    // For now, we'll implement a placeholder
    console.log(`🔍 Checking confirmation for prediction ${predictiveSignal.timestamp}`);
  }

  /**
   * Confirm a prediction (called externally when Trifecta signal occurs)
   */
  confirmPrediction(predictiveTimestamp, trifectaTimestamp) {
    const leadTime = (trifectaTimestamp - predictiveTimestamp) / 1000; // seconds
    
    this.stats.confirmedPredictions++;
    this.stats.averageLeadTime = (this.stats.averageLeadTime * (this.stats.confirmedPredictions - 1) + leadTime) / this.stats.confirmedPredictions;
    
    console.log(`✅ PREDICTION CONFIRMED! Lead time: ${leadTime.toFixed(1)}s`);
    
    this.emit('predictionConfirmed', {
      predictiveTimestamp,
      trifectaTimestamp,
      leadTime,
      accuracy: this.getAccuracy()
    });
  }

  /**
   * Mark prediction as false positive
   */
  markFalsePositive(predictiveTimestamp) {
    this.stats.falsePositives++;
    console.log(`❌ False positive detected for prediction ${predictiveTimestamp}`);
  }

  /**
   * Get prediction accuracy metrics
   */
  getAccuracy() {
    const total = this.stats.confirmedPredictions + this.stats.falsePositives;
    return total > 0 ? (this.stats.confirmedPredictions / total) * 100 : 0;
  }

  /**
   * Get recent scalogram data for visualization
   */
  getRecentScalogram(timePoints = 60) {
    const recentTimestamps = Array.from(this.scalogram.keys())
      .sort((a, b) => b - a)
      .slice(0, timePoints);
    
    const scalogramData = {};
    for (const timestamp of recentTimestamps) {
      scalogramData[timestamp] = this.scalogram.get(timestamp);
    }
    
    return scalogramData;
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      ...this.stats,
      accuracy: this.getAccuracy(),
      dataPoints: this.ofiTimeSeries.length,
      energyPoints: this.energyScores.length,
      scalogramSize: this.scalogram.size,
      lastUpdate: new Date().toISOString()
    };
  }
}

export default WaveletAnalyzer;
