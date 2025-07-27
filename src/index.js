#!/usr/bin/env node

/**
 * DEPLOYMENT COMPATIBILITY REDIRECT
 * 
 * This file exists solely for deployment compatibility.
 * It redirects to the main production entry point.
 */

console.log('[INFO] Deployment compatibility redirect - launching production engine...');

// Import and launch the production system
import('../phoenix-production.js').catch(error => {
  console.error('[ERROR] Failed to launch production engine:', error.message);
  process.exit(1);
});
