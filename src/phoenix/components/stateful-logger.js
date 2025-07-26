/**
 * Phoenix v6.0 - Stateful Logger (Mandate 3)
 * 
 * Intelligent logging system that eliminates redundant output
 * by maintaining state cache and only logging changes.
 */

import fs from 'fs';
import path from 'path';
import { getISTTime } from '../../utils/index.js';

export default class StatefulLogger {
  constructor(config = {}) {
    this.config = {
      enableFileLogging: config.enableFileLogging || false,
      enableConsoleLogging: config.enableConsoleLogging !== false,
      logDirectory: config.logDirectory || './logs/phoenix',
      stateChangeOnly: config.stateChangeOnly !== false,
      minLogLevel: config.minLogLevel || 1, // INFO
      ...config
    };
    
    // State cache for change detection
    this.stateCache = new Map();
    
    // Log levels
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4
    };
    
    // Performance stats
    this.stats = {
      totalLogs: 0,
      stateLogs: 0,
      duplicatesFiltered: 0,
      fileWrites: 0,
      consoleWrites: 0,
      startTime: Date.now()
    };
    
    // Setup file logging if enabled
    if (this.config.enableFileLogging) {
      this.setupFileLogging();
    }
    
    console.log('📝 Stateful Logger v6.0 initialized');
  }

  /**
   * Main logging method
   */
  log(key, value, level = this.levels.INFO, metadata = {}) {
    this.stats.totalLogs++;
    
    // Create log entry
    const entry = this.createLogEntry(key, value, level, metadata);
    
    // Check for state change
    if (this.config.stateChangeOnly && this.isDuplicate(entry)) {
      this.stats.duplicatesFiltered++;
      return false;
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
    if (this.config.enableFileLogging && this.logFileStream) {
      this.writeToFile(entry);
    }
    
    return true;
  }

  /**
   * Create log entry object
   */
  createLogEntry(key, value, level, metadata) {
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    return {
      key,
      value,
      level,
      metadata,
      timestamp: Date.now(),
      istTime: getISTTime(),
      hash: this.calculateHash(key + valueStr)
    };
  }

  /**
   * Calculate hash for change detection
   */
  calculateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Check if log entry is duplicate
   */
  isDuplicate(entry) {
    const cachedEntry = this.stateCache.get(entry.key);
    if (!cachedEntry) {
      return false; // First time logging this key
    }
    
    return cachedEntry.hash === entry.hash;
  }

  /**
   * Update state cache
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
   * Write to console
   */
  writeToConsole(entry) {
    const levelStr = Object.keys(this.levels)[entry.level] || 'INFO';
    const valueStr = typeof entry.value === 'object' ? 
      JSON.stringify(entry.value, null, 2) : entry.value;
    
    const formatted = `[${entry.istTime}] [${levelStr}] ${entry.key}: ${valueStr}`;
    
    switch (entry.level) {
      case this.levels.DEBUG:
        console.debug(formatted);
        break;
      case this.levels.INFO:
        console.log(formatted);
        break;
      case this.levels.WARN:
        console.warn(formatted);
        break;
      case this.levels.ERROR:
      case this.levels.CRITICAL:
        console.error(formatted);
        break;
      default:
        console.log(formatted);
    }
    
    this.stats.consoleWrites++;
  }

  /**
   * Write to file
   */
  writeToFile(entry) {
    if (!this.logFileStream) return;
    
    const levelStr = Object.keys(this.levels)[entry.level] || 'INFO';
    const valueStr = typeof entry.value === 'object' ? 
      JSON.stringify(entry.value) : entry.value;
    
    const formatted = `[${entry.istTime}] [${levelStr}] ${entry.key}: ${valueStr}\n`;
    
    try {
      this.logFileStream.write(formatted);
      this.stats.fileWrites++;
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Setup file logging
   */
  setupFileLogging() {
    try {
      // Create log directory
      if (!fs.existsSync(this.config.logDirectory)) {
        fs.mkdirSync(this.config.logDirectory, { recursive: true });
      }
      
      // Create log file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFileName = `phoenix-v6-${timestamp}.log`;
      const logFilePath = path.join(this.config.logDirectory, logFileName);
      
      // Create write stream
      this.logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      this.currentLogFile = logFilePath;
      
      // Write header
      this.logFileStream.write(`=== Phoenix Engine v6.0 Log Started at ${getISTTime()} ===\n`);
      
      console.log(`📁 File logging enabled: ${logFilePath}`);
      
    } catch (error) {
      console.error('Failed to setup file logging:', error.message);
      this.config.enableFileLogging = false;
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(key, value, metadata = {}) {
    return this.log(key, value, this.levels.DEBUG, metadata);
  }

  info(key, value, metadata = {}) {
    return this.log(key, value, this.levels.INFO, metadata);
  }

  warn(key, value, metadata = {}) {
    return this.log(key, value, this.levels.WARN, metadata);
  }

  error(key, value, metadata = {}) {
    return this.log(key, value, this.levels.ERROR, metadata);
  }

  critical(key, value, metadata = {}) {
    return this.log(key, value, this.levels.CRITICAL, metadata);
  }

  /**
   * Force log regardless of state change
   */
  force(key, value, level = this.levels.INFO, metadata = {}) {
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
   * Shutdown logger
   */
  shutdown() {
    console.log('📝 Shutting down Stateful Logger...');
    
    if (this.logFileStream) {
      this.logFileStream.write(`=== Phoenix Engine v6.0 Log Ended at ${getISTTime()} ===\n`);
      this.logFileStream.end();
    }
    
    const stats = this.getStats();
    console.log(`📊 Final stats: ${stats.totalLogs} total, ${stats.duplicatesFiltered} filtered, ${stats.filterEfficiency}% efficiency`);
  }
}
