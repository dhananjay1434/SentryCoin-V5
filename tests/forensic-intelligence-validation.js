#!/usr/bin/env node

/**
 * SentryCoin v4.4 - Forensic Intelligence Validation Test
 * 
 * Validates that the system can detect and respond to manipulation patterns
 * identified in the SPKUSDT forensic analysis:
 * - Wash trading detection
 * - Order book spoofing
 * - Whale inflow correlation
 * - Manipulation risk assessment
 */

import ManipulationDetector from '../src/services/manipulation-detector.js';
import OnChainMonitor from '../src/services/onchain-monitor.js';
import SentryCoinEngine from '../src/core/sentrycoin-engine.js';
import { config } from '../config.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🕵️ SentryCoin v4.4 - Forensic Intelligence Validation Test');
console.log('=======================================================\n');

async function validateForensicIntelligence() {
  let allTestsPassed = true;
  const issues = [];

  try {
    console.log('1️⃣ Testing Manipulation Detection Service...');
    
    const manipDetector = new ManipulationDetector({ symbol: 'SPKUSDT' });
    
    // Test 1: Spoof detection configuration
    if (manipDetector.spoofWallThreshold < 300000) {
      issues.push(`Spoof wall threshold too low: ${manipDetector.spoofWallThreshold} (should be ≥300k based on forensic analysis)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Spoof detection threshold: ${manipDetector.spoofWallThreshold} SPK`);
    }

    // Test 2: Simulate order book spoofing
    const mockOrderBook = {
      bids: [
        ['0.001', 500000], // Large wall that will "vanish"
        ['0.0009', 100000]
      ],
      asks: [
        ['0.0011', 200000],
        ['0.0012', 150000]
      ],
      timestamp: Date.now()
    };

    // First analysis - detect the wall
    manipDetector.analyzeOrderBookForSpoofing(mockOrderBook);
    
    // Simulate wall vanishing
    await new Promise(resolve => setTimeout(resolve, 12000)); // Wait for spoof detection window
    
    const mockOrderBookAfter = {
      bids: [
        ['0.0009', 100000] // Large wall vanished
      ],
      asks: [
        ['0.0011', 200000],
        ['0.0012', 150000]
      ],
      timestamp: Date.now()
    };

    manipDetector.analyzeOrderBookForSpoofing(mockOrderBookAfter);
    
    if (manipDetector.spoofCounter > 0) {
      console.log(`✅ Spoof detection working: ${manipDetector.spoofCounter} spoofs detected`);
    } else {
      issues.push('Spoof detection not working - failed to detect vanishing wall');
      allTestsPassed = false;
    }

    console.log('\n2️⃣ Testing FREE On-Chain Monitoring Service...');

    const onChainMonitor = new OnChainMonitor({ symbol: 'SPK' });

    // Test 3: Check for FREE API configuration
    const hasEtherscan = !!process.env.ETHERSCAN_API_KEY;
    const hasMoralis = !!process.env.MORALIS_API_KEY;
    const hasAlchemy = !!process.env.ALCHEMY_API_KEY;
    const hasFreeAPI = hasEtherscan || hasMoralis || hasAlchemy;

    if (!hasFreeAPI) {
      console.log(`⚠️ No FREE API configured - add one of: ETHERSCAN_API_KEY, MORALIS_API_KEY, or ALCHEMY_API_KEY`);
      console.log(`   💡 Etherscan is recommended (100% free, 100k calls/day)`);
    } else {
      if (hasEtherscan) console.log(`✅ Etherscan API configured (FREE, recommended)`);
      if (hasMoralis) console.log(`✅ Moralis API configured (FREE, 40k/month)`);
      if (hasAlchemy) console.log(`✅ Alchemy API configured (FREE, 300M units/month)`);
    }

    // Test 4: Whale threshold configuration
    if (onChainMonitor.whaleThreshold < 3000000) {
      issues.push(`Whale threshold too low: ${onChainMonitor.whaleThreshold} (should be ≥3M based on forensic analysis)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Whale inflow threshold: ${onChainMonitor.whaleThreshold} SPK`);
    }

    // Test 5: Simulate whale inflow (works with any API)
    let whaleInflowDetected = false;
    onChainMonitor.on('WHALE_INFLOW', (data) => {
      whaleInflowDetected = true;
      console.log(`✅ Whale inflow event triggered: ${data.amount} SPK (Source: ${data.source || 'MOCK'})`);
    });

    const mockWhaleInflow = {
      amount: 5000000, // 5M SPK
      from: '0xwhale...',
      to: '0xbinance...',
      timestamp: Date.now(),
      hash: '0xtest...'
    };

    // Test the processing method directly
    await onChainMonitor.processEtherscanTransaction({
      from: mockWhaleInflow.from,
      to: mockWhaleInflow.to,
      hash: mockWhaleInflow.hash,
      timeStamp: Math.floor(mockWhaleInflow.timestamp / 1000).toString(),
      tokenDecimal: '18'
    }, mockWhaleInflow.amount);

    if (!whaleInflowDetected) {
      issues.push('Whale inflow detection not working');
      allTestsPassed = false;
    }

    console.log('\n3️⃣ Testing Manipulation Risk Assessment...');
    
    // Test 5: Risk level calculation
    const riskAssessment = manipDetector.getManipulationAssessment();
    
    if (!riskAssessment.hasOwnProperty('riskLevel')) {
      issues.push('Risk assessment missing riskLevel property');
      allTestsPassed = false;
    } else {
      console.log(`✅ Risk assessment working: ${riskAssessment.riskLevel} risk level`);
    }

    if (!riskAssessment.hasOwnProperty('spoofingDetected')) {
      issues.push('Risk assessment missing spoofingDetected property');
      allTestsPassed = false;
    } else {
      console.log(`✅ Spoofing detection status: ${riskAssessment.spoofingDetected}`);
    }

    console.log('\n4️⃣ Testing Engine Integration...');
    
    // Test 6: Engine manipulation detection integration
    if (!process.env.ENABLE_MANIPULATION_DETECTION) {
      issues.push('ENABLE_MANIPULATION_DETECTION not configured');
      allTestsPassed = false;
    } else {
      console.log(`✅ Manipulation detection enabled: ${process.env.ENABLE_MANIPULATION_DETECTION}`);
    }

    // Test 7: Whale confirmation requirement
    if (process.env.REQUIRE_WHALE_CONFIRMATION === 'true') {
      console.log(`✅ Whale confirmation required for high-confidence signals`);
    } else {
      console.log(`⚠️ Whale confirmation optional (consider enabling for higher quality)`);
    }

    console.log('\n5️⃣ Testing Forensic Configuration Values...');
    
    // Test 8: Validate forensic-based thresholds
    const spoofWallThreshold = parseInt(process.env.SPOOF_WALL_THRESHOLD || '0');
    const whaleInflowThreshold = parseInt(process.env.WHALE_INFLOW_THRESHOLD || '0');
    const maxSpoofCount = parseInt(process.env.MAX_SPOOF_COUNT || '0');
    
    if (spoofWallThreshold < 300000) {
      issues.push(`SPOOF_WALL_THRESHOLD too low: ${spoofWallThreshold} (forensic analysis shows 500k SPK walls)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Spoof wall threshold: ${spoofWallThreshold} SPK`);
    }
    
    if (whaleInflowThreshold < 3000000) {
      issues.push(`WHALE_INFLOW_THRESHOLD too low: ${whaleInflowThreshold} (forensic analysis shows 3M+ SPK movements)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Whale inflow threshold: ${whaleInflowThreshold} SPK`);
    }
    
    if (maxSpoofCount < 3) {
      issues.push(`MAX_SPOOF_COUNT too low: ${maxSpoofCount} (should be ≥3 for reliable detection)`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Max spoof count: ${maxSpoofCount}`);
    }

    console.log('\n6️⃣ Testing Signal Enhancement Logic...');
    
    // Test 9: Whale inflow signal enhancement
    if (onChainMonitor.hasRecentWhaleInflows()) {
      console.log(`✅ Recent whale inflows detected - CASCADE signals will be enhanced`);
    } else {
      console.log(`ℹ️ No recent whale inflows - normal signal processing`);
    }

    // Test 10: Defensive mode triggering
    if (manipDetector.isSpoofingActive()) {
      console.log(`✅ Spoofing detected - defensive mode would be triggered`);
    } else {
      console.log(`ℹ️ No active spoofing detected`);
    }

  } catch (error) {
    issues.push(`Test execution failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Final assessment
  console.log('\n=======================================================');
  if (allTestsPassed && issues.length === 0) {
    console.log('🎉 FORENSIC INTELLIGENCE VALIDATION PASSED!');
    console.log('✅ Manipulation detection operational');
    console.log('✅ On-chain whale monitoring active');
    console.log('✅ Spoof detection configured');
    console.log('✅ Risk assessment functional');
    console.log('✅ Signal enhancement logic ready');
    console.log('\n🕵️ System now equipped with forensic intelligence');
    console.log('🛡️ Can detect and counter manipulation patterns');
    console.log('🐋 Whale movements will enhance signal confidence');
    console.log('🚫 Spoofing will trigger defensive measures');
  } else {
    console.log('❌ FORENSIC INTELLIGENCE VALIDATION FAILED!');
    console.log('🛑 The following issues must be resolved:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log('\n⚠️ Fix configuration and code issues before deployment');
  }
  console.log('=======================================================');

  return allTestsPassed;
}

// Run the validation
validateForensicIntelligence().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Forensic validation failed:', error.message);
  process.exit(1);
});
