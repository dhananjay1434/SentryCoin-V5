#!/usr/bin/env node

/**
 * SentryCoin v5.0 - Codebase Analysis (Non-interactive)
 * 
 * Analyzes the codebase for redundant files and organizational issues
 */

import fs from 'fs/promises';
import path from 'path';

async function analyzeCodebase() {
  console.log('🔍 SentryCoin v5.0 - Deep Codebase Analysis\n');

  const analysis = {
    redundantFiles: [],
    duplicateFiles: [],
    brokenImports: [],
    legacyFiles: [],
    unusedTests: []
  };

  // 1. Check for redundant files
  console.log('1. 🗂️ Checking for Redundant Files...');
  
  const redundantFiles = [
    'src/predictor.js',           // Moved to src/core/predictor.js
    'src/signal-validator.js',    // Moved to src/services/signal-validator.js
    'src/utils.js',              // Replaced by src/utils/index.js
    'tests/unit/core.test.js',   // Old test file
    'config/production.env',     // Old config
    'config/whale-addresses.env' // Old config
  ];

  for (const file of redundantFiles) {
    try {
      await fs.access(file);
      analysis.redundantFiles.push(file);
      console.log(`   ❌ Found redundant: ${file}`);
    } catch (error) {
      console.log(`   ✅ Already cleaned: ${file}`);
    }
  }

  // 2. Check for duplicate utilities
  console.log('\n2. 🔄 Checking for Duplicate Utilities...');
  
  const utilityFiles = ['src/utils.js', 'src/utils/index.js'];
  const existingUtils = [];
  
  for (const file of utilityFiles) {
    try {
      await fs.access(file);
      existingUtils.push(file);
    } catch (error) {
      // File doesn't exist
    }
  }
  
  if (existingUtils.length > 1) {
    console.log(`   ⚠️ Found duplicate utility files:`);
    existingUtils.forEach(file => console.log(`      - ${file}`));
    analysis.duplicateFiles = existingUtils;
  } else {
    console.log(`   ✅ No duplicate utility files`);
  }

  // 3. Check imports in key v5.0 files
  console.log('\n3. 🔗 Checking Import Paths...');
  
  const v5Files = [
    'src/core/sentrycoin-engine.js',
    'src/core/strategy-manager.js',
    'src/strategies/eth-unwind.js'
  ];

  for (const file of v5Files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
      
      console.log(`   📄 ${file}:`);
      imports.forEach(imp => {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          const importPath = match[1];
          if (importPath.startsWith('.')) {
            console.log(`      → ${importPath}`);
          }
        }
      });
    } catch (error) {
      console.log(`   ❌ Could not read ${file}`);
    }
  }

  // 4. Check documentation files
  console.log('\n4. 📚 Checking Documentation...');
  
  const docFiles = [
    'README.md',
    'PRODUCTION-DEPLOYMENT.md',
    'SENTRYCOIN_V5_APEX_PREDATOR_SPEC.md'
  ];

  for (const file of docFiles) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const hasV5 = content.includes('v5.0') || content.includes('5.0');
      const hasV4 = content.includes('v4.') && !content.includes('v5.0');
      
      console.log(`   📝 ${file}: ${hasV5 ? '✅ v5.0 ready' : hasV4 ? '⚠️ needs v5.0 update' : '📋 neutral'}`);
      
      if (hasV4 && !hasV5) {
        analysis.legacyFiles.push(file);
      }
    } catch (error) {
      console.log(`   ❌ Could not read ${file}`);
    }
  }

  // 5. Check test files
  console.log('\n5. 🧪 Checking Test Files...');
  
  try {
    const testFiles = await fs.readdir('tests');
    const v5Tests = testFiles.filter(f => f.includes('v5') || f.includes('eth-unwind'));
    const oldTests = testFiles.filter(f => f.includes('v4') || f.includes('trifecta') || f.includes('squeeze'));
    
    console.log(`   ✅ v5.0 tests: ${v5Tests.length}`);
    v5Tests.forEach(test => console.log(`      - ${test}`));
    
    if (oldTests.length > 0) {
      console.log(`   📋 Legacy tests: ${oldTests.length}`);
      oldTests.forEach(test => console.log(`      - ${test}`));
      analysis.unusedTests = oldTests;
    }
  } catch (error) {
    console.log(`   ❌ Could not read tests directory`);
  }

  // 6. Summary and recommendations
  console.log('\n📊 Analysis Summary:');
  console.log('=' .repeat(50));
  console.log(`🗂️ Redundant files found: ${analysis.redundantFiles.length}`);
  console.log(`🔄 Duplicate files found: ${analysis.duplicateFiles.length}`);
  console.log(`📚 Legacy docs needing update: ${analysis.legacyFiles.length}`);
  console.log(`🧪 Old test files: ${analysis.unusedTests.length}`);

  console.log('\n🎯 Recommendations:');
  
  if (analysis.redundantFiles.length > 0) {
    console.log('\n1. 📦 Create Legacy Archive:');
    console.log('   mkdir legacy-v4');
    analysis.redundantFiles.forEach(file => {
      console.log(`   mv ${file} legacy-v4/`);
    });
  }

  if (analysis.duplicateFiles.length > 1) {
    console.log('\n2. 🔄 Remove Duplicate Utils:');
    console.log('   rm src/utils.js  # Keep src/utils/index.js');
  }

  if (analysis.legacyFiles.length > 0) {
    console.log('\n3. 📚 Update Documentation:');
    analysis.legacyFiles.forEach(file => {
      console.log(`   Update ${file} for v5.0`);
    });
  }

  console.log('\n4. 🏗️ Suggested v5.0 Folder Structure:');
  console.log('   src/v5/                    # v5.0 specific modules');
  console.log('   src/v5/strategies/         # Advanced strategies');
  console.log('   src/v5/intelligence/       # Market intelligence');
  console.log('   src/v5/orchestration/      # Multi-strategy coordination');
  console.log('   legacy-v4/                 # Archived v4.x files');
  console.log('   docs/v5/                   # v5.0 documentation');

  console.log('\n✅ Analysis complete! Use the recommendations above to organize the codebase.');
}

analyzeCodebase().catch(console.error);
