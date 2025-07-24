/**
 * COIL_WATCHER - v4.1 Accumulation/Manipulation Phase Detector
 * 
 * Sends informational alerts when the market enters a high-liquidity,
 * low-volatility state that typically precedes significant breakouts.
 * This is the "Coil" phase where promoters accumulate tokens cheaply
 * before the next pump cycle.
 * 
 * Strategy: ALERT_ONLY - No trading, pure market intelligence
 * Expected: Early warning system for volatility breakouts
 */

import { EventEmitter } from 'events';
import { getISTTime, generateSignalId, formatPrice, formatPriceWithSymbol } from '../utils/index.js';
import cloudStorage from '../services/cloud-storage.js';
import FlashCrashAlerter from '../services/alerter.js';

class CoilWatcher extends EventEmitter {
  constructor(symbol) {
    super();
    
    this.symbol = symbol;
    this.alerter = new FlashCrashAlerter();
    
    // Alert configuration
    this.enabled = process.env.COIL_WATCHER_ENABLED === 'true';
    this.cooldownMinutes = parseInt(process.env.COIL_COOLDOWN_MINUTES || '10'); // 10-minute cooldown
    
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
    
    console.log(`⚠️ COIL_WATCHER v4.1 initialized for ${symbol}`);
    console.log(`📊 Mode: ALERT_ONLY (No Trading)`);
    console.log(`⏰ Cooldown: ${this.cooldownMinutes} minutes`);
  }

  /**
   * Handle incoming COIL_WATCHER signals
   */
  async handleCoilSignal(signal) {
    this.stats.signalsReceived++;
    
    const istTime = getISTTime();
    console.log(`⚠️ COIL_WATCHER SIGNAL RECEIVED [${istTime}]`);
    console.log(`   📊 ${signal.symbol}: ${formatPriceWithSymbol(signal.currentPrice)}`);
    console.log(`   📈 Momentum: ${signal.momentum.toFixed(3)}% (Neutral)`);
    console.log(`   ⚡ Ratio: ${signal.askToBidRatio.toFixed(2)}x | Liquidity: ${signal.totalBidVolume.toFixed(0)}`);
    console.log(`   🎯 Regime: ${signal.regime} | Expected: ${signal.classification.expectedOutcome}`);
    
    if (!this.enabled) {
      console.log(`⏸️ COIL_WATCHER disabled - signal logged only`);
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
      console.log(`⏰ COIL alert blocked - cooldown active (${remainingCooldown} minutes remaining)`);
      await this.logSignal(signal);
      return;
    }

    // Send the alert
    await this.sendCoilAlert(signal);
    
    // Update tracking
    this.lastAlertTime = now;
    this.alertHistory.push({
      timestamp: signal.timestamp,
      price: signal.currentPrice,
      liquidity: signal.totalBidVolume,
      momentum: signal.momentum
    });

    // Keep only last 10 alerts
    if (this.alertHistory.length > 10) {
      this.alertHistory.shift();
    }
  }

  /**
   * Send COIL_WATCHER alert to Telegram
   */
  async sendCoilAlert(signal) {
    const alertData = {
      ...signal,
      alertType: 'COIL_WATCHER',
      premiumSignal: false,
      tradingAction: 'ALERT_ONLY',
      confidence: signal.confidence,
      regime: signal.regime,
      message: this.generateCoilMessage(signal)
    };

    try {
      await this.alerter.triggerFlashCrashAlert(alertData);
      this.stats.alertsSent++;
      console.log(`📱 COIL_WATCHER alert sent successfully`);
    } catch (error) {
      console.error(`❌ Failed to send COIL alert: ${error.message}`);
    }
  }

  /**
   * Generate human-readable COIL alert message
   */
  generateCoilMessage(signal) {
    const liquidityK = (signal.totalBidVolume / 1000).toFixed(1);
    const priceFormatted = formatPriceWithSymbol(signal.currentPrice);
    
    return `⚠️ VOLATILITY WARNING: LIQUIDITY COIL DETECTED

🎯 Symbol: ${signal.symbol}
💰 Price: ${priceFormatted}
📊 Liquidity: ${liquidityK}k USDT
⚡ Pressure: ${signal.askToBidRatio.toFixed(2)}x
📈 Momentum: ${signal.momentum.toFixed(3)}%

🧠 Analysis: Market is in a high-liquidity, low-volatility state. This "coil" pattern typically precedes significant breakouts as promoters accumulate tokens before the next move.

⚠️ Prepare for a significant breakout or breakdown.

#CoilDetected #VolatilityWarning #${signal.symbol}`;
  }

  /**
   * Log COIL signal for analysis
   */
  async logSignal(signal) {
    try {
      const key = `coil_watcher_signal_${Date.now()}`;
      await cloudStorage.save(key, signal);
    } catch (error) {
      console.warn(`⚠️ Failed to log COIL signal: ${error.message}`);
    }
  }

  /**
   * Get COIL_WATCHER performance statistics
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
    console.log(`⚠️ COIL_WATCHER cooldown reset for ${this.symbol}`);
  }
}

export default CoilWatcher;
