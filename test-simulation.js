#!/usr/bin/env node

/**
 * Quick High-Fidelity Crash Simulation Test
 * Tests the algorithm with realistic crash scenarios
 */

import FlashCrashPredictor from './src/predictor.js';

async function testRealisticCrash() {
  console.log('🎭 High-Fidelity Flash Crash Simulation\n');
  
  const scenarios = [
    {
      name: 'Flash Crash Event',
      symbol: 'BTCUSDT',
      dangerRatio: 2.5,
      duration: 30,
      maxRatio: 8.0
    },
    {
      name: 'Whale Dump Scenario', 
      symbol: 'ETHUSDT',
      dangerRatio: 2.0,
      duration: 15,
      maxRatio: 12.0
    }
  ];

  for (const scenario of scenarios) {
    console.log(`🔬 Testing: ${scenario.name} (${scenario.symbol})`);
    console.log(`⚠️ Danger Ratio: ${scenario.dangerRatio}x`);
    console.log(`📊 Duration: ${scenario.duration} steps\n`);
    
    // Set environment for this test
    process.env.SYMBOL = scenario.symbol;
    process.env.DANGER_RATIO = scenario.dangerRatio.toString();
    process.env.COOLDOWN_MINUTES = '0.1'; // 6 seconds for testing
    
    const predictor = new FlashCrashPredictor();
    
    let alertsTriggered = 0;
    let firstAlertStep = null;
    let maxRatio = 0;
    
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
    
    const basePrice = getBasePriceForSymbol(scenario.symbol);
    
    for (let step = 0; step < scenario.duration; step++) {
      currentStep = step;
      const progress = step / (scenario.duration - 1);
      
      // Generate realistic crash order book
      const orderBook = generateCrashOrderBook(basePrice, progress, scenario.maxRatio, scenario.name);
      
      // Update predictor
      predictor.orderBook.bids.clear();
      predictor.orderBook.asks.clear();
      
      orderBook.bids.forEach(([price, quantity]) => {
        predictor.orderBook.bids.set(price, quantity);
      });
      
      orderBook.asks.forEach(([price, quantity]) => {
        predictor.orderBook.asks.set(price, quantity);
      });
      
      // Analyze
      predictor.analyzeFlashCrashConditions();
      const ratio = predictor.stats.lastRatio;
      maxRatio = Math.max(maxRatio, ratio);
      
      const status = ratio > scenario.dangerRatio ? '🚨' : '📊';
      console.log(`Step ${step.toString().padStart(2)}: Ratio ${ratio.toFixed(2)}x ${status}`);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`\n📋 ${scenario.name} Results:`);
    console.log(`🚨 Alerts Triggered: ${alertsTriggered}`);
    console.log(`📈 Max Ratio: ${maxRatio.toFixed(2)}x`);
    console.log(`⏱️ First Alert: Step ${firstAlertStep || 'None'}`);
    console.log(`🎯 Detection: ${alertsTriggered > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('\n' + '─'.repeat(60) + '\n');
  }
}

function getBasePriceForSymbol(symbol) {
  const prices = {
    'BTCUSDT': 43000,
    'ETHUSDT': 2500,
    'SOLUSDT': 100
  };
  return prices[symbol] || 100;
}

function generateCrashOrderBook(basePrice, progress, maxRatio, scenarioType) {
  const bids = [];
  const asks = [];
  
  let bidMultiplier, askMultiplier;
  
  if (scenarioType === 'Flash Crash Event') {
    bidMultiplier = 1 - (Math.pow(progress, 2) * 0.9); // Accelerating bid loss
    askMultiplier = 1 + (Math.pow(progress, 1.5) * 4); // Rapid ask buildup
  } else if (scenarioType === 'Whale Dump Scenario') {
    bidMultiplier = progress < 0.3 ? 1 : 1 - ((progress - 0.3) * 1.2); // Sudden bid collapse
    askMultiplier = progress < 0.3 ? 1 : 1 + ((progress - 0.3) * 8); // Massive ask wall
  } else {
    bidMultiplier = 1 - (progress * 0.6);
    askMultiplier = 1 + (progress * 2);
  }
  
  bidMultiplier = Math.max(bidMultiplier, 0.1);
  askMultiplier = Math.max(askMultiplier, 1);
  
  // Generate order book
  for (let i = 0; i < 50; i++) {
    const bidPrice = basePrice - (i * basePrice * 0.0005);
    const askPrice = basePrice + (i * basePrice * 0.0005);
    
    const bidVolume = (Math.random() * 10 + 2) * bidMultiplier;
    const askVolume = (Math.random() * 10 + 2) * askMultiplier;
    
    bids.push([bidPrice, Math.max(bidVolume, 0.1)]);
    asks.push([askPrice, askVolume]);
  }
  
  return { bids, asks };
}

testRealisticCrash().catch(console.error);
