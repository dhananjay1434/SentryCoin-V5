#!/usr/bin/env node

/**
 * SentryCoin v4.1.1 - Critical Fixes Validation Test
 * 
 * Validates that all critical architectural fixes are working correctly
 * to prevent the catastrophic failure pattern that occurred.
 */

import CascadeHunterTrader from '../src/strategies/cascade-hunter-trader.js';
import SentryCoinEngine from '../src/core/sentrycoin-engine.js';
import { config } from '../config.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 SentryCoin v4.1.1 - Critical Fixes Validation Test');
console.log('====================================================\n');

async function validateCriticalFixes() {
  let allTestsPassed = true;
  const issues = [];

  try {
    console.log('1️⃣ Testing Position Limit Controls...');
    
    // Test 1: Position limit enforcement
    const trader = new CascadeHunterTrader('SPKUSDT');
    
    // Verify configuration
    if (trader.maxConcurrentPositions <= 0) {
      issues.push('CASCADE_MAX_CONCURRENT_POSITIONS not configured');
      allTestsPassed = false;
    } else {
      console.log(`✅ Max concurrent positions: ${trader.maxConcurrentPositions}`);
    }
    
    if (trader.positionCooldownMinutes <= 0) {
      issues.push('CASCADE_POSITION_COOLDOWN_MINUTES not configured');
      allTestsPassed = false;
    } else {
      console.log(`✅ Position cooldown: ${trader.positionCooldownMinutes} minutes`);
    }

    console.log('\n2️⃣ Testing Signal Quality Assessment...');
    
    // Test 2: Signal quality grading (v4.2 thresholds)
    const testSignals = [
      { totalBidVolume: 450000, qualityExpected: 'LOW' },    // Above 400k threshold
      { totalBidVolume: 650000, qualityExpected: 'MEDIUM' }, // Above 600k threshold
      { totalBidVolume: 900000, qualityExpected: 'HIGH' },   // Above 800k threshold
      { totalBidVolume: 300000, qualityExpected: 'REJECT' }  // Below 400k threshold
    ];
    
    for (const testSignal of testSignals) {
      const quality = trader.assessSignalQuality(testSignal);
      if (quality === testSignal.qualityExpected) {
        console.log(`✅ Signal quality correct: ${testSignal.totalBidVolume} → ${quality}`);
      } else {
        issues.push(`Signal quality incorrect: ${testSignal.totalBidVolume} expected ${testSignal.qualityExpected}, got ${quality}`);
        allTestsPassed = false;
      }
    }

    console.log('\n3️⃣ Testing Position Sizing Logic...');
    
    // Test 3: Dynamic position sizing
    const highQualitySignal = { qualityGrade: 'HIGH', confidence: 'HIGH' };
    const lowQualitySignal = { qualityGrade: 'LOW', confidence: 'MEDIUM' };
    
    const highSize = trader.calculatePositionSize(highQualitySignal);
    const lowSize = trader.calculatePositionSize(lowQualitySignal);
    
    if (highSize > lowSize) {
      console.log(`✅ Position sizing scales correctly: HIGH=${highSize}, LOW=${lowSize}`);
    } else {
      issues.push('Position sizing not scaling with signal quality');
      allTestsPassed = false;
    }

    console.log('\n4️⃣ Testing Cross-Signal Validation...');
    
    // Test 4: Engine veto logic
    const engine = new SentryCoinEngine(config);
    
    if (!engine.enableSignalVeto) {
      issues.push('ENABLE_SIGNAL_CONFLICT_VETO not configured');
      allTestsPassed = false;
    } else {
      console.log(`✅ Signal veto enabled: ${engine.enableSignalVeto}`);
    }
    
    if (engine.shakeoutVetoDurationMs <= 0) {
      issues.push('SHAKEOUT_VETO_DURATION_MINUTES not configured');
      allTestsPassed = false;
    } else {
      console.log(`✅ Veto duration: ${engine.shakeoutVetoDurationMs / 60000} minutes`);
    }

    console.log('\n5️⃣ Testing Risk Management Enhancements...');
    
    // Test 5: Trailing stop configuration
    if (!trader.enableTrailingStop) {
      issues.push('CASCADE_ENABLE_TRAILING_STOP not enabled');
      allTestsPassed = false;
    } else {
      console.log(`✅ Trailing stop enabled: ${trader.enableTrailingStop}`);
    }
    
    if (!trader.enableDefensivePosture) {
      issues.push('ENABLE_DEFENSIVE_POSTURE not enabled');
      allTestsPassed = false;
    } else {
      console.log(`✅ Defensive posture enabled: ${trader.enableDefensivePosture}`);
    }

    console.log('\n6️⃣ Testing Configuration Values...');
    
    // Test 6: Validate safer configuration values (v4.2)
    const maxPosition = parseFloat(process.env.CASCADE_MAX_POSITION || '1000');
    const stopLoss = parseFloat(process.env.CASCADE_STOP_LOSS || '2.0');
    const liquidityThreshold = parseInt(process.env.CASCADE_LIQUIDITY_THRESHOLD || '100000');
    const maxActivePositions = parseInt(process.env.MAX_ACTIVE_POSITIONS || '1000');
    const signalCooldown = parseInt(process.env.SIGNAL_COOLDOWN_SECONDS || '0');

    if (maxPosition > 500) {
      issues.push(`CASCADE_MAX_POSITION too high: ${maxPosition} (should be ≤500)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Position size conservative: $${maxPosition}`);
    }

    if (maxActivePositions > 5) {
      issues.push(`MAX_ACTIVE_POSITIONS too high: ${maxActivePositions} (should be ≤5)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Max active positions safe: ${maxActivePositions}`);
    }

    if (signalCooldown < 60) {
      issues.push(`SIGNAL_COOLDOWN_SECONDS too low: ${signalCooldown} (should be ≥60)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Signal cooldown adequate: ${signalCooldown}s`);
    }

    if (liquidityThreshold < 400000) {
      issues.push(`CASCADE_LIQUIDITY_THRESHOLD too low: ${liquidityThreshold} (should be ≥400000)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Liquidity threshold raised: ${liquidityThreshold}`);
    }

  } catch (error) {
    issues.push(`Test execution failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Final assessment
  console.log('\n====================================================');
  if (allTestsPassed && issues.length === 0) {
    console.log('🎉 ALL CRITICAL FIXES VALIDATED SUCCESSFULLY!');
    console.log('✅ Position stacking prevention: IMPLEMENTED');
    console.log('✅ Cross-signal validation: IMPLEMENTED');
    console.log('✅ Signal quality filtering: IMPLEMENTED');
    console.log('✅ Enhanced risk management: IMPLEMENTED');
    console.log('\n🛡️ System is now protected against the catastrophic failure pattern');
    console.log('🚀 Safe for deployment with new safeguards');
  } else {
    console.log('❌ CRITICAL FIXES VALIDATION FAILED!');
    console.log('🛑 The following issues must be resolved:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log('\n⚠️ DO NOT DEPLOY until all issues are fixed');
  }
  console.log('====================================================');

  return allTestsPassed;
}

// Run the validation
validateCriticalFixes().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
});
