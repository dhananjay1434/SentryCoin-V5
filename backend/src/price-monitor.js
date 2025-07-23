import WebSocket from 'ws';

let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 5000; // 5 seconds

// In-memory price history storage
// Structure: { "BTCUSDT": [{ timestamp: 1678886400000, price: 60000.50 }, ...], ... }
export let priceHistory = {};

// Configuration for history management
const MAX_HISTORY_HOURS = parseInt(process.env.MAX_PRICE_HISTORY_HOURS) || 6;
const MAX_HISTORY_MS = MAX_HISTORY_HOURS * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

/**
 * Records a new price point and manages history pruning
 * @param {string} symbol - The trading pair symbol (e.g., "BTCUSDT")
 * @param {number} price - The current price
 */
export function recordPrice(symbol, price) {
  const timestamp = Date.now();
  const pricePoint = { timestamp, price };

  // Initialize array if it doesn't exist
  if (!priceHistory[symbol]) {
    priceHistory[symbol] = [];
  }

  // Add new price point
  priceHistory[symbol].push(pricePoint);

  // Prune old data to prevent memory leaks
  pruneOldPrices(symbol);

  // Log for debugging (can be removed in production)
  if (priceHistory[symbol].length % 100 === 0) {
    console.log(`📊 ${symbol}: ${priceHistory[symbol].length} price points stored`);
  }
}

/**
 * Removes price points older than MAX_HISTORY_MS for a specific symbol
 * @param {string} symbol - The trading pair symbol
 */
function pruneOldPrices(symbol) {
  if (!priceHistory[symbol]) return;

  const cutoffTime = Date.now() - MAX_HISTORY_MS;
  const originalLength = priceHistory[symbol].length;

  // Filter out old price points
  priceHistory[symbol] = priceHistory[symbol].filter(
    point => point.timestamp > cutoffTime
  );

  const prunedCount = originalLength - priceHistory[symbol].length;
  if (prunedCount > 0) {
    console.log(`🧹 Pruned ${prunedCount} old price points for ${symbol}`);
  }
}

/**
 * Performs cleanup across all symbols
 * This is called periodically to ensure memory doesn't grow unbounded
 */
function performGlobalCleanup() {
  const symbols = Object.keys(priceHistory);
  let totalPruned = 0;

  symbols.forEach(symbol => {
    const beforeCount = priceHistory[symbol].length;
    pruneOldPrices(symbol);
    totalPruned += beforeCount - priceHistory[symbol].length;

    // Remove empty arrays
    if (priceHistory[symbol].length === 0) {
      delete priceHistory[symbol];
    }
  });

  if (totalPruned > 0) {
    console.log(`🧹 Global cleanup: Pruned ${totalPruned} old price points across ${symbols.length} symbols`);
  }

  // Log memory usage stats
  const totalPoints = Object.values(priceHistory).reduce((sum, arr) => sum + arr.length, 0);
  const symbolCount = Object.keys(priceHistory).length;
  console.log(`📈 Price history stats: ${totalPoints} points across ${symbolCount} symbols`);
}

// Start periodic cleanup
setInterval(performGlobalCleanup, CLEANUP_INTERVAL_MS);

export function startPriceMonitor(onPriceUpdate) {
  console.log('🔌 Starting Binance WebSocket connection...');
  
  // Binance WebSocket stream for all mini ticker data
  const wsUrl = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
  
  ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    console.log('✅ Connected to Binance WebSocket');
    reconnectAttempts = 0;
  });

  ws.on('message', (data) => {
    try {
      const tickers = JSON.parse(data);

      // Process each ticker update
      tickers.forEach(ticker => {
        const symbol = ticker.s;
        const price = parseFloat(ticker.c);

        // Record price in history
        recordPrice(symbol, price);

        const priceData = {
          symbol,
          price,
          timestamp: Date.now()
        };

        // Call the callback with price data for alert checking
        onPriceUpdate(priceData);
      });

    } catch (error) {
      console.error('❌ Error parsing WebSocket data:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    
    // Attempt to reconnect
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay/1000}s...`);
      
      setTimeout(() => {
        startPriceMonitor(onPriceUpdate);
      }, reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached. Price monitoring stopped.');
    }
  });

  // Ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000); // Ping every 30 seconds

  // Clean up interval on close
  ws.on('close', () => {
    clearInterval(pingInterval);
  });
}

/**
 * Gets the price from a specific time ago
 * @param {string} symbol - The trading pair symbol
 * @param {number} millisecondsAgo - How many milliseconds ago to look
 * @returns {number|null} - The price at that time, or null if not found
 */
export function getPriceFromTimeAgo(symbol, millisecondsAgo) {
  if (!priceHistory[symbol] || priceHistory[symbol].length === 0) {
    return null;
  }

  const targetTime = Date.now() - millisecondsAgo;
  const prices = priceHistory[symbol];

  // Find the closest price point to the target time
  let closestPoint = null;
  let smallestDiff = Infinity;

  for (const point of prices) {
    const diff = Math.abs(point.timestamp - targetTime);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestPoint = point;
    }
  }

  return closestPoint ? closestPoint.price : null;
}

/**
 * Calculates percentage change between two prices
 * @param {number} oldPrice - The original price
 * @param {number} newPrice - The new price
 * @returns {number} - Percentage change (positive for increase, negative for decrease)
 */
export function calculatePercentageChange(oldPrice, newPrice) {
  if (!oldPrice || oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Gets price history statistics for debugging
 * @returns {object} - Statistics about stored price history
 */
export function getPriceHistoryStats() {
  const symbols = Object.keys(priceHistory);
  const stats = {
    symbolCount: symbols.length,
    totalPoints: 0,
    oldestTimestamp: null,
    newestTimestamp: null,
    symbolStats: {}
  };

  symbols.forEach(symbol => {
    const points = priceHistory[symbol];
    stats.totalPoints += points.length;

    if (points.length > 0) {
      const oldest = Math.min(...points.map(p => p.timestamp));
      const newest = Math.max(...points.map(p => p.timestamp));

      if (!stats.oldestTimestamp || oldest < stats.oldestTimestamp) {
        stats.oldestTimestamp = oldest;
      }
      if (!stats.newestTimestamp || newest > stats.newestTimestamp) {
        stats.newestTimestamp = newest;
      }

      stats.symbolStats[symbol] = {
        pointCount: points.length,
        oldestTimestamp: oldest,
        newestTimestamp: newest,
        currentPrice: points[points.length - 1].price
      };
    }
  });

  return stats;
}

export function stopPriceMonitor() {
  if (ws) {
    console.log('🛑 Stopping price monitor...');
    ws.close();
    ws = null;
  }
}
