#!/usr/bin/env node

/**
 * SentryCoin v6.0 - Phoenix Engine Redirect
 *
 * LEGACY COMPATIBILITY LAYER
 *
 * This file redirects to the new Phoenix Engine v6.0.
 * The old v5.x architecture has been completely reorganized.
 *
 * For new deployments, use: node phoenix-production.js
 *
 * @version 6.0.0
 * @redirect phoenix-production.js
 */

console.log('🔄 LEGACY REDIRECT: Launching Phoenix Engine v6.0...');
console.log('📋 Note: Use "node phoenix-production.js" for direct access');

// Redirect to Phoenix Engine
import('../phoenix-production.js').catch(error => {
  console.error('❌ Failed to launch Phoenix Engine:', error.message);
  console.log('🔧 Fallback: Attempting legacy engine...');

  // Fallback to legacy if Phoenix fails
  import('./legacy-fallback.js').catch(fallbackError => {
    console.error('💥 Critical failure - both Phoenix and legacy failed');
    process.exit(1);
  });
});
