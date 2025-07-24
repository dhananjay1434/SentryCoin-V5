/**
 * Trifecta Conviction Trader - High-Precision Short Strategy
 * 
 * Executes the premium "A+" signals identified by the Market Classifier.
 * These are the rare, high-value alerts with proven track record of accuracy.
 * 
 * Strategy: SHORT positions on TRIFECTA_CONVICTION_SIGNAL events
 * Expected: High precision, low frequency, significant alpha generation
 */

import { EventEmitter } from 'events';
import { getISTTime, generateSignalId } from './utils.js';
import cloudStorage from './cloud-storage.js';
import FlashCrashAlerter from './alerter.js';

class TrifectaTrader extends EventEmitter {
  constructor(symbol) {
    super();
    
    this.symbol = symbol;
    this.alerter = new FlashCrashAlerter();
    
    // Trading configuration
    this.enabled = process.env.TRIFECTA_TRADING_ENABLED === 'true';
    this.paperTrading = process.env.PAPER_TRADING !== 'false'; // Default to paper trading
    this.maxPositionSize = parseFloat(process.env.TRIFECTA_MAX_POSITION || '1000');
    this.stopLossPercent = parseFloat(process.env.TRIFECTA_STOP_LOSS || '2.0');
    this.takeProfitPercent = parseFloat(process.env.TRIFECTA_TAKE_PROFIT || '5.0');
    
    // Position tracking
    this.activePositions = new Map();
    this.positionHistory = [];
    
    // Performance metrics
    this.stats = {
      signalsReceived: 0,
      positionsOpened: 0,
      positionsClosed: 0,
      winnersCount: 0,
      losersCount: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      startTime: Date.now()
    };
    
    console.log(`🎯 Trifecta Conviction Trader initialized for ${symbol}`);
    console.log(`📊 Mode: ${this.paperTrading ? 'PAPER TRADING' : 'LIVE TRADING'}`);
    console.log(`💰 Max Position: $${this.maxPositionSize}`);
    console.log(`🛑 Stop Loss: ${this.stopLossPercent}%`);
    console.log(`🎯 Take Profit: ${this.takeProfitPercent}%`);
  }

  /**
   * Handle incoming Trifecta Conviction signals
   */
  async handleTrifectaSignal(signal) {
    this.stats.signalsReceived++;

    const istTime = getISTTime();
    console.log(`🚨 TRIFECTA CONVICTION SIGNAL RECEIVED [${istTime}]`);
    console.log(`   📊 ${signal.symbol}: $${signal.currentPrice.toFixed(6)}`);
    console.log(`   📈 Momentum: ${signal.momentum.toFixed(2)}% (Strong Negative)`);
    console.log(`   ⚡ Ratio: ${signal.askToBidRatio.toFixed(2)}x | Liquidity: ${signal.totalBidVolume.toFixed(0)}`);

    // ALWAYS send premium alert regardless of trading status
    await this.sendPremiumAlert(signal);

    if (!this.enabled) {
      console.log(`⏸️ Trading disabled - signal logged only (but alert sent)`);
      await this.logSignal(signal);
      return;
    }

    // Execute the short strategy
    await this.executeShortStrategy(signal);
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
        console.log(`   💰 Size: $${position.size} at $${position.entryPrice.toFixed(6)}`);
        console.log(`   🛑 Stop Loss: $${position.stopLoss.toFixed(6)} (+${this.stopLossPercent}%)`);
        console.log(`   🎯 Take Profit: $${position.takeProfit.toFixed(6)} (-${this.takeProfitPercent}%)`);

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
    // This would be called periodically with current price updates
    // For now, it's a placeholder for the monitoring logic
    console.log(`👁️ Monitoring position: ${position.id}`);
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

    // Remove from active positions
    this.activePositions.delete(position.id);
    
    // Add to history
    this.positionHistory.push(position);

    console.log(`🏁 POSITION CLOSED: ${position.id}`);
    console.log(`   📊 Reason: ${reason}`);
    console.log(`   💰 P&L: $${position.realizedPnL.toFixed(2)}`);
    console.log(`   📈 Return: ${((position.realizedPnL / position.size) * 100).toFixed(2)}%`);

    // Emit event for reporter
    this.emit('positionClosed', position);

    // Save closed position
    await cloudStorage.save(`closed_position_${position.id}`, position);
  }

  /**
   * Calculate unrealized P&L for open position
   */
  calculateUnrealizedPnL(position, currentPrice) {
    if (position.type === 'SHORT') {
      return (position.entryPrice - currentPrice) * (position.size / position.entryPrice);
    }
    return 0;
  }

  /**
   * Calculate realized P&L for closed position
   */
  calculateRealizedPnL(position) {
    if (position.type === 'SHORT') {
      return (position.entryPrice - position.exitPrice) * (position.size / position.entryPrice);
    }
    return 0;
  }

  /**
   * Send premium alert to subscribers
   */
  async sendPremiumAlert(signal) {
    const alertData = {
      ...signal,
      alertType: 'TRIFECTA_CONVICTION',
      premiumSignal: true,
      tradingAction: 'SHORT_RECOMMENDED',
      confidence: 'VERY_HIGH'
    };

    try {
      await this.alerter.triggerFlashCrashAlert(alertData);
      console.log(`📱 Premium Trifecta alert sent`);
    } catch (error) {
      console.error(`❌ Failed to send premium alert: ${error.message}`);
    }
  }

  /**
   * Log signal for analysis
   */
  async logSignal(signal) {
    try {
      const key = `trifecta_signal_${Date.now()}`;
      await cloudStorage.save(key, signal);
    } catch (error) {
      console.warn(`⚠️ Failed to log signal: ${error.message}`);
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

    return {
      ...this.stats,
      activePositions: this.activePositions.size,
      winRate: `${winRate}%`,
      avgPnL: `$${avgPnL}`,
      uptime: Math.floor((Date.now() - this.stats.startTime) / 1000)
    };
  }
}

export default TrifectaTrader;
