/**
 * SentryCoin v4.4 - On-Chain Monitoring Service
 * 
 * Monitors whale movements and exchange inflows for SPKUSDT
 * Based on forensic finding: "Exchange inflows historically precede double-digit draw-downs"
 */

import EventEmitter from 'events';
import axios from 'axios';

export default class OnChainMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = config;
    this.symbol = 'SPK';
    this.isRunning = false;
    
    // FREE whale monitoring alternatives
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY; // Free tier: 5 calls/sec
    this.moralisApiKey = process.env.MORALIS_API_KEY;     // Free tier: 40k requests/month
    this.alchemyApiKey = process.env.ALCHEMY_API_KEY;     // Free tier: 300M compute units/month

    // Enable free monitoring if any API key is available
    this.freeMonitoringEnabled = !!(this.etherscanApiKey || this.moralisApiKey || this.alchemyApiKey);
    
    // Monitoring thresholds
    this.whaleThreshold = parseInt(process.env.WHALE_INFLOW_THRESHOLD || '3000000'); // 3M SPK
    this.monitoringInterval = parseInt(process.env.ONCHAIN_MONITORING_INTERVAL || '60000'); // 1 minute
    
    // Known exchange addresses for SPK (would need to be populated with real addresses)
    this.exchangeAddresses = new Set([
      // Binance hot wallets
      '0x...',  // Would need real addresses
      // Coinbase
      '0x...',
      // Other major exchanges
    ]);
    
    // Tracking state
    this.lastCheckedTimestamp = Date.now();
    this.recentInflows = [];
    
    console.log('🔗 On-Chain Monitor initialized');
    console.log(`   🐋 Whale threshold: ${this.whaleThreshold} SPK`);
    console.log(`   ⏰ Check interval: ${this.monitoringInterval}ms`);
    console.log(`   📡 Free monitoring: ${this.freeMonitoringEnabled ? 'Enabled' : 'Disabled'}`);
    if (this.etherscanApiKey) console.log(`   🔍 Etherscan API: Available`);
    if (this.moralisApiKey) console.log(`   🔍 Moralis API: Available`);
    if (this.alchemyApiKey) console.log(`   🔍 Alchemy API: Available`);
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
   * Check for whale movements using FREE APIs
   */
  async checkForWhaleMovements() {
    const promises = [];

    // FREE Option 1: Etherscan API (most reliable)
    if (this.etherscanApiKey) {
      promises.push(this.checkEtherscanTransactions());
    }

    // FREE Option 2: Moralis API (good for multi-chain)
    if (this.moralisApiKey) {
      promises.push(this.checkMoralisTransactions());
    }

    // FREE Option 3: Alchemy API (high performance)
    if (this.alchemyApiKey) {
      promises.push(this.checkAlchemyTransactions());
    }

    // Fallback: Mock data for testing
    if (!this.freeMonitoringEnabled) {
      promises.push(this.checkMockWhaleData());
    }

    const results = await Promise.allSettled(promises);

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Whale check ${index} failed:`, result.reason);
      }
    });
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
   * Process Etherscan transaction
   */
  async processEtherscanTransaction(tx, amount) {
    const isExchangeInflow = this.exchangeAddresses.has(tx.to.toLowerCase());
    const isExchangeOutflow = this.exchangeAddresses.has(tx.from.toLowerCase());

    if (isExchangeInflow) {
      console.log(`🐋 ETHERSCAN: ${amount} SPK whale inflow detected`);

      const inflowData = {
        amount,
        from: tx.from,
        to: tx.to,
        timestamp: parseInt(tx.timeStamp) * 1000,
        hash: tx.hash,
        type: 'EXCHANGE_INFLOW',
        source: 'ETHERSCAN'
      };

      this.recentInflows.push(inflowData);
      this.emit('WHALE_INFLOW', inflowData);
      this.cleanupOldInflows();
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
   * Clean up old inflow records
   */
  cleanupOldInflows() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - maxAge;
    
    this.recentInflows = this.recentInflows.filter(inflow => inflow.timestamp > cutoff);
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
    const recentInflows = this.getRecentInflows();
    const totalRecentAmount = this.getTotalRecentInflows();
    
    return {
      isRunning: this.isRunning,
      whaleAlertEnabled: this.whaleAlertEnabled,
      recentInflowCount: recentInflows.length,
      totalRecentInflowAmount: totalRecentAmount,
      hasRecentInflows: recentInflows.length > 0,
      lastChecked: new Date(this.lastCheckedTimestamp).toISOString()
    };
  }
}
