#!/usr/bin/env node

/**
 * SentryCoin v5.1 - Deployment Verification Script
 * 
 * Verifies that the Render.com deployment is working correctly
 * Tests all critical endpoints and functionality
 */

import https from 'https';
import http from 'http';

class DeploymentVerifier {
  constructor() {
    this.baseUrl = process.env.RENDER_URL || 'https://your-app.onrender.com';
    this.timeout = 30000;
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
    
    console.log('🛡️ SentryCoin v5.1 - Deployment Verification');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log('🔍 Running comprehensive deployment tests...\n');
  }

  /**
   * Make HTTP request
   */
  async makeRequest(endpoint, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${endpoint}`;
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const startTime = Date.now();
      
      const req = client.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'SentryCoin-DeploymentVerifier/5.1',
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          try {
            const jsonData = JSON.parse(data);
            resolve({
              success: res.statusCode === expectedStatus,
              statusCode: res.statusCode,
              responseTime,
              data: jsonData,
              raw: data
            });
          } catch (error) {
            resolve({
              success: res.statusCode === expectedStatus,
              statusCode: res.statusCode,
              responseTime,
              data: null,
              raw: data,
              parseError: error.message
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
   * Run a test
   */
  async runTest(name, testFunction) {
    this.results.total++;
    
    try {
      console.log(`🧪 Testing: ${name}`);
      const result = await testFunction();
      
      if (result.success) {
        this.results.passed++;
        console.log(`   ✅ PASS - ${result.message || 'Test completed successfully'}`);
        if (result.details) {
          console.log(`   📊 ${result.details}`);
        }
      } else {
        this.results.failed++;
        console.log(`   ❌ FAIL - ${result.message || 'Test failed'}`);
        if (result.error) {
          console.log(`   🚨 Error: ${result.error}`);
        }
      }
      
    } catch (error) {
      this.results.failed++;
      console.log(`   ❌ FAIL - ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test health endpoint
   */
  async testHealthEndpoint() {
    try {
      const response = await this.makeRequest('/health');
      
      if (response.success && response.data) {
        return {
          success: true,
          message: `Health endpoint responding (${response.responseTime}ms)`,
          details: `Status: ${response.data.status || 'unknown'}`
        };
      } else {
        return {
          success: false,
          message: `Health endpoint failed`,
          error: `HTTP ${response.statusCode}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Health endpoint unreachable',
        error: error.error
      };
    }
  }

  /**
   * Test status endpoint
   */
  async testStatusEndpoint() {
    try {
      const response = await this.makeRequest('/status');
      
      if (response.success && response.data) {
        const hasVersion = response.data.version === '5.0.0';
        const hasStrategyManager = response.data.strategyManager !== undefined;
        
        return {
          success: hasVersion && hasStrategyManager,
          message: `Status endpoint responding (${response.responseTime}ms)`,
          details: `Version: ${response.data.version}, Strategies: ${response.data.stats?.strategiesActive || 0}`
        };
      } else {
        return {
          success: false,
          message: 'Status endpoint failed',
          error: `HTTP ${response.statusCode}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Status endpoint unreachable',
        error: error.error
      };
    }
  }

  /**
   * Test performance endpoint
   */
  async testPerformanceEndpoint() {
    try {
      const response = await this.makeRequest('/performance');
      
      if (response.success && response.data) {
        const hasClassifier = response.data.classifier !== undefined;
        
        return {
          success: hasClassifier,
          message: `Performance endpoint responding (${response.responseTime}ms)`,
          details: `Classifier active: ${hasClassifier ? 'Yes' : 'No'}`
        };
      } else {
        return {
          success: false,
          message: 'Performance endpoint failed',
          error: `HTTP ${response.statusCode}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Performance endpoint unreachable',
        error: error.error
      };
    }
  }

  /**
   * Test root endpoint
   */
  async testRootEndpoint() {
    try {
      const response = await this.makeRequest('/');
      
      if (response.success && response.data) {
        const isApexPredator = response.data.service?.includes('Apex Predator');
        
        return {
          success: isApexPredator,
          message: `Root endpoint responding (${response.responseTime}ms)`,
          details: `Service: ${response.data.service || 'unknown'}`
        };
      } else {
        return {
          success: false,
          message: 'Root endpoint failed',
          error: `HTTP ${response.statusCode}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Root endpoint unreachable',
        error: error.error
      };
    }
  }

  /**
   * Test response time
   */
  async testResponseTime() {
    try {
      const response = await this.makeRequest('/health');
      
      const isAcceptable = response.responseTime < 5000; // 5 seconds
      
      return {
        success: isAcceptable,
        message: `Response time: ${response.responseTime}ms`,
        details: isAcceptable ? 'Acceptable performance' : 'Slow response time'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Response time test failed',
        error: error.error
      };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting deployment verification tests...\n');
    
    await this.runTest('Health Endpoint', () => this.testHealthEndpoint());
    await this.runTest('Status Endpoint', () => this.testStatusEndpoint());
    await this.runTest('Performance Endpoint', () => this.testPerformanceEndpoint());
    await this.runTest('Root Endpoint', () => this.testRootEndpoint());
    await this.runTest('Response Time', () => this.testResponseTime());
    
    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    
    console.log('📊 === DEPLOYMENT VERIFICATION SUMMARY ===');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log(`📈 Tests passed: ${this.results.passed}/${this.results.total}`);
    console.log(`📊 Success rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('✅ ALL TESTS PASSED - Deployment is healthy!');
      console.log('🎉 SentryCoin v5.1 "Apex Predator" is ready for operation!');
    } else {
      console.log(`❌ ${this.results.failed} tests failed - Review deployment`);
      console.log('🔧 Check logs and configuration before proceeding');
    }
    
    console.log('==========================================\n');
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new DeploymentVerifier();
  verifier.runAllTests().catch(console.error);
}

export default DeploymentVerifier;
