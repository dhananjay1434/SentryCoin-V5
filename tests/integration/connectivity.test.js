#!/usr/bin/env node

/**
 * SentryCoin Connectivity Test Suite
 * 
 * Tests connectivity to various services and APIs to diagnose issues
 */

import axios from 'axios';
import WebSocket from 'ws';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

class ConnectivityTester {
  constructor() {
    this.results = [];
  }

  /**
   * Adds test result
   */
  addResult(test, success, message, details = null) {
    this.results.push({ test, success, message, details });
    const status = success ? '✅' : '❌';
    console.log(`${status} ${test}: ${message}`);
    if (details) {
      console.log(`   Details: ${details}`);
    }
  }

  /**
   * Tests Binance REST API connectivity
   */
  async testBinanceRestAPI() {
    console.log('\n🔍 Testing Binance REST API Connectivity...');
    
    const endpoints = [
      'https://api.binance.com/api/v3/ping',
      'https://api1.binance.com/api/v3/ping',
      'https://api2.binance.com/api/v3/ping',
      'https://api3.binance.com/api/v3/ping'
    ];

    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await axios.get(endpoint, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'SentryCoin-ConnectivityTest/1.0.0'
          }
        });
        const latency = Date.now() - start;
        
        this.addResult(
          `Binance API (${endpoint})`,
          true,
          `Connected successfully`,
          `Latency: ${latency}ms, Status: ${response.status}`
        );
      } catch (error) {
        this.addResult(
          `Binance API (${endpoint})`,
          false,
          `Connection failed`,
          `Error: ${error.message}, Status: ${error.response?.status || 'N/A'}`
        );
      }
    }
  }

  /**
   * Tests Binance order book API
   */
  async testBinanceOrderBook() {
    console.log('\n📊 Testing Binance Order Book API...');
    
    const symbol = process.env.SYMBOL || 'SOLUSDT';
    const endpoints = [
      'https://api.binance.com/api/v3/depth',
      'https://api1.binance.com/api/v3/depth',
      'https://api2.binance.com/api/v3/depth'
    ];

    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await axios.get(endpoint, {
          params: { symbol, limit: 10 },
          timeout: 15000,
          headers: {
            'User-Agent': 'SentryCoin-ConnectivityTest/1.0.0'
          }
        });
        const latency = Date.now() - start;
        
        const { bids, asks } = response.data;
        this.addResult(
          `Order Book (${endpoint})`,
          true,
          `Retrieved order book data`,
          `Latency: ${latency}ms, Bids: ${bids.length}, Asks: ${asks.length}`
        );
      } catch (error) {
        this.addResult(
          `Order Book (${endpoint})`,
          false,
          `Failed to retrieve order book`,
          `Error: ${error.message}, Status: ${error.response?.status || 'N/A'}`
        );
      }
    }
  }

  /**
   * Tests Binance WebSocket connectivity
   */
  async testBinanceWebSocket() {
    console.log('\n🔌 Testing Binance WebSocket Connectivity...');
    
    const symbol = (process.env.SYMBOL || 'SOLUSDT').toLowerCase();
    const endpoints = [
      `wss://stream.binance.com:9443/ws/${symbol}@depth`,
      `wss://stream.binance.com:443/ws/${symbol}@depth`,
      `wss://stream1.binance.com:9443/ws/${symbol}@depth`,
      `wss://stream2.binance.com:9443/ws/${symbol}@depth`
    ];

    for (const endpoint of endpoints) {
      await new Promise((resolve) => {
        const start = Date.now();
        const ws = new WebSocket(endpoint, {
          headers: {
            'User-Agent': 'SentryCoin-ConnectivityTest/1.0.0'
          }
        });

        const timeout = setTimeout(() => {
          ws.close();
          this.addResult(
            `WebSocket (${endpoint})`,
            false,
            'Connection timeout',
            'No response within 10 seconds'
          );
          resolve();
        }, 10000);

        ws.on('open', () => {
          const latency = Date.now() - start;
          clearTimeout(timeout);
          this.addResult(
            `WebSocket (${endpoint})`,
            true,
            'Connected successfully',
            `Connection time: ${latency}ms`
          );
          ws.close();
          resolve();
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          this.addResult(
            `WebSocket (${endpoint})`,
            false,
            'Connection failed',
            `Error: ${error.message}`
          );
          resolve();
        });

        ws.on('message', (data) => {
          try {
            const parsed = JSON.parse(data);
            console.log(`   📦 Received data: ${Object.keys(parsed).join(', ')}`);
          } catch (e) {
            console.log(`   📦 Received raw data: ${data.toString().substring(0, 100)}...`);
          }
        });
      });
    }
  }

  /**
   * Tests Telegram Bot API
   */
  async testTelegramBot() {
    console.log('\n📱 Testing Telegram Bot Connectivity...');
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      this.addResult(
        'Telegram Configuration',
        false,
        'Missing credentials',
        'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set'
      );
      return;
    }

    try {
      const bot = new TelegramBot(token, { polling: false });
      
      // Test bot info
      const botInfo = await bot.getMe();
      this.addResult(
        'Telegram Bot Info',
        true,
        'Bot authenticated successfully',
        `Bot: @${botInfo.username} (${botInfo.first_name})`
      );

      // Test sending message
      const testMessage = '🧪 SentryCoin Connectivity Test - ' + new Date().toISOString();
      await bot.sendMessage(chatId, testMessage);
      this.addResult(
        'Telegram Message Send',
        true,
        'Test message sent successfully',
        `Chat ID: ${chatId}`
      );

    } catch (error) {
      this.addResult(
        'Telegram Bot',
        false,
        'Failed to connect or send message',
        `Error: ${error.message}`
      );
    }
  }

  /**
   * Tests general network connectivity
   */
  async testNetworkConnectivity() {
    console.log('\n🌐 Testing General Network Connectivity...');
    
    const testUrls = [
      'https://www.google.com',
      'https://api.github.com',
      'https://httpbin.org/ip'
    ];

    for (const url of testUrls) {
      try {
        const start = Date.now();
        const response = await axios.get(url, { timeout: 10000 });
        const latency = Date.now() - start;
        
        this.addResult(
          `Network (${url})`,
          true,
          'Connected successfully',
          `Latency: ${latency}ms, Status: ${response.status}`
        );
      } catch (error) {
        this.addResult(
          `Network (${url})`,
          false,
          'Connection failed',
          `Error: ${error.message}`
        );
      }
    }
  }

  /**
   * Runs all connectivity tests
   */
  async runAllTests() {
    console.log('🧪 SentryCoin Connectivity Test Suite\n');
    console.log('🔍 Diagnosing connectivity issues...\n');

    await this.testNetworkConnectivity();
    await this.testBinanceRestAPI();
    await this.testBinanceOrderBook();
    await this.testBinanceWebSocket();
    await this.testTelegramBot();

    this.printSummary();
  }

  /**
   * Prints test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONNECTIVITY TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const failed = total - passed;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total:  ${total}`);
    console.log(`📈 Success Rate: ${((passed/total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      
      const binanceFailed = this.results.filter(r => 
        r.test.includes('Binance') && !r.success
      ).length;
      
      if (binanceFailed > 0) {
        console.log('• Binance API issues detected:');
        console.log('  - Your server location may be blocked (HTTP 451)');
        console.log('  - Consider using a VPN or different hosting provider');
        console.log('  - Try alternative cryptocurrency exchanges');
      }

      const telegramFailed = this.results.filter(r => 
        r.test.includes('Telegram') && !r.success
      ).length;
      
      if (telegramFailed > 0) {
        console.log('• Telegram issues detected:');
        console.log('  - Verify bot token and chat ID');
        console.log('  - Ensure bot is started by sending /start');
      }
    }

    console.log('\n🎯 Test Complete');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ConnectivityTester();
  tester.runAllTests().catch(console.error);
}

export default ConnectivityTester;
