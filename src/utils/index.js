/**
 * SentryCoin v5.0 - Utility Functions
 *
 * Centralized utility functions and constants for the v5.0 system
 */

import crypto from 'crypto';

/**
 * Generate a unique signal ID
 */
export function generateSignalId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get current time in IST format
 */
export function getISTTime() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format price with currency symbol
 */
export function formatPriceWithSymbol(price, symbol = 'USD') {
  if (typeof price !== 'number') return 'N/A';
  return `$${price.toFixed(2)}`;
}

/**
 * Format price without symbol
 */
export function formatPrice(price) {
  if (typeof price !== 'number') return 'N/A';
  return price.toFixed(2);
}

/**
 * Parse environment variable as float
 */
export function parseFloatEnv(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as integer
 */
export function parseIntEnv(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as boolean
 */
export function parseBoolEnv(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Get risk level based on ask/bid ratio
 */
export function getRiskLevel(ratio) {
  if (ratio >= 5.0) return 'EXTREME';
  if (ratio >= 3.0) return 'HIGH';
  if (ratio >= 2.0) return 'MEDIUM';
  return 'LOW';
}

/**
 * Format volume with appropriate units
 */
export function formatVolume(volume) {
  if (typeof volume !== 'number') return 'N/A';
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
  return volume.toFixed(0);
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue, newValue) {
  if (typeof oldValue !== 'number' || typeof newValue !== 'number') return 0;
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Convert to IST time (alias for getISTTime for backward compatibility)
 */
export function toIST() {
  return getISTTime();
}

// Application constants
export const APP_VERSION = '5.0.0';
export const APP_NAME = 'SentryCoin';

// Trading constants
export const DEFAULT_SYMBOL = 'SPKUSDT';
export const DEFAULT_DANGER_RATIO = 3.0;
export const DEFAULT_ORDER_BOOK_DEPTH = 50;

// Risk management constants
export const MAX_POSITION_SIZE = 1000;
export const DEFAULT_STOP_LOSS = 2.0;
export const DEFAULT_TAKE_PROFIT = 5.0;

// System constants
export const COOLDOWN_MINUTES = 5;
export const PRICE_HISTORY_LENGTH = 300;
export const REPORT_INTERVAL_HOURS = 1;
export const DAILY_REPORT_INTERVAL_HOURS = 24;

// Classification thresholds
export const PRESSURE_THRESHOLD = 3.0;
export const LIQUIDITY_THRESHOLD = 100000;
export const STRONG_MOMENTUM_THRESHOLD = -0.3;
export const WEAK_MOMENTUM_THRESHOLD = -0.1;

// Environment validation
export const REQUIRED_ENV_VARS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID'
];

// Optional environment variables with defaults
export const OPTIONAL_ENV_VARS = {
  SYMBOL: DEFAULT_SYMBOL,
  DANGER_RATIO: DEFAULT_DANGER_RATIO.toString(),
  ORDER_BOOK_DEPTH: DEFAULT_ORDER_BOOK_DEPTH.toString(),
  PRESSURE_THRESHOLD: PRESSURE_THRESHOLD.toString(),
  LIQUIDITY_THRESHOLD: LIQUIDITY_THRESHOLD.toString(),
  STRONG_MOMENTUM_THRESHOLD: STRONG_MOMENTUM_THRESHOLD.toString(),
  WEAK_MOMENTUM_THRESHOLD: WEAK_MOMENTUM_THRESHOLD.toString(),
  COOLDOWN_MINUTES: COOLDOWN_MINUTES.toString(),
  TRIFECTA_MAX_POSITION: MAX_POSITION_SIZE.toString(),
  TRIFECTA_STOP_LOSS: DEFAULT_STOP_LOSS.toString(),
  TRIFECTA_TAKE_PROFIT: DEFAULT_TAKE_PROFIT.toString(),
  SQUEEZE_MAX_POSITION: (MAX_POSITION_SIZE / 2).toString(),
  SQUEEZE_STOP_LOSS: (DEFAULT_STOP_LOSS * 0.75).toString(),
  SQUEEZE_TAKE_PROFIT: (DEFAULT_TAKE_PROFIT * 0.6).toString(),
  SQUEEZE_TIME_EXIT: '300',
  LOG_LEVEL: 'info',
  NODE_ENV: 'development'
};

// Logging utility
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

export const logger = {
  error: (...args) => LOG_LEVELS[LOG_LEVEL] >= 0 && console.error(...args),
  warn: (...args) => LOG_LEVELS[LOG_LEVEL] >= 1 && console.warn(...args),
  info: (...args) => LOG_LEVELS[LOG_LEVEL] >= 2 && console.log(...args),
  debug: (...args) => LOG_LEVELS[LOG_LEVEL] >= 3 && console.log(...args)
};
