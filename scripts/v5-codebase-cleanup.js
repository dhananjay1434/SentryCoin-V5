#!/usr/bin/env node

/**
 * SentryCoin v5.0 - Codebase Cleanup and Organization
 * 
 * Identifies and organizes redundant files, old connections, and legacy code
 * Creates proper folder structure for v5.0 "Apex Predator" architecture
 */

import fs from 'fs/promises';
import path from 'path';

class CodebaseCleanup {
  constructor() {
    this.redundantFiles = [];
    this.legacyFiles = [];
    this.duplicateFiles = [];
    this.brokenImports = [];
    this.cleanupActions = [];
  }

  /**
   * Analyze the codebase for redundant connections and old files
   */
  async analyzeCodebase() {
    console.log('🔍 SentryCoin v5.0 - Deep Codebase Analysis\n');

    // 1. Identify redundant files
    await this.identifyRedundantFiles();
    
    // 2. Find duplicate utilities
    await this.findDuplicateUtilities();
    
    // 3. Check for broken imports
    await this.checkBrokenImports();
    
    // 4. Identify legacy documentation
    await this.identifyLegacyDocumentation();
    
    // 5. Find unused test files
    await this.findUnusedTestFiles();

    this.generateCleanupPlan();
  }

  /**
   * Identify redundant files that are no longer needed in v5.0
   */
  async identifyRedundantFiles() {
    console.log('1. 🗂️ Identifying Redundant Files...');

    const redundantFiles = [
      // Old predictor in wrong location
      'src/predictor.js',
      
      // Old signal validator in wrong location  
      'src/signal-validator.js',
      
      // Old utils file (replaced by utils/index.js)
      'src/utils.js',
      
      // Legacy test files
      'tests/unit/core.test.js',
      'tests/integration/connectivity.test.js',
      
      // Old documentation files
      'DEPLOYMENT_CHECKLIST_v4.2.md',
      'DEVELOPMENT_SESSION_COMPLETE.md',
      'HFT_OPTIMIZATION_GUIDE.md',
      'LIVE_DEPLOYMENT_CHECKLIST.md',
      'STRATEGY_REFRAME_v4.3.md',
      
      // Old config files
      'config/production.env',
      'config/whale-addresses.env'
    ];

    for (const file of redundantFiles) {
      try {
        await fs.access(file);
        this.redundantFiles.push(file);
        console.log(`   ❌ Redundant: ${file}`);
      } catch (error) {
        // File doesn't exist, which is good
      }
    }

    console.log(`   Found ${this.redundantFiles.length} redundant files\n`);
  }

  /**
   * Find duplicate utility functions
   */
  async findDuplicateUtilities() {
    console.log('2. 🔄 Finding Duplicate Utilities...');

    const utilityFiles = [
      'src/utils.js',
      'src/utils/index.js'
    ];

    const duplicates = [];
    
    for (const file of utilityFiles) {
      try {
        await fs.access(file);
        duplicates.push(file);
      } catch (error) {
        // File doesn't exist
      }
    }

    if (duplicates.length > 1) {
      console.log(`   ⚠️ Found duplicate utility files:`);
      duplicates.forEach(file => console.log(`      - ${file}`));
      this.duplicateFiles.push(...duplicates);
    } else {
      console.log(`   ✅ No duplicate utility files found`);
    }

    console.log('');
  }

  /**
   * Check for broken imports in v5.0 files
   */
  async checkBrokenImports() {
    console.log('3. 🔗 Checking for Broken Imports...');

    const filesToCheck = [
      'src/core/sentrycoin-engine.js',
      'src/core/strategy-manager.js',
      'src/strategies/eth-unwind.js',
      'src/services/derivatives-monitor.js'
    ];

    for (const file of filesToCheck) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for imports that might be broken
        const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
        
        for (const importLine of imports) {
          const match = importLine.match(/from\s+['"]([^'"]+)['"]/);
          if (match) {
            const importPath = match[1];
            
            // Check if it's a relative import
            if (importPath.startsWith('.')) {
              const fullPath = path.resolve(path.dirname(file), importPath);
              const possibleExtensions = ['', '.js', '/index.js'];
              
              let found = false;
              for (const ext of possibleExtensions) {
                try {
                  await fs.access(fullPath + ext);
                  found = true;
                  break;
                } catch (error) {
                  // Continue checking
                }
              }
              
              if (!found) {
                this.brokenImports.push({
                  file,
                  import: importPath,
                  line: importLine
                });
                console.log(`   ❌ Broken import in ${file}: ${importPath}`);
              }
            }
          }
        }
      } catch (error) {
        console.log(`   ⚠️ Could not check ${file}: ${error.message}`);
      }
    }

    if (this.brokenImports.length === 0) {
      console.log(`   ✅ No broken imports found`);
    }

    console.log('');
  }

  /**
   * Identify legacy documentation that needs updating
   */
  async identifyLegacyDocumentation() {
    console.log('4. 📚 Identifying Legacy Documentation...');

    const docFiles = [
      'README.md',
      'BACKTESTING-GUIDE.md',
      'PRODUCTION-DEPLOYMENT.md',
      'TROUBLESHOOTING.md'
    ];

    for (const file of docFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for v4.x references
        const hasV4References = content.includes('v4.') || 
                               content.includes('version 4') ||
                               content.includes('CASCADE_HUNTER') ||
                               content.includes('trifecta-trader');
        
        if (hasV4References && !content.includes('v5.0')) {
          this.legacyFiles.push(file);
          console.log(`   📝 Needs v5.0 update: ${file}`);
        }
      } catch (error) {
        // File doesn't exist
      }
    }

    console.log('');
  }

  /**
   * Find unused test files
   */
  async findUnusedTestFiles() {
    console.log('5. 🧪 Finding Unused Test Files...');

    const testFiles = await this.getFilesInDirectory('tests');
    const activeTests = [
      'v5-apex-predator-test.js',
      'v5-integration-test.js',
      'eth-unwind-test.js',
      'config-test.js'
    ];

    const unusedTests = testFiles.filter(file => {
      const basename = path.basename(file);
      return !activeTests.includes(basename) && 
             !basename.includes('v5') &&
             basename.endsWith('.js');
    });

    if (unusedTests.length > 0) {
      console.log(`   Found ${unusedTests.length} potentially unused test files:`);
      unusedTests.forEach(file => {
        console.log(`   📋 ${file}`);
        this.legacyFiles.push(file);
      });
    } else {
      console.log(`   ✅ All test files appear to be in use`);
    }

    console.log('');
  }

  /**
   * Get all files in a directory recursively
   */
  async getFilesInDirectory(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesInDirectory(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Generate cleanup plan
   */
  generateCleanupPlan() {
    console.log('📋 SentryCoin v5.0 - Cleanup Plan\n');
    console.log('=' .repeat(50));

    // Plan 1: Create legacy archive
    if (this.redundantFiles.length > 0 || this.legacyFiles.length > 0) {
      console.log('\n1. 📦 Create Legacy Archive Folder');
      console.log('   Create: legacy-v4/');
      console.log('   Purpose: Archive old files for reference');
      
      this.cleanupActions.push({
        action: 'create_directory',
        path: 'legacy-v4',
        description: 'Archive folder for v4.x files'
      });

      // Move redundant files
      [...this.redundantFiles, ...this.legacyFiles].forEach(file => {
        this.cleanupActions.push({
          action: 'move_to_legacy',
          from: file,
          to: `legacy-v4/${file}`,
          description: `Archive ${file}`
        });
      });
    }

    // Plan 2: Fix duplicate utilities
    if (this.duplicateFiles.length > 0) {
      console.log('\n2. 🔄 Resolve Duplicate Files');
      console.log('   Keep: src/utils/index.js (v5.0 version)');
      console.log('   Remove: src/utils.js (old version)');
      
      this.cleanupActions.push({
        action: 'remove_duplicate',
        file: 'src/utils.js',
        description: 'Remove old utils.js in favor of utils/index.js'
      });
    }

    // Plan 3: Fix broken imports
    if (this.brokenImports.length > 0) {
      console.log('\n3. 🔗 Fix Broken Imports');
      this.brokenImports.forEach(broken => {
        console.log(`   Fix: ${broken.file} -> ${broken.import}`);
        this.cleanupActions.push({
          action: 'fix_import',
          file: broken.file,
          oldImport: broken.import,
          description: `Fix broken import in ${broken.file}`
        });
      });
    }

    // Plan 4: Create v5.0 folder structure
    console.log('\n4. 🏗️ Create v5.0 Folder Structure');
    const v5Folders = [
      'src/v5',
      'src/v5/strategies',
      'src/v5/intelligence',
      'src/v5/orchestration',
      'docs/v5',
      'tests/v5'
    ];

    v5Folders.forEach(folder => {
      console.log(`   Create: ${folder}/`);
      this.cleanupActions.push({
        action: 'create_directory',
        path: folder,
        description: `v5.0 architecture folder`
      });
    });

    // Plan 5: Update documentation
    console.log('\n5. 📚 Documentation Updates Needed');
    console.log('   - Update README.md for v5.0');
    console.log('   - Create v5.0 deployment guide');
    console.log('   - Update troubleshooting guide');

    console.log('\n' + '=' .repeat(50));
    console.log(`📊 Summary: ${this.cleanupActions.length} cleanup actions identified`);
    console.log(`🗂️ Redundant files: ${this.redundantFiles.length}`);
    console.log(`📋 Legacy files: ${this.legacyFiles.length}`);
    console.log(`🔄 Duplicate files: ${this.duplicateFiles.length}`);
    console.log(`🔗 Broken imports: ${this.brokenImports.length}`);
  }

  /**
   * Execute the cleanup plan
   */
  async executeCleanup() {
    console.log('\n🚀 Executing Cleanup Plan...\n');

    for (const action of this.cleanupActions) {
      try {
        switch (action.action) {
          case 'create_directory':
            await fs.mkdir(action.path, { recursive: true });
            console.log(`✅ Created: ${action.path}/`);
            break;

          case 'move_to_legacy':
            const targetDir = path.dirname(action.to);
            await fs.mkdir(targetDir, { recursive: true });
            await fs.rename(action.from, action.to);
            console.log(`📦 Moved: ${action.from} → ${action.to}`);
            break;

          case 'remove_duplicate':
            await fs.unlink(action.file);
            console.log(`🗑️ Removed: ${action.file}`);
            break;

          default:
            console.log(`⚠️ Skipped: ${action.description} (manual action required)`);
        }
      } catch (error) {
        console.log(`❌ Failed: ${action.description} - ${error.message}`);
      }
    }

    console.log('\n✅ Cleanup execution complete!');
  }
}

// Execute cleanup if run directly
if (import.meta.url.includes(process.argv[1])) {
  const cleanup = new CodebaseCleanup();
  
  cleanup.analyzeCodebase().then(() => {
    console.log('\n🤔 Execute cleanup plan? (y/N)');
    
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', async (data) => {
      const input = data.toString().trim().toLowerCase();
      
      if (input === 'y' || input === 'yes') {
        await cleanup.executeCleanup();
      } else {
        console.log('📋 Cleanup plan generated but not executed.');
        console.log('💡 Run this script again and type "y" to execute.');
      }
      
      process.exit(0);
    });
  }).catch(error => {
    console.error('❌ Cleanup analysis failed:', error);
    process.exit(1);
  });
}

export default CodebaseCleanup;
