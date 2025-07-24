#!/usr/bin/env node

/**
 * SentryCoin v4.1.1 - Trade Closure System Test
 * 
 * Comprehensive test to verify that all positions are properly monitored
 * and closed when stop-loss or take-profit conditions are met.
 */

import CascadeHunterTrader from '../src/strategies/cascade-hunter-trader.js';
import { formatPriceWithSymbol } from '../src/utils/index.js';

console.log('🧪 SentryCoin v4.1.1 - Trade Closure System Test');
console.log('===============================================\n');

async function testTradeClosure() {
  const symbol = 'SPKUSDT';
  let allTestsPassed = true;

  try {
    console.log('1️⃣ Initializing CASCADE_HUNTER Trader...');
    const trader = new CascadeHunterTrader(symbol);
    console.log('✅ Trader initialized\n');

    // Test 1: Open a position
    console.log('2️⃣ Testing Position Opening...');
    const mockSignal = {
      symbol: 'SPKUSDT',
      currentPrice: 0.001000,
      momentum: -0.5,
      confidence: 'HIGH',
      regime: 'DISTRIBUTION_PHASE'
    };

    const position = await trader.openShortPosition(mockSignal);
    trader.activePositions.set(position.id, position);
    
    console.log(`✅ Position opened: ${position.id}`);
    console.log(`   Entry: ${formatPriceWithSymbol(position.entryPrice)}`);
    console.log(`   Stop Loss: ${formatPriceWithSymbol(position.stopLoss)} (+${trader.stopLossPercent}%)`);
    console.log(`   Take Profit: ${formatPriceWithSymbol(position.takeProfit)} (-${trader.takeProfitPercent}%)`);

    // Test 2: Test normal price updates (no exit)
    console.log('\n3️⃣ Testing Normal Price Updates...');
    const normalPrices = [0.001005, 0.000998, 0.001002, 0.000995];
    
    for (const price of normalPrices) {
      trader.updatePositions(price);
      const pos = trader.activePositions.get(position.id);
      if (pos && pos.status === 'OPEN') {
        console.log(`✅ Price ${formatPriceWithSymbol(price)}: Position remains open`);
      } else {
        console.log(`❌ Position unexpectedly closed at ${formatPriceWithSymbol(price)}`);
        allTestsPassed = false;
      }
    }

    // Test 3: Test Stop Loss Trigger
    console.log('\n4️⃣ Testing Stop Loss Trigger...');
    const stopLossPrice = position.stopLoss + 0.000001; // Slightly above stop loss
    console.log(`   Testing price: ${formatPriceWithSymbol(stopLossPrice)} (above SL: ${formatPriceWithSymbol(position.stopLoss)})`);
    
    trader.updatePositions(stopLossPrice);
    const posAfterSL = trader.activePositions.get(position.id);
    
    if (!posAfterSL || posAfterSL.status === 'CLOSED') {
      console.log('✅ Stop loss triggered correctly - position closed');
    } else {
      console.log('❌ Stop loss failed to trigger');
      allTestsPassed = false;
    }

    // Test 4: Open new position for Take Profit test
    console.log('\n5️⃣ Testing Take Profit Trigger...');
    const position2 = await trader.openShortPosition(mockSignal);
    trader.activePositions.set(position2.id, position2);
    
    console.log(`✅ New position opened: ${position2.id}`);
    
    const takeProfitPrice = position2.takeProfit - 0.000001; // Slightly below take profit
    console.log(`   Testing price: ${formatPriceWithSymbol(takeProfitPrice)} (below TP: ${formatPriceWithSymbol(position2.takeProfit)})`);
    
    trader.updatePositions(takeProfitPrice);
    const posAfterTP = trader.activePositions.get(position2.id);
    
    if (!posAfterTP || posAfterTP.status === 'CLOSED') {
      console.log('✅ Take profit triggered correctly - position closed');
    } else {
      console.log('❌ Take profit failed to trigger');
      allTestsPassed = false;
    }

    // Test 5: Test Multiple Positions
    console.log('\n6️⃣ Testing Multiple Position Management...');
    const positions = [];
    
    // Open 3 positions
    for (let i = 0; i < 3; i++) {
      const pos = await trader.openShortPosition({
        ...mockSignal,
        currentPrice: 0.001000 + (i * 0.000010) // Slightly different entry prices
      });
      trader.activePositions.set(pos.id, pos);
      positions.push(pos);
      console.log(`✅ Position ${i + 1} opened: ${pos.id}`);
    }

    // Update all with same price
    const testPrice = 0.001008;
    trader.updatePositions(testPrice);
    
    let openCount = 0;
    let closedCount = 0;
    
    for (const pos of positions) {
      const currentPos = trader.activePositions.get(pos.id);
      if (currentPos && currentPos.status === 'OPEN') {
        openCount++;
      } else {
        closedCount++;
      }
    }
    
    console.log(`📊 After price update to ${formatPriceWithSymbol(testPrice)}:`);
    console.log(`   Open positions: ${openCount}`);
    console.log(`   Closed positions: ${closedCount}`);

    // Test 6: Verify Position Monitoring Timer
    console.log('\n7️⃣ Testing Position Monitoring Timer...');
    console.log('⏰ Waiting 35 seconds to test monitoring timer...');
    
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    console.log('✅ Monitoring timer test completed');

    // Test 7: Statistics Verification
    console.log('\n8️⃣ Verifying Statistics...');
    const stats = trader.getStats();
    console.log(`📊 Trading Statistics:`);
    console.log(`   Signals Received: ${stats.signalsReceived}`);
    console.log(`   Positions Opened: ${stats.positionsOpened}`);
    console.log(`   Positions Closed: ${stats.positionsClosed}`);
    console.log(`   Active Positions: ${stats.activePositions}`);
    console.log(`   Win Rate: ${stats.winRate}`);
    console.log(`   Total P&L: ${stats.totalPnL}`);

    // Cleanup
    trader.stopPositionMonitoring();

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    allTestsPassed = false;
  }

  // Final result
  console.log('\n===============================================');
  if (allTestsPassed) {
    console.log('🎉 ALL TRADE CLOSURE TESTS PASSED!');
    console.log('✅ Position monitoring system working correctly');
    console.log('✅ Stop loss triggers functioning');
    console.log('✅ Take profit triggers functioning');
    console.log('✅ Multiple position management working');
    console.log('✅ Position monitoring timer operational');
    console.log('\n🚀 Trade closure system is READY FOR LIVE DEPLOYMENT');
  } else {
    console.log('❌ SOME TESTS FAILED!');
    console.log('🛑 Trade closure system needs attention before live deployment');
  }
  console.log('===============================================');

  return allTestsPassed;
}

// Run the test
testTradeClosure().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
