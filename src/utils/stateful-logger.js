/**
 * SentryCoin v6.0 - Stateful Logger
 * 
 * PROJECT PHOENIX - MANDATE 3 IMPLEMENTATION
 * 
 * Centralized logging utility that eliminates redundant console output
 * by maintaining state cache and only logging changes.
 * 
 * RED TEAM MANDATE: "Create centralized logging utility with state-change detection."
 */

import fs from 'fs';
import path from 'path';
import { getISTTime } from './index.js';

/**
 * Log Level Enumeration
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

/**
 * Log Entry Structure
 */
export class LogEntry {
  constructor(key, value, level = LOG_LEVELS.INFO, metadata = {}) {
    this.key = key;
    this.value = value;
    this.level = level;
    this.metadata = metadata;
    this.timestamp = Date.now();
    this.istTime = getISTTime();
    this.hash = this.calculateHash();
  }

  /**
   * Calculate hash for change detection
   */
  calculateHash() {
    const valueStr = typeof this.value === 'object' ? JSON.stringify(this.value) : String(this.value);
    return this.simpleHash(this.key + valueStr);
  }

  /**
   * Simple hash function for change detection
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Format log entry for output
   */
  format() {
    const levelStr = Object.keys(LOG_LEVELS)[this.level] || 'INFO';
    const valueStr = typeof this.value === 'object' ? JSON.stringify(this.value, null, 2) : this.value;
    
    return `[${this.istTime}] [${levelStr}] ${this.key}: ${valueStr}`;
  }
}

/**
 * Stateful Logger - Core Engine
 */
export class StatefulLogger {
  constructor(config = {}) {
    this.config = {
      enableFileLogging: config.enableFileLogging || false,
      enableConsoleLogging: config.enableConsoleLogging !== false, // Default true
      logDirectory: config.logDirectory || './logs',
      maxLogFiles: config.maxLogFiles || 30,
      maxLogSize: config.maxLogSize || 10485760, // 10MB
      minLogLevel: config.minLogLevel || LOG_LEVELS.INFO,
      stateChangeOnly: config.stateChangeOnly !== false, // Default true
      ...config
    };
    
    // State cache for change detection
    this.stateCache = new Map();
    
    // Performance tracking
    this.stats = {
      totalLogs: 0,
      stateLogs: 0,
      duplicatesFiltered: 0,
      fileWrites: 0,
      consoleWrites: 0,
      startTime: Date.now()
    };
    
    // File logging setup
    if (this.config.enableFileLogging) {
      this.setupFileLogging();
    }
    
    console.log('📝 Stateful Logger v6.0 initialized');
    console.log(`   State-change only: ${this.config.stateChangeOnly}`);
    console.log(`   File logging: ${this.config.enableFileLogging}`);
    console.log(`   Min level: ${Object.keys(LOG_LEVELS)[this.config.minLogLevel]}`);
  }

  /**
   * Main logging method - only logs if state has changed
   */
  log(key, value, level = LOG_LEVELS.INFO, metadata = {}) {
    this.stats.totalLogs++;
    
    // Create log entry
    const entry = new LogEntry(key, value, level, metadata);
    
    // Check if this is a state change
    if (this.config.stateChangeOnly && this.isDuplicate(entry)) {
      this.stats.duplicatesFiltered++;
      return false; // No logging needed
    }
    
    // Update state cache
    this.updateStateCache(entry);
    this.stats.stateLogs++;
    
    // Apply minimum log level filter
    if (entry.level < this.config.minLogLevel) {
      return false;
    }
    
    // Output to console
    if (this.config.enableConsoleLogging) {
      this.writeToConsole(entry);
    }
    
    // Output to file
    if (this.config.enableFileLogging) {
      this.writeToFile(entry);
    }
    
    return true;
  }

  /**
   * Check if log entry is duplicate of cached state
   */
  isDuplicate(entry) {
    const cachedEntry = this.stateCache.get(entry.key);
    if (!cachedEntry) {
      return false; // First time logging this key
    }
    
    return cachedEntry.hash === entry.hash;
  }

  /**
   * Update state cache with new entry
   */
  updateStateCache(entry) {
    this.stateCache.set(entry.key, {
      hash: entry.hash,
      value: entry.value,
      timestamp: entry.timestamp,
      count: (this.stateCache.get(entry.key)?.count || 0) + 1
    });
  }

  /**
   * Write to console with appropriate formatting
   */
  writeToConsole(entry) {
    const formatted = entry.format();
    
    switch (entry.level) {
      case LOG_LEVELS.DEBUG:
        console.debug(formatted);
        break;
      case LOG_LEVELS.INFO:
        console.log(formatted);
        break;
      case LOG_LEVELS.WARN:
        console.warn(formatted);
        break;
      case LOG_LEVELS.ERROR:
      case LOG_LEVELS.CRITICAL:
        console.error(formatted);
        break;
      default:
        console.log(formatted);
    }
    
    this.stats.consoleWrites++;
  }

  /**
   * Write to log file
   */
  writeToFile(entry) {
    if (!this.logFileStream) {
      return;
    }
    
    const formatted = entry.format() + '\n';
    
    try {
      this.logFileStream.write(formatted);
      this.stats.fileWrites++;
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Setup file logging infrastructure
   */
  setupFileLogging() {
    try {
      // Create log directory if it doesn't exist
      if (!fs.existsSync(this.config.logDirectory)) {
        fs.mkdirSync(this.config.logDirectory, { recursive: true });
      }
      
      // Create log file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFileName = `sentrycoin-v6-${timestamp}.log`;
      const logFilePath = path.join(this.config.logDirectory, logFileName);
      
      // Create write stream
      this.logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      this.currentLogFile = logFilePath;
      
      // Write header
      this.logFileStream.write(`=== SentryCoin v6.0 Log Started at ${getISTTime()} ===\n`);
      
      console.log(`📁 File logging enabled: ${logFilePath}`);
      
      // Setup log rotation
      this.setupLogRotation();
      
    } catch (error) {
      console.error('Failed to setup file logging:', error.message);
      this.config.enableFileLogging = false;
    }
  }

  /**
   * Setup log rotation based on size and count
   */
  setupLogRotation() {
    setInterval(() => {
      this.rotateLogsIfNeeded();
    }, 60000); // Check every minute
  }

  /**
   * Rotate logs if size limit exceeded
   */
  rotateLogsIfNeeded() {
    if (!this.currentLogFile || !fs.existsSync(this.currentLogFile)) {
      return;
    }
    
    try {
      const stats = fs.statSync(this.currentLogFile);
      
      if (stats.size > this.config.maxLogSize) {
        this.rotateLogs();
      }
      
      this.cleanupOldLogs();
      
    } catch (error) {
      console.error('Error checking log file size:', error.message);
    }
  }

  /**
   * Rotate current log file
   */
  rotateLogs() {
    try {
      // Close current stream
      if (this.logFileStream) {
        this.logFileStream.end();
      }
      
      // Create new log file
      this.setupFileLogging();
      
      console.log('📁 Log file rotated due to size limit');
      
    } catch (error) {
      console.error('Error rotating log files:', error.message);
    }
  }

  /**
   * Cleanup old log files
   */
  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.config.logDirectory)
        .filter(file => file.startsWith('sentrycoin-v6-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDirectory, file),
          mtime: fs.statSync(path.join(this.config.logDirectory, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // Remove excess files
      if (files.length > this.config.maxLogFiles) {
        const filesToDelete = files.slice(this.config.maxLogFiles);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log(`📁 Deleted old log file: ${file.name}`);
        }
      }
      
    } catch (error) {
      console.error('Error cleaning up old logs:', error.message);
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(key, value, metadata = {}) {
    return this.log(key, value, LOG_LEVELS.DEBUG, metadata);
  }

  info(key, value, metadata = {}) {
    return this.log(key, value, LOG_LEVELS.INFO, metadata);
  }

  warn(key, value, metadata = {}) {
    return this.log(key, value, LOG_LEVELS.WARN, metadata);
  }

  error(key, value, metadata = {}) {
    return this.log(key, value, LOG_LEVELS.ERROR, metadata);
  }

  critical(key, value, metadata = {}) {
    return this.log(key, value, LOG_LEVELS.CRITICAL, metadata);
  }

  /**
   * Force log regardless of state change
   */
  force(key, value, level = LOG_LEVELS.INFO, metadata = {}) {
    const originalSetting = this.config.stateChangeOnly;
    this.config.stateChangeOnly = false;
    
    const result = this.log(key, value, level, metadata);
    
    this.config.stateChangeOnly = originalSetting;
    return result;
  }

  /**
   * Get current state cache
   */
  getStateCache() {
    const cache = {};
    for (const [key, value] of this.stateCache) {
      cache[key] = {
        value: value.value,
        timestamp: value.timestamp,
        count: value.count
      };
    }
    return cache;
  }

  /**
   * Clear state cache
   */
  clearStateCache() {
    const size = this.stateCache.size;
    this.stateCache.clear();
    console.log(`📝 Cleared state cache (${size} entries)`);
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const filterEfficiency = this.stats.totalLogs > 0 ? 
      (this.stats.duplicatesFiltered / this.stats.totalLogs * 100) : 0;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      cacheSize: this.stateCache.size,
      filterEfficiency: Math.round(filterEfficiency * 100) / 100,
      avgLogsPerSecond: Math.round((this.stats.totalLogs / (uptime / 1000)) * 100) / 100
    };
  }

  /**
   * Shutdown logger gracefully
   */
  shutdown() {
    console.log('📝 Shutting down Stateful Logger...');
    
    if (this.logFileStream) {
      this.logFileStream.write(`=== SentryCoin v6.0 Log Ended at ${getISTTime()} ===\n`);
      this.logFileStream.end();
    }
    
    const stats = this.getStats();
    console.log(`📊 Final stats: ${stats.totalLogs} total, ${stats.duplicatesFiltered} filtered, ${stats.filterEfficiency}% efficiency`);
  }
}

/**
 * Global singleton instance
 */
let globalLogger = null;

/**
 * Initialize global logger
 */
export function initializeLogger(config = {}) {
  if (globalLogger) {
    console.warn('Stateful Logger already initialized');
    return globalLogger;
  }
  
  globalLogger = new StatefulLogger(config);
  return globalLogger;
}

/**
 * Get global logger instance
 */
export function getLogger() {
  if (!globalLogger) {
    globalLogger = new StatefulLogger();
  }
  return globalLogger;
}

/**
 * Convenience functions for global logger
 */
export function log(key, value, level, metadata) {
  return getLogger().log(key, value, level, metadata);
}

export function debug(key, value, metadata) {
  return getLogger().debug(key, value, metadata);
}

export function info(key, value, metadata) {
  return getLogger().info(key, value, metadata);
}

export function warn(key, value, metadata) {
  return getLogger().warn(key, value, metadata);
}

export function error(key, value, metadata) {
  return getLogger().error(key, value, metadata);
}

export function critical(key, value, metadata) {
  return getLogger().critical(key, value, metadata);
}

export function force(key, value, level, metadata) {
  return getLogger().force(key, value, level, metadata);
}

// Export default instance
export default {
  StatefulLogger,
  LogEntry,
  LOG_LEVELS,
  initializeLogger,
  getLogger,
  log,
  debug,
  info,
  warn,
  error,
  critical,
  force
};
