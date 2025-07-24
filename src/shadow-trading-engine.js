/**
 * Shadow Trading Engine - High-Fidelity P&L Simulation
 * 
 * Implements realistic order execution simulation with:
 * - System & Network latency modeling
 * - Market impact & slippage calculation
 * - Trading fees & funding rate accounting
 * - Real-time P&L tracking with harsh market realities
 */

import { EventEmitter } from 'events';
import { getISTTime, generateSignalId } from './utils.js';

class ShadowTradingEngine extends EventEmitter {
  constructor(symbol) {
    super();
    
    this.symbol = symbol;
    this.positions = new Map(); // positionId -> position object
    this.trades = [];
    this.pnlHistory = [];
    
    // Latency modeling (milliseconds)
    this.systemLatency = parseFloat(process.env.SYSTEM_LATENCY || '15'); // T_sys
    this.networkLatency = parseFloat(process.env.NETWORK_LATENCY || '35'); // T_net
    this.totalLatency = this.systemLatency + this.networkLatency;
    
    // Market impact parameters
    this.marketImpactCoeff = parseFloat(process.env.MARKET_IMPACT_COEFF || '0.0001'); // C
    this.impactExponent = parseFloat(process.env.IMPACT_EXPONENT || '0.6'); // α
    
    // Trading costs
    this.tradingFeeRate = parseFloat(process.env.TRADING_FEE_RATE || '0.0004'); // 0.04%
    this.fundingRate = parseFloat(process.env.FUNDING_RATE || '0.0001'); // 0.01% per 8h
    
    // Performance metrics
    this.stats = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      totalFees: 0,
      totalSlippage: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0
    };
    
    console.log(`🎯 Shadow Trading Engine initialized for ${symbol}`);
    console.log(`⏱️ Total Latency: ${this.totalLatency}ms (System: ${this.systemLatency}ms + Network: ${this.networkLatency}ms)`);
    console.log(`💰 Trading Fee: ${(this.tradingFeeRate * 100).toFixed(3)}%`);
    console.log(`📊 Market Impact Coeff: ${this.marketImpactCoeff}`);
  }

  /**
   * Simulate order execution with realistic latency and slippage
   */
  async executeOrder(signal, orderType, size) {
    const signalTime = Date.now();
    const executionTime = signalTime + this.totalLatency;
    
    // Get market data at execution time (simulated)
    const marketData = await this.getMarketDataAtTime(executionTime);
    
    // Calculate realistic fill price with slippage
    const fillPrice = this.calculateFillPrice(marketData, orderType, size);
    const slippage = this.calculateSlippage(marketData, orderType, size);
    const tradingFee = size * fillPrice * this.tradingFeeRate;
    
    const position = {
      id: generateSignalId(),
      symbol: this.symbol,
      type: orderType, // 'LONG' or 'SHORT'
      size: size,
      entryPrice: fillPrice,
      entryTime: new Date(executionTime).toISOString(),
      signalTime: new Date(signalTime).toISOString(),
      signal: signal,
      slippage: slippage,
      entryFee: tradingFee,
      status: 'OPEN',
      unrealizedPnL: 0,
      fundingPaid: 0,
      latencyMs: this.totalLatency
    };
    
    this.positions.set(position.id, position);
    this.stats.totalTrades++;
    this.stats.totalFees += tradingFee;
    this.stats.totalSlippage += slippage;
    
    console.log(`📈 SHADOW ORDER EXECUTED: ${position.id}`);
    console.log(`   Type: ${orderType} | Size: $${size.toFixed(2)}`);
    console.log(`   Fill Price: $${fillPrice.toFixed(6)} (Slippage: $${slippage.toFixed(6)})`);
    console.log(`   Latency: ${this.totalLatency}ms | Fee: $${tradingFee.toFixed(4)}`);
    
    this.emit('positionOpened', position);
    return position;
  }

  /**
   * Calculate realistic fill price with market impact
   */
  calculateFillPrice(marketData, orderType, size) {
    const { midPrice, bidPrice, askPrice, bidVolume, askVolume } = marketData;
    const spread = askPrice - bidPrice;
    
    // Base slippage: half spread + market impact
    const baseSlippage = spread / 2;
    const marketImpact = this.calculateMarketImpact(size, orderType === 'SHORT' ? askVolume : bidVolume);
    const totalSlippage = baseSlippage + marketImpact;
    
    if (orderType === 'SHORT') {
      // Selling: get worse price (lower)
      return bidPrice - totalSlippage;
    } else {
      // Buying: pay worse price (higher)  
      return askPrice + totalSlippage;
    }
  }

  /**
   * Calculate market impact based on order size and available liquidity
   */
  calculateMarketImpact(orderSize, availableLiquidity) {
    if (availableLiquidity <= 0) return orderSize * 0.001; // Emergency fallback
    
    const liquidityRatio = orderSize / availableLiquidity;
    return this.marketImpactCoeff * Math.pow(liquidityRatio, this.impactExponent);
  }

  /**
   * Calculate slippage for reporting
   */
  calculateSlippage(marketData, orderType, size) {
    const { midPrice } = marketData;
    const fillPrice = this.calculateFillPrice(marketData, orderType, size);
    
    if (orderType === 'SHORT') {
      return midPrice - fillPrice; // Positive slippage = worse fill
    } else {
      return fillPrice - midPrice; // Positive slippage = worse fill
    }
  }

  /**
   * Update position with current market price and calculate unrealized P&L
   */
  updatePosition(positionId, currentMarketData) {
    const position = this.positions.get(positionId);
    if (!position || position.status !== 'OPEN') return;

    const currentPrice = currentMarketData.midPrice;
    position.currentPrice = currentPrice;
    
    // Calculate unrealized P&L
    if (position.type === 'SHORT') {
      position.unrealizedPnL = (position.entryPrice - currentPrice) * (position.size / position.entryPrice);
    } else {
      position.unrealizedPnL = (currentPrice - position.entryPrice) * (position.size / position.entryPrice);
    }
    
    // Account for funding costs (simplified - should be calculated per funding period)
    const timeHeld = (Date.now() - new Date(position.entryTime).getTime()) / (1000 * 60 * 60); // hours
    const fundingPeriods = Math.floor(timeHeld / 8); // Every 8 hours
    const newFundingCost = fundingPeriods * position.size * this.fundingRate;
    
    if (newFundingCost > position.fundingPaid) {
      const additionalFunding = newFundingCost - position.fundingPaid;
      position.fundingPaid = newFundingCost;
      position.unrealizedPnL -= additionalFunding; // Funding reduces P&L
    }
    
    this.emit('positionUpdated', position);
  }

  /**
   * Close position and calculate realized P&L
   */
  async closePosition(positionId, reason, currentMarketData) {
    const position = this.positions.get(positionId);
    if (!position || position.status !== 'OPEN') return null;

    const closeTime = Date.now() + this.totalLatency; // Account for execution latency
    const closeMarketData = await this.getMarketDataAtTime(closeTime);
    
    // Calculate exit fill price with slippage
    const exitOrderType = position.type === 'SHORT' ? 'LONG' : 'SHORT'; // Opposite to close
    const exitFillPrice = this.calculateFillPrice(closeMarketData, exitOrderType, position.size);
    const exitSlippage = this.calculateSlippage(closeMarketData, exitOrderType, position.size);
    const exitFee = position.size * exitFillPrice * this.tradingFeeRate;
    
    // Calculate final realized P&L
    let realizedPnL;
    if (position.type === 'SHORT') {
      realizedPnL = (position.entryPrice - exitFillPrice) * (position.size / position.entryPrice);
    } else {
      realizedPnL = (exitFillPrice - position.entryPrice) * (position.size / position.entryPrice);
    }
    
    // Subtract all costs
    const totalCosts = position.entryFee + exitFee + position.fundingPaid + position.slippage + exitSlippage;
    realizedPnL -= totalCosts;
    
    // Update position
    position.status = 'CLOSED';
    position.closeTime = new Date(closeTime).toISOString();
    position.closeReason = reason;
    position.exitPrice = exitFillPrice;
    position.exitSlippage = exitSlippage;
    position.exitFee = exitFee;
    position.realizedPnL = realizedPnL;
    position.totalCosts = totalCosts;
    position.holdTimeMs = closeTime - new Date(position.entryTime).getTime();
    
    // Update statistics
    this.updateStatistics(position);
    
    // Move to trades history
    this.trades.push(position);
    this.positions.delete(positionId);
    
    console.log(`🏁 SHADOW POSITION CLOSED: ${positionId}`);
    console.log(`   Reason: ${reason} | Hold Time: ${(position.holdTimeMs / 1000).toFixed(1)}s`);
    console.log(`   Entry: $${position.entryPrice.toFixed(6)} | Exit: $${exitFillPrice.toFixed(6)}`);
    console.log(`   Realized P&L: $${realizedPnL.toFixed(4)} | Total Costs: $${totalCosts.toFixed(4)}`);
    console.log(`   Win Rate: ${this.stats.winRate.toFixed(1)}% | Total P&L: $${this.stats.totalPnL.toFixed(2)}`);
    
    this.emit('positionClosed', position);
    return position;
  }

  /**
   * Get market data at specific time (simulated for now)
   */
  async getMarketDataAtTime(timestamp) {
    // In production, this would query historical data or use current data
    // For now, we'll use a simplified simulation
    const basePrice = 0.14; // SPK/USDT approximate price
    const spread = basePrice * 0.001; // 0.1% spread
    const midPrice = basePrice + (Math.random() - 0.5) * 0.001; // Small random walk
    
    return {
      timestamp,
      midPrice,
      bidPrice: midPrice - spread / 2,
      askPrice: midPrice + spread / 2,
      bidVolume: 50000 + Math.random() * 100000,
      askVolume: 50000 + Math.random() * 100000
    };
  }

  /**
   * Update performance statistics
   */
  updateStatistics(closedPosition) {
    const pnl = closedPosition.realizedPnL;
    this.stats.totalPnL += pnl;
    
    if (pnl > 0) {
      this.stats.winningTrades++;
      this.stats.avgWin = (this.stats.avgWin * (this.stats.winningTrades - 1) + pnl) / this.stats.winningTrades;
    } else {
      this.stats.losingTrades++;
      this.stats.avgLoss = (this.stats.avgLoss * (this.stats.losingTrades - 1) + Math.abs(pnl)) / this.stats.losingTrades;
    }
    
    this.stats.winRate = (this.stats.winningTrades / this.stats.totalTrades) * 100;
    this.stats.profitFactor = this.stats.avgLoss > 0 ? (this.stats.avgWin * this.stats.winningTrades) / (this.stats.avgLoss * this.stats.losingTrades) : 0;
    
    // Update drawdown
    this.pnlHistory.push({ timestamp: Date.now(), pnl: this.stats.totalPnL });
    this.calculateMaxDrawdown();
  }

  /**
   * Calculate maximum drawdown
   */
  calculateMaxDrawdown() {
    if (this.pnlHistory.length < 2) return;
    
    let peak = this.pnlHistory[0].pnl;
    let maxDD = 0;
    
    for (const point of this.pnlHistory) {
      if (point.pnl > peak) {
        peak = point.pnl;
      }
      const drawdown = peak - point.pnl;
      if (drawdown > maxDD) {
        maxDD = drawdown;
      }
    }
    
    this.stats.maxDrawdown = maxDD;
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.stats,
      activePositions: this.positions.size,
      totalTrades: this.trades.length,
      avgHoldTime: this.trades.length > 0 ? 
        this.trades.reduce((sum, trade) => sum + trade.holdTimeMs, 0) / this.trades.length / 1000 : 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

export default ShadowTradingEngine;
