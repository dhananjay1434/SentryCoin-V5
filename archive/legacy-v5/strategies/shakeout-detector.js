/**
 * SHAKEOUT_DETECTOR - v4.1 Stop Hunt Phase Detector
 * 
 * Sends informational alerts when strong negative momentum occurs
 * without corresponding sell pressure in the order book. This pattern
 * indicates artificial price suppression designed to trigger stop-losses
 * and accumulate tokens from panic sellers.
 * 
 * Strategy: ALERT_ONLY - No trading, potential LONG setup intelligence
 * Expected: Counter-trend reversal opportunities identification
 */

import { EventEmitter } from 'events';
import { getISTTime, generateSignalId, formatPrice, formatPriceWithSymbol } from '../utils/index.js';
import cloudStorage from '../services/cloud-storage.js';
import FlashCrashAlerter from '../services/alerter.js';

class ShakeoutDetector extends EventEmitter {
  constructor(symbol) {
    super();
    
    this.symbol = symbol;
    this.alerter = new FlashCrashAlerter();
    
    // Alert configuration
    this.enabled = process.env.SHAKEOUT_DETECTOR_ENABLED === 'true';
    this.cooldownMinutes = parseInt(process.env.SHAKEOUT_COOLDOWN_MINUTES || '15'); // 15-minute cooldown
    
    // Alert tracking
    this.lastAlertTime = 0;
    this.alertHistory = [];
    
    // Performance metrics
    this.stats = {
      signalsReceived: 0,
      alertsSent: 0,
      alertsBlocked: 0,
      startTime: Date.now()
    };
    
    console.log(`💡 SHAKEOUT_DETECTOR v4.1 initialized for ${symbol}`);
    console.log(`📊 Mode: ALERT_ONLY (No Trading)`);
    console.log(`⏰ Cooldown: ${this.cooldownMinutes} minutes`);
  }

  /**
   * Handle incoming SHAKEOUT_DETECTOR signals
   */
  async handleShakeoutSignal(signal) {
    this.stats.signalsReceived++;
    
    const istTime = getISTTime();
    console.log(`💡 SHAKEOUT_DETECTOR SIGNAL RECEIVED [${istTime}]`);
    console.log(`   📊 ${signal.symbol}: ${formatPriceWithSymbol(signal.currentPrice)}`);
    console.log(`   📈 Momentum: ${signal.momentum.toFixed(3)}% (Strong Negative)`);
    console.log(`   ⚡ Ratio: ${signal.askToBidRatio.toFixed(2)}x | Liquidity: ${signal.totalBidVolume.toFixed(0)}`);
    console.log(`   🎯 Regime: ${signal.regime} | Expected: ${signal.classification.expectedOutcome}`);
    
    if (!this.enabled) {
      console.log(`⏸️ SHAKEOUT_DETECTOR disabled - signal logged only`);
      await this.logSignal(signal);
      return;
    }

    // Check cooldown period
    const now = Date.now();
    const timeSinceLastAlert = now - this.lastAlertTime;
    const cooldownMs = this.cooldownMinutes * 60 * 1000;

    if (timeSinceLastAlert < cooldownMs) {
      this.stats.alertsBlocked++;
      const remainingCooldown = Math.ceil((cooldownMs - timeSinceLastAlert) / 60000);
      console.log(`⏰ SHAKEOUT alert blocked - cooldown active (${remainingCooldown} minutes remaining)`);
      await this.logSignal(signal);
      return;
    }

    // Send the alert
    await this.sendShakeoutAlert(signal);
    
    // Update tracking
    this.lastAlertTime = now;
    this.alertHistory.push({
      timestamp: signal.timestamp,
      price: signal.currentPrice,
      liquidity: signal.totalBidVolume,
      momentum: signal.momentum,
      pressure: signal.askToBidRatio
    });

    // Keep only last 10 alerts
    if (this.alertHistory.length > 10) {
      this.alertHistory.shift();
    }
  }

  /**
   * Send SHAKEOUT_DETECTOR alert to Telegram
   */
  async sendShakeoutAlert(signal) {
    const alertData = {
      ...signal,
      alertType: 'SHAKEOUT_DETECTOR',
      premiumSignal: false,
      tradingAction: 'ALERT_ONLY',
      confidence: signal.confidence,
      regime: signal.regime,
      message: this.generateShakeoutMessage(signal)
    };

    try {
      await this.alerter.triggerFlashCrashAlert(alertData);
      this.stats.alertsSent++;
      console.log(`📱 SHAKEOUT_DETECTOR alert sent successfully`);
    } catch (error) {
      console.error(`❌ Failed to send SHAKEOUT alert: ${error.message}`);
    }
  }

  /**
   * Generate human-readable SHAKEOUT alert message
   */
  generateShakeoutMessage(signal) {
    const liquidityK = (signal.totalBidVolume / 1000).toFixed(1);
    const priceFormatted = formatPriceWithSymbol(signal.currentPrice);
    
    return `💡 COUNTER-TREND ALERT: SHAKEOUT DETECTED

🎯 Symbol: ${signal.symbol}
💰 Price: ${priceFormatted}
📊 Liquidity: ${liquidityK}k USDT
⚡ Pressure: ${signal.askToBidRatio.toFixed(2)}x (LOW)
📈 Momentum: ${signal.momentum.toFixed(3)}% (STRONG NEGATIVE)

🧠 Analysis: Strong negative momentum detected with NO corresponding sell pressure in the order book. This suggests artificial price suppression designed to trigger retail stop-losses.

💡 A reversal (LONG) opportunity may be forming as weak hands are shaken out.

⚠️ This is NOT trading advice - monitor for potential reversal signals.

#ShakeoutDetected #CounterTrend #${signal.symbol}`;
  }

  /**
   * Log SHAKEOUT signal for analysis
   */
  async logSignal(signal) {
    try {
      const key = `shakeout_detector_signal_${Date.now()}`;
      await cloudStorage.save(key, signal);
    } catch (error) {
      console.warn(`⚠️ Failed to log SHAKEOUT signal: ${error.message}`);
    }
  }

  /**
   * Get SHAKEOUT_DETECTOR performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const alertRate = this.stats.signalsReceived > 0 ? 
      (this.stats.alertsSent / this.stats.signalsReceived * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      alertRate: `${alertRate}%`,
      lastAlertTime: this.lastAlertTime,
      cooldownActive: (Date.now() - this.lastAlertTime) < (this.cooldownMinutes * 60 * 1000),
      recentAlerts: this.alertHistory.length
    };
  }

  /**
   * Reset cooldown (for testing or manual override)
   */
  resetCooldown() {
    this.lastAlertTime = 0;
    console.log(`💡 SHAKEOUT_DETECTOR cooldown reset for ${this.symbol}`);
  }

  /**
   * Get recent shakeout patterns for analysis
   */
  getRecentPatterns() {
    return this.alertHistory.map(alert => ({
      timestamp: alert.timestamp,
      price: formatPriceWithSymbol(alert.price),
      momentum: `${alert.momentum.toFixed(3)}%`,
      pressure: `${alert.pressure.toFixed(2)}x`,
      liquidity: `${(alert.liquidity / 1000).toFixed(1)}k`
    }));
  }
}

export default ShakeoutDetector;
