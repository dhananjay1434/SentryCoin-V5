/**
 * SentryCoin v4.0 - Default Configuration
 * 
 * Centralized configuration management with environment variable overrides
 */

import { parseFloatEnv, parseIntEnv } from '../src/utils/index.js';

export const config = {
  // Application metadata
  app: {
    name: 'SentryCoin',
    version: '4.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Trading configuration
  trading: {
    symbol: process.env.SYMBOL || 'SPKUSDT',
    paperTrading: process.env.PAPER_TRADING !== 'false', // Default to paper trading
    trifectaEnabled: process.env.TRIFECTA_TRADING_ENABLED === 'true',
    squeezeEnabled: process.env.SQUEEZE_TRADING_ENABLED === 'true'
  },

  // Market data configuration
  market: {
    dangerRatio: parseFloatEnv('DANGER_RATIO', 3.0),
    orderBookDepth: parseIntEnv('ORDER_BOOK_DEPTH', 50),
    exchange: process.env.EXCHANGE || 'binance'
  },

  // Classification thresholds
  classification: {
    pressureThreshold: parseFloatEnv('PRESSURE_THRESHOLD', 3.0),
    liquidityThreshold: parseIntEnv('LIQUIDITY_THRESHOLD', 100000),
    strongMomentumThreshold: parseFloatEnv('STRONG_MOMENTUM_THRESHOLD', -0.3),
    weakMomentumThreshold: parseFloatEnv('WEAK_MOMENTUM_THRESHOLD', -0.1)
  },

  // Risk management
  risk: {
    trifecta: {
      maxPosition: parseFloatEnv('TRIFECTA_MAX_POSITION', 1000),
      stopLoss: parseFloatEnv('TRIFECTA_STOP_LOSS', 2.0),
      takeProfit: parseFloatEnv('TRIFECTA_TAKE_PROFIT', 5.0)
    },
    squeeze: {
      maxPosition: parseFloatEnv('SQUEEZE_MAX_POSITION', 500),
      stopLoss: parseFloatEnv('SQUEEZE_STOP_LOSS', 1.5),
      takeProfit: parseFloatEnv('SQUEEZE_TAKE_PROFIT', 3.0),
      timeExit: parseIntEnv('SQUEEZE_TIME_EXIT', 300) // 5 minutes
    }
  },

  // System configuration
  system: {
    cooldownMinutes: parseIntEnv('COOLDOWN_MINUTES', 5),
    priceHistoryLength: parseIntEnv('PRICE_HISTORY_LENGTH', 300),
    logLevel: process.env.LOG_LEVEL || 'info',
    port: parseIntEnv('PORT', 3000)
  },

  // External services
  services: {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      apiId: process.env.TELEGRAM_API_ID,
      apiHash: process.env.TELEGRAM_API_HASH
    },
    binance: {
      baseUrl: 'https://api.binance.com',
      wsUrl: 'wss://stream.binance.com:9443/ws'
    }
  },

  // Reporting configuration
  reporting: {
    sessionReports: true,
    hourlyReports: true,
    dailyReports: true,
    cloudStorage: process.env.CLOUD_STORAGE_ENABLED === 'true'
  }
};

/**
 * Validates required configuration
 */
export function validateConfig() {
  const required = [
    'services.telegram.botToken',
    'services.telegram.chatId'
  ];

  const missing = [];
  
  for (const path of required) {
    const value = getNestedValue(config, path);
    if (!value) {
      missing.push(path.replace(/\./g, '_').toUpperCase());
    }
  }

  return missing;
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Gets configuration for a specific environment
 */
export function getEnvironmentConfig() {
  const env = config.app.environment;
  
  const envOverrides = {
    production: {
      system: {
        logLevel: 'info'
      },
      reporting: {
        cloudStorage: true
      }
    },
    development: {
      system: {
        logLevel: 'debug'
      },
      trading: {
        paperTrading: true
      }
    },
    test: {
      system: {
        logLevel: 'error'
      },
      trading: {
        paperTrading: true,
        trifectaEnabled: false,
        squeezeEnabled: false
      }
    }
  };

  return {
    ...config,
    ...envOverrides[env]
  };
}

export default config;
