#!/usr/bin/env node

/**
 * SentryCoin v6.0 - API Connectivity Test Suite
 * 
 * OPERATION CHIMERA - API VALIDATION PROTOCOL
 * 
 * Tests all critical API connections for Phoenix Engine v6.0
 * before live deployment to ensure informational supremacy.
 */

import dotenv from 'dotenv';
import axios from 'axios';
import WebSocket from 'ws';

// Load environment configuration
dotenv.config();

class APIConnectivityTester {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    
    console.log('🧪 PHOENIX ENGINE v6.0 - API CONNECTIVITY TEST SUITE');
    console.log('🛡️ OPERATION CHIMERA - API VALIDATION PROTOCOL');
    console.log('⚡ Testing all critical API connections...\n');
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, details = '', latency = 0) {
    this.totalTests++;
    if (passed) {
      this.passedTests++;
    } else {
      this.failedTests++;
    }
    
    this.testResults.push({
      test: testName,
      passed,
      details,
      latency,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    const latencyStr = latency > 0 ? ` (${latency}ms)` : '';
    console.log(`${status} ${testName}: ${details}${latencyStr}`);
  }

  /**
   * Test Telegram Bot API
   */
  async testTelegramAPI() {
    console.log('\n📱 TESTING TELEGRAM API CONNECTION');
    console.log('=' .repeat(50));
    
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (!botToken || !chatId) {
        this.addTestResult('Telegram Config', false, 'Missing bot token or chat ID');
        return;
      }
      
      const startTime = Date.now();
      
      // Test bot info
      const botResponse = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, {
        timeout: 10000
      });
      
      const botLatency = Date.now() - startTime;
      
      if (botResponse.data.ok) {
        this.addTestResult('Telegram Bot Info', true, `Bot: ${botResponse.data.result.username}`, botLatency);
        
        // Test message sending
        const messageStartTime = Date.now();
        const messageResponse = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: chatId,
          text: '🧪 Phoenix Engine v6.0 API Test - Telegram connectivity confirmed',
          parse_mode: 'HTML'
        }, {
          timeout: 10000
        });
        
        const messageLatency = Date.now() - messageStartTime;
        
        if (messageResponse.data.ok) {
          this.addTestResult('Telegram Message Send', true, 'Test message sent successfully', messageLatency);
        } else {
          this.addTestResult('Telegram Message Send', false, 'Failed to send test message');
        }
      } else {
        this.addTestResult('Telegram Bot Info', false, 'Invalid bot token');
      }
      
    } catch (error) {
      this.addTestResult('Telegram API', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test Etherscan API
   */
  async testEtherscanAPI() {
    console.log('\n⛓️ TESTING ETHERSCAN API CONNECTION');
    console.log('=' .repeat(50));
    
    try {
      const apiKey = process.env.ETHERSCAN_API_KEY;
      
      if (!apiKey) {
        this.addTestResult('Etherscan Config', false, 'Missing API key');
        return;
      }
      
      const startTime = Date.now();
      
      // Test latest block
      const response = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: apiKey
        },
        timeout: 15000
      });
      
      const latency = Date.now() - startTime;
      
      if (response.data.result) {
        const blockNumber = parseInt(response.data.result, 16);
        this.addTestResult('Etherscan Latest Block', true, `Block: ${blockNumber.toLocaleString()}`, latency);
        
        // Test whale balance check
        const balanceStartTime = Date.now();
        const balanceResponse = await axios.get('https://api.etherscan.io/api', {
          params: {
            module: 'account',
            action: 'balance',
            address: '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
            tag: 'latest',
            apikey: apiKey
          },
          timeout: 15000
        });
        
        const balanceLatency = Date.now() - balanceStartTime;
        
        if (balanceResponse.data.status === '1') {
          const balanceEth = parseFloat(balanceResponse.data.result) / 1e18;
          this.addTestResult('Etherscan Whale Balance', true, `Balance: ${balanceEth.toFixed(2)} ETH`, balanceLatency);
        } else {
          this.addTestResult('Etherscan Whale Balance', false, 'Failed to fetch whale balance');
        }
        
      } else {
        this.addTestResult('Etherscan API', false, 'Invalid API response');
      }
      
    } catch (error) {
      this.addTestResult('Etherscan API', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test Blocknative API
   */
  async testBlocknativeAPI() {
    console.log('\n🔥 TESTING BLOCKNATIVE API CONNECTION');
    console.log('=' .repeat(50));
    
    try {
      const apiKey = process.env.BLOCKNATIVE_API_KEY;
      
      if (!apiKey) {
        this.addTestResult('Blocknative Config', false, 'Missing API key');
        return;
      }
      
      // Test WebSocket connection
      const wsUrl = 'wss://api.blocknative.com/v0';
      const ws = new WebSocket(wsUrl);
      
      const startTime = Date.now();
      
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          
          // Send initialization
          ws.send(JSON.stringify({
            categoryCode: 'initialize',
            eventCode: 'checkDappId',
            dappId: apiKey
          }));
          
          resolve(latency);
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.status === 'ok') {
              this.addTestResult('Blocknative Auth', true, 'API key authenticated successfully');
            }
          } catch (e) {
            // Ignore parsing errors for this test
          }
        });
      });
      
      const latency = await connectionPromise;
      this.addTestResult('Blocknative WebSocket', true, 'Connection established', latency);
      
      ws.close();
      
    } catch (error) {
      this.addTestResult('Blocknative API', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test Alchemy API
   */
  async testAlchemyAPI() {
    console.log('\n🧪 TESTING ALCHEMY API CONNECTION');
    console.log('=' .repeat(50));
    
    try {
      const apiKey = process.env.ALCHEMY_API_KEY;
      const networkUrl = process.env.ALCHEMY_NETWORK_URL;
      
      if (!apiKey || !networkUrl) {
        this.addTestResult('Alchemy Config', false, 'Missing API key or network URL');
        return;
      }
      
      const startTime = Date.now();
      
      // Test latest block
      const response = await axios.post(networkUrl, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const latency = Date.now() - startTime;
      
      if (response.data.result) {
        const blockNumber = parseInt(response.data.result, 16);
        this.addTestResult('Alchemy Latest Block', true, `Block: ${blockNumber.toLocaleString()}`, latency);
        
        // Test WebSocket connection
        const wsUrl = process.env.ALCHEMY_WS_URL;
        if (wsUrl) {
          const wsStartTime = Date.now();
          const ws = new WebSocket(wsUrl);
          
          const wsPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('WebSocket timeout'));
            }, 10000);
            
            ws.on('open', () => {
              clearTimeout(timeout);
              const wsLatency = Date.now() - wsStartTime;
              resolve(wsLatency);
              ws.close();
            });
            
            ws.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
          
          const wsLatency = await wsPromise;
          this.addTestResult('Alchemy WebSocket', true, 'WebSocket connection established', wsLatency);
        }
        
      } else {
        this.addTestResult('Alchemy API', false, 'Invalid API response');
      }
      
    } catch (error) {
      this.addTestResult('Alchemy API', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test Bybit API
   */
  async testBybitAPI() {
    console.log('\n📊 TESTING BYBIT API CONNECTION');
    console.log('=' .repeat(50));
    
    try {
      const apiKey = process.env.BYBIT_API_KEY;
      const apiSecret = process.env.BYBIT_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        this.addTestResult('Bybit Config', false, 'Missing API key or secret');
        return;
      }
      
      const startTime = Date.now();
      
      // Test server time (no authentication required)
      const timeResponse = await axios.get('https://api.bybit.com/v5/market/time', {
        timeout: 15000
      });
      
      const timeLatency = Date.now() - startTime;
      
      if (timeResponse.data.retCode === 0) {
        this.addTestResult('Bybit Server Time', true, 'Server time retrieved', timeLatency);
        
        // Test market data
        const marketStartTime = Date.now();
        const marketResponse = await axios.get('https://api.bybit.com/v5/market/tickers', {
          params: {
            category: 'linear',
            symbol: 'ETHUSDT'
          },
          timeout: 15000
        });
        
        const marketLatency = Date.now() - marketStartTime;
        
        if (marketResponse.data.retCode === 0 && marketResponse.data.result.list.length > 0) {
          const ticker = marketResponse.data.result.list[0];
          this.addTestResult('Bybit Market Data', true, `ETHUSDT: $${parseFloat(ticker.lastPrice).toFixed(2)}`, marketLatency);
        } else {
          this.addTestResult('Bybit Market Data', false, 'Failed to fetch market data');
        }
        
        // Test WebSocket connection
        const wsStartTime = Date.now();
        const ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
        
        const wsPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket timeout'));
          }, 10000);
          
          ws.on('open', () => {
            clearTimeout(timeout);
            const wsLatency = Date.now() - wsStartTime;
            
            // Subscribe to test stream
            ws.send(JSON.stringify({
              op: 'subscribe',
              args: ['tickers.ETHUSDT']
            }));
            
            resolve(wsLatency);
            ws.close();
          });
          
          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        const wsLatency = await wsPromise;
        this.addTestResult('Bybit WebSocket', true, 'WebSocket connection established', wsLatency);
        
      } else {
        this.addTestResult('Bybit API', false, 'Server time request failed');
      }
      
    } catch (error) {
      this.addTestResult('Bybit API', false, `Error: ${error.message}`);
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n' + '=' .repeat(80));
    console.log('🧪 PHOENIX ENGINE v6.0 - API CONNECTIVITY TEST REPORT');
    console.log('=' .repeat(80));
    
    console.log(`📊 Test Results: ${this.passedTests}/${this.totalTests} passed (${this.failedTests} failed)`);
    console.log('');
    
    // Group results by API
    const apiGroups = {
      'Telegram': this.testResults.filter(r => r.test.includes('Telegram')),
      'Etherscan': this.testResults.filter(r => r.test.includes('Etherscan')),
      'Blocknative': this.testResults.filter(r => r.test.includes('Blocknative')),
      'Alchemy': this.testResults.filter(r => r.test.includes('Alchemy')),
      'Bybit': this.testResults.filter(r => r.test.includes('Bybit'))
    };
    
    Object.entries(apiGroups).forEach(([apiName, tests]) => {
      const passed = tests.filter(t => t.passed).length;
      const total = tests.length;
      const status = passed === total ? '✅' : '❌';
      
      console.log(`${status} ${apiName}: ${passed}/${total} tests passed`);
      
      tests.forEach(test => {
        const testStatus = test.passed ? '  ✅' : '  ❌';
        const latency = test.latency > 0 ? ` (${test.latency}ms)` : '';
        console.log(`${testStatus} ${test.test}: ${test.details}${latency}`);
      });
      console.log('');
    });
    
    // Overall assessment
    const successRate = (this.passedTests / this.totalTests) * 100;
    
    if (successRate >= 90) {
      console.log('🎉 API CONNECTIVITY: EXCELLENT');
      console.log('🛡️ Phoenix Engine v6.0 is ready for deployment');
      console.log('🚀 All critical APIs operational');
      console.log('⚡ Informational supremacy confirmed');
      return true;
    } else if (successRate >= 70) {
      console.log('⚠️ API CONNECTIVITY: GOOD');
      console.log('🔧 Some APIs may need attention');
      console.log('📋 Review failed tests before deployment');
      return false;
    } else {
      console.log('❌ API CONNECTIVITY: POOR');
      console.log('🛑 Critical APIs offline - deployment not recommended');
      console.log('🔧 Fix API issues before proceeding');
      return false;
    }
  }

  /**
   * Run complete API test suite
   */
  async runAllTests() {
    console.log('🎯 COMMENCING API CONNECTIVITY VALIDATION\n');
    
    await this.testTelegramAPI();
    await this.testEtherscanAPI();
    await this.testBlocknativeAPI();
    await this.testAlchemyAPI();
    await this.testBybitAPI();
    
    const success = this.generateReport();
    
    if (success) {
      console.log('\n🔥 ALL SYSTEMS GO - PHOENIX ENGINE v6.0 READY FOR OPERATION CHIMERA');
    } else {
      console.log('\n🛑 API ISSUES DETECTED - RESOLVE BEFORE DEPLOYMENT');
    }
    
    return success;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new APIConnectivityTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

export default APIConnectivityTester;
