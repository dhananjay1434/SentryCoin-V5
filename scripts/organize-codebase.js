#!/usr/bin/env node

/**
 * Codebase Organization Script
 * 
 * Moves files to their proper directories according to the new structure
 */

import fs from 'fs/promises';
import path from 'path';

const moves = [
  // Core files
  { from: 'src/predictor.js', to: 'src/core/predictor.js' },
  { from: 'src/market-classifier.js', to: 'src/core/market-classifier.js' },
  
  // Strategy files
  { from: 'src/trifecta-trader.js', to: 'src/strategies/trifecta-trader.js' },
  { from: 'src/squeeze-trader.js', to: 'src/strategies/squeeze-trader.js' },
  
  // Service files
  { from: 'src/alerter.js', to: 'src/services/alerter.js' },
  { from: 'src/cloud-storage.js', to: 'src/services/cloud-storage.js' },
  { from: 'src/signal-validator.js', to: 'src/services/signal-validator.js' },
  
  // Reporting files
  { from: 'src/detailed-reporter.js', to: 'src/reporting/detailed-reporter.js' },
  
  // Test files
  { from: 'src/test.js', to: 'tests/unit/core.test.js' },
  { from: 'src/connectivity-test.js', to: 'tests/integration/connectivity.test.js' },
  
  // Script files
  { from: 'run-backtest.js', to: 'scripts/run-backtest.js' },
  { from: 'src/backtest-v4.js', to: 'scripts/backtest-v4.js' },
  { from: 'src/backtester.js', to: 'scripts/backtester.js' },
  { from: 'src/real-data-backtester.js', to: 'scripts/real-data-backtester.js' },
  { from: 'src/historical-data-fetcher.js', to: 'scripts/historical-data-fetcher.js' },
  
  // Data files
  { from: 'backtest-data', to: 'data/backtest' }
];

async function createDirectories() {
  const dirs = [
    'src/core',
    'src/strategies', 
    'src/services',
    'src/reporting',
    'tests/unit',
    'tests/integration',
    'scripts',
    'data/backtest',
    'config',
    'docs'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`❌ Failed to create ${dir}:`, error.message);
      }
    }
  }
}

async function moveFiles() {
  for (const { from, to } of moves) {
    try {
      // Check if source exists
      await fs.access(from);
      
      // Ensure target directory exists
      const targetDir = path.dirname(to);
      await fs.mkdir(targetDir, { recursive: true });
      
      // Move the file
      await fs.rename(from, to);
      console.log(`📁 Moved: ${from} → ${to}`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️ Source not found: ${from}`);
      } else {
        console.error(`❌ Failed to move ${from} to ${to}:`, error.message);
      }
    }
  }
}

async function main() {
  console.log('🗂️ Organizing SentryCoin codebase...\n');
  
  console.log('📁 Creating directory structure...');
  await createDirectories();
  
  console.log('\n📦 Moving files to new locations...');
  await moveFiles();
  
  console.log('\n✅ Codebase organization complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Update import paths in moved files');
  console.log('2. Update package.json scripts');
  console.log('3. Test the reorganized codebase');
}

main().catch(console.error);
