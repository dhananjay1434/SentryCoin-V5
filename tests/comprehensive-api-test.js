#!/usr/bin/env node

/**
 * SentryCoin v5.0 - Comprehensive API Test Suite
 * 
 * Tests all API endpoints including:
 * - Health check endpoints
 * - System status monitoring
 * - Performance metrics
 * - Error handling
 * - Response validation
 * - Load testing capabilities
 */

import axios from 'axios';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config();

class ComprehensiveAPITester {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 10000}`;
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.serverProcess = null;
    this.serverStarted = false;
    
    console.log('🧪 SentryCoin v5.0 - Comprehensive API Test Suite');
    console.log('🎯 Testing all API endpoints and functionality');
    console.log(`📡 Base URL: ${this.baseUrl}`);
    console.log('=' .repeat(80));
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, details = '', latency = 0, responseData = null) {
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
      responseData,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    const latencyStr = latency > 0 ? ` (${latency}ms)` : '';
    console.log(`${status} ${testName}: ${details}${latencyStr}`);
  }

  /**
   * Start the SentryCoin server for testing
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      console.log('\n🚀 Starting SentryCoin server for testing...');
      
      this.serverProcess = spawn('node', ['src/index.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          PAPER_TRADING: 'true',
          PORT: '3000'
        }
      });

      let serverOutput = '';
      let serverReady = false;

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        
        // Check if server is ready
        if (output.includes('API server running on port') || output.includes('fully operational')) {
          if (!serverReady) {
            serverReady = true;
            this.serverStarted = true;
            console.log('✅ Server started successfully');
            setTimeout(() => resolve(true), 2000); // Wait 2 seconds for full initialization
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          console.log('⚠️ Server startup timeout, proceeding with tests anyway');
          resolve(false);
        }
      }, 30000);
    });
  }

  /**
   * Stop the server
   */
  async stopServer() {
    if (this.serverProcess) {
      console.log('\n🛑 Stopping test server...');
      this.serverProcess.kill('SIGTERM');
      
      return new Promise((resolve) => {
        this.serverProcess.on('exit', () => {
          console.log('✅ Server stopped');
          resolve();
        });
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.serverProcess) {
            this.serverProcess.kill('SIGKILL');
            resolve();
          }
        }, 5000);
      });
    }
  }

  /**
   * Test basic connectivity
   */
  async testConnectivity() {
    console.log('\n📡 TESTING BASIC CONNECTIVITY');
    console.log('=' .repeat(50));
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });
      const latency = Date.now() - startTime;
      
      if (response.status === 200) {
        this.addTestResult('Basic Connectivity', true, 'Server is reachable', latency, response.data);
      } else {
        this.addTestResult('Basic Connectivity', false, `HTTP ${response.status}`, latency);
      }
    } catch (error) {
      this.addTestResult('Basic Connectivity', false, `Connection failed: ${error.message}`);
    }
  }

  /**
   * Test health endpoint
   */
  async testHealthEndpoint() {
    console.log('\n🏥 TESTING HEALTH ENDPOINT');
    console.log('=' .repeat(50));
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 10000
      });
      const latency = Date.now() - startTime;
      
      // Validate response structure
      const expectedFields = ['status', 'service', 'version', 'timestamp'];
      const hasAllFields = expectedFields.every(field => response.data.hasOwnProperty(field));
      
      if (hasAllFields) {
        this.addTestResult('Health Endpoint Structure', true, 'All required fields present', latency, response.data);
      } else {
        this.addTestResult('Health Endpoint Structure', false, 'Missing required fields', latency);
      }
      
      // Validate service name
      if (response.data.service === 'sentrycoin-v5.0-apex-predator') {
        this.addTestResult('Health Service Name', true, 'Correct service identifier', 0);
      } else {
        this.addTestResult('Health Service Name', false, `Unexpected service: ${response.data.service}`, 0);
      }
      
      // Validate version
      if (response.data.version === '5.0.0') {
        this.addTestResult('Health Version', true, 'Correct version number', 0);
      } else {
        this.addTestResult('Health Version', false, `Unexpected version: ${response.data.version}`, 0);
      }
      
    } catch (error) {
      this.addTestResult('Health Endpoint', false, `Request failed: ${error.message}`);
    }
  }

  /**
   * Test root endpoint
   */
  async testRootEndpoint() {
    console.log('\n🏠 TESTING ROOT ENDPOINT');
    console.log('=' .repeat(50));
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/`, {
        timeout: 10000
      });
      const latency = Date.now() - startTime;
      
      // Validate response structure
      const expectedFields = ['service', 'version', 'status', 'uptime', 'timestamp', 'system'];
      const hasAllFields = expectedFields.every(field => response.data.hasOwnProperty(field));
      
      if (hasAllFields) {
        this.addTestResult('Root Endpoint Structure', true, 'All required fields present', latency, response.data);
      } else {
        this.addTestResult('Root Endpoint Structure', false, 'Missing required fields', latency);
      }
      
      // Validate service name
      if (response.data.service === 'SentryCoin v5.0 "Apex Predator" Market Intelligence Engine') {
        this.addTestResult('Root Service Name', true, 'Correct service identifier', 0);
      } else {
        this.addTestResult('Root Service Name', false, `Unexpected service: ${response.data.service}`, 0);
      }
      
    } catch (error) {
      this.addTestResult('Root Endpoint', false, `Request failed: ${error.message}`);
    }
  }

  /**
   * Test status endpoint
   */
  async testStatusEndpoint() {
    console.log('\n📊 TESTING STATUS ENDPOINT');
    console.log('=' .repeat(50));
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/status`, {
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });
      const latency = Date.now() - startTime;
      
      if (response.status === 200) {
        this.addTestResult('Status Endpoint Available', true, 'System initialized and running', latency, response.data);
        
        // Validate system status structure if available
        if (response.data && typeof response.data === 'object') {
          this.addTestResult('Status Data Structure', true, 'Valid JSON response', 0);
        } else {
          this.addTestResult('Status Data Structure', false, 'Invalid response format', 0);
        }
      } else if (response.status === 503) {
        this.addTestResult('Status Endpoint Available', true, 'System not initialized (expected)', latency);
        
        if (response.data && response.data.error === 'System not initialized') {
          this.addTestResult('Status Error Message', true, 'Correct error response', 0);
        } else {
          this.addTestResult('Status Error Message', false, 'Unexpected error format', 0);
        }
      } else {
        this.addTestResult('Status Endpoint', false, `HTTP ${response.status}`, latency);
      }
      
    } catch (error) {
      this.addTestResult('Status Endpoint', false, `Request failed: ${error.message}`);
    }
  }

  /**
   * Test performance endpoint
   */
  async testPerformanceEndpoint() {
    console.log('\n📈 TESTING PERFORMANCE ENDPOINT');
    console.log('=' .repeat(50));

    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/performance`, {
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });
      const latency = Date.now() - startTime;

      if (response.status === 200) {
        this.addTestResult('Performance Endpoint Available', true, 'System initialized and running', latency, response.data);

        // Validate performance data structure
        const expectedFields = ['cascadeHunterTrader', 'coilWatcher', 'shakeoutDetector', 'classifier', 'timestamp'];
        const hasAllFields = expectedFields.every(field => response.data.hasOwnProperty(field));

        if (hasAllFields) {
          this.addTestResult('Performance Data Structure', true, 'All required fields present', 0);
        } else {
          this.addTestResult('Performance Data Structure', false, 'Missing required fields', 0);
        }
      } else if (response.status === 503) {
        this.addTestResult('Performance Endpoint Available', true, 'System not initialized (expected)', latency);
      } else {
        this.addTestResult('Performance Endpoint', false, `HTTP ${response.status}`, latency);
      }

    } catch (error) {
      this.addTestResult('Performance Endpoint', false, `Request failed: ${error.message}`);
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('\n🚨 TESTING ERROR HANDLING');
    console.log('=' .repeat(50));

    // Test 404 endpoint
    try {
      const response = await axios.get(`${this.baseUrl}/nonexistent`, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status === 404) {
        this.addTestResult('404 Error Handling', true, 'Correct 404 response for invalid endpoint', 0);
      } else {
        this.addTestResult('404 Error Handling', false, `Expected 404, got ${response.status}`, 0);
      }
    } catch (error) {
      this.addTestResult('404 Error Handling', false, `Request failed: ${error.message}`);
    }

    // Test invalid JSON POST
    try {
      const response = await axios.post(`${this.baseUrl}/status`, 'invalid json', {
        timeout: 10000,
        validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status >= 400) {
        this.addTestResult('Invalid JSON Handling', true, `Correctly rejected invalid JSON (${response.status})`, 0);
      } else {
        this.addTestResult('Invalid JSON Handling', false, `Unexpectedly accepted invalid JSON (${response.status})`, 0);
      }
    } catch (error) {
      this.addTestResult('Invalid JSON Handling', true, `Correctly rejected invalid JSON: ${error.message}`, 0);
    }
  }

  /**
   * Test response times and performance
   */
  async testPerformanceMetrics() {
    console.log('\n⚡ TESTING PERFORMANCE METRICS');
    console.log('=' .repeat(50));

    const endpoints = [
      { path: '/health', name: 'Health' },
      { path: '/', name: 'Root' },
      { path: '/status', name: 'Status' },
      { path: '/performance', name: 'Performance' }
    ];

    for (const endpoint of endpoints) {
      const responseTimes = [];
      const testCount = 5;

      for (let i = 0; i < testCount; i++) {
        try {
          const startTime = Date.now();
          await axios.get(`${this.baseUrl}${endpoint.path}`, {
            timeout: 10000,
            validateStatus: () => true
          });
          const responseTime = Date.now() - startTime;
          responseTimes.push(responseTime);
        } catch (error) {
          // Skip failed requests for performance testing
        }
      }

      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const minResponseTime = Math.min(...responseTimes);

        if (avgResponseTime < 1000) {
          this.addTestResult(`${endpoint.name} Performance`, true,
            `Avg: ${avgResponseTime.toFixed(0)}ms, Min: ${minResponseTime}ms, Max: ${maxResponseTime}ms`, avgResponseTime);
        } else {
          this.addTestResult(`${endpoint.name} Performance`, false,
            `Slow response - Avg: ${avgResponseTime.toFixed(0)}ms`, avgResponseTime);
        }
      } else {
        this.addTestResult(`${endpoint.name} Performance`, false, 'All requests failed', 0);
      }
    }
  }

  /**
   * Test concurrent requests
   */
  async testConcurrentRequests() {
    console.log('\n🔄 TESTING CONCURRENT REQUESTS');
    console.log('=' .repeat(50));

    const concurrentCount = 10;
    const promises = [];

    const startTime = Date.now();

    for (let i = 0; i < concurrentCount; i++) {
      promises.push(
        axios.get(`${this.baseUrl}/health`, {
          timeout: 15000,
          validateStatus: () => true
        }).catch(error => ({ error: error.message }))
      );
    }

    try {
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const successCount = results.filter(r => r.status === 200).length;
      const errorCount = results.filter(r => r.error).length;

      if (successCount >= concurrentCount * 0.8) { // 80% success rate
        this.addTestResult('Concurrent Requests', true,
          `${successCount}/${concurrentCount} successful in ${totalTime}ms`, totalTime);
      } else {
        this.addTestResult('Concurrent Requests', false,
          `Only ${successCount}/${concurrentCount} successful, ${errorCount} errors`, totalTime);
      }
    } catch (error) {
      this.addTestResult('Concurrent Requests', false, `Test failed: ${error.message}`);
    }
  }

  /**
   * Test HTTP methods
   */
  async testHttpMethods() {
    console.log('\n🌐 TESTING HTTP METHODS');
    console.log('=' .repeat(50));

    // Test GET (should work)
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        this.addTestResult('GET Method', true, 'GET requests working correctly', 0);
      } else {
        this.addTestResult('GET Method', false, `GET returned ${response.status}`, 0);
      }
    } catch (error) {
      this.addTestResult('GET Method', false, `GET failed: ${error.message}`);
    }

    // Test POST (should return 404 for health endpoint)
    try {
      const response = await axios.post(`${this.baseUrl}/health`, {}, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status === 404 || response.status === 405) {
        this.addTestResult('POST Method Rejection', true, 'POST correctly rejected for GET-only endpoint', 0);
      } else {
        this.addTestResult('POST Method Rejection', false, `POST unexpectedly returned ${response.status}`, 0);
      }
    } catch (error) {
      this.addTestResult('POST Method Rejection', true, `POST correctly rejected: ${error.message}`, 0);
    }

    // Test OPTIONS (CORS preflight)
    try {
      const response = await axios.options(`${this.baseUrl}/health`, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status === 200 || response.status === 204) {
        this.addTestResult('OPTIONS Method', true, 'OPTIONS requests handled', 0);
      } else {
        this.addTestResult('OPTIONS Method', false, `OPTIONS returned ${response.status}`, 0);
      }
    } catch (error) {
      this.addTestResult('OPTIONS Method', false, `OPTIONS failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n📋 COMPREHENSIVE API TEST REPORT');
    console.log('=' .repeat(80));

    const passRate = this.totalTests > 0 ? (this.passedTests / this.totalTests * 100).toFixed(1) : 0;

    console.log(`📊 Test Summary:`);
    console.log(`   Total Tests: ${this.totalTests}`);
    console.log(`   Passed: ${this.passedTests} ✅`);
    console.log(`   Failed: ${this.failedTests} ❌`);
    console.log(`   Pass Rate: ${passRate}%`);

    if (this.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`   - ${result.test}: ${result.details}`);
        });
    }

    console.log('\n📈 Performance Summary:');
    const performanceTests = this.testResults.filter(r => r.latency > 0);
    if (performanceTests.length > 0) {
      const avgLatency = performanceTests.reduce((sum, test) => sum + test.latency, 0) / performanceTests.length;
      const maxLatency = Math.max(...performanceTests.map(t => t.latency));
      const minLatency = Math.min(...performanceTests.map(t => t.latency));

      console.log(`   Average Response Time: ${avgLatency.toFixed(0)}ms`);
      console.log(`   Fastest Response: ${minLatency}ms`);
      console.log(`   Slowest Response: ${maxLatency}ms`);
    }

    console.log('\n🎯 Recommendations:');
    if (this.failedTests === 0) {
      console.log('   ✅ All API endpoints are functioning correctly');
      console.log('   ✅ System is ready for production use');
    } else {
      console.log('   ⚠️ Some API endpoints have issues that need attention');
      console.log('   ⚠️ Review failed tests before production deployment');
    }

    const avgResponseTime = performanceTests.length > 0 ?
      performanceTests.reduce((sum, test) => sum + test.latency, 0) / performanceTests.length : 0;

    if (avgResponseTime > 1000) {
      console.log('   ⚠️ Response times are slower than optimal (>1000ms average)');
    } else if (avgResponseTime > 500) {
      console.log('   💡 Response times could be improved (>500ms average)');
    } else {
      console.log('   ✅ Response times are excellent (<500ms average)');
    }

    return this.failedTests === 0;
  }

  /**
   * Run all API tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive API test suite...\n');

    // Test without server first (to check error handling)
    await this.testConnectivity();

    // Try to start server for full testing
    const serverStarted = await this.startServer();

    if (serverStarted) {
      console.log('\n✅ Server is running, proceeding with full test suite...');

      // Wait a bit more for full initialization
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Run all endpoint tests
      await this.testHealthEndpoint();
      await this.testRootEndpoint();
      await this.testStatusEndpoint();
      await this.testPerformanceEndpoint();

      // Run advanced tests
      await this.testErrorHandling();
      await this.testHttpMethods();
      await this.testPerformanceMetrics();
      await this.testConcurrentRequests();

      // Stop the server
      await this.stopServer();
    } else {
      console.log('\n⚠️ Could not start server, running limited tests...');

      // Run basic connectivity tests only
      await this.testHealthEndpoint();
      await this.testRootEndpoint();
      await this.testStatusEndpoint();
      await this.testPerformanceEndpoint();
    }

    // Generate final report
    const success = this.generateReport();

    if (success) {
      console.log('\n🎉 ALL API TESTS PASSED - SYSTEM IS READY!');
      process.exit(0);
    } else {
      console.log('\n🚨 SOME API TESTS FAILED - REVIEW REQUIRED!');
      process.exit(1);
    }
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ComprehensiveAPITester();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Test interrupted, cleaning up...');
    await tester.stopServer();
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Test terminated, cleaning up...');
    await tester.stopServer();
    process.exit(1);
  });

  tester.runAllTests().catch(async (error) => {
    console.error('❌ Test suite failed:', error);
    await tester.stopServer();
    process.exit(1);
  });
}

export default ComprehensiveAPITester;
