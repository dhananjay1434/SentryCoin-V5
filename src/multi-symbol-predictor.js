#!/usr/bin/env node

/**
 * Multi-Symbol Flash Crash Predictor
 * 
 * Monitors multiple cryptocurrency pairs simultaneously for flash crash conditions
 */

import FlashCrashPredictor from './predictor.js';
import dotenv from 'dotenv';

dotenv.config();

class MultiSymbolPredictor {
  constructor() {
    this.symbols = this.parseSymbols();
    this.predictors = new Map();
    this.isRunning = false;
    
    console.log('🛡️ Multi-Symbol Flash Crash Predictor v1.0.0');
    console.log('📊 Real-time monitoring across multiple trading pairs');
    console.log(`🎯 Monitoring ${this.symbols.length} symbols: ${this.symbols.join(', ')}`);
  }

  /**
   * Parses symbols from environment variable
   */
  parseSymbols() {
    const symbolsEnv = process.env.SYMBOLS || process.env.SYMBOL || 'BTCUSDT';
    return symbolsEnv.split(',').map(s => s.trim().toUpperCase());
  }

  /**
   * Starts monitoring all configured symbols
   */
  async start() {
    console.log('\n🚀 Starting Multi-Symbol Flash Crash Predictor...');
    
    // Create predictor for each symbol
    for (const symbol of this.symbols) {
      console.log(`📊 Initializing predictor for ${symbol}...`);
      
      try {
        const predictor = await this.createPredictorForSymbol(symbol);
        this.predictors.set(symbol, predictor);
        
        // Start the predictor
        await predictor.start();
        console.log(`✅ ${symbol} predictor active`);
        
      } catch (error) {
        console.error(`❌ Failed to initialize ${symbol}: ${error.message}`);
        console.log(`⚠️ Continuing with other symbols...`);
      }
    }

    this.isRunning = true;
    console.log(`\n✅ Multi-Symbol Predictor running with ${this.predictors.size}/${this.symbols.length} active monitors`);
    
    // Start consolidated statistics reporting
    this.startConsolidatedStats();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Creates a predictor instance for a specific symbol
   */
  async createPredictorForSymbol(symbol) {
    // Temporarily override environment for this symbol
    const originalSymbol = process.env.SYMBOL;
    process.env.SYMBOL = symbol;
    
    // Create predictor with symbol-specific configuration
    const predictor = new FlashCrashPredictor();
    
    // Restore original environment
    process.env.SYMBOL = originalSymbol;
    
    // Override alert method to include symbol in alerts
    const originalTriggerAlert = predictor.triggerFlashCrashAlert.bind(predictor);
    predictor.triggerFlashCrashAlert = async (alertData) => {
      // Add symbol to alert data
      const enhancedAlertData = {
        ...alertData,
        symbol: symbol,
        timestamp: new Date().toISOString()
      };
      
      console.log(`🚨 FLASH CRASH ALERT: ${symbol}`);
      console.log(`📊 Ask/Bid Ratio: ${alertData.askToBidRatio.toFixed(2)}x`);
      console.log(`💰 Symbol: ${symbol}`);
      console.log(`⏰ Time: ${enhancedAlertData.timestamp}`);
      
      // Send enhanced alert
      return await originalTriggerAlert(enhancedAlertData);
    };
    
    return predictor;
  }

  /**
   * Starts consolidated statistics reporting across all symbols
   */
  startConsolidatedStats() {
    setInterval(() => {
      console.log('\n📊 MULTI-SYMBOL STATUS REPORT');
      console.log('═'.repeat(60));
      
      let totalMessages = 0;
      let totalAlerts = 0;
      let activeConnections = 0;
      
      for (const [symbol, predictor] of this.predictors) {
        const stats = predictor.stats;
        const isConnected = predictor.isConnected;
        const ratio = stats.lastRatio || 0;
        
        totalMessages += stats.messagesProcessed;
        totalAlerts += stats.alertsTriggered;
        if (isConnected) activeConnections++;
        
        const status = isConnected ? '🟢' : '🔴';
        const ratioStatus = ratio > predictor.dangerRatio ? '🚨' : '📊';
        
        console.log(`${status} ${symbol.padEnd(8)} | Ratio: ${ratio.toFixed(2)}x ${ratioStatus} | Msgs: ${stats.messagesProcessed} | Alerts: ${stats.alertsTriggered}`);
      }
      
      console.log('─'.repeat(60));
      console.log(`📈 Total: ${totalMessages} msgs | ${totalAlerts} alerts | ${activeConnections}/${this.predictors.size} connected`);
      console.log(`⏰ ${new Date().toLocaleTimeString()}`);
      
    }, 60000); // Every minute
  }

  /**
   * Gets status of all predictors
   */
  getStatus() {
    const status = {
      service: 'Multi-Symbol Flash Crash Predictor',
      version: '1.0.0',
      symbols: this.symbols,
      activeMonitors: this.predictors.size,
      totalSymbols: this.symbols.length,
      isRunning: this.isRunning,
      timestamp: new Date().toISOString(),
      monitors: {}
    };

    for (const [symbol, predictor] of this.predictors) {
      status.monitors[symbol] = {
        connected: predictor.isConnected,
        messagesProcessed: predictor.stats.messagesProcessed,
        alertsTriggered: predictor.stats.alertsTriggered,
        lastRatio: predictor.stats.lastRatio,
        dangerRatio: predictor.dangerRatio,
        uptime: Math.floor((Date.now() - predictor.stats.startTime) / 1000)
      };
    }

    return status;
  }

  /**
   * Graceful shutdown of all predictors
   */
  shutdown() {
    console.log('\n🛑 Shutting down Multi-Symbol Flash Crash Predictor...');
    
    for (const [symbol, predictor] of this.predictors) {
      console.log(`🔌 Stopping ${symbol} monitor...`);
      try {
        if (predictor.ws) {
          predictor.ws.close();
        }
        if (predictor.mockInterval) {
          clearInterval(predictor.mockInterval);
        }
      } catch (error) {
        console.error(`❌ Error stopping ${symbol}: ${error.message}`);
      }
    }
    
    console.log('✅ All monitors stopped');
    process.exit(0);
  }
}

// Export for use in other modules
export default MultiSymbolPredictor;

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const multiPredictor = new MultiSymbolPredictor();
  multiPredictor.start().catch(console.error);
}
