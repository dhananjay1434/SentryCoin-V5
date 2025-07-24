#!/usr/bin/env node

/**
 * SentryCoin v4.2 - HFT Optimization Validation Test
 * 
 * Validates that the system maintains HFT capabilities while preventing
 * the catastrophic failure pattern through smart risk controls.
 */

import CascadeHunterTrader from '../src/strategies/cascade-hunter-trader.js';
import SentryCoinEngine from '../src/core/sentrycoin-engine.js';
import { config } from '../config.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🏎️ SentryCoin v4.2 - HFT Optimization Validation Test');
console.log('====================================================\n');

async function validateHFTOptimization() {
  let allTestsPassed = true;
  const issues = [];

  try {
    console.log('1️⃣ Testing HFT-Compatible Timing Controls...');
    
    const trader = new CascadeHunterTrader('SPKUSDT');
    
    // Test 1: Verify HFT-friendly cooldowns
    if (trader.signalCooldownMs > 1000) {
      issues.push(`Signal cooldown too high for HFT: ${trader.signalCooldownMs}ms (should be ≤1000ms)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ HFT-friendly cooldown: ${trader.signalCooldownMs}ms`);
    }
    
    // Test 2: Verify adequate position limits for HFT
    if (trader.maxConcurrentPositions < 20) {
      issues.push(`Position limit too low for HFT: ${trader.maxConcurrentPositions} (should be ≥20)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ HFT-appropriate position limit: ${trader.maxConcurrentPositions}`);
    }

    console.log('\n2️⃣ Testing Correlation-Based Risk Controls...');
    
    // Test 3: Verify correlation limits exist
    if (!trader.maxCorrelatedPositions || trader.maxCorrelatedPositions <= 0) {
      issues.push('MAX_CORRELATED_POSITIONS not configured');
      allTestsPassed = false;
    } else {
      console.log(`✅ Correlation limit configured: ${trader.maxCorrelatedPositions}`);
    }
    
    // Test 4: Test correlation detection
    const mockPositions = [
      { strategy: 'CASCADE_SHORT', status: 'OPEN' },
      { strategy: 'CASCADE_SHORT', status: 'OPEN' },
      { strategy: 'COIL_LONG', status: 'OPEN' }
    ];
    
    // Simulate positions
    trader.activePositions.clear();
    mockPositions.forEach((pos, index) => {
      trader.activePositions.set(`pos_${index}`, pos);
    });
    
    const correlatedPositions = trader.getCorrelatedPositions('CASCADE_SHORT');
    if (correlatedPositions.length === 2) {
      console.log(`✅ Correlation detection working: Found ${correlatedPositions.length} CASCADE_SHORT positions`);
    } else {
      issues.push(`Correlation detection failed: Expected 2, got ${correlatedPositions.length}`);
      allTestsPassed = false;
    }

    console.log('\n3️⃣ Testing Dynamic Position Sizing...');
    
    // Test 5: Verify exposure scaling
    const highExposureSignal = { qualityGrade: 'HIGH', confidence: 'HIGH' };
    
    // Test with low exposure (few positions)
    trader.activePositions.clear();
    const lowExposureSize = trader.calculatePositionSize(highExposureSignal);
    
    // Test with high exposure (many positions)
    for (let i = 0; i < 20; i++) {
      trader.activePositions.set(`pos_${i}`, { status: 'OPEN' });
    }
    const highExposureSize = trader.calculatePositionSize(highExposureSignal);
    
    if (highExposureSize < lowExposureSize) {
      console.log(`✅ Dynamic sizing working: Low exposure=${lowExposureSize}, High exposure=${highExposureSize}`);
    } else {
      issues.push('Dynamic position sizing not working - size should decrease with exposure');
      allTestsPassed = false;
    }

    console.log('\n4️⃣ Testing HFT-Optimized Signal Quality...');
    
    // Test 6: Verify HFT-appropriate thresholds
    const liquidityThreshold = parseInt(process.env.CASCADE_LIQUIDITY_THRESHOLD || '400000');
    if (liquidityThreshold > 200000) {
      issues.push(`Liquidity threshold too high for HFT: ${liquidityThreshold} (consider ≤200000 for HFT)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ HFT-appropriate liquidity threshold: ${liquidityThreshold}`);
    }
    
    // Test 7: Test signal quality grading for HFT
    const testSignals = [
      { totalBidVolume: 200000, qualityExpected: 'LOW' },
      { totalBidVolume: 350000, qualityExpected: 'MEDIUM' },
      { totalBidVolume: 600000, qualityExpected: 'HIGH' }
    ];
    
    for (const testSignal of testSignals) {
      const quality = trader.assessSignalQuality(testSignal);
      if (quality === testSignal.qualityExpected) {
        console.log(`✅ HFT signal quality correct: ${testSignal.totalBidVolume} → ${quality}`);
      } else {
        issues.push(`HFT signal quality incorrect: ${testSignal.totalBidVolume} expected ${testSignal.qualityExpected}, got ${quality}`);
        allTestsPassed = false;
      }
    }

    console.log('\n5️⃣ Testing HFT-Compatible Conflict Resolution...');
    
    // Test 8: Verify short conflict veto duration
    const engine = new SentryCoinEngine(config);
    if (engine.conflictVetoDurationMs > 10000) {
      issues.push(`Conflict veto too long for HFT: ${engine.conflictVetoDurationMs}ms (should be ≤10000ms)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ HFT-friendly conflict veto: ${engine.conflictVetoDurationMs}ms`);
    }

    console.log('\n6️⃣ Testing HFT Performance Characteristics...');
    
    // Test 9: Simulate rapid signal processing
    const startTime = Date.now();
    const signalCount = 100;
    
    for (let i = 0; i < signalCount; i++) {
      const mockSignal = {
        totalBidVolume: 300000,
        qualityGrade: 'MEDIUM',
        confidence: 'HIGH',
        type: 'CASCADE_SHORT'
      };
      
      // Simulate signal processing (without actual trading)
      trader.assessSignalQuality(mockSignal);
      trader.calculatePositionSize(mockSignal);
    }
    
    const processingTime = Date.now() - startTime;
    const signalsPerSecond = (signalCount / processingTime) * 1000;
    
    if (signalsPerSecond > 1000) {
      console.log(`✅ HFT processing speed: ${signalsPerSecond.toFixed(0)} signals/second`);
    } else {
      issues.push(`Processing speed too slow for HFT: ${signalsPerSecond.toFixed(0)} signals/second`);
      allTestsPassed = false;
    }

  } catch (error) {
    issues.push(`Test execution failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Final assessment
  console.log('\n====================================================');
  if (allTestsPassed && issues.length === 0) {
    console.log('🎉 HFT OPTIMIZATION VALIDATION PASSED!');
    console.log('✅ Maintains HFT speed capabilities');
    console.log('✅ Smart correlation-based risk controls');
    console.log('✅ Dynamic position sizing');
    console.log('✅ Microsecond-friendly conflict resolution');
    console.log('✅ High-frequency signal processing');
    console.log('\n🏎️ System optimized for HFT while preventing catastrophic failure');
    console.log('🛡️ Smart risk controls without killing speed');
  } else {
    console.log('❌ HFT OPTIMIZATION VALIDATION FAILED!');
    console.log('🛑 The following issues must be resolved:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log('\n⚠️ Adjust configuration for optimal HFT performance');
  }
  console.log('====================================================');

  return allTestsPassed;
}

// Run the validation
validateHFTOptimization().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ HFT validation failed:', error.message);
  process.exit(1);
});
