import WebSocket from 'ws';
import axios from 'axios';
import FlashCrashAlerter from './alerter.js';
import dotenv from 'dotenv';

dotenv.config();

class FlashCrashPredictor {
  constructor() {
    this.symbol = process.env.SYMBOL || 'BTCUSDT';
    this.dangerRatio = parseFloat(process.env.DANGER_RATIO) || 3.0;
    this.orderBookDepth = parseInt(process.env.ORDER_BOOK_DEPTH) || 50;
    
    // Order book state
    this.orderBook = {
      bids: new Map(), // price -> quantity
      asks: new Map(), // price -> quantity
      lastUpdateId: 0
    };
    
    // WebSocket connection
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    // Alerting system
    this.alerter = new FlashCrashAlerter();
    
    // Statistics
    this.stats = {
      messagesProcessed: 0,
      alertsTriggered: 0,
      lastRatio: 0,
      startTime: Date.now(),
      connectionErrors: 0,
      lastSuccessfulConnection: null
    };

    // Graceful degradation mode
    this.degradedMode = false;
    this.degradedModeStartTime = null;
    
    console.log(`🛡️ Flash Crash Predictor initialized for ${this.symbol}`);
    console.log(`⚠️ Danger ratio threshold: ${this.dangerRatio}x`);
    console.log(`📊 Order book depth: ${this.orderBookDepth} levels`);
  }

  /**
   * Starts the flash crash prediction engine
   */
  async start() {
    try {
      console.log('🚀 Starting Flash Crash Predictor...');

      // Test Telegram connection (non-blocking)
      try {
        await this.alerter.sendTestAlert();
        console.log('✅ Telegram connection verified');
      } catch (telegramError) {
        console.log('⚠️ Telegram test failed (will retry later):', telegramError.message);
      }

      // Initialize order book from REST API with retry
      try {
        await this.initializeOrderBookWithRetry();
        console.log('✅ Order book initialization completed');
      } catch (orderBookError) {
        console.log('⚠️ Order book initialization failed, entering degraded mode');
        this.enterDegradedMode();
      }

      // Start WebSocket connection
      try {
        await this.connectWebSocket();
        console.log('✅ WebSocket connection initiated');
      } catch (wsError) {
        console.log('⚠️ WebSocket connection failed, will retry automatically');
        this.stats.connectionErrors++;
      }

      // Start statistics reporting
      this.startStatsReporting();

      console.log('✅ Flash Crash Predictor is now running');

      if (this.degradedMode) {
        console.log('⚠️ Running in degraded mode - limited functionality');
      }

    } catch (error) {
      console.error('❌ Failed to start predictor:', error.message);
      console.log('🔄 Will continue running web server...');
      this.enterDegradedMode();
      // Don't exit - keep web server running
    }
  }

  /**
   * Initializes order book with current snapshot from REST API
   */
  async initializeOrderBook() {
    console.log('📊 Initializing order book snapshot...');

    // Try multiple API endpoints in order of preference
    const apiEndpoints = [
      'https://api.binance.com/api/v3/depth',
      'https://api1.binance.com/api/v3/depth',
      'https://api2.binance.com/api/v3/depth',
      'https://api3.binance.com/api/v3/depth'
    ];

    let lastError;

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🔄 Trying endpoint: ${endpoint}`);

        const response = await axios.get(endpoint, {
          params: {
            symbol: this.symbol,
            limit: this.orderBookDepth * 2 // Get extra depth for safety
          },
          timeout: 15000, // Increased timeout
          headers: {
            'User-Agent': 'SentryCoin-FlashCrash-Predictor/1.0.0'
          }
        });

        const { bids, asks, lastUpdateId } = response.data;

        // Clear existing order book
        this.orderBook.bids.clear();
        this.orderBook.asks.clear();

        // Populate bids (buy orders)
        bids.forEach(([price, quantity]) => {
          this.orderBook.bids.set(parseFloat(price), parseFloat(quantity));
        });

        // Populate asks (sell orders)
        asks.forEach(([price, quantity]) => {
          this.orderBook.asks.set(parseFloat(price), parseFloat(quantity));
        });

        this.orderBook.lastUpdateId = lastUpdateId;

        console.log(`✅ Order book initialized with ${bids.length} bids and ${asks.length} asks using ${endpoint}`);
        return; // Success, exit the loop

      } catch (error) {
        lastError = error;
        console.log(`❌ Failed with ${endpoint}: ${error.message} (Status: ${error.response?.status})`);

        // If it's a 451 error, log specific guidance
        if (error.response?.status === 451) {
          console.log('⚠️ HTTP 451: This region may be blocked by Binance for legal/compliance reasons');
        }

        continue; // Try next endpoint
      }
    }

    // If all endpoints failed
    throw new Error(`Failed to initialize order book from all endpoints. Last error: ${lastError.message}`);
  }

  /**
   * Initializes order book with retry logic
   */
  async initializeOrderBookWithRetry() {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.initializeOrderBook();
        return; // Success
      } catch (error) {
        console.log(`❌ Order book init attempt ${attempt}/${maxRetries} failed: ${error.message}`);

        if (attempt === maxRetries) {
          console.log('⚠️ All order book init attempts failed. Starting with empty order book...');
          // Initialize with empty order book
          this.orderBook.bids.clear();
          this.orderBook.asks.clear();
          this.orderBook.lastUpdateId = 0;
          return;
        }

        console.log(`🔄 Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Connects to Binance WebSocket depth stream
   */
  async connectWebSocket() {
    // Try multiple WebSocket endpoints
    const wsEndpoints = [
      `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@depth`,
      `wss://stream.binance.com:443/ws/${this.symbol.toLowerCase()}@depth`,
      `wss://stream1.binance.com:9443/ws/${this.symbol.toLowerCase()}@depth`,
      `wss://stream2.binance.com:9443/ws/${this.symbol.toLowerCase()}@depth`
    ];

    const wsUrl = wsEndpoints[this.reconnectAttempts % wsEndpoints.length];
    console.log(`🔌 Connecting to WebSocket: ${wsUrl} (attempt ${this.reconnectAttempts + 1})`);

    this.ws = new WebSocket(wsUrl, {
      headers: {
        'User-Agent': 'SentryCoin-FlashCrash-Predictor/1.0.0'
      }
    });

    this.ws.on('open', () => {
      console.log('✅ WebSocket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data) => {
      try {
        this.processDepthUpdate(JSON.parse(data));
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error.message);
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      if (error.message.includes('451')) {
        console.log('⚠️ WebSocket blocked (451) - trying alternative endpoint on reconnect');
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket disconnected (Code: ${code}, Reason: ${reason})`);
      this.isConnected = false;
      this.handleReconnection();
    });
  }

  /**
   * Processes incoming depth updates from WebSocket
   * @param {Object} depthUpdate - Binance depth update message
   */
  processDepthUpdate(depthUpdate) {
    const { b: bids, a: asks, u: updateId } = depthUpdate;
    
    // Ensure updates are in order
    if (updateId <= this.orderBook.lastUpdateId) {
      return; // Skip old updates
    }
    
    // Update bids
    bids.forEach(([price, quantity]) => {
      const priceFloat = parseFloat(price);
      const quantityFloat = parseFloat(quantity);
      
      if (quantityFloat === 0) {
        this.orderBook.bids.delete(priceFloat);
      } else {
        this.orderBook.bids.set(priceFloat, quantityFloat);
      }
    });
    
    // Update asks
    asks.forEach(([price, quantity]) => {
      const priceFloat = parseFloat(price);
      const quantityFloat = parseFloat(quantity);
      
      if (quantityFloat === 0) {
        this.orderBook.asks.delete(priceFloat);
      } else {
        this.orderBook.asks.set(priceFloat, quantityFloat);
      }
    });
    
    this.orderBook.lastUpdateId = updateId;
    this.stats.messagesProcessed++;
    
    // Analyze for flash crash conditions
    this.analyzeFlashCrashConditions();
  }

  /**
   * Core algorithm: Analyzes order book for flash crash conditions
   */
  analyzeFlashCrashConditions() {
    // Get top N levels of bids and asks
    const topBids = this.getTopOrderBookLevels(this.orderBook.bids, this.orderBookDepth, 'desc');
    const topAsks = this.getTopOrderBookLevels(this.orderBook.asks, this.orderBookDepth, 'asc');
    
    // Calculate total volumes
    const totalBidVolume = topBids.reduce((sum, [, quantity]) => sum + quantity, 0);
    const totalAskVolume = topAsks.reduce((sum, [, quantity]) => sum + quantity, 0);
    
    // Calculate the critical ratio
    const askToBidRatio = totalBidVolume > 0 ? totalAskVolume / totalBidVolume : 0;
    
    this.stats.lastRatio = askToBidRatio;
    
    // Check for flash crash conditions
    if (askToBidRatio > this.dangerRatio && !this.alerter.isOnCooldown()) {
      this.triggerFlashCrashAlert({
        askToBidRatio,
        totalBidVolume,
        totalAskVolume,
        currentPrice: this.getCurrentPrice()
      });
    }
    
    // Log periodic updates (every 1000 messages)
    if (this.stats.messagesProcessed % 1000 === 0) {
      console.log(`📊 Ratio: ${askToBidRatio.toFixed(2)}x | Bids: ${totalBidVolume.toFixed(2)} | Asks: ${totalAskVolume.toFixed(2)}`);
    }
  }

  /**
   * Gets top N levels from order book side
   * @param {Map} orderBookSide - Bids or asks map
   * @param {number} depth - Number of levels to return
   * @param {string} sortOrder - 'asc' or 'desc'
   * @returns {Array} Array of [price, quantity] pairs
   */
  getTopOrderBookLevels(orderBookSide, depth, sortOrder) {
    const entries = Array.from(orderBookSide.entries());
    
    // Sort by price
    entries.sort((a, b) => {
      return sortOrder === 'asc' ? a[0] - b[0] : b[0] - a[0];
    });
    
    return entries.slice(0, depth);
  }

  /**
   * Gets current market price (best bid/ask midpoint)
   * @returns {number} Current price
   */
  getCurrentPrice() {
    const bestBid = Math.max(...this.orderBook.bids.keys());
    const bestAsk = Math.min(...this.orderBook.asks.keys());
    return (bestBid + bestAsk) / 2;
  }

  /**
   * Triggers flash crash alert
   * @param {Object} alertData - Alert data
   */
  async triggerFlashCrashAlert(alertData) {
    console.log(`🚨 FLASH CRASH CONDITIONS DETECTED!`);
    console.log(`   Ask/Bid Ratio: ${alertData.askToBidRatio.toFixed(2)}x (threshold: ${this.dangerRatio}x)`);
    console.log(`   Total Bid Volume: ${alertData.totalBidVolume.toFixed(2)}`);
    console.log(`   Total Ask Volume: ${alertData.totalAskVolume.toFixed(2)}`);
    
    const success = await this.alerter.triggerFlashCrashAlert({
      symbol: this.symbol,
      ...alertData
    });
    
    if (success) {
      this.stats.alertsTriggered++;
    }
  }

  /**
   * Handles WebSocket reconnection
   */
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Exiting...');
      process.exit(1);
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  /**
   * Starts periodic statistics reporting
   */
  startStatsReporting() {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
      const messagesPerSecond = this.stats.messagesProcessed / uptime;

      let statusMsg = `📈 Stats: ${this.stats.messagesProcessed} msgs | ${this.stats.alertsTriggered} alerts | ${messagesPerSecond.toFixed(2)} msg/s | Ratio: ${this.stats.lastRatio.toFixed(2)}x`;

      if (this.degradedMode) {
        statusMsg += ' | ⚠️ DEGRADED MODE';
      }

      if (this.stats.connectionErrors > 0) {
        statusMsg += ` | Errors: ${this.stats.connectionErrors}`;
      }

      console.log(statusMsg);

      // Check for degraded mode recovery
      this.checkDegradedModeRecovery();
    }, 60000); // Every minute
  }

  /**
   * Enters degraded mode when primary services fail
   */
  enterDegradedMode() {
    this.degradedMode = true;
    this.degradedModeStartTime = Date.now();
    console.log('⚠️ Entering degraded mode - web server will continue running');
    console.log('📊 Health checks and status endpoints remain available');
  }

  /**
   * Checks if system can exit degraded mode
   */
  checkDegradedModeRecovery() {
    if (!this.degradedMode) return;

    // Try to recover every 5 minutes
    const recoveryInterval = 5 * 60 * 1000;
    if (Date.now() - this.degradedModeStartTime > recoveryInterval) {
      console.log('🔄 Attempting to recover from degraded mode...');
      this.start().catch(() => {
        console.log('❌ Recovery attempt failed, staying in degraded mode');
        this.degradedModeStartTime = Date.now(); // Reset timer
      });
    }
  }

  /**
   * Enters degraded mode when primary services fail
   */
  enterDegradedMode() {
    this.degradedMode = true;
    this.degradedModeStartTime = Date.now();
    console.log('⚠️ Entering degraded mode - web server will continue running');
    console.log('📊 Health checks and status endpoints remain available');
  }

  /**
   * Checks if system can exit degraded mode
   */
  checkDegradedModeRecovery() {
    if (!this.degradedMode) return;

    // Try to recover every 5 minutes
    const recoveryInterval = 5 * 60 * 1000;
    if (Date.now() - this.degradedModeStartTime > recoveryInterval) {
      console.log('🔄 Attempting to recover from degraded mode...');
      this.start().catch(() => {
        console.log('❌ Recovery attempt failed, staying in degraded mode');
        this.degradedModeStartTime = Date.now(); // Reset timer
      });
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('🛑 Shutting down Flash Crash Predictor...');
    if (this.ws) {
      this.ws.close();
    }
    process.exit(0);
  }
}

export default FlashCrashPredictor;
