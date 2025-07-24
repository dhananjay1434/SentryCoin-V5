#!/usr/bin/env node

/**
 * SentryCoin v4.0 - Uptime Monitor
 * 
 * Simple uptime monitoring script that pings the Render service
 * to keep it alive 24/7 and prevent it from sleeping
 */

import https from 'https';
import http from 'http';

// Configuration
const RENDER_URL = process.env.RENDER_URL || 'https://your-app-name.onrender.com';
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (Render free tier sleeps after 15 min)
const HEALTH_ENDPOINT = '/health';

class UptimeMonitor {
  constructor() {
    this.url = RENDER_URL + HEALTH_ENDPOINT;
    this.isRunning = false;
    this.pingCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    
    console.log('🔄 SentryCoin v4.0 Uptime Monitor');
    console.log(`📡 Target URL: ${this.url}`);
    console.log(`⏰ Ping Interval: ${PING_INTERVAL / 1000 / 60} minutes`);
  }

  /**
   * Ping the service to keep it alive
   */
  async ping() {
    this.pingCount++;
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest();
      const responseTime = Date.now() - startTime;
      
      if (response.statusCode === 200) {
        this.successCount++;
        console.log(`✅ Ping #${this.pingCount} - OK (${responseTime}ms) - ${new Date().toISOString()}`);
        
        // Log service status if available
        if (response.data) {
          try {
            const status = JSON.parse(response.data);
            if (status.status) {
              console.log(`   📊 Service Status: ${status.status} | Uptime: ${status.uptime || 'N/A'}s`);
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      } else {
        this.errorCount++;
        console.log(`⚠️ Ping #${this.pingCount} - HTTP ${response.statusCode} (${responseTime}ms)`);
      }
    } catch (error) {
      this.errorCount++;
      console.log(`❌ Ping #${this.pingCount} - Error: ${error.message}`);
    }

    // Log statistics every 10 pings
    if (this.pingCount % 10 === 0) {
      const successRate = ((this.successCount / this.pingCount) * 100).toFixed(1);
      console.log(`📈 Statistics: ${this.pingCount} pings, ${successRate}% success rate`);
    }
  }

  /**
   * Make HTTP/HTTPS request
   */
  makeRequest() {
    return new Promise((resolve, reject) => {
      const isHttps = this.url.startsWith('https');
      const client = isHttps ? https : http;
      
      const req = client.get(this.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'SentryCoin-UptimeMonitor/4.0'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Start the uptime monitoring
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting uptime monitoring...\n');

    // Initial ping
    this.ping();

    // Set up interval
    this.interval = setInterval(() => {
      this.ping();
    }, PING_INTERVAL);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down uptime monitor...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down uptime monitor...');
      this.stop();
      process.exit(0);
    });
  }

  /**
   * Stop the uptime monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
    }

    const successRate = this.pingCount > 0 ? ((this.successCount / this.pingCount) * 100).toFixed(1) : 0;
    console.log(`📊 Final Statistics:`);
    console.log(`   Total Pings: ${this.pingCount}`);
    console.log(`   Successful: ${this.successCount}`);
    console.log(`   Failed: ${this.errorCount}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log('✅ Uptime monitor stopped');
  }
}

// Start the monitor if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new UptimeMonitor();
  monitor.start();
}

export default UptimeMonitor;
