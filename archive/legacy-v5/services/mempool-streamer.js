/**
 * SentryCoin v6.0 - Real-Time Mempool Streamer
 * 
 * PROJECT PHOENIX - MANDATE 2 IMPLEMENTATION
 * 
 * Replaces polling-based on-chain monitor with event-driven mempool streaming
 * for millisecond-latency whale intent detection.
 * 
 * RED TEAM MANDATE: "Decommission polling. Implement real-time mempool firehose."
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import axios from 'axios';
import { getISTTime } from '../utils/index.js';

/**
 * Whale Intent Detection Event
 */
export class WhaleIntentEvent {
  constructor(data) {
    this.id = `whale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.whaleAddress = data.whaleAddress;
    this.transactionHash = data.transactionHash;
    this.intentType = data.intentType; // 'EXCHANGE_DEPOSIT', 'LARGE_TRANSFER', 'DEX_SWAP'
    this.estimatedValue = data.estimatedValue;
    this.targetExchange = data.targetExchange;
    this.confidence = data.confidence;
    this.detectionLatency = data.detectionLatency;
    this.timestamp = Date.now();
    this.istTime = getISTTime();
    this.status = 'PENDING'; // PENDING -> CONFIRMED -> EXECUTED
  }

  /**
   * Calculate threat level based on whale activity
   */
  getThreatLevel() {
    if (this.intentType === 'EXCHANGE_DEPOSIT' && this.estimatedValue > 10000000) {
      return 'CRITICAL'; // >$10M exchange deposit
    }
    if (this.intentType === 'EXCHANGE_DEPOSIT' && this.estimatedValue > 1000000) {
      return 'HIGH'; // >$1M exchange deposit
    }
    if (this.intentType === 'LARGE_TRANSFER' && this.estimatedValue > 5000000) {
      return 'MEDIUM'; // >$5M transfer
    }
    return 'LOW';
  }
}

/**
 * Real-Time Mempool Streamer - Core Engine
 */
export default class MempoolStreamer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = config;
    this.symbol = config.symbol || 'ETH';
    
    // Provider configuration (priority order)
    this.providers = {
      blocknative: {
        enabled: !!process.env.BLOCKNATIVE_API_KEY,
        apiKey: process.env.BLOCKNATIVE_API_KEY,
        wsUrl: 'wss://api.blocknative.com/v0',
        priority: 1
      },
      alchemy: {
        enabled: !!process.env.ALCHEMY_API_KEY,
        apiKey: process.env.ALCHEMY_API_KEY,
        wsUrl: `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        priority: 2
      },
      custom: {
        enabled: !!process.env.CUSTOM_GETH_WS,
        wsUrl: process.env.CUSTOM_GETH_WS,
        priority: 3
      }
    };
    
    // Whale watchlist (loaded from environment or config)
    this.whaleWatchlist = new Set(this.loadWhaleWatchlist());
    
    // Exchange address detection
    this.exchangeAddresses = new Map([
      ['0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', 'BINANCE'],
      ['0xd551234ae421e3bcba99a0da6d736074f22192ff', 'BINANCE'],
      ['0x564286362092d8e7936f0549571a803b203aaced', 'BINANCE'],
      ['0xa910f92acdaf488fa6ef02174fb86208ad7722ba', 'COINBASE'],
      ['0x71660c4005ba85c37ccec55d0c4493e66fe775d3', 'COINBASE'],
      ['0x503828976d22510aad0201ac7ec88293211d23da', 'COINBASE'],
      ['0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', 'OKEX'],
      ['0x236f9f97e0e62388479bf9e5ba4889e46b0273c3', 'OKEX']
    ]);
    
    // Connection state
    this.connections = new Map();
    this.isStreaming = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    // Performance tracking
    this.stats = {
      totalTransactions: 0,
      whaleTransactions: 0,
      intentsDetected: 0,
      avgDetectionLatency: 0,
      connectionUptime: 0,
      startTime: Date.now(),
      lastWhaleActivity: null
    };
    
    console.log(`🔥 Mempool Streamer v6.0 initialized for ${this.symbol}`);
    console.log(`👁️ Monitoring ${this.whaleWatchlist.size} whale addresses`);
    console.log(`🏢 Tracking ${this.exchangeAddresses.size} exchange addresses`);
  }

  /**
   * Start real-time mempool streaming
   */
  async start() {
    console.log('🚀 Starting real-time mempool streaming...');
    
    // Try providers in priority order
    const sortedProviders = Object.entries(this.providers)
      .filter(([name, config]) => config.enabled)
      .sort(([, a], [, b]) => a.priority - b.priority);
    
    if (sortedProviders.length === 0) {
      throw new Error('No mempool providers configured. Set BLOCKNATIVE_API_KEY, ALCHEMY_API_KEY, or CUSTOM_GETH_WS');
    }
    
    for (const [providerName, providerConfig] of sortedProviders) {
      try {
        await this.connectToProvider(providerName, providerConfig);
        console.log(`✅ Connected to ${providerName.toUpperCase()} mempool stream`);
        break;
      } catch (error) {
        console.error(`❌ Failed to connect to ${providerName}:`, error.message);
        continue;
      }
    }
    
    if (!this.isStreaming) {
      throw new Error('Failed to connect to any mempool provider');
    }
    
    this.stats.startTime = Date.now();
    console.log('🎯 Mempool streaming active - whale intent detection enabled');
  }

  /**
   * Connect to specific mempool provider
   */
  async connectToProvider(providerName, config) {
    switch (providerName) {
      case 'blocknative':
        return this.connectBlocknative(config);
      case 'alchemy':
        return this.connectAlchemy(config);
      case 'custom':
        return this.connectCustomGeth(config);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Connect to Blocknative mempool stream
   */
  async connectBlocknative(config) {
    const ws = new WebSocket(config.wsUrl);
    
    ws.on('open', () => {
      // Subscribe to pending transactions
      const subscription = {
        categoryCode: 'initialize',
        eventCode: 'checkDappId',
        dappId: config.apiKey
      };
      ws.send(JSON.stringify(subscription));
      
      // Subscribe to mempool
      const mempoolSub = {
        categoryCode: 'configs',
        eventCode: 'put',
        config: {
          scope: 'global',
          filters: [{
            status: 'pending'
          }],
          watchAddress: Array.from(this.whaleWatchlist)
        }
      };
      ws.send(JSON.stringify(mempoolSub));
      
      this.isStreaming = true;
      this.connections.set('blocknative', ws);
    });
    
    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        this.processBlocknativeEvent(event);
      } catch (error) {
        console.error('Error processing Blocknative event:', error.message);
      }
    });
    
    ws.on('error', (error) => {
      console.error('Blocknative WebSocket error:', error.message);
      this.handleConnectionError('blocknative');
    });
    
    ws.on('close', () => {
      console.warn('Blocknative connection closed');
      this.handleConnectionClose('blocknative');
    });
  }

  /**
   * Connect to Alchemy mempool stream
   */
  async connectAlchemy(config) {
    const ws = new WebSocket(config.wsUrl);
    
    ws.on('open', () => {
      // Subscribe to pending transactions
      const subscription = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newPendingTransactions', true] // Include transaction details
      };
      ws.send(JSON.stringify(subscription));
      
      this.isStreaming = true;
      this.connections.set('alchemy', ws);
    });
    
    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        this.processAlchemyEvent(event);
      } catch (error) {
        console.error('Error processing Alchemy event:', error.message);
      }
    });
    
    ws.on('error', (error) => {
      console.error('Alchemy WebSocket error:', error.message);
      this.handleConnectionError('alchemy');
    });
    
    ws.on('close', () => {
      console.warn('Alchemy connection closed');
      this.handleConnectionClose('alchemy');
    });
  }

  /**
   * Connect to custom Geth node
   */
  async connectCustomGeth(config) {
    const ws = new WebSocket(config.wsUrl);
    
    ws.on('open', () => {
      // Subscribe to pending transactions
      const subscription = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newPendingTransactions']
      };
      ws.send(JSON.stringify(subscription));
      
      this.isStreaming = true;
      this.connections.set('custom', ws);
    });
    
    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        this.processGethEvent(event);
      } catch (error) {
        console.error('Error processing Geth event:', error.message);
      }
    });
    
    ws.on('error', (error) => {
      console.error('Custom Geth WebSocket error:', error.message);
      this.handleConnectionError('custom');
    });
    
    ws.on('close', () => {
      console.warn('Custom Geth connection closed');
      this.handleConnectionClose('custom');
    });
  }

  /**
   * Process Blocknative mempool events
   */
  processBlocknativeEvent(event) {
    if (event.status !== 'pending') return;
    
    this.stats.totalTransactions++;
    
    const transaction = event.transaction;
    if (!transaction) return;
    
    // Check if transaction involves watched whale address
    const whaleAddress = this.isWhaleTransaction(transaction.from, transaction.to);
    if (!whaleAddress) return;
    
    this.stats.whaleTransactions++;
    
    // Analyze transaction intent
    const intent = this.analyzeTransactionIntent(transaction, whaleAddress);
    if (intent) {
      this.emitWhaleIntent(intent);
    }
  }

  /**
   * Process Alchemy mempool events
   */
  processAlchemyEvent(event) {
    if (!event.params || !event.params.result) return;
    
    this.stats.totalTransactions++;
    
    const transaction = event.params.result;
    
    // Check if transaction involves watched whale address
    const whaleAddress = this.isWhaleTransaction(transaction.from, transaction.to);
    if (!whaleAddress) return;
    
    this.stats.whaleTransactions++;
    
    // Analyze transaction intent
    const intent = this.analyzeTransactionIntent(transaction, whaleAddress);
    if (intent) {
      this.emitWhaleIntent(intent);
    }
  }

  /**
   * Process custom Geth events
   */
  async processGethEvent(event) {
    if (!event.params || !event.params.result) return;
    
    this.stats.totalTransactions++;
    
    const txHash = event.params.result;
    
    // Fetch full transaction details
    try {
      const txDetails = await this.getTransactionDetails(txHash);
      if (!txDetails) return;
      
      // Check if transaction involves watched whale address
      const whaleAddress = this.isWhaleTransaction(txDetails.from, txDetails.to);
      if (!whaleAddress) return;
      
      this.stats.whaleTransactions++;
      
      // Analyze transaction intent
      const intent = this.analyzeTransactionIntent(txDetails, whaleAddress);
      if (intent) {
        this.emitWhaleIntent(intent);
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error.message);
    }
  }

  /**
   * Check if transaction involves whale address
   */
  isWhaleTransaction(from, to) {
    const fromLower = from?.toLowerCase();
    const toLower = to?.toLowerCase();
    
    for (const whaleAddress of this.whaleWatchlist) {
      const whaleLower = whaleAddress.toLowerCase();
      if (fromLower === whaleLower || toLower === whaleLower) {
        return whaleAddress;
      }
    }
    
    return null;
  }

  /**
   * Analyze transaction to determine whale intent
   */
  analyzeTransactionIntent(transaction, whaleAddress) {
    const { from, to, value, data } = transaction;
    const valueEth = parseInt(value, 16) / 1e18;
    const valueUSD = valueEth * 3500; // Approximate ETH price
    
    // Detect exchange deposits
    const targetExchange = this.exchangeAddresses.get(to?.toLowerCase());
    if (targetExchange) {
      return new WhaleIntentEvent({
        whaleAddress,
        transactionHash: transaction.hash,
        intentType: 'EXCHANGE_DEPOSIT',
        estimatedValue: valueUSD,
        targetExchange,
        confidence: 0.95,
        detectionLatency: Date.now() - this.stats.startTime
      });
    }
    
    // Detect large transfers
    if (valueUSD > 1000000) { // >$1M transfer
      return new WhaleIntentEvent({
        whaleAddress,
        transactionHash: transaction.hash,
        intentType: 'LARGE_TRANSFER',
        estimatedValue: valueUSD,
        targetExchange: null,
        confidence: 0.8,
        detectionLatency: Date.now() - this.stats.startTime
      });
    }
    
    // Detect DEX interactions (simplified)
    if (data && data.length > 10) {
      return new WhaleIntentEvent({
        whaleAddress,
        transactionHash: transaction.hash,
        intentType: 'DEX_SWAP',
        estimatedValue: valueUSD,
        targetExchange: 'DEX',
        confidence: 0.7,
        detectionLatency: Date.now() - this.stats.startTime
      });
    }
    
    return null;
  }

  /**
   * Emit whale intent event
   */
  emitWhaleIntent(intent) {
    this.stats.intentsDetected++;
    this.stats.lastWhaleActivity = Date.now();
    
    console.log(`🚨 WHALE INTENT DETECTED: ${intent.intentType} - ${intent.whaleAddress}`);
    console.log(`💰 Estimated Value: $${intent.estimatedValue.toLocaleString()}`);
    console.log(`⚡ Detection Latency: ${intent.detectionLatency}ms`);
    console.log(`🎯 Threat Level: ${intent.getThreatLevel()}`);
    
    // Emit high-priority event
    this.emit('EVENT_WHALE_INTENT', intent);
    
    // Update average detection latency
    this.updateAverageLatency(intent.detectionLatency);
  }

  /**
   * Load whale watchlist from configuration
   */
  loadWhaleWatchlist() {
    // Load from environment variable or config file
    const watchlistEnv = process.env.WHALE_WATCHLIST;
    if (watchlistEnv) {
      return watchlistEnv.split(',').map(addr => addr.trim());
    }
    
    // Default whale addresses for testing
    return [
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance hot wallet
      '0xa910f92acdaf488fa6ef02174fb86208ad7722ba', // Coinbase hot wallet
      '0x28c6c06298d514db089934071355e5743bf21d60', // Binance 14
      '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance 15
      '0xdfd5293d8e347dfe59e90efd55b2956a1343963d'  // Binance 16
    ];
  }

  /**
   * Get transaction details from node
   */
  async getTransactionDetails(txHash) {
    // Implementation would depend on your Ethereum node setup
    // This is a placeholder for the actual RPC call
    return null;
  }

  /**
   * Update average detection latency
   */
  updateAverageLatency(newLatency) {
    if (this.stats.avgDetectionLatency === 0) {
      this.stats.avgDetectionLatency = newLatency;
    } else {
      this.stats.avgDetectionLatency = (this.stats.avgDetectionLatency + newLatency) / 2;
    }
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(providerName) {
    console.error(`Connection error for ${providerName}`);
    this.attemptReconnection(providerName);
  }

  /**
   * Handle connection close
   */
  handleConnectionClose(providerName) {
    this.isStreaming = false;
    this.connections.delete(providerName);
    this.attemptReconnection(providerName);
  }

  /**
   * Attempt to reconnect to provider
   */
  async attemptReconnection(providerName) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${providerName}`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
    
    console.log(`Attempting reconnection to ${providerName} in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        const config = this.providers[providerName];
        await this.connectToProvider(providerName, config);
        this.reconnectAttempts = 0; // Reset on successful connection
      } catch (error) {
        console.error(`Reconnection failed for ${providerName}:`, error.message);
      }
    }, delay);
  }

  /**
   * Stop mempool streaming
   */
  async stop() {
    console.log('🛑 Stopping mempool streaming...');
    
    for (const [providerName, connection] of this.connections) {
      connection.close();
      console.log(`Disconnected from ${providerName}`);
    }
    
    this.connections.clear();
    this.isStreaming = false;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      isStreaming: this.isStreaming,
      activeConnections: this.connections.size,
      whaleDetectionRate: this.stats.whaleTransactions / this.stats.totalTransactions * 100,
      avgDetectionLatency: Math.round(this.stats.avgDetectionLatency)
    };
  }
}
