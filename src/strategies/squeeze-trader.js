/**
 * Absorption Squeeze Trader - Contrarian Long Strategy
 * 
 * Executes the proprietary "hidden alpha" strategy identified by the Market Classifier.
 * This is our internal edge - more frequent signals with different risk profile.
 * 
 * Strategy: LONG positions on ABSORPTION_SQUEEZE_SIGNAL events
 * Expected: Medium precision, higher frequency, consistent alpha generation
 */

import { EventEmitter } from 'events';
import { getISTTime, generateSignalId } from '../utils/index.js';
import cloudStorage from '../services/cloud-storage.js';

class SqueezeTrader extends EventEmitter {
  constructor(symbol) {
    super();
    
    this.symbol = symbol;
    
    // Trading configuration
    this.enabled = process.env.SQUEEZE_TRADING_ENABLED === 'true';
    this.paperTrading = process.env.PAPER_TRADING !== 'false'; // Default to paper trading
    this.maxPositionSize = parseFloat(process.env.SQUEEZE_MAX_POSITION || '500');
    this.stopLossPercent = parseFloat(process.env.SQUEEZE_STOP_LOSS || '1.5');
    this.takeProfitPercent = parseFloat(process.env.SQUEEZE_TAKE_PROFIT || '3.0');
    this.timeBasedExit = parseInt(process.env.SQUEEZE_TIME_EXIT || '300'); // 5 minutes
    
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
      avgHoldTime: 0,
      startTime: Date.now()
    };
    
    console.log(`🔄 Absorption Squeeze Trader initialized for ${symbol}`);
    console.log(`📊 Mode: ${this.paperTrading ? 'PAPER TRADING' : 'LIVE TRADING'}`);
    console.log(`💰 Max Position: $${this.maxPositionSize}`);
    console.log(`🛑 Stop Loss: ${this.stopLossPercent}%`);
    console.log(`🎯 Take Profit: ${this.takeProfitPercent}%`);
    console.log(`⏰ Time Exit: ${this.timeBasedExit}s`);
  }

  /**
   * Handle incoming Absorption Squeeze signals
   */
  async handleSqueezeSignal(signal) {
    this.stats.signalsReceived++;
    
    const istTime = getISTTime();
    console.log(`🔄 ABSORPTION SQUEEZE SIGNAL RECEIVED [${istTime}]`);
    console.log(`   📊 ${signal.symbol}: $${signal.currentPrice.toFixed(6)}`);
    console.log(`   📈 Momentum: ${signal.momentum.toFixed(2)}% (${signal.classification.momentum})`);
    console.log(`   ⚡ Ratio: ${signal.askToBidRatio.toFixed(2)}x | Liquidity: ${signal.totalBidVolume.toFixed(0)}`);
    console.log(`   🎯 Expected: ${signal.classification.expectedOutcome}`);
    
    if (!this.enabled) {
      console.log(`⏸️ Trading disabled - signal logged only`);
      await this.logSignal(signal);
      return;
    }

    // Execute the long strategy
    await this.executeLongStrategy(signal);
  }

  /**
   * Execute the contrarian long strategy
   */
  async executeLongStrategy(signal) {
    try {
      const position = await this.openLongPosition(signal);
      
      if (position) {
        this.activePositions.set(position.id, position);
        this.stats.positionsOpened++;

        console.log(`📈 LONG POSITION OPENED: ${position.id}`);
        console.log(`   💰 Size: $${position.size} at $${position.entryPrice.toFixed(6)}`);
        console.log(`   🛑 Stop Loss: $${position.stopLoss.toFixed(6)} (-${this.stopLossPercent}%)`);
        console.log(`   🎯 Take Profit: $${position.takeProfit.toFixed(6)} (+${this.takeProfitPercent}%)`);
        console.log(`   ⏰ Time Exit: ${this.timeBasedExit}s`);

        // Emit event for reporter
        this.emit('positionOpened', position);

        // Start monitoring this position
        this.monitorPosition(position);

        // Set time-based exit
        this.scheduleTimeBasedExit(position);

        // Save position to cloud storage
        await cloudStorage.save(`squeeze_position_${position.id}`, position);
      }
    } catch (error) {
      console.error(`❌ Failed to execute long strategy: ${error.message}`);
    }
  }

  /**
   * Open a long position (paper trading implementation)
   */
  async openLongPosition(signal) {
    const positionId = generateSignalId();
    const entryPrice = signal.currentPrice;
    const size = this.calculatePositionSize(signal);
    
    // Calculate stop loss and take profit levels
    const stopLoss = entryPrice * (1 - this.stopLossPercent / 100);
    const takeProfit = entryPrice * (1 + this.takeProfitPercent / 100);
    
    const position = {
      id: positionId,
      symbol: signal.symbol,
      type: 'LONG',
      strategy: 'ABSORPTION_SQUEEZE',
      entryPrice: entryPrice,
      size: size,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      timeExit: Date.now() + (this.timeBasedExit * 1000),
      openTime: new Date().toISOString(),
      signal: signal,
      status: 'OPEN',
      paperTrading: this.paperTrading
    };

    if (this.paperTrading) {
      console.log(`📝 PAPER TRADE: Long position simulated`);
      return position;
    } else {
      // TODO: Implement actual trading API calls
      console.log(`🟢 LIVE TRADING: Would execute real long order`);
      return position;
    }
  }

  /**
   * Calculate position size based on signal confidence and momentum
   */
  calculatePositionSize(signal) {
    let baseSize = this.maxPositionSize;
    
    // Adjust size based on confidence
    if (signal.confidence === 'HIGH') {
      baseSize *= 1.0;
    } else if (signal.confidence === 'MEDIUM') {
      baseSize *= 0.7;
    } else {
      baseSize *= 0.5;
    }
    
    // Adjust based on momentum strength
    if (signal.classification.momentum === 'POSITIVE') {
      baseSize *= 1.2; // Stronger signal for positive momentum
    }
    
    return Math.min(baseSize, this.maxPositionSize);
  }

  /**
   * Monitor an active position
   */
  monitorPosition(position) {
    console.log(`👁️ Monitoring squeeze position: ${position.id}`);
  }

  /**
   * Schedule time-based exit for mean reversion strategy
   */
  scheduleTimeBasedExit(position) {
    const timeToExit = position.timeExit - Date.now();
    
    if (timeToExit > 0) {
      setTimeout(async () => {
        if (this.activePositions.has(position.id) && position.status === 'OPEN') {
          const currentPrice = position.currentPrice || position.entryPrice;
          await this.closePosition(position, 'TIME_EXIT', currentPrice);
        }
      }, timeToExit);
    }
  }

  /**
   * Update position with current price
   */
  async updatePosition(positionId, currentPrice) {
    const position = this.activePositions.get(positionId);
    if (!position || position.status !== 'OPEN') return;

    const unrealizedPnL = this.calculateUnrealizedPnL(position, currentPrice);
    position.currentPrice = currentPrice;
    position.unrealizedPnL = unrealizedPnL;

    // Check for stop loss or take profit
    if (currentPrice <= position.stopLoss) {
      await this.closePosition(position, 'STOP_LOSS', currentPrice);
    } else if (currentPrice >= position.takeProfit) {
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
    position.holdTime = new Date(position.closeTime) - new Date(position.openTime);

    // Update statistics
    this.stats.positionsClosed++;
    this.stats.totalPnL += position.realizedPnL;
    this.stats.avgHoldTime = (this.stats.avgHoldTime * (this.stats.positionsClosed - 1) + position.holdTime) / this.stats.positionsClosed;
    
    if (position.realizedPnL > 0) {
      this.stats.winnersCount++;
    } else {
      this.stats.losersCount++;
    }

    // Remove from active positions
    this.activePositions.delete(position.id);
    
    // Add to history
    this.positionHistory.push(position);

    console.log(`🏁 SQUEEZE POSITION CLOSED: ${position.id}`);
    console.log(`   📊 Reason: ${reason}`);
    console.log(`   💰 P&L: $${position.realizedPnL.toFixed(2)}`);
    console.log(`   📈 Return: ${((position.realizedPnL / position.size) * 100).toFixed(2)}%`);
    console.log(`   ⏰ Hold Time: ${Math.floor(position.holdTime / 1000)}s`);

    // Emit event for reporter
    this.emit('positionClosed', position);

    // Save closed position
    await cloudStorage.save(`closed_squeeze_${position.id}`, position);
  }

  /**
   * Calculate unrealized P&L for open position
   */
  calculateUnrealizedPnL(position, currentPrice) {
    if (position.type === 'LONG') {
      return (currentPrice - position.entryPrice) * (position.size / position.entryPrice);
    }
    return 0;
  }

  /**
   * Calculate realized P&L for closed position
   */
  calculateRealizedPnL(position) {
    if (position.type === 'LONG') {
      return (position.exitPrice - position.entryPrice) * (position.size / position.entryPrice);
    }
    return 0;
  }

  /**
   * Log signal for analysis
   */
  async logSignal(signal) {
    try {
      const key = `squeeze_signal_${Date.now()}`;
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

        // Check for stop-loss, take-profit, or time exit
        this.checkExitConditions(position, currentPrice);
      }
    }
  }

  /**
   * Check exit conditions for a position (stop-loss, take-profit, time exit)
   */
  async checkExitConditions(position, currentPrice) {
    try {
      const { entryPrice, type, stopLoss, takeProfit, timestamp } = position;
      let exitReason = null;

      // For LONG positions (Absorption Squeeze strategy)
      if (type === 'LONG') {
        // Stop loss: price goes down beyond stop loss
        if (currentPrice <= stopLoss) {
          exitReason = 'STOP_LOSS';
        }
        // Take profit: price goes up to take profit level
        else if (currentPrice >= takeProfit) {
          exitReason = 'TAKE_PROFIT';
        }
      }
      // For SHORT positions (if any)
      else if (type === 'SHORT') {
        // Stop loss: price goes up beyond stop loss
        if (currentPrice >= stopLoss) {
          exitReason = 'STOP_LOSS';
        }
        // Take profit: price goes down to take profit level
        else if (currentPrice <= takeProfit) {
          exitReason = 'TAKE_PROFIT';
        }
      }

      // Time-based exit (unique to Absorption Squeeze strategy)
      const positionAge = (Date.now() - new Date(timestamp).getTime()) / 1000;
      if (this.timeExitSeconds && positionAge >= this.timeExitSeconds) {
        exitReason = 'TIME_EXIT';
      }

      if (exitReason) {
        await this.closePosition(position, exitReason, currentPrice);
        console.log(`🔄 Squeeze position closed: ${exitReason} at $${currentPrice} (held ${Math.floor(positionAge)}s)`);
      }
    } catch (error) {
      console.error(`❌ Error checking exit conditions for position ${position.id}:`, error.message);
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

    const avgHoldTimeMinutes = this.stats.avgHoldTime > 0 ? 
      (this.stats.avgHoldTime / 60000).toFixed(1) : 0;

    return {
      ...this.stats,
      activePositions: this.activePositions.size,
      winRate: `${winRate}%`,
      avgPnL: `$${avgPnL}`,
      avgHoldTime: `${avgHoldTimeMinutes}min`,
      uptime: Math.floor((Date.now() - this.stats.startTime) / 1000)
    };
  }
}

export default SqueezeTrader;
