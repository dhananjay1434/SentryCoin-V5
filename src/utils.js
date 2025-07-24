/**
 * SentryCoin v4.0 - Utility Functions
 *
 * Common utility functions and constants used across the application
 * @version 4.0.0
 */

/**
 * Converts a date to Indian Standard Time (IST) formatted string
 * @param {Date} date - Date to convert (defaults to current time)
 * @returns {string} Formatted IST time string
 */
export function toIST(date = new Date()) {
  const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return istTime.toISOString().replace('T', ' ').substring(0, 19) + ' IST';
}

/**
 * Gets current time in Indian Standard Time (IST)
 * @returns {string} Formatted IST time
 */
export function getISTTime() {
  return toIST(new Date());
}

/**
 * Determines risk level based on ask/bid ratio
 * @param {number} ratio - Ask to bid ratio
 * @returns {string} Risk level description with emoji
 */
export function getRiskLevel(ratio) {
  if (ratio >= 5.0) return '🔴 EXTREME';
  if (ratio >= 4.0) return '🟠 VERY HIGH';
  if (ratio >= 3.0) return '🟡 HIGH';
  return '🟢 MODERATE';
}

/**
 * Formats volume numbers for display
 * @param {number} volume - Volume to format
 * @returns {string} Formatted volume string
 */
export function formatVolume(volume) {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`;
  }
  return volume.toFixed(2);
}

/**
 * Generates a unique signal ID
 * @returns {string} Unique signal identifier
 */
export function generateSignalId() {
  return `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates required environment variables
 * @param {string[]} required - Array of required environment variable names
 * @returns {string[]} Array of missing environment variables
 */
export function validateEnvironmentVariables(required) {
  return required.filter(key => !process.env[key]);
}

/**
 * Calculates percentage change between two values
 * @param {number} oldValue - Original value
 * @param {number} newValue - New value
 * @returns {number} Percentage change (negative for decrease, positive for increase)
 */
export function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Sleeps for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely parses a float from environment variable with fallback
 * @param {string} envVar - Environment variable name
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} Parsed float or default value
 */
export function parseFloatEnv(envVar, defaultValue) {
  const value = parseFloat(process.env[envVar]);
  return isNaN(value) ? defaultValue : value;
}

/**
 * Safely parses an integer from environment variable with fallback
 * @param {string} envVar - Environment variable name
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} Parsed integer or default value
 */
export function parseIntEnv(envVar, defaultValue) {
  const value = parseInt(process.env[envVar]);
  return isNaN(value) ? defaultValue : value;
}

/**
 * Creates a retry wrapper for async functions
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Function} Wrapped function with retry logic
 */
export function withRetry(fn, maxRetries = 3, delay = 1000) {
  return async (...args) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        console.log(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        console.log(`🔄 Retrying in ${delay}ms...`);
        
        await sleep(delay);
        delay *= 2; // Exponential backoff
      }
    }
  };
}

/**
 * Truncates a string to a maximum length with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncateString(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Formats a number with thousands separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  return num.toLocaleString();
}
