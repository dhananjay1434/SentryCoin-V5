#!/usr/bin/env node

/**
 * SentryCoin v5.1 - 24/7 Uptime Monitor & Health Pinger
 *
 * Keeps Render.com service alive by pinging health endpoint every 10 minutes
 * Prevents free tier sleep and ensures continuous operation
 *
 * Deploy this separately on a different service (Vercel, Netlify, etc.)
 * or run locally to maintain 24/7 uptime
 */

import https from 'https';
import http from 'http';

class UptimePinger {
  constructor() {
    this.serviceName = 'SentryCoin v5.1 Apex Predator';
    this.healthEndpoint = process.env.HEALTH_ENDPOINT || 'https://your-render-app.onrender.com/health';
    this.pingInterval = parseInt(process.env.PING_INTERVAL_MINUTES || '10') * 60 * 1000; // 10 minutes
    this.timeout = 30000; // 30 second timeout

    // Statistics tracking
    this.stats = {
      totalPings: 0,
      successfulPings: 0,
      failedPings: 0,
      lastSuccessTime: null,
      lastFailureTime: null,
      startTime: new Date(),
      consecutiveFailures: 0,
      maxConsecutiveFailures: 0
    };

    console.log(`🛡️ ${this.serviceName} - Uptime Monitor Started`);
    console.log(`📡 Health Endpoint: ${this.healthEndpoint}`);
    console.log(`⏰ Ping Interval: ${process.env.PING_INTERVAL_MINUTES || '10'} minutes`);
    console.log(`🎯 Timeout: ${this.timeout / 1000} seconds\n`);
  }

  /**
   * Ping the health endpoint
   */
  async pingHealth() {
    return new Promise((resolve, reject) => {
      const url = new URL(this.healthEndpoint);
      const client = url.protocol === 'https:' ? https : http;

      const startTime = Date.now();

      const req = client.get(this.healthEndpoint, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'SentryCoin-UptimePinger/5.1',
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;

          if (res.statusCode === 200) {
            try {
              const healthData = JSON.parse(data);
              resolve({
                success: true,
                statusCode: res.statusCode,
                responseTime,
                data: healthData
              });
            } catch (error) {
              resolve({
                success: true,
                statusCode: res.statusCode,
                responseTime,
                data: { status: 'ok', raw: data }
              });
            }
          } else {
            reject({
              success: false,
              statusCode: res.statusCode,
              responseTime,
              error: `HTTP ${res.statusCode}`,
              data
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          success: false,
          error: 'Request timeout',
          responseTime: this.timeout
        });
      });

      req.on('error', (error) => {
        reject({
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime
        });
      });
    });
  }

  /**
   * Log ping result
   */
  logResult(result) {
    const timestamp = new Date().toISOString();

    if (result.success) {
      this.stats.successfulPings++;
      this.stats.lastSuccessTime = timestamp;
      this.stats.consecutiveFailures = 0;

      console.log(`✅ [${timestamp}] Health check successful`);
      console.log(`   📊 Response time: ${result.responseTime}ms`);
      console.log(`   🎯 Status: ${result.data?.status || 'ok'}`);

      if (result.data?.service) {
        console.log(`   🛡️ Service: ${result.data.service}`);
      }

      if (result.data?.uptime) {
        console.log(`   ⏱️ Uptime: ${Math.floor(result.data.uptime / 3600)}h ${Math.floor((result.data.uptime % 3600) / 60)}m`);
      }

    } else {
      this.stats.failedPings++;
      this.stats.lastFailureTime = timestamp;
      this.stats.consecutiveFailures++;

      if (this.stats.consecutiveFailures > this.stats.maxConsecutiveFailures) {
        this.stats.maxConsecutiveFailures = this.stats.consecutiveFailures;
      }

      console.log(`❌ [${timestamp}] Health check failed`);
      console.log(`   🚨 Error: ${result.error}`);
      console.log(`   📊 Response time: ${result.responseTime}ms`);
      console.log(`   🔄 Consecutive failures: ${this.stats.consecutiveFailures}`);

      // Alert on multiple consecutive failures
      if (this.stats.consecutiveFailures >= 3) {
        console.log(`🚨 ALERT: ${this.stats.consecutiveFailures} consecutive failures detected!`);
      }
    }
  }

  /**
   * Print statistics summary
   */
  printStats() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    const successRate = this.stats.totalPings > 0
      ? ((this.stats.successfulPings / this.stats.totalPings) * 100).toFixed(2)
      : '0.00';

    console.log(`\n📊 === UPTIME MONITOR STATISTICS ===`);
    console.log(`⏱️ Monitor uptime: ${uptimeHours}h ${uptimeMinutes}m`);
    console.log(`📡 Total pings: ${this.stats.totalPings}`);
    console.log(`✅ Successful: ${this.stats.successfulPings}`);
    console.log(`❌ Failed: ${this.stats.failedPings}`);
    console.log(`📈 Success rate: ${successRate}%`);
    console.log(`🔄 Max consecutive failures: ${this.stats.maxConsecutiveFailures}`);
    console.log(`🕐 Last success: ${this.stats.lastSuccessTime || 'Never'}`);
    console.log(`🕐 Last failure: ${this.stats.lastFailureTime || 'Never'}`);
    console.log(`=====================================\n`);
  }

  /**
   * Start the uptime monitoring
   */
  start() {
    console.log(`🚀 Starting uptime monitoring...`);

    // Initial ping
    this.executePing();

    // Set up interval
    setInterval(() => {
      this.executePing();
    }, this.pingInterval);

    // Print stats every hour
    setInterval(() => {
      this.printStats();
    }, 60 * 60 * 1000);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down uptime monitor...');
      this.printStats();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down uptime monitor...');
      this.printStats();
      process.exit(0);
    });
  }

  /**
   * Execute a ping and handle the result
   */
  async executePing() {
    this.stats.totalPings++;

    try {
      const result = await this.pingHealth();
      this.logResult(result);
    } catch (error) {
      this.logResult(error);
    }
  }
}

// Start the uptime monitor
const monitor = new UptimePinger();
monitor.start();
