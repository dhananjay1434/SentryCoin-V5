/**
 * Phoenix v6.0 - Event-Driven Mempool Streamer (Mandate 2)
 * 
 * Real-time whale intent detection through mempool monitoring.
 * Replaces polling-based approach with event-driven streaming.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import axios from 'axios';

export default class MempoolStreamer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.symbol = config.symbol || 'ETH';
    this.logger = config.logger;
    this.providers = config.providers || {};
    
    // Whale watchlist
    this.whaleWatchlist = new Set(this.loadWhaleWatchlist());
    
    // Exchange addresses for deposit detection
    this.exchangeAddresses = new Map([
      ['0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', 'BINANCE'],
      ['0xd551234ae421e3bcba99a0da6d736074f22192ff', 'BINANCE'],
      ['0xa910f92acdaf488fa6ef02174fb86208ad7722ba', 'COINBASE'],
      ['0x71660c4005ba85c37ccec55d0c4493e66fe775d3', 'COINBASE'],
      ['0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', 'OKEX']
    ]);
    
    // Connection state
    this.connections = new Map();
    this.isStreaming = false;
    
    // Performance stats
    this.stats = {
      totalTransactions: 0,
      whaleTransactions: 0,
      intentsDetected: 0,
      avgDetectionLatency: 0,
      startTime: Date.now()
    };
    
    this.logger?.info('mempool_streamer_init', {
      symbol: this.symbol,
      whaleCount: this.whaleWatchlist.size,
      exchangeCount: this.exchangeAddresses.size
    });
  }

  /**
   * Start mempool streaming
   */
  async start() {
    this.logger?.info('mempool_streaming_start', 'Starting real-time mempool monitoring');
    
    try {
      // Try Blocknative first (primary provider)
      if (this.providers.blocknative?.enabled) {
        await this.connectBlocknative();
      }
      
      // Try Alchemy as backup
      if (this.providers.alchemy?.enabled && !this.isStreaming) {
        await this.connectAlchemy();
      }
      
      if (!this.isStreaming) {
        throw new Error('Failed to connect to any mempool provider');
      }
      
      this.stats.startTime = Date.now();
      this.logger?.info('mempool_streaming_active', 'Whale intent detection enabled');
      
      return true;
      
    } catch (error) {
      this.logger?.error('mempool_streaming_failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Connect to Blocknative mempool stream
   */
  async connectBlocknative() {
    const apiKey = process.env.BLOCKNATIVE_API_KEY;
    if (!apiKey) {
      throw new Error('Blocknative API key not configured');
    }
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('wss://api.blocknative.com/v0');
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Blocknative connection timeout'));
      }, 15000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        
        // Initialize connection
        ws.send(JSON.stringify({
          categoryCode: 'initialize',
          eventCode: 'checkDappId',
          dappId: apiKey
        }));
        
        // Subscribe to whale addresses
        ws.send(JSON.stringify({
          categoryCode: 'configs',
          eventCode: 'put',
          config: {
            scope: 'global',
            filters: [{
              status: 'pending'
            }],
            watchAddress: Array.from(this.whaleWatchlist)
          }
        }));
        
        this.connections.set('blocknative', ws);
        this.isStreaming = true;
        
        this.logger?.info('blocknative_connected', 'Primary mempool provider active');
        resolve();
      });
      
      ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.processBlocknativeEvent(event);
        } catch (error) {
          this.logger?.error('blocknative_message_error', error.message);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.logger?.error('blocknative_error', error.message);
        reject(error);
      });
      
      ws.on('close', () => {
        this.handleConnectionClose('blocknative');
      });
    });
  }

  /**
   * Connect to Alchemy mempool stream
   */
  async connectAlchemy() {
    const wsUrl = process.env.ALCHEMY_WS_URL;
    if (!wsUrl) {
      throw new Error('Alchemy WebSocket URL not configured');
    }
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Alchemy connection timeout'));
      }, 15000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        
        // Subscribe to pending transactions
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_subscribe',
          params: ['newPendingTransactions', true]
        }));
        
        this.connections.set('alchemy', ws);
        this.isStreaming = true;
        
        this.logger?.info('alchemy_connected', 'Backup mempool provider active');
        resolve();
      });
      
      ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.processAlchemyEvent(event);
        } catch (error) {
          this.logger?.error('alchemy_message_error', error.message);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.logger?.error('alchemy_error', error.message);
        reject(error);
      });
      
      ws.on('close', () => {
        this.handleConnectionClose('alchemy');
      });
    });
  }

  /**
   * Process Blocknative events
   */
  processBlocknativeEvent(event) {
    if (event.status !== 'pending' || !event.transaction) return;
    
    this.stats.totalTransactions++;
    
    const transaction = event.transaction;
    const whaleAddress = this.isWhaleTransaction(transaction.from, transaction.to);
    
    if (whaleAddress) {
      this.stats.whaleTransactions++;
      const intent = this.analyzeWhaleIntent(transaction, whaleAddress);
      
      if (intent) {
        this.emitWhaleIntent(intent);
      }
    }
  }

  /**
   * Process Alchemy events
   */
  processAlchemyEvent(event) {
    if (!event.params?.result) return;
    
    this.stats.totalTransactions++;
    
    const transaction = event.params.result;
    const whaleAddress = this.isWhaleTransaction(transaction.from, transaction.to);
    
    if (whaleAddress) {
      this.stats.whaleTransactions++;
      const intent = this.analyzeWhaleIntent(transaction, whaleAddress);
      
      if (intent) {
        this.emitWhaleIntent(intent);
      }
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
   * Analyze whale transaction to determine intent
   */
  analyzeWhaleIntent(transaction, whaleAddress) {
    const { from, to, value, hash } = transaction;
    const valueEth = parseInt(value || '0', 16) / 1e18;
    const valueUSD = valueEth * 3500; // Approximate ETH price
    
    // Skip small transactions
    if (valueUSD < 100000) return null; // Less than $100k
    
    const detectionLatency = Date.now() - this.stats.startTime;
    
    // Detect exchange deposits
    const targetExchange = this.exchangeAddresses.get(to?.toLowerCase());
    if (targetExchange) {
      return {
        id: `whale_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        whaleAddress,
        transactionHash: hash,
        intentType: 'EXCHANGE_DEPOSIT',
        estimatedValue: valueUSD,
        targetExchange,
        threatLevel: this.calculateThreatLevel(valueUSD, 'EXCHANGE_DEPOSIT'),
        confidence: 0.95,
        detectionLatency,
        timestamp: Date.now()
      };
    }
    
    // Detect large transfers
    if (valueUSD > 1000000) {
      return {
        id: `whale_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        whaleAddress,
        transactionHash: hash,
        intentType: 'LARGE_TRANSFER',
        estimatedValue: valueUSD,
        targetExchange: null,
        threatLevel: this.calculateThreatLevel(valueUSD, 'LARGE_TRANSFER'),
        confidence: 0.8,
        detectionLatency,
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  /**
   * Calculate threat level based on transaction
   */
  calculateThreatLevel(valueUSD, intentType) {
    if (intentType === 'EXCHANGE_DEPOSIT') {
      if (valueUSD > 10000000) return 'CRITICAL'; // >$10M
      if (valueUSD > 1000000) return 'HIGH';      // >$1M
      return 'MEDIUM';
    }
    
    if (intentType === 'LARGE_TRANSFER') {
      if (valueUSD > 5000000) return 'MEDIUM';    // >$5M
      return 'LOW';
    }
    
    return 'LOW';
  }

  /**
   * Emit whale intent event
   */
  emitWhaleIntent(intent) {
    this.stats.intentsDetected++;
    
    // Update average detection latency
    if (this.stats.avgDetectionLatency === 0) {
      this.stats.avgDetectionLatency = intent.detectionLatency;
    } else {
      this.stats.avgDetectionLatency = (this.stats.avgDetectionLatency + intent.detectionLatency) / 2;
    }
    
    this.logger?.warn('whale_intent_detected', {
      whaleAddress: intent.whaleAddress,
      intentType: intent.intentType,
      estimatedValue: intent.estimatedValue,
      threatLevel: intent.threatLevel,
      detectionLatency: intent.detectionLatency
    });
    
    this.emit('WHALE_INTENT_DETECTED', intent);
  }

  /**
   * Load whale watchlist from environment
   */
  loadWhaleWatchlist() {
    const watchlistEnv = process.env.WHALE_WATCHLIST;
    if (watchlistEnv) {
      return watchlistEnv.split(',').map(addr => addr.trim());
    }
    
    // Default whale addresses
    return [
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
      '0xa910f92acdaf488fa6ef02174fb86208ad7722ba',
      '0x28c6c06298d514db089934071355e5743bf21d60'
    ];
  }

  /**
   * Handle connection close
   */
  handleConnectionClose(providerName) {
    this.connections.delete(providerName);
    
    if (this.connections.size === 0) {
      this.isStreaming = false;
    }
    
    this.logger?.warn('mempool_connection_closed', providerName);
  }

  /**
   * Stop mempool streaming
   */
  async stop() {
    this.logger?.info('mempool_streaming_stop', 'Stopping mempool monitoring');
    
    for (const [providerName, connection] of this.connections) {
      connection.close();
      this.logger?.info('mempool_provider_disconnected', providerName);
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
      whaleDetectionRate: this.stats.whaleTransactions / this.stats.totalTransactions * 100 || 0,
      avgDetectionLatency: Math.round(this.stats.avgDetectionLatency)
    };
  }
}
