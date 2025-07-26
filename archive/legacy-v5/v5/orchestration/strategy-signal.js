/**
 * SentryCoin v5.0 - Enhanced Strategy Signal System
 * 
 * Advanced signal architecture for multi-strategy orchestration
 * Supports complex decision-making with metadata and conflict resolution
 */

import { generateSignalId, getISTTime } from '../utils/index.js';

/**
 * Enhanced Strategy Signal Class v2.0
 * 
 * Represents a trading signal with comprehensive metadata for
 * multi-strategy coordination and conflict resolution
 */
export class StrategySignal {
  constructor({
    strategyId,           // Strategy identifier (e.g., 'ETH_UNWIND', 'CASCADE_HUNTER')
    action,              // Signal action type
    confidence,          // Strategy confidence (0.0 - 1.0)
    triggers = [],       // Array of specific conditions met
    targetPrice,         // Primary target price
    stopLossPrice,       // Risk management level
    positionSizeFactor = 0.1, // Allocation percentage (0.0 - 1.0)
    timeframe = 'SWING', // Signal timeframe
    priority = 5,        // Priority for conflict resolution (1-10)
    metadata = {},       // Strategy-specific data
    symbol,              // Trading symbol
    currentPrice,        // Current market price
    reasoning = ''       // Human-readable reasoning
  }) {
    // Core signal properties
    this.strategyId = strategyId;
    this.action = action;
    this.confidence = confidence;
    this.triggers = triggers;
    this.targetPrice = targetPrice;
    this.stopLossPrice = stopLossPrice;
    this.positionSizeFactor = positionSizeFactor;
    this.timeframe = timeframe;
    this.priority = priority;
    this.metadata = metadata;
    this.symbol = symbol;
    this.currentPrice = currentPrice;
    this.reasoning = reasoning;
    
    // System properties
    this.id = generateSignalId();
    this.timestamp = Date.now();
    this.istTime = getISTTime();
    this.status = 'PENDING';
    this.executionTime = null;
    this.result = null;
    
    // Validation
    this.validate();
  }

  /**
   * Validate signal properties
   */
  validate() {
    if (!this.strategyId) {
      throw new Error('StrategySignal: strategyId is required');
    }
    
    if (!VALID_ACTIONS.includes(this.action)) {
      throw new Error(`StrategySignal: Invalid action '${this.action}'`);
    }
    
    if (this.confidence < 0 || this.confidence > 1) {
      throw new Error('StrategySignal: confidence must be between 0 and 1');
    }
    
    if (this.priority < 1 || this.priority > 10) {
      throw new Error('StrategySignal: priority must be between 1 and 10');
    }
    
    if (this.positionSizeFactor < 0 || this.positionSizeFactor > 1) {
      throw new Error('StrategySignal: positionSizeFactor must be between 0 and 1');
    }
  }

  /**
   * Calculate risk-reward ratio
   */
  getRiskRewardRatio() {
    if (!this.targetPrice || !this.stopLossPrice || !this.currentPrice) {
      return null;
    }
    
    const risk = Math.abs(this.currentPrice - this.stopLossPrice);
    const reward = Math.abs(this.targetPrice - this.currentPrice);
    
    return risk > 0 ? reward / risk : null;
  }

  /**
   * Get signal strength score (0-100)
   */
  getStrengthScore() {
    let score = this.confidence * 50; // Base confidence (0-50)
    score += this.triggers.length * 5; // Trigger count bonus (0-25+)
    score += this.priority * 2.5; // Priority bonus (2.5-25)
    
    const rrRatio = this.getRiskRewardRatio();
    if (rrRatio && rrRatio > 1) {
      score += Math.min(rrRatio * 5, 25); // Risk-reward bonus (0-25)
    }
    
    return Math.min(Math.round(score), 100);
  }

  /**
   * Check if signal is actionable
   */
  isActionable() {
    return this.status === 'PENDING' && 
           this.confidence >= 0.5 && 
           this.triggers.length > 0;
  }

  /**
   * Mark signal as executed
   */
  markExecuted(result = null) {
    this.status = 'EXECUTED';
    this.executionTime = Date.now();
    this.result = result;
  }

  /**
   * Mark signal as rejected
   */
  markRejected(reason = '') {
    this.status = 'REJECTED';
    this.result = { reason };
  }

  /**
   * Convert to JSON for logging/storage
   */
  toJSON() {
    return {
      id: this.id,
      strategyId: this.strategyId,
      action: this.action,
      confidence: this.confidence,
      triggers: this.triggers,
      targetPrice: this.targetPrice,
      stopLossPrice: this.stopLossPrice,
      positionSizeFactor: this.positionSizeFactor,
      timeframe: this.timeframe,
      priority: this.priority,
      metadata: this.metadata,
      symbol: this.symbol,
      currentPrice: this.currentPrice,
      reasoning: this.reasoning,
      timestamp: this.timestamp,
      istTime: this.istTime,
      status: this.status,
      executionTime: this.executionTime,
      result: this.result,
      strengthScore: this.getStrengthScore(),
      riskRewardRatio: this.getRiskRewardRatio()
    };
  }

  /**
   * Create a formatted string representation
   */
  toString() {
    const rrRatio = this.getRiskRewardRatio();
    const strengthScore = this.getStrengthScore();
    
    return `[${this.strategyId}] ${this.action} ${this.symbol} @ ${this.currentPrice} | ` +
           `Confidence: ${(this.confidence * 100).toFixed(1)}% | ` +
           `Strength: ${strengthScore}/100 | ` +
           `Priority: ${this.priority} | ` +
           `R:R ${rrRatio ? rrRatio.toFixed(2) : 'N/A'} | ` +
           `Triggers: [${this.triggers.join(', ')}]`;
  }
}

/**
 * Valid signal actions
 */
export const VALID_ACTIONS = [
  'ENTER_LONG',
  'ENTER_SHORT',
  'ADD_TO_LONG',
  'ADD_TO_SHORT',
  'PARTIAL_TP',
  'FULL_TP',
  'MOVE_STOP',
  'EXIT_ALL',
  'ALERT_ONLY'
];

/**
 * Signal timeframes
 */
export const TIMEFRAMES = {
  SCALP: 'SCALP',     // < 1 hour
  SWING: 'SWING',     // 1 hour - 1 day
  MACRO: 'MACRO'      // > 1 day
};

/**
 * Strategy priority levels
 */
export const STRATEGY_PRIORITIES = {
  'ETH_UNWIND': 10,        // Highest priority - macro strategy
  'BTC_MACRO': 9,          // High priority - macro strategy
  'CASCADE_HUNTER': 7,     // High priority - validated system
  'SPOOF_FADER': 5,        // Medium priority - scalping
  'COIL_WATCHER': 3,       // Low priority - alerts only
  'SHAKEOUT_DETECTOR': 3   // Low priority - alerts only
};

/**
 * Signal factory for creating standardized signals
 */
export class SignalFactory {
  static createCascadeSignal(data) {
    return new StrategySignal({
      strategyId: 'CASCADE_HUNTER',
      action: 'ENTER_SHORT',
      confidence: data.confidence || 0.8,
      triggers: data.triggers || ['PRESSURE_SPIKE', 'MOMENTUM_NEGATIVE'],
      targetPrice: data.targetPrice,
      stopLossPrice: data.stopLossPrice,
      positionSizeFactor: 0.2,
      timeframe: 'SWING',
      priority: STRATEGY_PRIORITIES.CASCADE_HUNTER,
      symbol: data.symbol,
      currentPrice: data.currentPrice,
      reasoning: data.reasoning || 'CASCADE_HUNTER signal detected',
      metadata: {
        askToBidRatio: data.askToBidRatio,
        totalBidVolume: data.totalBidVolume,
        momentum: data.momentum
      }
    });
  }

  static createEthUnwindSignal(data) {
    return new StrategySignal({
      strategyId: 'ETH_UNWIND',
      action: data.action || 'ENTER_SHORT',
      confidence: data.confidence || 0.9,
      triggers: data.triggers || [],
      targetPrice: data.targetPrice,
      stopLossPrice: data.stopLossPrice,
      positionSizeFactor: data.positionSizeFactor || 0.5,
      timeframe: 'MACRO',
      priority: STRATEGY_PRIORITIES.ETH_UNWIND,
      symbol: data.symbol || 'ETHUSDT',
      currentPrice: data.currentPrice,
      reasoning: data.reasoning || 'ETH_UNWIND macro signal',
      metadata: {
        state: data.state,
        derivativesTrigger: data.derivativesTrigger,
        onChainTrigger: data.onChainTrigger,
        technicalTrigger: data.technicalTrigger
      }
    });
  }

  static createAlertSignal(strategyId, message, data = {}) {
    return new StrategySignal({
      strategyId: strategyId,
      action: 'ALERT_ONLY',
      confidence: data.confidence || 0.7,
      triggers: data.triggers || ['ALERT_CONDITION'],
      positionSizeFactor: 0,
      timeframe: data.timeframe || 'SWING',
      priority: STRATEGY_PRIORITIES[strategyId] || 3,
      symbol: data.symbol,
      currentPrice: data.currentPrice,
      reasoning: message,
      metadata: data.metadata || {}
    });
  }
}

export default StrategySignal;
