/**
 * SentryCoin v5.0 - ETH_UNWIND Strategy
 * 
 * Sophisticated macro strategy for Ethereum short positions based on:
 * - Derivatives market analysis (OI, funding rates, leverage)
 * - On-chain intelligence (exchange flows, supply metrics)
 * - Technical analysis (support/resistance levels)
 * 
 * Implements state machine logic for multi-phase execution
 */

import { EventEmitter } from 'events';
import { SignalFactory } from '../core/strategy-signal.js';
import { getISTTime, formatPrice, formatPriceWithSymbol } from '../utils/index.js';

/**
 * ETH_UNWIND Strategy States
 */
export const ETH_UNWIND_STATES = {
  MONITORING: 'MONITORING',     // Default state - watching for triggers
  ARMED: 'ARMED',               // 2/3 triggers met - ready to enter
  ENGAGED: 'ENGAGED',           // Position open - managing trade
  COOLDOWN: 'COOLDOWN'          // Post-trade cooldown period
};

/**
 * Trigger evaluation system
 */
export class EthUnwindTriggers {
  constructor(config) {
    this.config = config;
    
    // Derivatives triggers
    this.derivativesTrigger = {
      oiThreshold: config.oiThreshold || 24000000000, // $24B
      fundingSpike: config.fundingRateSpike || 0.018, // 1.8% daily
      elrDanger: config.elrDangerZone || 0.90 // 90%
    };
    
    // On-chain triggers
    this.onChainTrigger = {
      exchangeInflowThreshold: config.exchangeInflowThreshold || 50000, // 50k ETH
      supplyInflationary: true
    };
    
    // Technical triggers
    this.technicalTrigger = {
      supportLevel: config.supportLevel || 3600,
      resistanceLevel: config.resistanceLevel || 3850
    };
    
    console.log('🎯 ETH_UNWIND triggers configured:');
    console.log(`   📊 Derivatives: OI≥$${(this.derivativesTrigger.oiThreshold/1e9).toFixed(1)}B, Funding≥${(this.derivativesTrigger.fundingSpike*100).toFixed(2)}%, ELR≥${(this.derivativesTrigger.elrDanger*100).toFixed(0)}%`);
    console.log(`   🔗 On-chain: Inflow≥${this.onChainTrigger.exchangeInflowThreshold.toLocaleString()} ETH, Supply inflating`);
    console.log(`   📈 Technical: Support≤$${this.technicalTrigger.supportLevel}, Resistance≥$${this.technicalTrigger.resistanceLevel}`);
  }

  /**
   * Evaluate derivatives conditions
   */
  evaluateDerivatives(data) {
    const conditions = {
      oiATH: data.openInterest.ath || data.openInterest.total >= this.derivativesTrigger.oiThreshold,
      fundingSpike: data.fundingRates.spike || Math.abs(data.fundingRates.average) >= this.derivativesTrigger.fundingSpike,
      elrDanger: data.leverageMetrics.estimatedLeverageRatio >= this.derivativesTrigger.elrDanger
    };
    
    const triggered = Object.values(conditions).some(Boolean);
    const triggerCount = Object.values(conditions).filter(Boolean).length;
    
    return {
      triggered,
      triggerCount,
      conditions,
      evidence: this.buildDerivativesEvidence(data, conditions)
    };
  }

  /**
   * Evaluate on-chain conditions
   */
  evaluateOnChain(data) {
    const conditions = {
      exchangeInflow: data.exchangeFlows.inflowSpike || data.exchangeFlows.netFlow24h >= this.onChainTrigger.exchangeInflowThreshold,
      supplyInflating: data.supplyMetrics.isInflationary
    };
    
    const triggered = Object.values(conditions).some(Boolean);
    const triggerCount = Object.values(conditions).filter(Boolean).length;
    
    return {
      triggered,
      triggerCount,
      conditions,
      evidence: this.buildOnChainEvidence(data, conditions)
    };
  }

  /**
   * Evaluate technical conditions
   */
  evaluateTechnical(price) {
    const conditions = {
      supportBreak: price <= this.technicalTrigger.supportLevel,
      nearSupport: price <= (this.technicalTrigger.supportLevel * 1.02) // Within 2% of support
    };
    
    const triggered = conditions.supportBreak;
    const triggerCount = Object.values(conditions).filter(Boolean).length;
    
    return {
      triggered,
      triggerCount,
      conditions,
      evidence: this.buildTechnicalEvidence(price, conditions)
    };
  }

  /**
   * Build evidence strings for logging
   */
  buildDerivativesEvidence(data, conditions) {
    const evidence = [];
    if (conditions.oiATH) evidence.push(`OI: $${(data.openInterest.total/1e9).toFixed(2)}B (${data.openInterest.ath ? 'ATH' : 'above threshold'})`);
    if (conditions.fundingSpike) evidence.push(`Funding: ${(data.fundingRates.average*100).toFixed(3)}% (spike detected)`);
    if (conditions.elrDanger) evidence.push(`ELR: ${(data.leverageMetrics.estimatedLeverageRatio*100).toFixed(1)}% (danger zone)`);
    return evidence.join(', ');
  }

  buildOnChainEvidence(data, conditions) {
    const evidence = [];
    if (conditions.exchangeInflow) evidence.push(`Exchange inflow: ${data.exchangeFlows.netFlow24h.toLocaleString()} ETH`);
    if (conditions.supplyInflating) evidence.push('ETH supply inflating');
    return evidence.join(', ');
  }

  buildTechnicalEvidence(price, conditions) {
    const evidence = [];
    if (conditions.supportBreak) evidence.push(`Support broken: $${price} ≤ $${this.technicalTrigger.supportLevel}`);
    if (conditions.nearSupport) evidence.push(`Near support: $${price} (within 2%)`);
    return evidence.join(', ');
  }
}

/**
 * ETH_UNWIND Strategy Implementation
 */
export class EthUnwindStrategy extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = config;
    this.symbol = config.symbol || 'ETHUSDT';
    this.enabled = config.enabled !== false;
    
    // State machine
    this.state = ETH_UNWIND_STATES.MONITORING;
    this.stateHistory = [];
    this.lastStateChange = Date.now();
    
    // Trigger system
    this.triggers = new EthUnwindTriggers(config);
    this.triggerStatus = {
      derivatives: { triggered: false, evidence: '' },
      onChain: { triggered: false, evidence: '' },
      technical: { triggered: false, evidence: '' }
    };
    
    // Position management
    this.position = null;
    this.entryPrice = null;
    this.stopLossPrice = null;
    this.targetPrices = {
      tp1: config.takeProfit1 || 3000,
      tp2: config.takeProfit2 || 2800
    };
    
    // Risk management
    this.maxPositionSize = config.maxPositionSize || 10000;
    this.stopLossPercent = config.stopLossPercent || 7.0;
    this.cooldownHours = config.cooldownHours || 12;
    this.cooldownUntil = 0;
    
    // Performance tracking
    this.stats = {
      signalsGenerated: 0,
      positionsOpened: 0,
      positionsClosed: 0,
      winnersCount: 0,
      losersCount: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      startTime: Date.now()
    };
    
    console.log(`🎯 ETH_UNWIND Strategy initialized for ${this.symbol}`);
    console.log(`📊 State: ${this.state} | Max Position: $${this.maxPositionSize.toLocaleString()}`);
    console.log(`🛑 Stop Loss: ${this.stopLossPercent}% | Targets: $${this.targetPrices.tp1}, $${this.targetPrices.tp2}`);
  }

  /**
   * Process market data and evaluate strategy conditions
   */
  processMarketData(marketData) {
    if (!this.enabled) return;
    
    const { price, derivativesData, onChainData } = marketData;
    
    // Evaluate all trigger conditions
    const derivativesEval = this.triggers.evaluateDerivatives(derivativesData);
    const onChainEval = this.triggers.evaluateOnChain(onChainData);
    const technicalEval = this.triggers.evaluateTechnical(price);
    
    // Update trigger status
    this.triggerStatus.derivatives = derivativesEval;
    this.triggerStatus.onChain = onChainEval;
    this.triggerStatus.technical = technicalEval;
    
    // Count active triggers
    const activeTriggers = [derivativesEval, onChainEval, technicalEval].filter(t => t.triggered).length;
    
    // State machine logic
    this.processStateMachine(price, activeTriggers);
    
    // Position management if engaged
    if (this.state === ETH_UNWIND_STATES.ENGAGED && this.position) {
      this.managePosition(price);
    }
  }

  /**
   * Process state machine transitions
   */
  processStateMachine(price, activeTriggers) {
    const previousState = this.state;
    
    switch (this.state) {
      case ETH_UNWIND_STATES.MONITORING:
        if (activeTriggers >= 2) {
          this.changeState(ETH_UNWIND_STATES.ARMED, `${activeTriggers}/3 triggers active`);
        }
        break;
        
      case ETH_UNWIND_STATES.ARMED:
        if (this.triggerStatus.technical.triggered) {
          this.enterPosition(price);
          this.changeState(ETH_UNWIND_STATES.ENGAGED, 'Technical trigger activated - position entered');
        } else if (activeTriggers < 2) {
          this.changeState(ETH_UNWIND_STATES.MONITORING, 'Insufficient triggers - disarming');
        }
        break;
        
      case ETH_UNWIND_STATES.ENGAGED:
        // Position management handled separately
        break;
        
      case ETH_UNWIND_STATES.COOLDOWN:
        if (Date.now() > this.cooldownUntil) {
          this.changeState(ETH_UNWIND_STATES.MONITORING, 'Cooldown period completed');
        }
        break;
    }
    
    // Log state changes
    if (this.state !== previousState) {
      this.logStateChange(previousState, this.state, activeTriggers);
    }
  }

  /**
   * Change strategy state
   */
  changeState(newState, reason) {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    
    this.stateHistory.push({
      from: previousState,
      to: newState,
      reason,
      timestamp: Date.now(),
      istTime: getISTTime()
    });
    
    // Keep only last 50 state changes
    if (this.stateHistory.length > 50) {
      this.stateHistory = this.stateHistory.slice(-25);
    }
    
    this.emit('stateChange', newState);
  }

  /**
   * Enter short position
   */
  enterPosition(price) {
    this.entryPrice = price;
    this.stopLossPrice = price * (1 + this.stopLossPercent / 100);
    
    const positionSizeFactor = this.calculatePositionSize();
    
    // Create signal
    const signal = SignalFactory.createEthUnwindSignal({
      action: 'ENTER_SHORT',
      confidence: this.calculateConfidence(),
      triggers: this.getActiveTriggers(),
      targetPrice: this.targetPrices.tp1,
      stopLossPrice: this.stopLossPrice,
      positionSizeFactor,
      symbol: this.symbol,
      currentPrice: price,
      reasoning: this.buildPositionReasoning(),
      state: this.state,
      derivativesTrigger: this.triggerStatus.derivatives.triggered,
      onChainTrigger: this.triggerStatus.onChain.triggered,
      technicalTrigger: this.triggerStatus.technical.triggered
    });
    
    this.position = {
      entryPrice: this.entryPrice,
      stopLossPrice: this.stopLossPrice,
      targetPrices: this.targetPrices,
      size: positionSizeFactor,
      openTime: Date.now()
    };
    
    this.stats.signalsGenerated++;
    this.stats.positionsOpened++;
    
    console.log(`🚨 ETH_UNWIND POSITION ENTERED:`);
    console.log(`   📊 Entry: ${formatPriceWithSymbol(this.entryPrice)} | Stop: ${formatPriceWithSymbol(this.stopLossPrice)}`);
    console.log(`   🎯 Targets: ${formatPriceWithSymbol(this.targetPrices.tp1)}, ${formatPriceWithSymbol(this.targetPrices.tp2)}`);
    console.log(`   💰 Size: ${(positionSizeFactor * 100).toFixed(1)}% | Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
    
    this.emit('signal', signal);
  }

  /**
   * Calculate position size based on confidence and risk
   */
  calculatePositionSize() {
    const baseSize = 0.3; // 30% base allocation
    const confidenceMultiplier = this.calculateConfidence();
    const triggerMultiplier = this.getActiveTriggers().length / 3;
    
    return Math.min(baseSize * confidenceMultiplier * triggerMultiplier, 0.5); // Max 50%
  }

  /**
   * Calculate strategy confidence
   */
  calculateConfidence() {
    const triggerCount = this.getActiveTriggers().length;
    const baseConfidence = 0.6;
    const triggerBonus = triggerCount * 0.1;
    
    return Math.min(baseConfidence + triggerBonus, 0.95);
  }

  /**
   * Get list of active triggers
   */
  getActiveTriggers() {
    const triggers = [];
    if (this.triggerStatus.derivatives.triggered) triggers.push('DERIVATIVES_TRIGGER');
    if (this.triggerStatus.onChain.triggered) triggers.push('ONCHAIN_TRIGGER');
    if (this.triggerStatus.technical.triggered) triggers.push('TECHNICAL_TRIGGER');
    return triggers;
  }

  /**
   * Build reasoning for position entry
   */
  buildPositionReasoning() {
    const evidence = [];
    if (this.triggerStatus.derivatives.triggered) evidence.push(`Derivatives: ${this.triggerStatus.derivatives.evidence}`);
    if (this.triggerStatus.onChain.triggered) evidence.push(`On-chain: ${this.triggerStatus.onChain.evidence}`);
    if (this.triggerStatus.technical.triggered) evidence.push(`Technical: ${this.triggerStatus.technical.evidence}`);
    
    return `ETH_UNWIND macro short entry - ${evidence.join(' | ')}`;
  }

  /**
   * Manage open position
   */
  managePosition(currentPrice) {
    if (!this.position) return;
    
    // Check stop loss
    if (currentPrice >= this.stopLossPrice) {
      this.closePosition(currentPrice, 'STOP_LOSS');
      return;
    }
    
    // Check take profit levels
    if (currentPrice <= this.targetPrices.tp2) {
      this.closePosition(currentPrice, 'TAKE_PROFIT_2');
    } else if (currentPrice <= this.targetPrices.tp1) {
      this.partialTakeProfit(currentPrice, 0.5); // Close 50% at TP1
    }
  }

  /**
   * Close position
   */
  closePosition(price, reason) {
    if (!this.position) return;
    
    const pnl = this.calculatePnL(price);
    const isWinner = pnl > 0;
    
    this.stats.positionsClosed++;
    this.stats.totalPnL += pnl;
    
    if (isWinner) {
      this.stats.winnersCount++;
    } else {
      this.stats.losersCount++;
    }
    
    console.log(`🏁 ETH_UNWIND POSITION CLOSED:`);
    console.log(`   📊 Exit: ${formatPriceWithSymbol(price)} | Reason: ${reason}`);
    console.log(`   💰 P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}% | ${isWinner ? '✅ WIN' : '❌ LOSS'}`);
    
    this.position = null;
    this.entryPrice = null;
    this.stopLossPrice = null;
    
    // Enter cooldown
    this.cooldownUntil = Date.now() + (this.cooldownHours * 60 * 60 * 1000);
    this.changeState(ETH_UNWIND_STATES.COOLDOWN, `Position closed: ${reason}`);
  }

  /**
   * Partial take profit
   */
  partialTakeProfit(price, percentage) {
    console.log(`🎯 ETH_UNWIND PARTIAL TP: ${(percentage * 100).toFixed(0)}% at ${formatPriceWithSymbol(price)}`);
    
    // Emit partial TP signal
    const signal = SignalFactory.createEthUnwindSignal({
      action: 'PARTIAL_TP',
      confidence: 0.9,
      triggers: ['TAKE_PROFIT_1'],
      positionSizeFactor: percentage,
      symbol: this.symbol,
      currentPrice: price,
      reasoning: `Partial take profit at TP1: ${formatPriceWithSymbol(price)}`
    });
    
    this.emit('signal', signal);
  }

  /**
   * Calculate P&L percentage
   */
  calculatePnL(currentPrice) {
    if (!this.entryPrice) return 0;
    return ((this.entryPrice - currentPrice) / this.entryPrice) * 100; // Short position
  }

  /**
   * Log state changes
   */
  logStateChange(from, to, activeTriggers) {
    console.log(`🔄 ETH_UNWIND State: ${from} → ${to} | Active Triggers: ${activeTriggers}/3`);
    
    if (activeTriggers > 0) {
      const evidence = [];
      if (this.triggerStatus.derivatives.triggered) evidence.push(`📊 ${this.triggerStatus.derivatives.evidence}`);
      if (this.triggerStatus.onChain.triggered) evidence.push(`🔗 ${this.triggerStatus.onChain.evidence}`);
      if (this.triggerStatus.technical.triggered) evidence.push(`📈 ${this.triggerStatus.technical.evidence}`);
      
      if (evidence.length > 0) {
        console.log(`   Evidence: ${evidence.join(' | ')}`);
      }
    }
  }

  /**
   * Get strategy statistics
   */
  getStats() {
    const winRate = this.stats.positionsClosed > 0 ? 
      (this.stats.winnersCount / this.stats.positionsClosed) * 100 : 0;
    
    return {
      ...this.stats,
      state: this.state,
      winRate: winRate.toFixed(1),
      avgPnL: this.stats.positionsClosed > 0 ? 
        (this.stats.totalPnL / this.stats.positionsClosed).toFixed(2) : 0,
      uptime: Date.now() - this.stats.startTime,
      activeTriggers: this.getActiveTriggers().length,
      position: this.position ? {
        entryPrice: this.entryPrice,
        currentPnL: this.position ? this.calculatePnL(this.entryPrice) : 0
      } : null
    };
  }

  /**
   * Shutdown strategy
   */
  async shutdown() {
    console.log('🛑 Shutting down ETH_UNWIND strategy...');
    
    if (this.position) {
      console.log('⚠️ Warning: Position still open during shutdown');
    }
    
    this.enabled = false;
    console.log('✅ ETH_UNWIND strategy shutdown complete');
  }
}

export default EthUnwindStrategy;
