/**
 * BaseTrader - Abstract Base Class for All Trading Strategies
 * 
 * Enforces interface contracts and provides common functionality
 * to prevent architectural mismatches and ensure system stability.
 * 
 * All trading strategy classes MUST extend this base class.
 */

import { EventEmitter } from 'events';

export class BaseTrader extends EventEmitter {
  constructor(symbol, config = {}) {
    super();
    
    // Prevent direct instantiation of abstract class
    if (this.constructor === BaseTrader) {
      throw new TypeError('Abstract class "BaseTrader" cannot be instantiated directly.');
    }
    
    this.symbol = symbol;
    this.config = config;
    this.activePositions = new Map();
    this.isEnabled = true;
    
    // Common statistics tracking
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
    
    console.log(`🎯 ${this.constructor.name} initialized for ${symbol}`);
  }

  /**
   * REQUIRED METHOD: Update all active positions with current price
   * This method MUST be implemented by all child classes
   * @param {number} currentPrice - Current market price
   */
  updatePositions(currentPrice) {
    throw new Error(`Method "updatePositions(currentPrice)" must be implemented by ${this.constructor.name}`);
  }

  /**
   * REQUIRED METHOD: Handle incoming trading signals
   * This method MUST be implemented by all child classes
   * @param {object} signal - Trading signal object
   * @param {number} currentPrice - Current market price
   */
  onSignal(signal, currentPrice) {
    throw new Error(`Method "onSignal(signal, currentPrice)" must be implemented by ${this.constructor.name}`);
  }

  /**
   * REQUIRED METHOD: Get trading performance statistics
   * This method MUST be implemented by all child classes
   * @returns {object} Performance statistics
   */
  getStats() {
    throw new Error(`Method "getStats()" must be implemented by ${this.constructor.name}`);
  }

  /**
   * Common method: Generate unique position ID
   * @returns {string} Unique position identifier
   */
  generatePositionId() {
    return `${this.symbol}_${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Common method: Calculate unrealized P&L for a position
   * @param {object} position - Position object
   * @param {number} currentPrice - Current market price
   * @returns {number} Unrealized P&L as percentage
   */
  calculateUnrealizedPnL(position, currentPrice) {
    if (!position || !currentPrice) return 0;
    
    const { entryPrice, type, size } = position;
    
    if (type === 'LONG') {
      return ((currentPrice - entryPrice) / entryPrice) * 100;
    } else if (type === 'SHORT') {
      return ((entryPrice - currentPrice) / entryPrice) * 100;
    }
    
    return 0;
  }

  /**
   * Common method: Calculate realized P&L for a closed position
   * @param {object} position - Position object
   * @returns {number} Realized P&L as percentage
   */
  calculateRealizedPnL(position) {
    if (!position || !position.exitPrice) return 0;
    
    const { entryPrice, exitPrice, type } = position;
    
    if (type === 'LONG') {
      return ((exitPrice - entryPrice) / entryPrice) * 100;
    } else if (type === 'SHORT') {
      return ((entryPrice - exitPrice) / entryPrice) * 100;
    }
    
    return 0;
  }

  /**
   * Common method: Validate position object
   * @param {object} position - Position to validate
   * @returns {boolean} True if valid
   */
  validatePosition(position) {
    const requiredFields = ['id', 'symbol', 'type', 'entryPrice', 'size', 'timestamp'];
    
    for (const field of requiredFields) {
      if (!(field in position)) {
        console.error(`❌ Invalid position: missing field '${field}'`);
        return false;
      }
    }
    
    if (!['LONG', 'SHORT'].includes(position.type)) {
      console.error(`❌ Invalid position type: ${position.type}`);
      return false;
    }
    
    return true;
  }

  /**
   * Common method: Enable/disable trader
   * @param {boolean} enabled - Whether trader should be enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} ${this.constructor.name} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Common method: Check if trader is healthy and operational
   * @returns {boolean} True if trader is healthy
   */
  isHealthy() {
    return this.isEnabled && typeof this.updatePositions === 'function';
  }

  /**
   * Common method: Get basic trader information
   * @returns {object} Trader information
   */
  getInfo() {
    return {
      name: this.constructor.name,
      symbol: this.symbol,
      isEnabled: this.isEnabled,
      activePositions: this.activePositions.size,
      uptime: Math.floor((Date.now() - this.stats.startTime) / 1000),
      isHealthy: this.isHealthy()
    };
  }

  /**
   * Common method: Emergency shutdown
   * Closes all positions and disables trader
   */
  async emergencyShutdown(reason = 'Emergency shutdown') {
    console.warn(`🚨 ${this.constructor.name} emergency shutdown: ${reason}`);
    
    try {
      // Close all active positions
      for (const [positionId, position] of this.activePositions) {
        if (position.status === 'OPEN') {
          await this.closePosition(position, 'EMERGENCY_SHUTDOWN', position.currentPrice || position.entryPrice);
        }
      }
      
      this.setEnabled(false);
      this.emit('emergencyShutdown', { reason, trader: this.constructor.name });
      
    } catch (error) {
      console.error(`❌ Error during emergency shutdown of ${this.constructor.name}:`, error.message);
    }
  }
}

export default BaseTrader;
