#!/usr/bin/env node

/**
 * Simple API Test - Debug version
 */

import axios from 'axios';

console.log('🧪 Simple API Test Starting...');

const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 10000}`;

async function testAPI() {
  console.log(`Testing basic connectivity to ${baseUrl}...`);
  
  try {
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log(`✅ Health endpoint responded with status: ${response.status}`);
    console.log(`📊 Response data:`, response.data);
    
  } catch (error) {
    console.log(`❌ Health endpoint failed: ${error.message}`);
  }
  
  try {
    const response = await axios.get(`${baseUrl}/`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log(`✅ Root endpoint responded with status: ${response.status}`);
    console.log(`📊 Response data:`, response.data);
    
  } catch (error) {
    console.log(`❌ Root endpoint failed: ${error.message}`);
  }
  
  try {
    const response = await axios.get(`${baseUrl}/status`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log(`✅ Status endpoint responded with status: ${response.status}`);
    if (response.status === 503) {
      console.log(`📊 Expected 503 - System not initialized`);
    } else {
      console.log(`📊 Response data:`, response.data);
    }
    
  } catch (error) {
    console.log(`❌ Status endpoint failed: ${error.message}`);
  }
  
  try {
    const response = await axios.get(`${baseUrl}/performance`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log(`✅ Performance endpoint responded with status: ${response.status}`);
    if (response.status === 503) {
      console.log(`📊 Expected 503 - System not initialized`);
    } else {
      console.log(`📊 Response data:`, response.data);
    }
    
  } catch (error) {
    console.log(`❌ Performance endpoint failed: ${error.message}`);
  }
}

testAPI().then(() => {
  console.log('🎉 Simple API test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});
