/**
 * Binance Exchange Configuration for SentryCoin v4.0
 * 
 * Optimized settings for Binance cryptocurrency exchange
 * Includes API endpoints, WebSocket configurations, and trading parameters
 */

export const binanceConfig = {
  // Exchange Information
  name: 'Binance',
  id: 'binance',
  
  // API Endpoints
  restEndpoints: [
    'https://api.binance.com/api/v3/depth?symbol={symbol}&limit=1000',
    'https://api1.binance.com/api/v3/depth?symbol={symbol}&limit=1000',
    'https://api2.binance.com/api/v3/depth?symbol={symbol}&limit=1000',
    'https://api3.binance.com/api/v3/depth?symbol={symbol}&limit=1000'
  ],
  
  // WebSocket Endpoints
  wsEndpoints: [
    'wss://stream.binance.com:9443/ws/{symbol}@depth@100ms',
    'wss://stream1.binance.com:9443/ws/{symbol}@depth@100ms',
    'wss://stream2.binance.com:9443/ws/{symbol}@depth@100ms'
  ],
  
  // Symbol Format
  symbolFormat: (symbol) => symbol.toLowerCase(),
  
  // Rate Limits
  rateLimits: {
    rest: {
      requests: 1200,
      window: 60000 // 1 minute
    },
    websocket: {
      connections: 5,
      subscriptions: 1024
    }
  },
  
  // Trading Parameters
  trading: {
    minOrderSize: 0.001,
    maxOrderSize: 9000,
    tickSize: 0.000001,
    stepSize: 0.001,
    
    // Commission rates (0.1% for spot trading)
    makerFee: 0.001,
    takerFee: 0.001
  },
  
  // Market Data Configuration
  marketData: {
    depthLevels: [5, 10, 20, 50, 100, 500, 1000],
    updateSpeed: ['100ms', '1000ms'],
    priceTickSize: 6, // 6 decimal places for price precision
    quantityTickSize: 4 // 4 decimal places for quantity
  },
  
  // Regional Restrictions
  restrictions: {
    blockedRegions: ['US', 'CN'],
    vpnDetection: true,
    complianceRequired: true
  },
  
  // Error Handling
  errorCodes: {
    451: 'REGION_BLOCKED',
    429: 'RATE_LIMIT_EXCEEDED',
    418: 'IP_BANNED',
    1003: 'TOO_MANY_REQUESTS'
  },
  
  // Fallback Configuration
  fallback: {
    enabled: true,
    exchange: 'coinbase',
    mockMode: true,
    reason: 'Regional restrictions or API limits'
  }
};

export default binanceConfig;
