/**
 * CASCADE_HUNTER Trader - v4.1 Distribution Phase Detection
 *
 * Executes live SHORT trades on validated CASCADE_HUNTER signals from the
 * Market Regime Detection Engine. These signals identify the Distribution Phase
 * of pump-and-dump cycles with high precision.
 *
 * Strategy: SHORT positions on CASCADE_HUNTER_SIGNAL events
 * Expected: High precision, low frequency, significant alpha generation
 */

import { EventEmitter } from 'events';
import { getISTTime, generateSignalId, formatPrice, formatPriceWithSymbol } from '../utils/index.js';
import cloudStorage from '../services/cloud-storage.js';
import FlashCrashAlerter from '../services/alerter.js';

class CascadeHunterTrader extends EventEmitter {
  constructor(symbol) {
    super();

    this.symbol = symbol;
    this.alerter = new FlashCrashAlerter();

    // v4.1 CASCADE_HUNTER Trading configuration
    this.enabled = process.env.CASCADE_TRADING_ENABLED === 'true';
    this.paperTrading = process.env.PAPER_TRADING !== 'false'; // Default to paper trading
    this.maxPositionSize = parseFloat(process.env.CASCADE_MAX_POSITION || '1000');
    this.stopLossPercent = parseFloat(process.env.CASCADE_STOP_LOSS || '2.0');
    this.takeProfitPercent = parseFloat(process.env.CASCADE_TAKE_PROFIT || '5.0');
    
    // Position tracking
    this.activePositions = new Map();
    this.positionHistory = [];
    
    // Performance metrics - load from persistent storage or initialize
    this.statsFile = `./data/cascade-hunter-stats-${symbol}.json`;
    this.stats = this.loadPersistedStats() || {
      signalsReceived: 0,
      positionsOpened: 0,
      positionsClosed: 0,
      winnersCount: 0,
      losersCount: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      startTime: Date.now(),
      sessionStartTime: Date.now() // Track current session separately
    };

    // Position monitoring timer
    this.positionMonitorTimer = null;
    this.startPositionMonitoring();

    console.log(`🎯 CASCADE_HUNTER Trader v4.1 initialized for ${symbol}`);
    console.log(`📊 Mode: ${this.paperTrading ? 'PAPER TRADING' : 'LIVE TRADING'}`);
    console.log(`💰 Max Position: $${this.maxPositionSize}`);
    console.log(`🛑 Stop Loss: ${this.stopLossPercent}%`);
    console.log(`🎯 Take Profit: ${this.takeProfitPercent}%`);
  }

  /**
   * Handle incoming CASCADE_HUNTER signals (v4.1)
   */
  async handleCascadeSignal(signal) {
    this.stats.signalsReceived++;

    const istTime = getISTTime();
    console.log(`🚨 CASCADE_HUNTER SIGNAL RECEIVED [${istTime}]`);
    console.log(`   📊 ${signal.symbol}: ${formatPriceWithSymbol(signal.currentPrice)}`);
    console.log(`   📈 Momentum: ${signal.momentum.toFixed(3)}% (Strong Negative)`);
    console.log(`   ⚡ Ratio: ${signal.askToBidRatio.toFixed(2)}x | Liquidity: ${signal.totalBidVolume.toFixed(0)}`);
    console.log(`   🎯 Regime: ${signal.regime} | Confidence: ${signal.confidence}`);

    if (!this.enabled) {
      console.log(`⏸️ Trading disabled - signal logged only`);
      await this.logSignal(signal);
      return;
    }

    // Execute the short strategy for Distribution Phase
    await this.executeShortStrategy(signal);

    // Send premium alert to subscribers
    await this.sendPremiumAlert(signal);
  }

  /**
   * Legacy method for backward compatibility
   */
  async handleTrifectaSignal(signal) {
    // Redirect to new CASCADE_HUNTER handler
    await this.handleCascadeSignal(signal);
  }

  /**
   * Execute the high-precision short strategy
   */
  async executeShortStrategy(signal) {
    try {
      const position = await this.openShortPosition(signal);
      
      if (position) {
        this.activePositions.set(position.id, position);
        this.stats.positionsOpened++;

        console.log(`📉 SHORT POSITION OPENED: ${position.id}`);
        console.log(`   💰 Size: $${position.size} at ${formatPriceWithSymbol(position.entryPrice)}`);
        console.log(`   🛑 Stop Loss: ${formatPriceWithSymbol(position.stopLoss)} (+${this.stopLossPercent}%)`);
        console.log(`   🎯 Take Profit: ${formatPriceWithSymbol(position.takeProfit)} (-${this.takeProfitPercent}%)`);

        // Emit event for reporter
        this.emit('positionOpened', position);

        // Start monitoring this position
        this.monitorPosition(position);

        // Save position to cloud storage
        await cloudStorage.save(`position_${position.id}`, position);
      }
    } catch (error) {
      console.error(`❌ Failed to execute short strategy: ${error.message}`);
    }
  }

  /**
   * Open a short position (paper trading implementation)
   */
  async openShortPosition(signal) {
    const positionId = generateSignalId();
    const entryPrice = signal.currentPrice;
    const size = this.calculatePositionSize(signal);
    
    // Calculate stop loss and take profit levels
    const stopLoss = entryPrice * (1 + this.stopLossPercent / 100);
    const takeProfit = entryPrice * (1 - this.takeProfitPercent / 100);
    
    const position = {
      id: positionId,
      symbol: signal.symbol,
      type: 'SHORT',
      strategy: 'TRIFECTA_CONVICTION',
      entryPrice: entryPrice,
      size: size,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      openTime: new Date().toISOString(),
      signal: signal,
      status: 'OPEN',
      paperTrading: this.paperTrading
    };

    if (this.paperTrading) {
      console.log(`📝 PAPER TRADE: Short position simulated`);
      return position;
    } else {
      // TODO: Implement actual trading API calls
      console.log(`🔴 LIVE TRADING: Would execute real short order`);
      return position;
    }
  }

  /**
   * Calculate position size based on risk management
   */
  calculatePositionSize(signal) {
    // Simple fixed size for now - can be enhanced with volatility-based sizing
    return Math.min(this.maxPositionSize, this.maxPositionSize * signal.confidence === 'HIGH' ? 1.0 : 0.5);
  }

  /**
   * Monitor an active position for stop loss/take profit
   */
  monitorPosition(position) {
    console.log(`👁️ Monitoring position: ${position.id}`);
  }

  /**
   * Start periodic position monitoring (backup system)
   */
  startPositionMonitoring() {
    if (this.positionMonitorTimer) return;

    this.positionMonitorTimer = setInterval(() => {
      if (this.activePositions.size > 0) {
        console.log(`🔍 Position monitor check: ${this.activePositions.size} active positions`);

        // Log active positions for debugging
        for (const [id, position] of this.activePositions) {
          if (position.status === 'OPEN') {
            const currentPrice = position.currentPrice || position.entryPrice;
            const unrealizedPnL = this.calculateUnrealizedPnL(position, currentPrice);
            console.log(`   📊 ${id}: Entry=${position.entryPrice.toFixed(6)}, Current=${currentPrice.toFixed(6)}, P&L=${unrealizedPnL.toFixed(2)}%`);
            console.log(`   🎯 Targets: SL=${position.stopLoss.toFixed(6)}, TP=${position.takeProfit.toFixed(6)}`);
          }
        }
      }
    }, 30000); // Check every 30 seconds

    console.log(`⏰ Position monitoring timer started (30s intervals)`);
  }

  /**
   * Stop position monitoring
   */
  stopPositionMonitoring() {
    if (this.positionMonitorTimer) {
      clearInterval(this.positionMonitorTimer);
      this.positionMonitorTimer = null;
      console.log(`⏰ Position monitoring timer stopped`);
    }
  }

  /**
   * Update position with current price (called by price feed)
   */
  async updatePosition(positionId, currentPrice) {
    const position = this.activePositions.get(positionId);
    if (!position || position.status !== 'OPEN') return;

    const unrealizedPnL = this.calculateUnrealizedPnL(position, currentPrice);
    position.currentPrice = currentPrice;
    position.unrealizedPnL = unrealizedPnL;

    // Check for stop loss or take profit
    if (currentPrice >= position.stopLoss) {
      await this.closePosition(position, 'STOP_LOSS', currentPrice);
    } else if (currentPrice <= position.takeProfit) {
      await this.closePosition(position, 'TAKE_PROFIT', currentPrice);
    }
  }

  /**
   * Close a position
   */
  async closePosition(position, reason, exitPrice) {
    position.status = 'CLOSED';
    position.closeTime = new Date().toISOString();
    position.exitPrice = exitPrice;
    position.closeReason = reason;
    position.realizedPnL = this.calculateRealizedPnL(position);

    // Update statistics
    this.stats.positionsClosed++;
    this.stats.totalPnL += position.realizedPnL;

    if (position.realizedPnL > 0) {
      this.stats.winnersCount++;
    } else {
      this.stats.losersCount++;
    }

    // Save updated statistics to persistent storage
    this.savePersistedStats();

    // Remove from active positions
    this.activePositions.delete(position.id);

    // Add to history
    this.positionHistory.push(position);

    console.log(`🏁 POSITION CLOSED: ${position.id}`);
    console.log(`   📊 Reason: ${reason}`);
    console.log(`   💰 P&L: ${position.realizedPnL.toFixed(2)}%`);
    console.log(`   📈 Entry: ${formatPriceWithSymbol(position.entryPrice)} | Exit: ${formatPriceWithSymbol(exitPrice)}`);

    // Emit event for reporter
    this.emit('positionClosed', position);

    // Save closed position
    await cloudStorage.save(`closed_position_${position.id}`, position);
  }

  /**
   * Calculate unrealized P&L for open position (percentage-based)
   */
  calculateUnrealizedPnL(position, currentPrice) {
    if (!position || !currentPrice) return 0;

    const { entryPrice, type } = position;

    if (type === 'SHORT') {
      // For SHORT: profit when price goes down, loss when price goes up
      return ((entryPrice - currentPrice) / entryPrice) * 100;
    } else if (type === 'LONG') {
      // For LONG: profit when price goes up, loss when price goes down
      return ((currentPrice - entryPrice) / entryPrice) * 100;
    }

    return 0;
  }

  /**
   * Calculate realized P&L for closed position (percentage-based)
   */
  calculateRealizedPnL(position) {
    if (!position || !position.exitPrice) return 0;

    const { entryPrice, exitPrice, type } = position;

    if (type === 'SHORT') {
      // For SHORT: profit when exit price is lower than entry price
      return ((entryPrice - exitPrice) / entryPrice) * 100;
    } else if (type === 'LONG') {
      // For LONG: profit when exit price is higher than entry price
      return ((exitPrice - entryPrice) / entryPrice) * 100;
    }

    return 0;
  }

  /**
   * Send premium CASCADE_HUNTER alert to subscribers
   */
  async sendPremiumAlert(signal) {
    const alertData = {
      ...signal,
      alertType: 'CASCADE_HUNTER',
      premiumSignal: true,
      tradingAction: 'SHORT_EXECUTED',
      confidence: 'VERY_HIGH',
      regime: signal.regime || 'DISTRIBUTION_PHASE'
    };

    try {
      await this.alerter.triggerFlashCrashAlert(alertData);
      console.log(`📱 Premium CASCADE_HUNTER alert sent`);
    } catch (error) {
      console.error(`❌ Failed to send premium alert: ${error.message}`);
    }
  }

  /**
   * Log CASCADE_HUNTER signal for analysis
   */
  async logSignal(signal) {
    try {
      const key = `cascade_hunter_signal_${Date.now()}`;
      await cloudStorage.save(key, signal);
    } catch (error) {
      console.warn(`⚠️ Failed to log signal: ${error.message}`);
    }
  }

  /**
   * Update all active positions with current price
   */
  updatePositions(currentPrice) {
    if (!currentPrice || this.activePositions.size === 0) {
      return;
    }

    for (const [positionId, position] of this.activePositions) {
      if (position.status === 'OPEN') {
        position.currentPrice = currentPrice;
        position.unrealizedPnL = this.calculateUnrealizedPnL(position, currentPrice);

        // Check for stop-loss or take-profit
        this.checkExitConditions(position, currentPrice);
      }
    }
  }

  /**
   * Check exit conditions for a position (stop-loss, take-profit)
   */
  async checkExitConditions(position, currentPrice) {
    try {
      const { entryPrice, type, stopLoss, takeProfit, id } = position;
      let exitReason = null;

      // Detailed logging for debugging
      const unrealizedPnL = this.calculateUnrealizedPnL(position, currentPrice);

      // For SHORT positions (CASCADE_HUNTER strategy)
      if (type === 'SHORT') {
        // Stop loss: price goes up beyond stop loss
        if (currentPrice >= stopLoss) {
          exitReason = 'STOP_LOSS';
          console.log(`🛑 STOP LOSS TRIGGERED for ${id}: Price ${currentPrice.toFixed(6)} >= SL ${stopLoss.toFixed(6)}`);
        }
        // Take profit: price goes down to take profit level
        else if (currentPrice <= takeProfit) {
          exitReason = 'TAKE_PROFIT';
          console.log(`🎯 TAKE PROFIT TRIGGERED for ${id}: Price ${currentPrice.toFixed(6)} <= TP ${takeProfit.toFixed(6)}`);
        }
        else {
          // Log current status for debugging
          console.log(`📊 Position ${id} monitoring: Price=${currentPrice.toFixed(6)}, P&L=${unrealizedPnL.toFixed(2)}%, SL=${stopLoss.toFixed(6)}, TP=${takeProfit.toFixed(6)}`);
        }
      }
      // For LONG positions (if any)
      else if (type === 'LONG') {
        // Stop loss: price goes down beyond stop loss
        if (currentPrice <= stopLoss) {
          exitReason = 'STOP_LOSS';
          console.log(`🛑 STOP LOSS TRIGGERED for ${id}: Price ${currentPrice.toFixed(6)} <= SL ${stopLoss.toFixed(6)}`);
        }
        // Take profit: price goes up to take profit level
        else if (currentPrice >= takeProfit) {
          exitReason = 'TAKE_PROFIT';
          console.log(`🎯 TAKE PROFIT TRIGGERED for ${id}: Price ${currentPrice.toFixed(6)} >= TP ${takeProfit.toFixed(6)}`);
        }
      }

      if (exitReason) {
        await this.closePosition(position, exitReason, currentPrice);
        console.log(`🎯 CASCADE_HUNTER position closed: ${exitReason} at ${formatPriceWithSymbol(currentPrice)}`);
      }
    } catch (error) {
      console.error(`❌ Error checking exit conditions for position ${position.id}:`, error.message);
    }
  }

  /**
   * Load persisted statistics from file
   */
  loadPersistedStats() {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.statsFile)) {
        const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
        data.sessionStartTime = Date.now(); // Reset session start time
        console.log(`📊 Loaded persisted CASCADE_HUNTER stats: ${data.positionsClosed} trades, ${data.totalPnL.toFixed(2)}% total P&L`);
        return data;
      }
    } catch (error) {
      console.warn(`⚠️ Could not load persisted stats: ${error.message}`);
    }
    return null;
  }

  /**
   * Save statistics to persistent storage
   */
  savePersistedStats() {
    try {
      const fs = require('fs');
      const path = require('path');

      // Ensure data directory exists
      const dataDir = path.dirname(this.statsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.warn(`⚠️ Could not save persisted stats: ${error.message}`);
    }
  }

  /**
   * Get trading performance statistics
   */
  getStats() {
    const winRate = this.stats.positionsClosed > 0 ?
      (this.stats.winnersCount / this.stats.positionsClosed * 100).toFixed(2) : 0;

    const avgPnL = this.stats.positionsClosed > 0 ?
      (this.stats.totalPnL / this.stats.positionsClosed).toFixed(2) : 0;

    const sessionUptime = Math.floor((Date.now() - this.stats.sessionStartTime) / 1000);
    const totalUptime = Math.floor((Date.now() - this.stats.startTime) / 1000);

    return {
      ...this.stats,
      activePositions: this.activePositions.size,
      winRate: `${winRate}%`,
      avgPnL: `${avgPnL}%`,
      totalPnL: `${this.stats.totalPnL.toFixed(2)}%`,
      sessionUptime: sessionUptime,
      totalUptime: totalUptime,
      uptime: sessionUptime // For backward compatibility
    };
  }
}

export default CascadeHunterTrader;
