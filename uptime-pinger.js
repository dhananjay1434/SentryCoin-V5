#!/usr/bin/env node

/**
 * SentryCoin 24/7 Uptime Pinger - Binance Edition
 *
 * Simple script to keep your Render service alive by pinging it every 14 minutes
 * Prevents the free tier from sleeping after 15 minutes of inactivity
 * Optimized for Binance-compatible SentryCoin deployment
 */

import https from 'https';

const RENDER_URL = 'https://sentrycoin.onrender.com/health';
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds

let pingCount = 0;
let successCount = 0;
let errorCount = 0;

console.log('🔄 SentryCoin 24/7 Uptime Monitor Started (Binance Edition)');
console.log(`📡 Target: ${RENDER_URL}`);
console.log(`⏰ Interval: ${PING_INTERVAL / 1000 / 60} minutes`);
console.log('🚀 Keeping your Binance-compatible service alive...\n');

function ping() {
  pingCount++;
  const startTime = Date.now();
  
  https.get(RENDER_URL, (res) => {
    const responseTime = Date.now() - startTime;
    
    if (res.statusCode === 200) {
      successCount++;
      console.log(`✅ Ping #${pingCount} - OK (${responseTime}ms) - ${new Date().toLocaleString()}`);
    } else {
      errorCount++;
      console.log(`⚠️ Ping #${pingCount} - HTTP ${res.statusCode} (${responseTime}ms)`);
    }
    
    // Log stats every 10 pings
    if (pingCount % 10 === 0) {
      const successRate = ((successCount / pingCount) * 100).toFixed(1);
      console.log(`📊 Stats: ${pingCount} pings, ${successRate}% success rate\n`);
    }
  }).on('error', (error) => {
    errorCount++;
    console.log(`❌ Ping #${pingCount} - Error: ${error.message}`);
  });
}

// Initial ping
ping();

// Set up interval
setInterval(ping, PING_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  const successRate = pingCount > 0 ? ((successCount / pingCount) * 100).toFixed(1) : 0;
  console.log('\n🛑 Shutting down uptime monitor...');
  console.log(`📊 Final Stats: ${pingCount} pings, ${successRate}% success rate`);
  console.log('✅ Monitor stopped');
  process.exit(0);
});

console.log('💡 Press Ctrl+C to stop monitoring');
console.log('🔄 Monitor is running...\n');
