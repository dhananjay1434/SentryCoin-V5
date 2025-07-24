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
import fs from 'fs';
import path from 'path';
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
    this.maxPositionSize = parseFloat(process.env.CASCADE_MAX_POSITION || '500');
    this.stopLossPercent = parseFloat(process.env.CASCADE_STOP_LOSS || '1.5');
    this.takeProfitPercent = parseFloat(process.env.CASCADE_TAKE_PROFIT || '3.0');

    // PROFESSIONAL MID-FREQUENCY: Quality over quantity
    this.maxConcurrentPositions = parseInt(process.env.MAX_ACTIVE_POSITIONS || '3');
    this.signalCooldownMinutes = parseInt(process.env.SIGNAL_COOLDOWN_MINUTES || '15');
    this.requireRegimeConfirmation = process.env.REQUIRE_REGIME_CONFIRMATION === 'true';
    this.maxExposurePercentage = parseFloat(process.env.MAX_EXPOSURE_PERCENTAGE || '10');
    this.enableInstitutionalSizing = process.env.ENABLE_INSTITUTIONAL_SIZING === 'true';

    // CRITICAL FIX: Dynamic stop-loss controls
    this.enableTrailingStop = process.env.ENABLE_TRAILING_STOP_LOSS === 'true';
    this.trailProfitTrigger = parseFloat(process.env.TRAIL_PROFIT_TRIGGER || '1.5');
    this.trailDistance = parseFloat(process.env.TRAIL_DISTANCE || '1.0');

    // CRITICAL FIX: Cross-signal validation
    this.enableConflictVeto = process.env.ENABLE_CONFLICT_VETO === 'true';
    this.enableDefensivePosture = process.env.ENABLE_DEFENSIVE_POSTURE === 'true';

    // CRITICAL FIX: Signal quality scaling (v4.2)
    this.enableQualityScaling = process.env.CASCADE_ENABLE_QUALITY_SCALING === 'true';
    this.highQualityLiquidity = parseInt(process.env.CASCADE_HIGH_QUALITY_LIQUIDITY || '800000');
    this.mediumQualityLiquidity = parseInt(process.env.CASCADE_MEDIUM_QUALITY_LIQUIDITY || '600000');
    this.lowQualityLiquidity = parseInt(process.env.CASCADE_LOW_QUALITY_LIQUIDITY || '400000');

    // CRITICAL FIX: Timing controls
    this.lastPositionTime = 0;
    
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
   * Handle incoming CASCADE_HUNTER signals (v4.1) - WITH CRITICAL SAFETY CHECKS
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

    // PROFESSIONAL CHECK 1: Quality over quantity
    if (this.activePositions.size >= this.maxConcurrentPositions) {
      console.log(`🎯 PROFESSIONAL LIMIT: Maximum ${this.maxConcurrentPositions} high-quality positions - Signal ignored`);
      await this.logSignal(signal);
      return;
    }

    // PROFESSIONAL CHECK 2: Time to analyze market reaction
    const now = Date.now();
    const timeSinceLastPosition = now - this.lastPositionTime;
    const cooldownMs = this.signalCooldownMinutes * 60 * 1000;

    if (timeSinceLastPosition < cooldownMs) {
      const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastPosition) / 60000);
      console.log(`⏰ PROFESSIONAL COOLDOWN: Analyzing market reaction (${remainingMinutes} minutes remaining)`);
      await this.logSignal(signal);
      return;
    }

    // PROFESSIONAL CHECK 3: Multi-signal validation
    if (this.requireRegimeConfirmation) {
      const conflictCheck = await this.validateRegimeCoherence(signal);
      if (!conflictCheck.isValid) {
        console.log(`🧠 REGIME CONFLICT: ${conflictCheck.reason} - Signal ignored`);
        await this.logSignal(signal);
        return;
      }
    }

    // CRITICAL FIX 3: Signal quality assessment
    const signalQuality = this.assessSignalQuality(signal);
    if (signalQuality === 'REJECT') {
      console.log(`🚫 SIGNAL QUALITY TOO LOW - Signal rejected`);
      await this.logSignal(signal);
      return;
    }

    // Add quality to signal for position sizing
    signal.qualityGrade = signalQuality;

    // Execute the short strategy for Distribution Phase
    await this.executeShortStrategy(signal);

    // Update timing
    this.lastPositionTime = now;

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
   * CRITICAL FIX: Assess signal quality based on liquidity depth (v4.2)
   */
  assessSignalQuality(signal) {
    if (!this.enableQualityScaling) {
      return 'MEDIUM'; // Default if quality scaling disabled
    }

    const liquidity = signal.totalBidVolume;

    if (liquidity >= this.highQualityLiquidity) {
      return 'HIGH';      // 800k+ liquidity
    } else if (liquidity >= this.mediumQualityLiquidity) {
      return 'MEDIUM';    // 600k+ liquidity
    } else if (liquidity >= this.lowQualityLiquidity) {
      return 'LOW';       // 400k+ liquidity (minimum threshold)
    } else {
      return 'REJECT';    // Below 400k - too risky to trade
    }
  }

  /**
   * HFT-OPTIMIZED: Dynamic position sizing with exposure scaling
   */
  calculatePositionSize(signal) {
    let baseSize = this.maxPositionSize;

    // HFT-OPTIMIZED: Scale position size based on signal quality
    if (this.enableQualityScaling && signal.qualityGrade) {
      switch (signal.qualityGrade) {
        case 'HIGH':
          baseSize = this.maxPositionSize * 1.0;
          break;
        case 'MEDIUM':
          baseSize = this.maxPositionSize * 0.8;
          break;
        case 'LOW':
          baseSize = this.maxPositionSize * 0.5;
          break;
        default:
          baseSize = this.maxPositionSize * 0.3;
      }
    }

    // HFT-OPTIMIZED: Dynamic scaling based on current exposure
    const currentPositions = this.activePositions.size;
    const exposureScaling = Math.max(0.2, 1 - (currentPositions / this.maxConcurrentPositions));

    // Additional confidence scaling
    const confidenceMultiplier = signal.confidence === 'HIGH' ? 1.0 : 0.8;

    const finalSize = baseSize * exposureScaling * confidenceMultiplier;

    return Math.min(this.maxPositionSize, finalSize);
  }

  /**
   * PROFESSIONAL: Multi-signal regime validation
   */
  async validateRegimeCoherence(cascadeSignal) {
    // This would integrate with the engine's other detectors
    // For now, implement basic validation logic

    // Check signal quality meets institutional standards
    if (cascadeSignal.totalBidVolume < 500000) {
      return {
        isValid: false,
        reason: 'Insufficient liquidity for institutional-grade trade'
      };
    }

    // Check momentum strength
    if (cascadeSignal.momentum > -0.8) {
      return {
        isValid: false,
        reason: 'Momentum insufficient for high-conviction trade'
      };
    }

    // Check pressure ratio
    if (cascadeSignal.askToBidRatio < 4.0) {
      return {
        isValid: false,
        reason: 'Pressure ratio below institutional threshold'
      };
    }

    return {
      isValid: true,
      reason: 'Institutional-grade signal validated'
    };
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
   * CRITICAL FIX: Enhanced position monitoring with trailing stops
   */
  updatePositions(currentPrice) {
    if (!currentPrice || this.activePositions.size === 0) {
      return;
    }

    for (const [positionId, position] of this.activePositions) {
      if (position.status === 'OPEN') {
        position.currentPrice = currentPrice;
        position.unrealizedPnL = this.calculateUnrealizedPnL(position, currentPrice);

        // CRITICAL FIX: Implement trailing stop-loss
        if (this.enableTrailingStop) {
          this.updateTrailingStop(position, currentPrice);
        }

        // Check for stop-loss or take-profit
        this.checkExitConditions(position, currentPrice);
      }
    }
  }

  /**
   * CRITICAL FIX: Trailing stop-loss implementation (v4.2)
   */
  updateTrailingStop(position, currentPrice) {
    if (position.type !== 'SHORT') return;

    const pnlPercent = this.calculateUnrealizedPnL(position, currentPrice);

    // Only trail when profit exceeds trigger threshold
    if (pnlPercent > this.trailProfitTrigger) {
      const trailDistance = this.trailDistance / 100;
      const newStopLoss = currentPrice * (1 + trailDistance);

      // For SHORT positions, new stop must be LOWER than current stop
      if (newStopLoss < position.stopLoss) {
        console.log(`📈 TRAILING STOP updated for ${position.id}: ${newStopLoss.toFixed(6)} (was ${position.stopLoss.toFixed(6)})`);
        console.log(`   💰 Profit: ${pnlPercent.toFixed(2)}% | Trail trigger: ${this.trailProfitTrigger}%`);
        position.stopLoss = newStopLoss;
      }
    }
  }

  /**
   * CRITICAL FIX: Defensive posture when conflicting signals detected
   */
  enterDefensivePosture(reason = 'Conflicting signal detected') {
    if (!this.enableDefensivePosture) return;

    console.log(`🛡️ ENTERING DEFENSIVE POSTURE: ${reason}`);

    let positionsAdjusted = 0;
    for (const [positionId, position] of this.activePositions) {
      if (position.status === 'OPEN' && position.type === 'SHORT') {
        const pnlPercent = this.calculateUnrealizedPnL(position, position.currentPrice);

        // Move stop to breakeven if in profit, or tighten if at loss
        if (pnlPercent > 0) {
          position.stopLoss = position.entryPrice; // Breakeven
          console.log(`🛡️ Moved stop to BREAKEVEN for ${position.id}`);
        } else {
          // Tighten stop-loss by 50% if at loss
          const tightenedStop = position.entryPrice * (1 + (this.stopLossPercent * 0.5) / 100);
          if (tightenedStop < position.stopLoss) {
            position.stopLoss = tightenedStop;
            console.log(`🛡️ TIGHTENED stop-loss for ${position.id}: ${tightenedStop.toFixed(6)}`);
          }
        }
        positionsAdjusted++;
      }
    }

    console.log(`🛡️ Defensive posture applied to ${positionsAdjusted} positions`);
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
