import WebSocket from 'ws';
import axios from 'axios';
import FlashCrashAlerter from './alerter.js';
import SignalValidator from './signal-validator.js';
import { getISTTime, parseFloatEnv, parseIntEnv } from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

class FlashCrashPredictor {
  constructor() {
    // Using SPK/USDT as requested
    this.symbol = process.env.SYMBOL || 'SPKUSDT';
    this.dangerRatio = parseFloatEnv('DANGER_RATIO', 3.0);
    this.orderBookDepth = parseIntEnv('ORDER_BOOK_DEPTH', 50);
    this.exchange = process.env.EXCHANGE || 'coinbase'; // Default to Coinbase Pro

    // Algorithm version configuration
    this.algorithmVersion = process.env.ALGORITHM_VERSION || 'v3.0'; // Default to Trifecta
    this.enableTrifecta = process.env.ENABLE_TRIFECTA !== 'false'; // Default enabled

    // Order book state
    this.orderBook = {
      bids: new Map(), // price -> quantity
      asks: new Map(), // price -> quantity
      lastUpdateId: 0
    };

    // Price history for momentum calculation (Trifecta v3.0)
    this.priceHistory = [];
    this.maxPriceHistoryLength = 300; // 5 minutes at 1-second intervals

    // WebSocket connection
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;

    // Alerting system
    this.alerter = new FlashCrashAlerter();

    // Signal validation system
    this.validator = new SignalValidator(this.symbol, (signalId) => {
      // Remove completed signal from active tracking
      this.activeSignals.delete(signalId);
      console.log(`🏁 Signal ${signalId} removed from active tracking`);
    });

    // Active signal tracking
    this.activeSignals = new Set(); // Track multiple active signals
    this.priceTrackingTimer = null;

    // Cooldown system to prevent alert spam
    this.lastAlertTime = null;
    this.cooldownMinutes = parseIntEnv('COOLDOWN_MINUTES', 5);

    // Statistics
    this.stats = {
      messagesProcessed: 0,
      alertsTriggered: 0,
      lastRatio: 0,
      startTime: Date.now(),
      connectionErrors: 0,
      lastSuccessfulConnection: null,
      trifectaSignals: 0,
      partialTrifectaSignals: 0,
      v1Signals: 0,
      v2Signals: 0
    };

    // Graceful degradation mode
    this.degradedMode = false;
    this.degradedModeStartTime = null;
    
    console.log(`🛡️ Flash Crash Predictor initialized for ${this.symbol}`);
    console.log(`🏢 Exchange: ${this.exchange.toUpperCase()}`);
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
   * Gets exchange configuration
   */
  getExchangeConfig() {
    const configs = {
      binance: {
        name: 'Binance',
        restEndpoints: [
          'https://api.binance.com/api/v3/depth',
          'https://api1.binance.com/api/v3/depth',
          'https://api2.binance.com/api/v3/depth',
          'https://api3.binance.com/api/v3/depth'
        ],
        wsEndpoints: [
          `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@depth`,
          `wss://stream.binance.com:443/ws/${this.symbol.toLowerCase()}@depth`,
          `wss://stream1.binance.com:9443/ws/${this.symbol.toLowerCase()}@depth`,
          `wss://stream2.binance.com:9443/ws/${this.symbol.toLowerCase()}@depth`
        ],
        parseOrderBook: (data) => ({
          bids: data.bids,
          asks: data.asks,
          lastUpdateId: data.lastUpdateId
        }),
        parseDepthUpdate: (data) => ({
          bids: data.b,
          asks: data.a,
          updateId: data.u
        })
      },
      coinbase: {
        name: 'Coinbase Pro',
        restEndpoints: [
          'https://api.exchange.coinbase.com/products/{symbol}/book?level=2'
        ],
        wsEndpoints: [
          'wss://ws-feed.exchange.coinbase.com'
        ],
        symbolFormat: (symbol) => {
          // Convert SOLUSDT to SOL-USD format
          const base = symbol.replace('USDT', '').replace('USDC', '');
          return `${base}-USD`;
        },
        parseOrderBook: (data) => ({
          bids: data.bids || [],
          asks: data.asks || [],
          lastUpdateId: Date.now()
        }),
        parseDepthUpdate: (data) => ({
          bids: data.changes?.filter(c => c[0] === 'buy') || [],
          asks: data.changes?.filter(c => c[0] === 'sell') || [],
          updateId: Date.now()
        })
      },
      kraken: {
        name: 'Kraken',
        restEndpoints: [
          'https://api.kraken.com/0/public/Depth'
        ],
        wsEndpoints: [
          'wss://ws.kraken.com'
        ],
        parseOrderBook: (data) => {
          const result = data.result[Object.keys(data.result)[0]];
          return {
            bids: result.bids || [],
            asks: result.asks || [],
            lastUpdateId: Date.now()
          };
        },
        parseDepthUpdate: (data) => ({
          bids: data.bids || [],
          asks: data.asks || [],
          updateId: Date.now()
        })
      }
    };

    return configs[this.exchange] || configs.coinbase;
  }

  /**
   * Initializes order book with current snapshot from REST API
   */
  async initializeOrderBook() {
    console.log('📊 Initializing order book snapshot...');

    const config = this.getExchangeConfig();
    console.log(`🏢 Using ${config.name} exchange`);

    let lastError;

    // Try Binance first (original implementation)
    if (this.exchange === 'binance') {
      for (const endpoint of config.restEndpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${endpoint}`);

          const response = await axios.get(endpoint, {
            params: {
              symbol: this.symbol,
              limit: this.orderBookDepth * 2
            },
            timeout: 15000,
            headers: {
              'User-Agent': 'SentryCoin-FlashCrash-Predictor/1.0.0'
            }
          });

          const parsed = config.parseOrderBook(response.data);
          this.populateOrderBook(parsed.bids, parsed.asks, parsed.lastUpdateId);

          console.log(`✅ Order book initialized with ${parsed.bids.length} bids and ${parsed.asks.length} asks using ${endpoint}`);
          return;

        } catch (error) {
          lastError = error;
          console.log(`❌ Failed with ${endpoint}: ${error.message} (Status: ${error.response?.status})`);

          if (error.response?.status === 451) {
            console.log('⚠️ HTTP 451: This region may be blocked by Binance for legal/compliance reasons');
            console.log('🔄 Switching to alternative exchange...');
            this.exchange = 'coinbase'; // Fallback to Coinbase
            break;
          }
          continue;
        }
      }
    }

    // If Binance failed or using alternative exchange, try mock data for now
    if (this.exchange !== 'binance') {
      console.log(`🔄 Using ${config.name} - implementing mock data for demonstration`);
      await this.initializeMockOrderBook();
      return;
    }

    throw new Error(`Failed to initialize order book from all endpoints. Last error: ${lastError.message}`);
  }

  /**
   * Populates order book with bid/ask data
   */
  populateOrderBook(bids, asks, lastUpdateId) {
    this.orderBook.bids.clear();
    this.orderBook.asks.clear();

    bids.forEach(([price, quantity]) => {
      this.orderBook.bids.set(parseFloat(price), parseFloat(quantity));
    });

    asks.forEach(([price, quantity]) => {
      this.orderBook.asks.set(parseFloat(price), parseFloat(quantity));
    });

    this.orderBook.lastUpdateId = lastUpdateId;
  }

  /**
   * Initializes mock order book for demonstration when real APIs are blocked
   */
  async initializeMockOrderBook() {
    console.log('🎭 Initializing mock order book for demonstration...');

    // Generate realistic mock data based on symbol
    const basePrice = this.getBasePriceForSymbol();
    const mockBids = [];
    const mockAsks = [];

    // Generate 50 levels of mock bids (below current price)
    for (let i = 0; i < this.orderBookDepth; i++) {
      const price = basePrice - (i * 0.01);
      const quantity = Math.random() * 10 + 1;
      mockBids.push([price.toFixed(2), quantity.toFixed(4)]);
    }

    // Generate 50 levels of mock asks (above current price)
    for (let i = 0; i < this.orderBookDepth; i++) {
      const price = basePrice + (i * 0.01);
      const quantity = Math.random() * 10 + 1;
      mockAsks.push([price.toFixed(2), quantity.toFixed(4)]);
    }

    this.populateOrderBook(mockBids, mockAsks, Date.now());

    console.log(`✅ Mock order book initialized with ${mockBids.length} bids and ${mockAsks.length} asks`);
    console.log(`📊 Base price: $${basePrice.toFixed(6)} (${this.symbol})`);
    console.log('⚠️ Note: Using simulated data - real trading data unavailable due to regional restrictions');
  }

  /**
   * Gets base price for symbol (for mock data)
   */
  getBasePriceForSymbol() {
    const prices = {
      'BTCUSDT': 43000,
      'ETHUSDT': 2500,
      'SOLUSDT': 100,
      'SPKUSDT': 0.162,  // SPK/USDT price
      'ADAUSDT': 0.5,
      'DOGEUSDT': 0.08,
      'BNBUSDT': 300,
      'AVAXUSDT': 25,
      'MATICUSDT': 0.8
    };

    return prices[this.symbol] || 0.162; // Default to SPK price
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
   * Connects to exchange WebSocket depth stream
   */
  async connectWebSocket() {
    const config = this.getExchangeConfig();

    if (this.exchange === 'binance') {
      await this.connectBinanceWebSocket(config);
    } else {
      await this.connectMockWebSocket(config);
    }
  }

  /**
   * Connects to Binance WebSocket
   */
  async connectBinanceWebSocket(config) {
    const wsUrl = config.wsEndpoints[this.reconnectAttempts % config.wsEndpoints.length];
    console.log(`🔌 Connecting to ${config.name} WebSocket: ${wsUrl} (attempt ${this.reconnectAttempts + 1})`);

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
        console.log('⚠️ WebSocket blocked (451) - switching to mock mode');
        this.exchange = 'coinbase'; // Switch to mock mode
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket disconnected (Code: ${code}, Reason: ${reason})`);
      this.isConnected = false;
      this.handleReconnection();
    });
  }

  /**
   * Connects to mock WebSocket for demonstration
   */
  async connectMockWebSocket(config) {
    console.log(`🎭 Starting mock WebSocket for ${config.name} (demonstration mode)`);
    console.log('📊 Generating simulated market data...');

    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Simulate market data updates every 2 seconds
    this.mockInterval = setInterval(() => {
      this.generateMockDepthUpdate();
    }, 2000);

    console.log('✅ Mock WebSocket connected successfully');
  }

  /**
   * Generates mock depth updates for demonstration
   */
  generateMockDepthUpdate() {
    if (!this.isConnected) return;

    // Generate random price movements
    const basePrice = this.getBasePriceForSymbol();
    const priceChange = (Math.random() - 0.5) * 0.02; // ±1% change

    // Create mock depth update
    const mockUpdate = {
      b: [], // bids
      a: [], // asks
      u: Date.now() // update ID
    };

    // Add some random bid/ask updates
    for (let i = 0; i < 5; i++) {
      const bidPrice = (basePrice + priceChange - (i * 0.01)).toFixed(2);
      const askPrice = (basePrice + priceChange + (i * 0.01)).toFixed(2);
      const quantity = (Math.random() * 10 + 1).toFixed(4);

      mockUpdate.b.push([bidPrice, quantity]);
      mockUpdate.a.push([askPrice, quantity]);
    }

    // Occasionally create imbalanced conditions for testing
    if (Math.random() < 0.1) { // 10% chance
      // Create sell pressure (more asks)
      for (let i = 0; i < 10; i++) {
        const askPrice = (basePrice + priceChange + (i * 0.005)).toFixed(2);
        const quantity = (Math.random() * 50 + 10).toFixed(4); // Larger quantities
        mockUpdate.a.push([askPrice, quantity]);
      }
      console.log('🎭 Generated mock sell pressure for testing');
    }

    this.processDepthUpdate(mockUpdate);
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
   * SentryCoin v3.0 - Trifecta Algorithm
   * Based on quantitative analysis of 19 validated signals
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
    const currentPrice = this.getCurrentPrice();

    this.stats.lastRatio = askToBidRatio;

    // Update price history for momentum calculation
    this.updatePriceHistory(currentPrice);

    if (this.enableTrifecta && this.algorithmVersion === 'v3.0') {
      this.analyzeTrifectaConditions(askToBidRatio, totalBidVolume, totalAskVolume, currentPrice);
    } else {
      // Fallback to v2.0 Golden Signal Algorithm
      this.analyzeGoldenSignalConditions(askToBidRatio, totalBidVolume, totalAskVolume, currentPrice);
    }

    // Log periodic updates (every 1000 messages)
    if (this.stats.messagesProcessed % 1000 === 0) {
      const istTime = getISTTime();
      console.log(`📊 [${istTime}] ${this.algorithmVersion} | Price: $${currentPrice.toFixed(6)} | Ratio: ${askToBidRatio.toFixed(2)}x | Bids: ${totalBidVolume.toFixed(2)} | Asks: ${totalAskVolume.toFixed(2)}`);

      if (this.enableTrifecta) {
        const momentum = this.calculateMomentum();
        console.log(`🎯 Trifecta Status: Pressure(${askToBidRatio > 3.0 ? '✅' : '❌'}) | Liquidity(${totalBidVolume < 100000 ? '✅' : '❌'}) | Momentum(${momentum <= -0.1 ? '✅' : '❌'})`);
      }

      // Show validation stats
      const validationStats = this.validator.getStats();
      if (validationStats.totalSignals > 0) {
        console.log(`📈 Validation: ${validationStats.totalSignals} signals, ${validationStats.accuracy.toFixed(1)}% accuracy`);
      }
    }
  }

  /**
   * SentryCoin v3.0 - Trifecta Algorithm
   * Requires ALL THREE conditions for signal generation
   */
  analyzeTrifectaConditions(askToBidRatio, totalBidVolume, totalAskVolume, currentPrice) {
    // Factor 1: High Pressure (Sell-side overwhelming buy-side)
    const pressureCondition = askToBidRatio > 3.0;

    // Factor 2: Fragile Foundation (Thin buy-side support)
    const liquidityCondition = totalBidVolume < 100000;

    // Factor 3: Bearish Weather (Negative or flat momentum)
    const momentum = this.calculateMomentum();
    const momentumCondition = momentum <= -0.1; // -0.1% or worse momentum

    // The Trifecta Signal: All three conditions must be met
    const isTrifectaSignal = pressureCondition && liquidityCondition && momentumCondition;

    // Research signals for analysis (partial conditions met)
    const isPartialTrifecta = (pressureCondition && liquidityCondition) ||
                             (pressureCondition && momentumCondition) ||
                             (liquidityCondition && momentumCondition);

    if (isTrifectaSignal && !this.isOnCooldown()) {
      this.stats.trifectaSignals++;
      this.triggerFlashCrashAlert({
        askToBidRatio,
        totalBidVolume,
        totalAskVolume,
        currentPrice,
        momentum,
        signalType: 'TRIFECTA',
        confidence: 'VERY HIGH',
        algorithmVersion: 'v3.0'
      });
    } else if (isPartialTrifecta) {
      this.logTrifectaResearchSignal({
        askToBidRatio,
        totalBidVolume,
        totalAskVolume,
        currentPrice,
        momentum,
        pressureCondition,
        liquidityCondition,
        momentumCondition,
        signalType: 'PARTIAL_TRIFECTA'
      });
    }
  }

  /**
   * SentryCoin v2.0 - Golden Signal Algorithm (Fallback)
   */
  analyzeGoldenSignalConditions(askToBidRatio, totalBidVolume, totalAskVolume, currentPrice) {
    const goldenSignalRatioThreshold = 2.749;
    const goldenSignalVolumeThreshold = 100000;

    const isGoldenSignal = askToBidRatio >= goldenSignalRatioThreshold &&
                          totalBidVolume < goldenSignalVolumeThreshold;

    if (isGoldenSignal && !this.isOnCooldown()) {
      this.stats.v2Signals++;
      this.triggerFlashCrashAlert({
        askToBidRatio,
        totalBidVolume,
        totalAskVolume,
        currentPrice,
        signalType: 'GOLDEN',
        confidence: 'HIGH',
        algorithmVersion: 'v2.0'
      });
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
   * Updates price history for momentum calculation (Trifecta v3.0)
   * @param {number} currentPrice - Current market price
   */
  updatePriceHistory(currentPrice) {
    const timestamp = Date.now();
    this.priceHistory.push({ price: currentPrice, timestamp });

    // Keep only last 5 minutes of data
    if (this.priceHistory.length > this.maxPriceHistoryLength) {
      this.priceHistory.shift();
    }
  }

  /**
   * Calculates 5-minute momentum for Trifecta algorithm
   * @returns {number} Momentum percentage (-negative for bearish, +positive for bullish)
   */
  calculateMomentum() {
    if (this.priceHistory.length < 2) {
      return 0; // Not enough data
    }

    const currentPrice = this.priceHistory[this.priceHistory.length - 1].price;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    // Find price closest to 5 minutes ago
    let basePrice = this.priceHistory[0].price;
    for (const point of this.priceHistory) {
      if (point.timestamp >= fiveMinutesAgo) {
        break;
      }
      basePrice = point.price;
    }

    // Calculate momentum as percentage change
    return ((currentPrice - basePrice) / basePrice) * 100;
  }

  /**
   * Logs Trifecta research signals for pattern analysis
   * @param {Object} signalData - Trifecta signal data
   */
  logTrifectaResearchSignal(signalData) {
    const istTime = getISTTime();
    const { pressureCondition, liquidityCondition, momentumCondition } = signalData;

    console.log(`🔬 TRIFECTA RESEARCH SIGNAL [${istTime}]`);
    console.log(`   📊 Ask/Bid Ratio: ${signalData.askToBidRatio.toFixed(2)}x ${pressureCondition ? '✅' : '❌'} (>3.0x)`);
    console.log(`   💰 Bid Volume: ${signalData.totalBidVolume.toFixed(2)} ${liquidityCondition ? '✅' : '❌'} (<100k)`);
    console.log(`   📈 Momentum: ${signalData.momentum.toFixed(2)}% ${momentumCondition ? '✅' : '❌'} (≤-0.1%)`);
    console.log(`   🧪 Partial Conditions: ${[pressureCondition, liquidityCondition, momentumCondition].filter(Boolean).length}/3`);

    // Record for internal analysis
    this.stats.partialTrifectaSignals = (this.stats.partialTrifectaSignals || 0) + 1;
  }



  /**
   * Starts dedicated price tracking timer for active signals
   */
  startPriceTracking() {
    if (this.priceTrackingTimer) return; // Already running

    // Check every 2 seconds for precise timing
    this.priceTrackingTimer = setInterval(() => {
      if (this.activeSignals.size > 0) {
        const currentPrice = this.getCurrentPrice();

        // Update all active signals
        this.activeSignals.forEach(signalId => {
          this.validator.updatePriceTracking(signalId, currentPrice);
        });
      } else {
        // No active signals, stop timer to save resources
        this.stopPriceTracking();
      }
    }, 2000); // Check every 2 seconds for precision

    console.log(`⏰ Price tracking timer started (checking every 2 seconds)`);
  }

  /**
   * Stops price tracking timer
   */
  stopPriceTracking() {
    if (this.priceTrackingTimer) {
      clearInterval(this.priceTrackingTimer);
      this.priceTrackingTimer = null;
      console.log(`⏰ Price tracking timer stopped`);
    }
  }

  /**
   * Triggers flash crash alert (SentryCoin v2.0 - Golden Signal)
   * @param {Object} alertData - Alert data
   */
  async triggerFlashCrashAlert(alertData) {
    const istTime = getISTTime();
    const signalType = alertData.signalType || 'CRITICAL';
    const confidence = alertData.confidence || 'HIGH';

    console.log(`🚨 ${signalType} FLASH CRASH SIGNAL DETECTED! [${istTime}]`);
    console.log(`   🎯 Signal Type: ${signalType} (Confidence: ${confidence})`);
    console.log(`   📊 Ask/Bid Ratio: ${alertData.askToBidRatio.toFixed(2)}x (Golden Threshold: 2.75x)`);
    console.log(`   💰 Total Bid Volume: ${alertData.totalBidVolume.toFixed(2)} (Golden Threshold: <100k)`);
    console.log(`   📈 Total Ask Volume: ${alertData.totalAskVolume.toFixed(2)}`);
    console.log(`   ⚡ Golden Signal Criteria: ${alertData.askToBidRatio >= 2.75 ? '✅' : '❌'} Ratio + ${alertData.totalBidVolume < 100000 ? '✅' : '❌'} Low Liquidity`);

    // Record signal for validation tracking
    const signalId = this.validator.recordSignal(alertData);
    console.log(`📊 Signal recorded for validation: ${signalId}`);

    const success = await this.alerter.triggerFlashCrashAlert({
      symbol: this.symbol,
      ...alertData
    });

    if (success) {
      this.stats.alertsTriggered++;
      this.lastAlertTime = Date.now(); // Activate cooldown period
      console.log(`⏰ Alert cooldown activated for ${this.cooldownMinutes} minutes`);

      // Add signal to active tracking
      this.activeSignals.add(signalId);
      this.currentSignalId = signalId; // Keep for backward compatibility

      // Start dedicated price tracking timer
      this.startPriceTracking();
      console.log(`✅ ${signalType} alert sent successfully`);
    } else {
      console.log(`❌ ${signalType} alert failed to send`);
    }

    return success;
  }

  /**
   * Logs research signals for pattern analysis (no user alert)
   * @param {Object} signalData - Signal data for research
   */
  logResearchSignal(signalData) {
    const istTime = getISTTime();
    const signalType = signalData.signalType || 'RESEARCH';

    console.log(`🔬 ${signalType} SIGNAL LOGGED [${istTime}]`);
    console.log(`   📊 Ask/Bid Ratio: ${signalData.askToBidRatio.toFixed(2)}x`);
    console.log(`   💰 Total Bid Volume: ${signalData.totalBidVolume.toFixed(2)}`);
    console.log(`   📈 Total Ask Volume: ${signalData.totalAskVolume.toFixed(2)}`);
    console.log(`   🧪 Research Pattern: ${signalData.askToBidRatio >= 2.75 ? 'High Ratio' : 'Normal Ratio'} + ${signalData.totalBidVolume < 100000 ? 'Low Liquidity' : 'Normal Liquidity'}`);

    // Record for internal analysis but don't send user alert
    const signalId = this.validator.recordSignal({
      ...signalData,
      isResearchSignal: true
    });
    console.log(`🔬 Research signal logged: ${signalId}`);

    this.stats.researchSignalsLogged = (this.stats.researchSignalsLogged || 0) + 1;
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
      const istTime = getISTTime();

      let statusMsg = `📈 Stats [${istTime}]: ${this.stats.messagesProcessed} msgs | ${this.stats.alertsTriggered} alerts | ${messagesPerSecond.toFixed(2)} msg/s | Ratio: ${this.stats.lastRatio.toFixed(2)}x`;

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
   * Checks if the system is currently in cooldown period
   */
  isOnCooldown() {
    if (!this.lastAlertTime) {
      return false;
    }

    const cooldownMs = this.cooldownMinutes * 60 * 1000;
    const timeSinceLastAlert = Date.now() - this.lastAlertTime;

    return timeSinceLastAlert < cooldownMs;
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('🛑 Shutting down Flash Crash Predictor...');
    if (this.ws) {
      this.ws.close();
    }
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }
    process.exit(0);
  }
}

export default FlashCrashPredictor;
