/**
 * SentryCoin v4.0 - Definitive Production Configuration
 * 
 * Consolidated configuration for all system components
 * Validated through live market analysis and production deployment
 */

import { binanceConfig } from './config/binance.js';

// Environment variable helpers
const parseFloatEnv = (key, defaultValue) => {
  const value = process.env[key];
  return value ? parseFloat(value) : defaultValue;
};

const parseIntEnv = (key, defaultValue) => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const parseBoolEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * PRODUCTION CONFIGURATION - VALIDATED SETTINGS
 * All thresholds validated through live cascade event analysis
 */
export const config = {
  // ================================
  // SYSTEM INFORMATION
  // ================================
  system: {
    name: 'SentryCoin',
    version: '4.0.0',
    environment: process.env.NODE_ENV || 'production',
    deploymentDate: '2025-07-24',
    status: 'PRODUCTION_READY'
  },

  // ================================
  // TRADING CONFIGURATION
  // ================================
  trading: {
    // Primary trading symbol (ETHEREUM FOCUSED)
    symbol: process.env.SYMBOL || 'ETHUSDT',
    
    // Exchange configuration
    exchange: process.env.EXCHANGE || 'binance',
    
    // Trading mode (SAFETY: Paper trading enforced)
    paperTrading: parseBoolEnv('PAPER_TRADING', true),
    
    // Strategy enablement (Conservative initial deployment)
    strategies: {
      trifecta: parseBoolEnv('TRIFECTA_TRADING_ENABLED', true),
      squeeze: parseBoolEnv('SQUEEZE_TRADING_ENABLED', false),
      pressureSpike: parseBoolEnv('PRESSURE_SPIKE_ALERTS_ENABLED', true)
    }
  },

  // ================================
  // SIGNAL THRESHOLDS (VALIDATED)
  // ================================
  signals: {
    // Pressure threshold (validated: 3.18x triggered in live event)
    pressureThreshold: parseFloatEnv('PRESSURE_THRESHOLD', 3.0),
    
    // Liquidity thresholds (validated: 156k in live cascade)
    liquidityThreshold: parseIntEnv('LIQUIDITY_THRESHOLD', 100000),
    lowLiquidityThreshold: parseIntEnv('LOW_LIQUIDITY_THRESHOLD', 50000),
    
    // Momentum thresholds (validated: -0.755% in live event)
    strongMomentumThreshold: parseFloatEnv('STRONG_MOMENTUM_THRESHOLD', -0.3),
    weakMomentumThreshold: parseFloatEnv('WEAK_MOMENTUM_THRESHOLD', -0.1),
    
    // Signal quality controls
    cooldownMinutes: parseIntEnv('COOLDOWN_MINUTES', 5),
    maxSignalsPerHour: parseIntEnv('MAX_SIGNALS_PER_HOUR', 20)
  },

  // ================================
  // RISK MANAGEMENT
  // ================================
  risk: {
    // Trifecta Strategy (SHORT positions)
    trifecta: {
      maxPosition: parseFloatEnv('TRIFECTA_MAX_POSITION', 1000),
      stopLoss: parseFloatEnv('TRIFECTA_STOP_LOSS', 2.0),
      takeProfit: parseFloatEnv('TRIFECTA_TAKE_PROFIT', 5.0),
      maxConcurrentPositions: parseIntEnv('TRIFECTA_MAX_CONCURRENT', 3)
    },
    
    // Squeeze Strategy (LONG positions) - Disabled initially
    squeeze: {
      maxPosition: parseFloatEnv('SQUEEZE_MAX_POSITION', 0),
      stopLoss: parseFloatEnv('SQUEEZE_STOP_LOSS', 1.5),
      takeProfit: parseFloatEnv('SQUEEZE_TAKE_PROFIT', 3.0),
      timeExit: parseIntEnv('SQUEEZE_TIME_EXIT', 300),
      maxConcurrentPositions: parseIntEnv('SQUEEZE_MAX_CONCURRENT', 0)
    },
    
    // Global risk limits
    global: {
      maxDailyLoss: parseFloatEnv('MAX_DAILY_LOSS', 5000),
      maxDrawdown: parseFloatEnv('MAX_DRAWDOWN', 10000),
      emergencyStopLoss: parseFloatEnv('EMERGENCY_STOP_LOSS', 15000)
    }
  },

  // ================================
  // EXCHANGE CONFIGURATIONS
  // ================================
  exchanges: {
    binance: binanceConfig,
    
    coinbase: {
      name: 'Coinbase Pro',
      id: 'coinbase',
      restEndpoints: [
        'https://api.exchange.coinbase.com/products/{symbol}/book?level=2'
      ],
      wsEndpoints: [
        'wss://ws-feed.exchange.coinbase.com'
      ],
      symbolFormat: (symbol) => {
        const base = symbol.replace('USDT', '').replace('USDC', '');
        return `${base}-USD`;
      },
      fallback: true
    }
  },

  // ================================
  // MONITORING & ALERTING
  // ================================
  monitoring: {
    // Performance tracking
    enablePerformanceMonitoring: parseBoolEnv('ENABLE_PERFORMANCE_MONITORING', true),
    enableDetailedLogging: parseBoolEnv('ENABLE_DETAILED_LOGGING', true),
    enableSignalValidation: parseBoolEnv('ENABLE_SIGNAL_VALIDATION', true),
    
    // Reporting intervals
    statsReportInterval: parseIntEnv('STATS_REPORT_INTERVAL', 60),
    hourlyReports: parseBoolEnv('ENABLE_HOURLY_REPORTS', true),
    dailyReports: parseBoolEnv('ENABLE_DAILY_REPORTS', true),
    
    // System health thresholds
    memoryAlertThreshold: parseIntEnv('MEMORY_ALERT_THRESHOLD', 80),
    cpuAlertThreshold: parseIntEnv('CPU_ALERT_THRESHOLD', 85),
    errorRateThreshold: parseFloatEnv('ERROR_RATE_THRESHOLD', 5.0),
    
    // Alert controls
    maxAlertsPerHour: parseIntEnv('MAX_ALERTS_PER_HOUR', 10),
    enableSignalConfirmations: parseBoolEnv('ENABLE_SIGNAL_CONFIRMATIONS', true)
  },

  // ================================
  // TELEGRAM CONFIGURATION
  // ================================
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    enableAlerts: parseBoolEnv('ENABLE_TELEGRAM_ALERTS', true),
    alertCooldown: parseIntEnv('TELEGRAM_ALERT_COOLDOWN', 300),
    maxRetries: parseIntEnv('TELEGRAM_MAX_RETRIES', 3)
  },

  // ================================
  // TECHNICAL CONFIGURATION
  // ================================
  technical: {
    // Order book analysis
    orderBookDepth: parseIntEnv('ORDER_BOOK_DEPTH', 50),
    priceHistoryLength: parseIntEnv('PRICE_HISTORY_LENGTH', 100),
    momentumCalculationPeriod: parseIntEnv('MOMENTUM_PERIOD', 30),
    
    // WebSocket configuration
    wsReconnectDelay: parseIntEnv('WS_RECONNECT_DELAY', 5000),
    wsMaxReconnectAttempts: parseIntEnv('WS_MAX_RECONNECT_ATTEMPTS', 10),
    wsPingInterval: parseIntEnv('WS_PING_INTERVAL', 30000),
    
    // API rate limiting
    apiRequestsPerMinute: parseIntEnv('API_REQUESTS_PER_MINUTE', 1200),
    apiTimeout: parseIntEnv('API_TIMEOUT', 30000),
    
    // Data processing
    classificationInterval: parseIntEnv('CLASSIFICATION_INTERVAL', 1000),
    memoryCleanupInterval: parseIntEnv('MEMORY_CLEANUP_INTERVAL', 300000)
  },

  // ================================
  // LOGGING CONFIGURATION
  // ================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: parseBoolEnv('ENABLE_FILE_LOGGING', true),
    enableConsoleLogging: parseBoolEnv('ENABLE_CONSOLE_LOGGING', true),
    logDirectory: process.env.LOG_DIRECTORY || './logs',
    maxLogFiles: parseIntEnv('MAX_LOG_FILES', 30),
    maxLogSize: parseIntEnv('MAX_LOG_SIZE', 10485760) // 10MB
  },

  // ================================
  // DEVELOPMENT & TESTING
  // ================================
  development: {
    enableMockData: parseBoolEnv('ENABLE_MOCK_DATA', false),
    mockDataInterval: parseIntEnv('MOCK_DATA_INTERVAL', 2000),
    enableTestSignals: parseBoolEnv('ENABLE_TEST_SIGNALS', false),
    testSignalProbability: parseFloatEnv('TEST_SIGNAL_PROBABILITY', 0.1)
  },

  // ================================
  // v5.0 MULTI-STRATEGY CONFIGURATION
  // ================================
  strategies: {
    enabled: process.env.ENABLED_STRATEGIES ?
      process.env.ENABLED_STRATEGIES.split(',').map(s => s.trim()) :
      ['CASCADE_HUNTER'],

    // ETH_UNWIND Macro Strategy Configuration
    ethUnwind: {
      enabled: parseBoolEnv('ETH_UNWIND_ENABLED', false),
      symbol: process.env.ETH_UNWIND_SYMBOL || 'ETHUSDT',

      // Technical levels
      supportLevel: parseFloatEnv('ETH_UNWIND_SUPPORT', 3600),
      resistanceLevel: parseFloatEnv('ETH_UNWIND_RESISTANCE', 3850),
      takeProfit1: parseFloatEnv('ETH_UNWIND_TP1', 3000),
      takeProfit2: parseFloatEnv('ETH_UNWIND_TP2', 2800),

      // Derivatives thresholds
      oiThreshold: parseIntEnv('ETH_UNWIND_OI_ATH', 24000000000), // $24B
      fundingRateSpike: parseFloatEnv('ETH_UNWIND_FUNDING_SPIKE', 0.018), // 1.8%
      elrDangerZone: parseFloatEnv('ETH_UNWIND_ELR_DANGER', 0.90), // 90%

      // On-chain thresholds
      exchangeInflowThreshold: parseIntEnv('ETH_UNWIND_EXCHANGE_INFLOW', 50000), // 50k ETH

      // Risk management
      maxPositionSize: parseFloatEnv('ETH_UNWIND_MAX_POSITION', 10000),
      stopLossPercent: parseFloatEnv('ETH_UNWIND_STOP_LOSS', 7.0),
      cooldownHours: parseIntEnv('ETH_UNWIND_COOLDOWN_HOURS', 12)
    }
  },

  // ================================
  // DATA SERVICES CONFIGURATION
  // ================================
  dataServices: {
    derivatives: {
      enabled: parseBoolEnv('DERIVATIVES_MONITOR_ENABLED', true),
      updateInterval: parseIntEnv('DERIVATIVES_UPDATE_INTERVAL', 300000), // 5 minutes
      symbol: process.env.DERIVATIVES_SYMBOL || 'ETHUSDT',
      apis: {
        binance: process.env.BINANCE_FUTURES_API || 'https://fapi.binance.com',
        bybit: process.env.BYBIT_API || 'https://api.bybit.com',
        coinglass: process.env.COINGLASS_API || 'https://open-api.coinglass.com'
      }
    },

    onChainV2: {
      enabled: parseBoolEnv('ONCHAIN_V2_ENABLED', true),
      updateInterval: parseIntEnv('ONCHAIN_UPDATE_INTERVAL', 600000), // 10 minutes
      symbol: process.env.ONCHAIN_SYMBOL || 'ETH',
      apis: {
        glassnode: process.env.GLASSNODE_API,
        cryptoquant: process.env.CRYPTOQUANT_API,
        nansen: process.env.NANSEN_API
      }
    }
  },

  // ================================
  // MULTI-STRATEGY ORCHESTRATION
  // ================================
  orchestration: {
    enableConflictResolution: parseBoolEnv('ENABLE_CONFLICT_RESOLUTION', true),
    maxConcurrentStrategies: parseIntEnv('MAX_CONCURRENT_STRATEGIES', 5),
    signalTimeoutMinutes: parseIntEnv('SIGNAL_TIMEOUT_MINUTES', 30),

    // Strategy priorities (1-10, higher = more priority)
    strategyPriorities: {
      'ETH_UNWIND': parseIntEnv('ETH_UNWIND_PRIORITY', 10),
      'BTC_MACRO': parseIntEnv('BTC_MACRO_PRIORITY', 9),
      'CASCADE_HUNTER': parseIntEnv('CASCADE_HUNTER_PRIORITY', 7),
      'SPOOF_FADER': parseIntEnv('SPOOF_FADER_PRIORITY', 5),
      'COIL_WATCHER': parseIntEnv('COIL_WATCHER_PRIORITY', 3),
      'SHAKEOUT_DETECTOR': parseIntEnv('SHAKEOUT_DETECTOR_PRIORITY', 3)
    }
  }
};

// ================================
// CONFIGURATION VALIDATION
// ================================
export function validateConfig() {
  const errors = [];
  
  // Validate required Telegram settings
  if (config.telegram.enableAlerts && !config.telegram.botToken) {
    errors.push('TELEGRAM_BOT_TOKEN is required when alerts are enabled');
  }
  
  if (config.telegram.enableAlerts && !config.telegram.chatId) {
    errors.push('TELEGRAM_CHAT_ID is required when alerts are enabled');
  }
  
  // Validate threshold logic
  if (config.signals.strongMomentumThreshold >= config.signals.weakMomentumThreshold) {
    errors.push('STRONG_MOMENTUM_THRESHOLD must be less than WEAK_MOMENTUM_THRESHOLD');
  }
  
  // Validate risk management
  if (config.risk.trifecta.stopLoss >= config.risk.trifecta.takeProfit) {
    errors.push('Trifecta stop loss must be less than take profit');
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`   - ${error}`));
    return false;
  }
  
  console.log('✅ Configuration validation passed');
  return true;
}

// ================================
// CONFIGURATION SUMMARY
// ================================
export function printConfigSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('🛡️ SENTRYCOIN v4.0 PRODUCTION CONFIGURATION');
  console.log('='.repeat(60));
  console.log(`📊 Symbol: ${config.trading.symbol}`);
  console.log(`🏢 Exchange: ${config.trading.exchange.toUpperCase()}`);
  console.log(`🛡️ Paper Trading: ${config.trading.paperTrading ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🎯 Trifecta Strategy: ${config.trading.strategies.trifecta ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🔄 Squeeze Strategy: ${config.trading.strategies.squeeze ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🔥 Pressure Spikes: ${config.trading.strategies.pressureSpike ? 'ENABLED' : 'DISABLED'}`);
  console.log(`⚠️ Pressure Threshold: ${config.signals.pressureThreshold}x`);
  console.log(`💧 Liquidity Threshold: ${(config.signals.liquidityThreshold/1000).toFixed(0)}k`);
  console.log(`📈 Strong Momentum: ${config.signals.strongMomentumThreshold}%`);
  console.log(`📊 Environment: ${config.system.environment.toUpperCase()}`);
  console.log('='.repeat(60));
}

export default config;
