/**
 * SentryCoin v4.5 - Whale Watchlist Intelligence System
 *
 * Monitors specific whale addresses from top 50 holders forensic analysis
 * Implements three-tier threat level system for CASCADE_HUNTER strategy
 * Provides predictive intelligence based on on-chain whale movements
 */

import EventEmitter from 'events';
import axios from 'axios';
import { getISTTime, parseIntEnv } from '../utils/index.js';

export default class OnChainMonitor extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = config;
    this.symbol = 'SPK';
    this.contractAddress = '0x20F7A3DdF244dc9299975b4Da1C39F8D5D75f05A'; // SPK token contract
    this.isRunning = false;

    // API Configuration
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    this.moralisApiKey = process.env.MORALIS_API_KEY;
    this.alchemyApiKey = process.env.ALCHEMY_API_KEY;

    // v4.5 Whale Watchlist (Top 50 holders forensic analysis)
    this.whaleWatchlist = new Set([
      process.env.WHALE_ADDRESS_1?.toLowerCase(),
      process.env.WHALE_ADDRESS_2?.toLowerCase(),
      process.env.WHALE_ADDRESS_3?.toLowerCase(),
      process.env.WHALE_ADDRESS_4?.toLowerCase(),
      process.env.WHALE_ADDRESS_5?.toLowerCase(),
      process.env.WHALE_ADDRESS_6?.toLowerCase(),
      process.env.WHALE_ADDRESS_7?.toLowerCase(),
      process.env.WHALE_ADDRESS_8?.toLowerCase(),
    ].filter(addr => addr && addr !== 'undefined'));

    // v4.6 Predatory State Machine Thresholds
    this.whaleHuntTriggerThreshold = parseIntEnv('WHALE_HUNT_TRIGGER_THRESHOLD', 3000000); // 3M SPK triggers hunt
    this.whaleHuntModeDurationHours = parseIntEnv('WHALE_HUNT_MODE_DURATION_HOURS', 12);   // 12 hours hunt mode
    this.dumpValidityHours = parseIntEnv('WHALE_DUMP_VALIDITY_HOURS', 6);
    this.monitoringInterval = parseIntEnv('ONCHAIN_MONITORING_INTERVAL', 15000);

    // v4.6 Predatory State Machine (4 States)
    this.systemState = 'PATIENT';  // PATIENT, HUNTING, STRIKE, DEFENSIVE
    this.huntModeStartTime = 0;
    this.lastWhaleActivity = 0;
    this.stateHistory = [];
    this.recentDumps = [];

    // Legacy threat level (for backward compatibility)
    this.threatLevel = 'LOW';
    this.lastThreatUpdate = 0;
    this.threatHistory = [];

    // Known exchange addresses (major CEX deposit addresses)
    this.exchangeAddresses = new Set([
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance 14
      '0xd551234ae421e3bcba99a0da6d736074f22192ff', // Binance 15
      '0x564286362092d8e7936f0549571a803b203aaced', // Binance 16
      '0x0681d8db095565fe8a346fa0277bffde9c0edbbf', // Binance 17
      '0xfe9e8709d3215310075d67e3ed32a380ccf451c8', // Coinbase 6
      '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', // Coinbase 10
      '0x77696bb39917c91a0c3908d577d5e322095425ca', // Gate.io 1
      '0x1c4b70a3968436b9a0a9cf5205c787eb81bb558c', // Gate.io 2
      '0x7793cd85c11a924478d358d49b05b37e91b5810f', // Bybit 1
      '0x5861b8446a2f6e19a067874c133f04c578928727', // KuCoin 1
      '0x689c56aef474df92d44a1b70850f808488f9769c', // KuCoin 2
      '0x46340b20830761efd32832a74d7169b29feb9758', // Crypto.com 1
      '0x72a53cdbbcc1b9efa39c834a540550e23463aacb', // Crypto.com 2
    ]);

    console.log('🔗 Whale Watchlist Monitor v4.5 initialized');
    console.log(`   🐋 Monitoring ${this.whaleWatchlist.size} whale addresses from top 50 holders`);
    console.log(`   🚨 HIGH threat: ${(this.whaleDumpThresholdHigh/1000).toFixed(0)}k from watchlist`);
    console.log(`   ⚠️ MEDIUM threat: ${(this.whaleDumpThresholdMedium/1000000).toFixed(1)}M from others`);
    console.log(`   ⏰ Check interval: ${this.monitoringInterval/1000}s`);
    console.log(`   📡 APIs: ${this.etherscanApiKey ? 'Etherscan ✅' : ''} ${this.moralisApiKey ? 'Moralis ✅' : ''} ${this.alchemyApiKey ? 'Alchemy ✅' : ''}`);
  }

  /**
   * Start monitoring on-chain activity
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ On-chain monitor already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting on-chain monitoring...');

    // Start monitoring loop
    this.monitoringLoop();
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;
    console.log('⏹️ On-chain monitoring stopped');
  }

  /**
   * Main monitoring loop
   */
  async monitoringLoop() {
    while (this.isRunning) {
      try {
        await this.checkForWhaleMovements();
        await this.sleep(this.monitoringInterval);
      } catch (error) {
        console.error('❌ On-chain monitoring error:', error.message);
        await this.sleep(this.monitoringInterval * 2); // Back off on error
      }
    }
  }

  /**
   * Check for whale movements using watchlist intelligence
   */
  async checkForWhaleMovements() {
    const promises = [];

    // Primary: Etherscan API for whale watchlist monitoring
    if (this.etherscanApiKey) {
      promises.push(this.checkWatchlistMovements());
    }

    // Secondary: General whale movement detection
    if (this.moralisApiKey) {
      promises.push(this.checkMoralisTransactions());
    }

    if (this.alchemyApiKey) {
      promises.push(this.checkAlchemyTransactions());
    }

    // Fallback: Mock data for testing
    if (!this.etherscanApiKey && !this.moralisApiKey && !this.alchemyApiKey) {
      promises.push(this.checkMockWhaleData());
    }

    const results = await Promise.allSettled(promises);

    // Process results and update threat level
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Whale check ${index} failed:`, result.reason);
      }
    });

    // v4.6: Update predatory state machine
    this.updateSystemState();
  }

  /**
   * v4.5 CORE: Monitor specific whale addresses from watchlist
   */
  async checkWatchlistMovements() {
    if (!this.etherscanApiKey) return;

    for (const whaleAddress of this.whaleWatchlist) {
      try {
        await this.checkSpecificWhaleAddress(whaleAddress);
        await this.sleep(200); // Rate limiting: 5 calls/sec
      } catch (error) {
        console.error(`❌ Failed to check whale ${whaleAddress}:`, error.message);
      }
    }
  }

  /**
   * Check specific whale address for exchange deposits
   */
  async checkSpecificWhaleAddress(whaleAddress) {
    try {
      const response = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'tokentx',
          contractaddress: this.contractAddress,
          address: whaleAddress,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.etherscanApiKey
        },
        timeout: 10000
      });

      const transactions = response.data.result || [];

      // Check recent transactions (last 10)
      for (const tx of transactions.slice(0, 10)) {
        const amount = parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || 18));
        const isToExchange = this.exchangeAddresses.has(tx.to.toLowerCase());
        const isFromWatchlist = this.whaleWatchlist.has(tx.from.toLowerCase());

        if (isToExchange && isFromWatchlist && amount >= this.whaleDumpThresholdHigh) {
          await this.processWatchlistDump(tx, amount, 'HIGH');
        }
      }

    } catch (error) {
      console.error(`❌ Etherscan API error for ${whaleAddress}:`, error.message);
    }
  }

  /**
   * FREE Option 1: Check Etherscan API for large SPK movements
   * Free tier: 5 calls/second, 100k calls/day
   */
  async checkEtherscanTransactions() {
    if (!this.etherscanApiKey) return;

    try {
      // Get recent transactions for SPK token contract
      const response = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'tokentx',
          contractaddress: '0x...', // SPK token contract address (need real address)
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.etherscanApiKey
        },
        timeout: 10000
      });

      const transactions = response.data.result || [];

      for (const tx of transactions.slice(0, 50)) { // Check last 50 transactions
        const amount = parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));

        if (amount >= this.whaleThreshold) {
          await this.processEtherscanTransaction(tx, amount);
        }
      }

    } catch (error) {
      console.error('❌ Etherscan API error:', error.message);
    }
  }

  /**
   * FREE Option 2: Check Moralis API for whale movements
   * Free tier: 40k requests/month
   */
  async checkMoralisTransactions() {
    if (!this.moralisApiKey) return;

    try {
      const response = await axios.get('https://deep-index.moralis.io/api/v2/erc20/transfers', {
        params: {
          chain: 'eth',
          address: '0x...', // SPK token contract address
          limit: 50
        },
        headers: {
          'X-API-Key': this.moralisApiKey
        },
        timeout: 10000
      });

      const transfers = response.data.result || [];

      for (const transfer of transfers) {
        const amount = parseInt(transfer.value) / Math.pow(10, transfer.token_decimals);

        if (amount >= this.whaleThreshold) {
          await this.processMoralisTransaction(transfer, amount);
        }
      }

    } catch (error) {
      console.error('❌ Moralis API error:', error.message);
    }
  }

  /**
   * FREE Option 3: Check Alchemy API for whale movements
   * Free tier: 300M compute units/month
   */
  async checkAlchemyTransactions() {
    if (!this.alchemyApiKey) return;

    try {
      const response = await axios.post(`https://eth-mainnet.alchemyapi.io/v2/${this.alchemyApiKey}`, {
        jsonrpc: '2.0',
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: 'latest',
          toBlock: 'latest',
          contractAddresses: ['0x...'], // SPK token contract
          category: ['erc20'],
          maxCount: 50
        }],
        id: 1
      }, {
        timeout: 10000
      });

      const transfers = response.data.result?.transfers || [];

      for (const transfer of transfers) {
        const amount = parseFloat(transfer.value);

        if (amount >= this.whaleThreshold) {
          await this.processAlchemyTransaction(transfer, amount);
        }
      }

    } catch (error) {
      console.error('❌ Alchemy API error:', error.message);
    }
  }

  /**
   * Process whale dump from watchlist (HIGH threat)
   */
  async processWatchlistDump(tx, amount, threatLevel) {
    const dumpData = {
      amount,
      from: tx.from,
      to: tx.to,
      timestamp: parseInt(tx.timeStamp) * 1000,
      hash: tx.hash,
      threatLevel,
      isWatchlistWhale: true,
      source: 'WATCHLIST_ETHERSCAN'
    };

    this.recentDumps.push(dumpData);
    console.log(`🚨 ${threatLevel} THREAT: Watchlist whale ${tx.from.substring(0,8)}... dumped ${(amount/1000).toFixed(0)}k SPK to exchange`);

    this.emit('WHALE_DUMP', dumpData);
    this.cleanupOldDumps();
  }

  /**
   * v4.6 PREDATORY STATE MACHINE - Core intelligence system
   */
  updateSystemState() {
    const now = Date.now();
    const validityWindow = this.dumpValidityHours * 60 * 60 * 1000;
    const recentDumps = this.recentDumps.filter(dump => now - dump.timestamp < validityWindow);

    let newState = this.systemState;

    // Check for whale hunt trigger (State 1 → State 2)
    const significantDumps = recentDumps.filter(dump =>
      dump.amount >= this.whaleHuntTriggerThreshold
    );

    if (significantDumps.length > 0 && this.systemState === 'PATIENT') {
      newState = 'HUNTING';
      this.huntModeStartTime = now;
      this.lastWhaleActivity = now;

      console.log(`🎯 ENTERING HUNT MODE: ${significantDumps.length} whale dump(s) detected`);
      console.log(`   🐋 Largest dump: ${(Math.max(...significantDumps.map(d => d.amount))/1000000).toFixed(1)}M SPK`);
      console.log(`   ⏰ Hunt mode duration: ${this.whaleHuntModeDurationHours} hours`);
    }

    // Check hunt mode expiration (State 2 → State 1)
    if (this.systemState === 'HUNTING') {
      const huntDuration = now - this.huntModeStartTime;
      const huntModeExpiry = this.whaleHuntModeDurationHours * 60 * 60 * 1000;

      if (huntDuration > huntModeExpiry) {
        newState = 'PATIENT';
        console.log(`⏰ HUNT MODE EXPIRED: Returning to patient monitoring`);
      }
    }

    // Update state if changed
    if (newState !== this.systemState) {
      const previousState = this.systemState;
      this.systemState = newState;

      this.stateHistory.push({
        timestamp: now,
        previousState,
        newState,
        triggerDumps: significantDumps.length,
        huntDuration: this.systemState === 'HUNTING' ? 0 : now - this.huntModeStartTime
      });

      this.emit('SYSTEM_STATE_CHANGE', {
        state: newState,
        previousState,
        timestamp: now,
        huntModeActive: newState === 'HUNTING',
        recentDumps: recentDumps.length
      });
    }

    // Legacy threat level update for backward compatibility
    this.updateLegacyThreatLevel(recentDumps);
  }

  /**
   * Legacy threat level system (for backward compatibility)
   */
  updateLegacyThreatLevel(recentDumps) {
    const now = Date.now();
    let newThreatLevel = 'LOW';

    // Map system state to threat level
    switch (this.systemState) {
      case 'HUNTING':
        newThreatLevel = 'HIGH';
        break;
      case 'STRIKE':
        newThreatLevel = 'HIGH';
        break;
      case 'DEFENSIVE':
        newThreatLevel = 'MEDIUM';
        break;
      default:
        newThreatLevel = 'LOW';
    }

    // Update threat level if changed
    if (newThreatLevel !== this.threatLevel) {
      const previousLevel = this.threatLevel;
      this.threatLevel = newThreatLevel;
      this.lastThreatUpdate = now;

      this.threatHistory.push({
        timestamp: now,
        previousLevel,
        newLevel: newThreatLevel,
        systemState: this.systemState,
        triggerDumps: recentDumps.length
      });
    }
  }

  /**
   * v4.6 Get current system state for predatory trading
   */
  getSystemState() {
    const now = Date.now();
    const huntModeTimeRemaining = this.systemState === 'HUNTING'
      ? Math.max(0, (this.whaleHuntModeDurationHours * 60 * 60 * 1000) - (now - this.huntModeStartTime))
      : 0;

    return {
      state: this.systemState,
      huntModeActive: this.systemState === 'HUNTING',
      huntModeTimeRemaining: Math.floor(huntModeTimeRemaining / 1000), // seconds
      lastWhaleActivity: this.lastWhaleActivity,
      recentDumps: this.recentDumps.length,
      allowTrading: this.systemState === 'HUNTING', // Only trade in HUNTING mode
      stateHistory: this.stateHistory.slice(-5) // Last 5 state changes
    };
  }

  /**
   * Get current threat level for CASCADE_HUNTER strategy (legacy compatibility)
   */
  getThreatLevel() {
    const systemState = this.getSystemState();

    return {
      level: this.threatLevel,
      lastUpdate: this.lastThreatUpdate,
      recentDumps: this.recentDumps.length,
      isValid: Date.now() - this.lastThreatUpdate < (this.dumpValidityHours * 60 * 60 * 1000),
      // v4.6 additions
      systemState: systemState.state,
      huntModeActive: systemState.huntModeActive,
      allowTrading: systemState.allowTrading
    };
  }

  /**
   * Check if system is in predatory hunt mode
   */
  isInHuntMode() {
    return this.systemState === 'HUNTING';
  }

  /**
   * Force system into defensive mode (for SHAKEOUT protection)
   */
  enterDefensiveMode(reason = 'Manual trigger') {
    if (this.systemState !== 'DEFENSIVE') {
      const previousState = this.systemState;
      this.systemState = 'DEFENSIVE';

      console.log(`🛡️ ENTERING DEFENSIVE MODE: ${reason}`);

      this.stateHistory.push({
        timestamp: Date.now(),
        previousState,
        newState: 'DEFENSIVE',
        reason,
        manual: true
      });

      this.emit('DEFENSIVE_MODE_ACTIVATED', {
        reason,
        previousState,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process Moralis transaction
   */
  async processMoralisTransaction(transfer, amount) {
    const isExchangeInflow = this.exchangeAddresses.has(transfer.to_address.toLowerCase());

    if (isExchangeInflow) {
      console.log(`🐋 MORALIS: ${amount} SPK whale inflow detected`);

      const inflowData = {
        amount,
        from: transfer.from_address,
        to: transfer.to_address,
        timestamp: new Date(transfer.block_timestamp).getTime(),
        hash: transfer.transaction_hash,
        type: 'EXCHANGE_INFLOW',
        source: 'MORALIS'
      };

      this.recentInflows.push(inflowData);
      this.emit('WHALE_INFLOW', inflowData);
      this.cleanupOldInflows();
    }
  }

  /**
   * Process Alchemy transaction
   */
  async processAlchemyTransaction(transfer, amount) {
    const isExchangeInflow = this.exchangeAddresses.has(transfer.to.toLowerCase());

    if (isExchangeInflow) {
      console.log(`🐋 ALCHEMY: ${amount} SPK whale inflow detected`);

      const inflowData = {
        amount,
        from: transfer.from,
        to: transfer.to,
        timestamp: Date.now(), // Alchemy doesn't provide timestamp in this format
        hash: transfer.hash,
        type: 'EXCHANGE_INFLOW',
        source: 'ALCHEMY'
      };

      this.recentInflows.push(inflowData);
      this.emit('WHALE_INFLOW', inflowData);
      this.cleanupOldInflows();
    }
  }

  /**
   * Mock whale data for testing (remove in production)
   */
  async checkMockWhaleData() {
    // This is for testing purposes - would be removed in production
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      const mockInflow = {
        amount: 5000000, // 5M SPK
        from: '0xmockwhale...',
        to: '0xbinance...',
        timestamp: Date.now(),
        hash: '0xmockhash...',
        type: 'EXCHANGE_INFLOW'
      };
      
      console.log('🧪 MOCK: Simulating whale inflow for testing');
      this.emit('WHALE_INFLOW', mockInflow);
    }
  }

  /**
   * Get recent whale inflows
   */
  getRecentInflows(timeWindowMs = 12 * 60 * 60 * 1000) { // 12 hours default
    const cutoff = Date.now() - timeWindowMs;
    return this.recentInflows.filter(inflow => inflow.timestamp > cutoff);
  }

  /**
   * Check if there are recent whale inflows
   */
  hasRecentWhaleInflows(timeWindowMs = 12 * 60 * 60 * 1000) {
    return this.getRecentInflows(timeWindowMs).length > 0;
  }

  /**
   * Get total recent inflow amount
   */
  getTotalRecentInflows(timeWindowMs = 12 * 60 * 60 * 1000) {
    return this.getRecentInflows(timeWindowMs)
      .reduce((total, inflow) => total + inflow.amount, 0);
  }

  /**
   * Clean up old dump records
   */
  cleanupOldDumps() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - maxAge;

    this.recentDumps = this.recentDumps.filter(dump => dump.timestamp > cutoff);
    this.threatHistory = this.threatHistory.filter(event => event.timestamp > cutoff);
  }

  /**
   * Utility function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    const validityWindow = this.dumpValidityHours * 60 * 60 * 1000;
    const recentDumps = this.recentDumps.filter(dump =>
      Date.now() - dump.timestamp < validityWindow
    );

    const watchlistDumps = recentDumps.filter(dump => dump.isWatchlistWhale);
    const totalDumpAmount = recentDumps.reduce((sum, dump) => sum + dump.amount, 0);

    return {
      isRunning: this.isRunning,
      threatLevel: this.threatLevel,
      lastThreatUpdate: new Date(this.lastThreatUpdate).toISOString(),
      whaleWatchlistSize: this.whaleWatchlist.size,
      recentDumpCount: recentDumps.length,
      watchlistDumpCount: watchlistDumps.length,
      totalRecentDumpAmount: totalDumpAmount,
      hasHighThreat: this.threatLevel === 'HIGH',
      hasMediumThreat: this.threatLevel === 'MEDIUM',
      threatHistory: this.threatHistory.slice(-5), // Last 5 threat changes
      lastChecked: new Date().toISOString()
    };
  }
}
