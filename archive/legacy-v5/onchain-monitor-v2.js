/**
 * SentryCoin v5.0 - Enhanced On-Chain Intelligence v2
 * 
 * Macro-level on-chain analysis for ETH_UNWIND and other macro strategies:
 * - Exchange flow monitoring (net ETH flows to/from exchanges)
 * - Supply metrics tracking (inflation/deflation analysis)
 * - Network activity monitoring (gas prices, active addresses)
 * - Staking data analysis (staking inflows/outflows)
 */

import { EventEmitter } from 'events';
import axios from 'axios';
import { getISTTime, parseFloatEnv, parseIntEnv } from '../utils/index.js';

/**
 * On-chain data structure for macro analysis
 */
export class OnChainData {
  constructor() {
    this.exchangeFlows = {
      netFlow24h: 0,        // Net ETH flow to exchanges (positive = inflow)
      inflowSpike: false,   // Large inflow detected
      outflowSpike: false,  // Large outflow detected
      majorExchanges: {     // Per-exchange breakdown
        binance: 0,
        coinbase: 0,
        kraken: 0,
        okx: 0
      }
    };
    
    this.supplyMetrics = {
      totalSupply: 0,       // Current ETH supply
      isInflationary: false, // Supply increasing/decreasing
      burnRate: 0,          // ETH burn rate (ETH/day)
      stakingRatio: 0,      // Percentage of ETH staked
      circulatingSupply: 0  // Non-staked ETH supply
    };
    
    this.networkActivity = {
      avgGasPrice: 0,       // 24h average gas price (Gwei)
      gasSpike: false,      // Gas price spike detected
      activeAddresses: 0,   // Daily active addresses
      transactionCount: 0,  // Daily transaction count
      networkUtilization: 0 // Network capacity utilization %
    };
    
    this.stakingData = {
      totalStaked: 0,       // Total ETH staked
      stakingInflow: 0,     // New staking (24h)
      stakingOutflow: 0,    // Unstaking (24h)
      validatorCount: 0,    // Active validators
      stakingYield: 0       // Current staking yield %
    };
    
    this.alerts = [];       // Generated alerts
    this.lastUpdate = Date.now();
    this.symbol = 'ETH';
  }

  /**
   * Update exchange flow data
   */
  updateExchangeFlows(data) {
    this.exchangeFlows.netFlow24h = data.netFlow24h || 0;
    this.exchangeFlows.majorExchanges = data.majorExchanges || {};
    
    // Detect spikes (thresholds configurable)
    const inflowThreshold = 50000; // 50k ETH
    const outflowThreshold = -30000; // -30k ETH
    
    this.exchangeFlows.inflowSpike = this.exchangeFlows.netFlow24h > inflowThreshold;
    this.exchangeFlows.outflowSpike = this.exchangeFlows.netFlow24h < outflowThreshold;
    
    if (this.exchangeFlows.inflowSpike) {
      this.generateAlert('EXCHANGE_INFLOW_SPIKE', 
        `Large ETH inflow to exchanges: ${this.exchangeFlows.netFlow24h.toLocaleString()} ETH`);
    }
    
    if (this.exchangeFlows.outflowSpike) {
      this.generateAlert('EXCHANGE_OUTFLOW_SPIKE', 
        `Large ETH outflow from exchanges: ${Math.abs(this.exchangeFlows.netFlow24h).toLocaleString()} ETH`);
    }
  }

  /**
   * Update supply metrics
   */
  updateSupplyMetrics(data) {
    const previousSupply = this.supplyMetrics.totalSupply;
    this.supplyMetrics.totalSupply = data.totalSupply || 0;
    this.supplyMetrics.burnRate = data.burnRate || 0;
    this.supplyMetrics.stakingRatio = data.stakingRatio || 0;
    this.supplyMetrics.circulatingSupply = data.circulatingSupply || 0;
    
    // Determine if supply is inflationary
    if (previousSupply > 0) {
      const supplyChange = this.supplyMetrics.totalSupply - previousSupply;
      this.supplyMetrics.isInflationary = supplyChange > 0;
      
      if (this.supplyMetrics.isInflationary) {
        this.generateAlert('SUPPLY_INFLATION', 
          `ETH supply increasing: +${supplyChange.toFixed(2)} ETH`);
      } else if (supplyChange < -1000) { // Significant deflation
        this.generateAlert('SUPPLY_DEFLATION', 
          `ETH supply decreasing: ${supplyChange.toFixed(2)} ETH`);
      }
    }
  }

  /**
   * Update network activity metrics
   */
  updateNetworkActivity(data) {
    const previousGasPrice = this.networkActivity.avgGasPrice;
    this.networkActivity.avgGasPrice = data.avgGasPrice || 0;
    this.networkActivity.activeAddresses = data.activeAddresses || 0;
    this.networkActivity.transactionCount = data.transactionCount || 0;
    this.networkActivity.networkUtilization = data.networkUtilization || 0;
    
    // Detect gas price spikes
    const gasSpikeThreshold = 50; // 50 Gwei
    const gasSpikeMultiplier = 2.0; // 2x previous price
    
    this.networkActivity.gasSpike = 
      this.networkActivity.avgGasPrice > gasSpikeThreshold ||
      (previousGasPrice > 0 && this.networkActivity.avgGasPrice > previousGasPrice * gasSpikeMultiplier);
    
    if (this.networkActivity.gasSpike) {
      this.generateAlert('GAS_PRICE_SPIKE', 
        `Gas price spike: ${this.networkActivity.avgGasPrice.toFixed(1)} Gwei`);
    }
  }

  /**
   * Update staking data
   */
  updateStakingData(data) {
    this.stakingData.totalStaked = data.totalStaked || 0;
    this.stakingData.stakingInflow = data.stakingInflow || 0;
    this.stakingData.stakingOutflow = data.stakingOutflow || 0;
    this.stakingData.validatorCount = data.validatorCount || 0;
    this.stakingData.stakingYield = data.stakingYield || 0;
    
    // Detect significant staking changes
    const stakingChangeThreshold = 10000; // 10k ETH
    
    if (Math.abs(this.stakingData.stakingInflow) > stakingChangeThreshold) {
      this.generateAlert('STAKING_FLOW_CHANGE', 
        `Significant staking flow: ${this.stakingData.stakingInflow > 0 ? '+' : ''}${this.stakingData.stakingInflow.toLocaleString()} ETH`);
    }
  }

  /**
   * Generate alert
   */
  generateAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: Date.now(),
      istTime: getISTTime()
    };
    
    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Get summary for logging
   */
  getSummary() {
    return {
      exchangeFlows: {
        netFlow24h: `${this.exchangeFlows.netFlow24h >= 0 ? '+' : ''}${this.exchangeFlows.netFlow24h.toLocaleString()} ETH`,
        inflowSpike: this.exchangeFlows.inflowSpike,
        outflowSpike: this.exchangeFlows.outflowSpike
      },
      supply: {
        totalSupply: `${(this.supplyMetrics.totalSupply / 1e6).toFixed(2)}M ETH`,
        isInflationary: this.supplyMetrics.isInflationary,
        stakingRatio: `${this.supplyMetrics.stakingRatio.toFixed(1)}%`
      },
      network: {
        avgGasPrice: `${this.networkActivity.avgGasPrice.toFixed(1)} Gwei`,
        gasSpike: this.networkActivity.gasSpike,
        utilization: `${this.networkActivity.networkUtilization.toFixed(1)}%`
      },
      alertCount: this.alerts.length
    };
  }
}

/**
 * Enhanced On-Chain Monitor v2
 */
export class OnChainMonitorV2 extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = config;
    this.symbol = config.symbol || 'ETH';
    this.updateInterval = config.updateInterval || 600000; // 10 minutes
    this.enabled = config.enabled !== false;
    
    // Data storage
    this.data = new OnChainData();
    this.data.symbol = this.symbol;
    
    // API configurations
    this.apis = {
      glassnode: config.apis?.glassnode,
      cryptoquant: config.apis?.cryptoquant,
      nansen: config.apis?.nansen
    };
    
    // Update timer
    this.updateTimer = null;
    this.isRunning = false;
    
    // Statistics
    this.stats = {
      updatesCompleted: 0,
      updatesFailed: 0,
      lastSuccessfulUpdate: null,
      startTime: Date.now()
    };
    
    console.log(`🔗 On-Chain Monitor v2 initialized for ${this.symbol}`);
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ On-Chain Monitor v2 already running');
      return;
    }
    
    if (!this.enabled) {
      console.log('⚠️ On-Chain Monitor v2 disabled in config');
      return;
    }
    
    console.log('🚀 Starting On-Chain Monitor v2...');
    
    try {
      // Initial data fetch
      await this.updateAllData();
      
      // Set up periodic updates
      this.updateTimer = setInterval(() => {
        this.updateAllData().catch(error => {
          console.error('❌ On-chain update error:', error.message);
        });
      }, this.updateInterval);
      
      this.isRunning = true;
      console.log(`✅ On-Chain Monitor v2 started (${this.updateInterval / 1000}s intervals)`);
      
    } catch (error) {
      console.error('❌ Failed to start On-Chain Monitor v2:', error.message);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.isRunning = false;
    console.log('🛑 On-Chain Monitor v2 stopped');
  }

  /**
   * Update all on-chain data
   */
  async updateAllData() {
    try {
      console.log(`🔗 Updating on-chain data for ${this.symbol}...`);
      
      // Fetch data from multiple sources
      const [exchangeData, supplyData, networkData, stakingData] = await Promise.allSettled([
        this.fetchExchangeFlows(),
        this.fetchSupplyMetrics(),
        this.fetchNetworkActivity(),
        this.fetchStakingData()
      ]);
      
      // Update data
      if (exchangeData.status === 'fulfilled') {
        this.data.updateExchangeFlows(exchangeData.value);
      }
      
      if (supplyData.status === 'fulfilled') {
        this.data.updateSupplyMetrics(supplyData.value);
      }
      
      if (networkData.status === 'fulfilled') {
        this.data.updateNetworkActivity(networkData.value);
      }
      
      if (stakingData.status === 'fulfilled') {
        this.data.updateStakingData(stakingData.value);
      }
      
      this.data.lastUpdate = Date.now();
      this.stats.updatesCompleted++;
      this.stats.lastSuccessfulUpdate = Date.now();
      
      // Emit update event
      this.emit('dataUpdated', this.data);
      
      // Emit specific alerts
      const newAlerts = this.data.alerts.filter(alert => 
        alert.timestamp > (this.stats.lastSuccessfulUpdate - this.updateInterval)
      );
      
      newAlerts.forEach(alert => {
        this.emit(alert.type, alert);
      });
      
      // Log summary
      const summary = this.data.getSummary();
      console.log(`🔗 On-Chain Update: Flows ${summary.exchangeFlows.netFlow24h} | ` +
                 `Supply ${summary.supply.totalSupply} (${summary.supply.isInflationary ? 'Inflating' : 'Deflating'}) | ` +
                 `Gas ${summary.network.avgGasPrice}`);
      
    } catch (error) {
      this.stats.updatesFailed++;
      console.error('❌ On-chain data update failed:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * Fetch exchange flow data
   */
  async fetchExchangeFlows() {
    // This would integrate with real APIs (Glassnode, CryptoQuant, etc.)
    // For now, return mock data structure
    return {
      netFlow24h: 25000, // 25k ETH inflow
      majorExchanges: {
        binance: 12000,
        coinbase: 8000,
        kraken: 3000,
        okx: 2000
      }
    };
  }

  /**
   * Fetch supply metrics
   */
  async fetchSupplyMetrics() {
    // This would integrate with real APIs
    return {
      totalSupply: 120500000, // 120.5M ETH
      burnRate: -1500,        // Deflationary
      stakingRatio: 28.5,     // 28.5% staked
      circulatingSupply: 86157500
    };
  }

  /**
   * Fetch network activity data
   */
  async fetchNetworkActivity() {
    // This would integrate with real APIs
    return {
      avgGasPrice: 25.3,      // 25.3 Gwei
      activeAddresses: 450000,
      transactionCount: 1200000,
      networkUtilization: 65.2 // 65.2%
    };
  }

  /**
   * Fetch staking data
   */
  async fetchStakingData() {
    // This would integrate with real APIs
    return {
      totalStaked: 34342500,  // 34.3M ETH staked
      stakingInflow: 5000,    // 5k ETH new staking
      stakingOutflow: 2000,   // 2k ETH unstaking
      validatorCount: 1073000,
      stakingYield: 3.2       // 3.2% APR
    };
  }

  /**
   * Get current data
   */
  getData() {
    return this.data;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      isRunning: this.isRunning,
      lastUpdate: this.data.lastUpdate
    };
  }
}

export default OnChainMonitorV2;
