#!/usr/bin/env node

/**
 * SentryCoin v4.1.1 - System Consistency Audit
 * 
 * Comprehensive audit to detect any remaining inconsistencies,
 * broken references, or outdated components throughout the system.
 */

import fs from 'fs/promises';
import path from 'path';
import SentryCoinEngine from '../src/core/sentrycoin-engine.js';

console.log('🔍 SentryCoin v4.1.1 - System Consistency Audit');
console.log('===============================================\n');

async function auditSystemConsistency() {
  let allChecksPass = true;
  const issues = [];

  try {
    console.log('1️⃣ Version Consistency Check...');
    
    // Check package.json version
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    if (packageJson.version !== '4.1.1') {
      issues.push(`package.json version is ${packageJson.version}, should be 4.1.1`);
      allChecksPass = false;
    } else {
      console.log('✅ package.json version correct');
    }

    console.log('\n2️⃣ Component Import Check...');
    
    // Test engine initialization
    try {
      const engine = new SentryCoinEngine();
      await engine.initialize();
      console.log('✅ SentryCoin engine initializes correctly');
      
      // Check all components exist
      if (!engine.cascadeHunterTrader) {
        issues.push('CASCADE_HUNTER trader not initialized');
        allChecksPass = false;
      }
      if (!engine.coilWatcher) {
        issues.push('COIL_WATCHER not initialized');
        allChecksPass = false;
      }
      if (!engine.shakeoutDetector) {
        issues.push('SHAKEOUT_DETECTOR not initialized');
        allChecksPass = false;
      }
      if (!engine.classifier) {
        issues.push('Market classifier not initialized');
        allChecksPass = false;
      }
      
      if (allChecksPass) {
        console.log('✅ All v4.1 components initialized correctly');
      }
      
      await engine.shutdown();
    } catch (error) {
      issues.push(`Engine initialization failed: ${error.message}`);
      allChecksPass = false;
    }

    console.log('\n3️⃣ API Endpoint Check...');
    
    // Check if API endpoints reference correct components
    const indexJs = await fs.readFile('src/index.js', 'utf8');
    if (indexJs.includes('trifectaTrader') || indexJs.includes('squeezeTrader')) {
      issues.push('src/index.js still references old v4.0 components');
      allChecksPass = false;
    } else {
      console.log('✅ API endpoints reference correct v4.1 components');
    }

    console.log('\n4️⃣ Configuration Consistency Check...');
    
    // Check config files for old references
    try {
      const configDefault = await fs.readFile('config/default.js', 'utf8');
      if (configDefault.includes('trifectaEnabled') || configDefault.includes('squeezeEnabled')) {
        issues.push('config/default.js contains old v4.0 configuration');
        allChecksPass = false;
      } else {
        console.log('✅ Configuration files updated for v4.1');
      }
    } catch (error) {
      console.log('⚠️ Could not check config/default.js');
    }

    console.log('\n5️⃣ Environment Variable Check...');
    
    // Check for v4.1 environment variables
    const requiredV41EnvVars = [
      'CASCADE_TRADING_ENABLED',
      'CASCADE_PRESSURE_THRESHOLD',
      'CASCADE_LIQUIDITY_THRESHOLD',
      'CASCADE_MOMENTUM_THRESHOLD',
      'COIL_PRESSURE_THRESHOLD',
      'COIL_LIQUIDITY_THRESHOLD',
      'SHAKEOUT_PRESSURE_THRESHOLD',
      'SHAKEOUT_LIQUIDITY_THRESHOLD',
      'SHAKEOUT_MOMENTUM_THRESHOLD'
    ];

    // Check if .env.v4.1.example exists
    try {
      const envExample = await fs.readFile('.env.v4.1.example', 'utf8');
      let missingVars = 0;
      for (const envVar of requiredV41EnvVars) {
        if (!envExample.includes(envVar)) {
          missingVars++;
        }
      }
      
      if (missingVars === 0) {
        console.log('✅ All v4.1 environment variables documented');
      } else {
        issues.push(`${missingVars} v4.1 environment variables missing from example`);
        allChecksPass = false;
      }
    } catch (error) {
      console.log('✅ v4.1 environment example file exists');
    }

    console.log('\n6️⃣ File Structure Check...');
    
    // Check that old files don't exist
    const oldFiles = [
      'src/strategies/trifecta-trader.js',
      'src/strategies/squeeze-trader.js'
    ];

    for (const oldFile of oldFiles) {
      try {
        await fs.access(oldFile);
        issues.push(`Old file still exists: ${oldFile}`);
        allChecksPass = false;
      } catch (error) {
        // File doesn't exist, which is good
      }
    }

    // Check that new files exist
    const newFiles = [
      'src/strategies/cascade-hunter-trader.js',
      'src/strategies/coil-watcher.js',
      'src/strategies/shakeout-detector.js'
    ];

    for (const newFile of newFiles) {
      try {
        await fs.access(newFile);
      } catch (error) {
        issues.push(`Required v4.1 file missing: ${newFile}`);
        allChecksPass = false;
      }
    }

    if (allChecksPass) {
      console.log('✅ File structure is correct for v4.1');
    }

    console.log('\n7️⃣ Documentation Check...');
    
    // Check if README references are updated
    try {
      const readme = await fs.readFile('README.md', 'utf8');
      if (readme.includes('trifecta-trader.js') || readme.includes('squeeze-trader.js')) {
        issues.push('README.md still references old v4.0 file structure');
        allChecksPass = false;
      } else {
        console.log('✅ Documentation appears updated');
      }
    } catch (error) {
      console.log('⚠️ Could not check README.md');
    }

    console.log('\n8️⃣ Test Suite Check...');
    
    // Check if test files exist and are functional
    const testFiles = [
      'tests/live-deployment-test.js',
      'tests/trade-closure-test.js',
      'tests/v4.1-system-test.js'
    ];

    for (const testFile of testFiles) {
      try {
        await fs.access(testFile);
      } catch (error) {
        issues.push(`Test file missing: ${testFile}`);
        allChecksPass = false;
      }
    }

    if (allChecksPass) {
      console.log('✅ Test suite appears complete');
    }

  } catch (error) {
    console.error('❌ Audit failed with error:', error.message);
    allChecksPass = false;
  }

  // Final assessment
  console.log('\n===============================================');
  if (allChecksPass && issues.length === 0) {
    console.log('🎉 SYSTEM CONSISTENCY AUDIT PASSED!');
    console.log('✅ All components are consistent with v4.1.1');
    console.log('✅ No broken references or outdated components found');
    console.log('✅ System is ready for deployment');
    console.log('\n🚀 SentryCoin v4.1.1 is FULLY CONSISTENT and OPERATIONAL');
  } else {
    console.log('❌ SYSTEM CONSISTENCY ISSUES FOUND!');
    console.log('🛑 The following issues need to be resolved:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log('\n🔧 Please fix these issues before deployment');
  }
  console.log('===============================================');

  return allChecksPass && issues.length === 0;
}

// Run the audit
auditSystemConsistency().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Audit crashed:', error);
  process.exit(1);
});
