#!/usr/bin/env node

/**
 * SentryCoin Backtesting Runner
 * 
 * Simple script to run backtesting with real historical data
 */

import RealDataBacktester from './src/real-data-backtester.js';
import HistoricalDataFetcher from './src/historical-data-fetcher.js';

console.log('🚀 SentryCoin Flash Crash Predictor - Real Data Backtesting\n');

const command = process.argv[2];

switch (command) {
  case 'fetch':
    console.log('📥 Fetching historical data for known crash events...\n');
    const fetcher = new HistoricalDataFetcher();
    fetcher.fetchCrashEventData().then(results => {
      console.log(`\n✅ Successfully fetched data for ${results.length} crash events`);
      console.log('📁 Data cached in ./backtest-data/ directory');
      console.log('\n🚀 Now run: node run-backtest.js test');
    }).catch(error => {
      console.error('❌ Failed to fetch data:', error.message);
      console.log('\n💡 Trying alternative approach with mock historical data...');
    });
    break;

  case 'test':
    console.log('🧪 Running backtesting with real historical data...\n');
    const backtester = new RealDataBacktester();
    backtester.runRealDataBacktest().catch(error => {
      console.error('❌ Backtesting failed:', error.message);
    });
    break;

  case 'quick':
    console.log('⚡ Running quick backtest with sample data...\n');
    runQuickBacktest();
    break;

  default:
    console.log('📋 SentryCoin Backtesting Commands:\n');
    console.log('  node run-backtest.js fetch  - Fetch historical crash data');
    console.log('  node run-backtest.js test   - Run full backtesting');
    console.log('  node run-backtest.js quick  - Run quick test with sample data');
    console.log('\n💡 Start with: node run-backtest.js fetch');
}

/**
 * Runs a quick backtest with sample data
 */
async function runQuickBacktest() {
  const { default: FlashCrashPredictor } = await import('./src/predictor.js');
  
  console.log('🎭 Generating sample crash scenario...');
  
  // Create predictor
  const predictor = new FlashCrashPredictor();
  predictor.dangerRatio = 2.5;
  
  let alertsTriggered = 0;
  let firstAlertStep = null;
  
  // Override alert method
  let currentStep = 0;
  predictor.triggerFlashCrashAlert = async (alertData) => {
    alertsTriggered++;
    if (!firstAlertStep) {
      firstAlertStep = currentStep;
    }
    console.log(`🚨 ALERT at step ${currentStep}: Ratio ${alertData.askToBidRatio.toFixed(2)}x`);
    return true;
  };
  
  // Simulate crash scenario
  console.log('📊 Simulating flash crash scenario...\n');

  for (let step = 0; step < 20; step++) {
    currentStep = step;
    const progress = step / 19;
    
    // Clear order book
    predictor.orderBook.bids.clear();
    predictor.orderBook.asks.clear();
    
    // Generate bids (decreasing volume)
    const bidMultiplier = 1 - (progress * 0.7);
    for (let i = 0; i < 25; i++) {
      const price = 100 - (i * 0.01);
      const volume = (Math.random() * 5 + 1) * bidMultiplier;
      predictor.orderBook.bids.set(price, Math.max(volume, 0.1));
    }
    
    // Generate asks (increasing volume)
    const askMultiplier = 1 + (progress * 4);
    for (let i = 0; i < 25; i++) {
      const price = 100 + (i * 0.01);
      const volume = (Math.random() * 5 + 1) * askMultiplier;
      predictor.orderBook.asks.set(price, volume);
    }
    
    // Analyze
    predictor.analyzeFlashCrashConditions();
    const ratio = predictor.stats.lastRatio;
    
    console.log(`Step ${step.toString().padStart(2)}: Ratio ${ratio.toFixed(2)}x ${ratio > predictor.dangerRatio ? '🚨' : '📊'}`);
  }
  
  console.log('\n📋 Quick Backtest Results:');
  console.log(`🚨 Alerts Triggered: ${alertsTriggered}`);
  console.log(`⏱️ First Alert: Step ${firstAlertStep || 'None'}`);
  console.log(`🎯 Detection: ${alertsTriggered > 0 ? 'SUCCESS' : 'FAILED'}`);
  
  if (alertsTriggered > 0) {
    console.log('\n✅ Algorithm successfully detected the simulated flash crash!');
  } else {
    console.log('\n❌ Algorithm missed the simulated flash crash.');
    console.log('💡 Consider lowering the DANGER_RATIO threshold.');
  }
}
