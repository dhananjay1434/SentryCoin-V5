/**
 * SentryCoin v5.0 - Multi-Strategy Orchestration Manager
 * 
 * Coordinates multiple trading strategies, manages signal conflicts,
 * and orchestrates resource allocation across strategies
 */

import { EventEmitter } from 'events';
import { StrategySignal, STRATEGY_PRIORITIES } from './strategy-signal.js';
import { getISTTime, generateSignalId } from '../utils/index.js';

/**
 * Strategy Manager - Core orchestration engine for v5.0
 */
export class StrategyManager extends EventEmitter {
  constructor(config) {
    super();
    
    this.config = config;
    this.strategies = new Map();
    this.activeSignals = new Map();
    this.signalHistory = [];
    this.conflictResolver = new ConflictResolver(config);
    
    // Performance tracking
    this.stats = {
      strategiesLoaded: 0,
      signalsProcessed: 0,
      conflictsResolved: 0,
      signalsExecuted: 0,
      signalsRejected: 0,
      startTime: Date.now()
    };
    
    console.log('🎯 Strategy Manager v5.0 initialized');
  }

  /**
   * Register a strategy with the manager
   */
  registerStrategy(strategyId, strategyInstance) {
    if (this.strategies.has(strategyId)) {
      console.warn(`⚠️ Strategy ${strategyId} already registered, replacing...`);
    }
    
    this.strategies.set(strategyId, {
      instance: strategyInstance,
      enabled: true,
      lastSignalTime: 0,
      signalCount: 0,
      performance: {
        signalsGenerated: 0,
        signalsExecuted: 0,
        winRate: 0,
        totalPnL: 0
      }
    });
    
    // Set up event listeners for this strategy
    this.setupStrategyListeners(strategyId, strategyInstance);
    
    this.stats.strategiesLoaded++;
    console.log(`✅ Strategy registered: ${strategyId}`);
  }

  /**
   * Set up event listeners for a strategy
   */
  setupStrategyListeners(strategyId, strategyInstance) {
    // Listen for signals from this strategy
    strategyInstance.on('signal', (signalData) => {
      this.handleStrategySignal(strategyId, signalData);
    });
    
    // Listen for state changes
    strategyInstance.on('stateChange', (newState) => {
      this.handleStrategyStateChange(strategyId, newState);
    });
    
    // Listen for errors
    strategyInstance.on('error', (error) => {
      this.handleStrategyError(strategyId, error);
    });
  }

  /**
   * Handle incoming signal from a strategy
   */
  async handleStrategySignal(strategyId, signalData) {
    try {
      this.stats.signalsProcessed++;
      
      // Create enhanced signal object
      const signal = new StrategySignal({
        strategyId,
        ...signalData
      });
      
      console.log(`📡 Signal received from ${strategyId}: ${signal.toString()}`);
      
      // Update strategy stats
      const strategy = this.strategies.get(strategyId);
      if (strategy) {
        strategy.lastSignalTime = Date.now();
        strategy.signalCount++;
        strategy.performance.signalsGenerated++;
      }
      
      // Store signal for conflict resolution
      this.activeSignals.set(signal.id, signal);
      this.signalHistory.push(signal);
      
      // Process signal through conflict resolution
      const resolution = await this.conflictResolver.resolveSignal(signal, this.activeSignals);
      
      if (resolution.approved) {
        await this.executeSignal(signal, resolution);
      } else {
        this.rejectSignal(signal, resolution.reason);
      }
      
    } catch (error) {
      console.error(`❌ Error handling signal from ${strategyId}:`, error.message);
      this.emit('error', { strategyId, error, signalData });
    }
  }

  /**
   * Execute an approved signal
   */
  async executeSignal(signal, resolution) {
    try {
      signal.markExecuted(resolution);
      this.stats.signalsExecuted++;
      
      // Update strategy performance
      const strategy = this.strategies.get(signal.strategyId);
      if (strategy) {
        strategy.performance.signalsExecuted++;
      }
      
      console.log(`✅ Signal executed: ${signal.id} from ${signal.strategyId}`);
      console.log(`   Action: ${signal.action} | Size: ${(signal.positionSizeFactor * 100).toFixed(1)}%`);
      console.log(`   Target: ${signal.targetPrice} | Stop: ${signal.stopLossPrice}`);
      
      // Emit execution event
      this.emit('signalExecuted', {
        signal,
        resolution,
        timestamp: Date.now()
      });
      
      // Clean up old signals
      this.cleanupOldSignals();
      
    } catch (error) {
      console.error(`❌ Error executing signal ${signal.id}:`, error.message);
      signal.markRejected(`Execution error: ${error.message}`);
    }
  }

  /**
   * Reject a signal
   */
  rejectSignal(signal, reason) {
    signal.markRejected(reason);
    this.stats.signalsRejected++;
    
    console.log(`🚫 Signal rejected: ${signal.id} from ${signal.strategyId}`);
    console.log(`   Reason: ${reason}`);
    
    this.emit('signalRejected', {
      signal,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Handle strategy state changes
   */
  handleStrategyStateChange(strategyId, newState) {
    console.log(`🔄 Strategy ${strategyId} state changed to: ${newState}`);
    
    this.emit('strategyStateChange', {
      strategyId,
      newState,
      timestamp: Date.now()
    });
  }

  /**
   * Handle strategy errors
   */
  handleStrategyError(strategyId, error) {
    console.error(`❌ Strategy ${strategyId} error:`, error.message);
    
    // Consider disabling strategy if too many errors
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.errorCount = (strategy.errorCount || 0) + 1;
      
      if (strategy.errorCount > 5) {
        console.warn(`⚠️ Disabling strategy ${strategyId} due to excessive errors`);
        strategy.enabled = false;
      }
    }
    
    this.emit('strategyError', {
      strategyId,
      error,
      timestamp: Date.now()
    });
  }

  /**
   * Distribute market data to all strategies
   */
  distributeMarketData(marketData) {
    for (const [strategyId, strategy] of this.strategies) {
      if (strategy.enabled && strategy.instance.processMarketData) {
        try {
          strategy.instance.processMarketData(marketData);
        } catch (error) {
          console.error(`❌ Error distributing data to ${strategyId}:`, error.message);
          this.handleStrategyError(strategyId, error);
        }
      }
    }
  }

  /**
   * Get strategy performance summary
   */
  getPerformanceSummary() {
    const summary = {
      manager: {
        ...this.stats,
        uptime: Date.now() - this.stats.startTime,
        activeSignals: this.activeSignals.size
      },
      strategies: {}
    };
    
    for (const [strategyId, strategy] of this.strategies) {
      summary.strategies[strategyId] = {
        enabled: strategy.enabled,
        lastSignalTime: strategy.lastSignalTime,
        signalCount: strategy.signalCount,
        performance: strategy.performance,
        errorCount: strategy.errorCount || 0
      };
    }
    
    return summary;
  }

  /**
   * Enable/disable a strategy
   */
  setStrategyEnabled(strategyId, enabled) {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.enabled = enabled;
      console.log(`${enabled ? '✅' : '🚫'} Strategy ${strategyId} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      console.warn(`⚠️ Strategy ${strategyId} not found`);
    }
  }

  /**
   * Clean up old signals to prevent memory leaks
   */
  cleanupOldSignals() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    // Remove old signals from active tracking
    for (const [signalId, signal] of this.activeSignals) {
      if (signal.timestamp < cutoffTime || signal.status !== 'PENDING') {
        this.activeSignals.delete(signalId);
      }
    }
    
    // Trim signal history
    if (this.signalHistory.length > 1000) {
      this.signalHistory = this.signalHistory.slice(-500);
    }
  }

  /**
   * Shutdown all strategies
   */
  async shutdown() {
    console.log('🛑 Shutting down Strategy Manager...');
    
    for (const [strategyId, strategy] of this.strategies) {
      try {
        if (strategy.instance.shutdown) {
          await strategy.instance.shutdown();
        }
      } catch (error) {
        console.error(`❌ Error shutting down strategy ${strategyId}:`, error.message);
      }
    }
    
    this.strategies.clear();
    this.activeSignals.clear();
    
    console.log('✅ Strategy Manager shutdown complete');
  }
}

/**
 * Conflict Resolution System
 */
export class ConflictResolver {
  constructor(config) {
    this.config = config;
    this.resolutionHistory = [];
  }

  /**
   * Resolve signal conflicts and determine if signal should be executed
   */
  async resolveSignal(newSignal, activeSignals) {
    const conflicts = this.findConflicts(newSignal, activeSignals);
    
    if (conflicts.length === 0) {
      return {
        approved: true,
        reason: 'No conflicts detected',
        conflicts: []
      };
    }
    
    // Apply conflict resolution rules
    const resolution = this.applyResolutionRules(newSignal, conflicts);
    
    // Log resolution
    this.resolutionHistory.push({
      signalId: newSignal.id,
      conflicts: conflicts.map(c => c.id),
      resolution,
      timestamp: Date.now()
    });
    
    return resolution;
  }

  /**
   * Find conflicting signals
   */
  findConflicts(newSignal, activeSignals) {
    const conflicts = [];
    
    for (const [signalId, signal] of activeSignals) {
      if (signal.id === newSignal.id) continue;
      
      // Check for symbol conflicts
      if (signal.symbol === newSignal.symbol) {
        // Check for directional conflicts
        if (this.isDirectionalConflict(signal, newSignal)) {
          conflicts.push(signal);
        }
      }
      
      // Check for resource conflicts (position size)
      if (this.isResourceConflict(signal, newSignal)) {
        conflicts.push(signal);
      }
    }
    
    return conflicts;
  }

  /**
   * Check if signals have directional conflicts
   */
  isDirectionalConflict(signal1, signal2) {
    const longActions = ['ENTER_LONG', 'ADD_TO_LONG'];
    const shortActions = ['ENTER_SHORT', 'ADD_TO_SHORT'];
    
    const signal1IsLong = longActions.includes(signal1.action);
    const signal1IsShort = shortActions.includes(signal1.action);
    const signal2IsLong = longActions.includes(signal2.action);
    const signal2IsShort = shortActions.includes(signal2.action);
    
    return (signal1IsLong && signal2IsShort) || (signal1IsShort && signal2IsLong);
  }

  /**
   * Check if signals have resource conflicts
   */
  isResourceConflict(signal1, signal2) {
    // Check if both signals are for the same symbol and would exceed allocation
    if (signal1.symbol === signal2.symbol) {
      const totalAllocation = signal1.positionSizeFactor + signal2.positionSizeFactor;
      return totalAllocation > 1.0; // Can't allocate more than 100%
    }
    return false;
  }

  /**
   * Apply resolution rules based on priority and other factors
   */
  applyResolutionRules(newSignal, conflicts) {
    // Rule 1: Priority-based resolution
    const highestPriorityConflict = conflicts.reduce((highest, current) => 
      current.priority > highest.priority ? current : highest
    );
    
    if (newSignal.priority > highestPriorityConflict.priority) {
      return {
        approved: true,
        reason: `Higher priority than conflicting signals (${newSignal.priority} > ${highestPriorityConflict.priority})`,
        conflicts
      };
    }
    
    // Rule 2: Confidence-based resolution for same priority
    if (newSignal.priority === highestPriorityConflict.priority) {
      if (newSignal.confidence > highestPriorityConflict.confidence) {
        return {
          approved: true,
          reason: `Higher confidence than conflicting signals (${newSignal.confidence} > ${highestPriorityConflict.confidence})`,
          conflicts
        };
      }
    }
    
    // Rule 3: Timeframe-based resolution (macro > swing > scalp)
    const timeframePriority = { 'MACRO': 3, 'SWING': 2, 'SCALP': 1 };
    const newSignalTimeframePriority = timeframePriority[newSignal.timeframe] || 1;
    const conflictTimeframePriority = timeframePriority[highestPriorityConflict.timeframe] || 1;
    
    if (newSignalTimeframePriority > conflictTimeframePriority) {
      return {
        approved: true,
        reason: `Higher timeframe priority (${newSignal.timeframe} > ${highestPriorityConflict.timeframe})`,
        conflicts
      };
    }
    
    // Default: Reject new signal
    return {
      approved: false,
      reason: `Conflicts with higher priority signal ${highestPriorityConflict.id} from ${highestPriorityConflict.strategyId}`,
      conflicts
    };
  }
}

export default StrategyManager;
