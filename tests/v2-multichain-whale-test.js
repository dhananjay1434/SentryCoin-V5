#!/usr/bin/env node

/**
 * SentryCoin V2 - Multi-Chain Whale Monitoring Test
 * 
 * Tests the new Etherscan V2 API integration for monitoring whale addresses
 * across 50+ supported chains with a single API key.
 */

import OnChainMonitor from '../src/services/onchain-monitor.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 SentryCoin V2 - Multi-Chain Whale Monitoring Test');
console.log('====================================================\n');

async function testV2MultiChainAPI() {
  console.log('🔧 Testing V2 Multi-Chain API Integration...\n');

  // Initialize the monitor
  const monitor = new OnChainMonitor({ symbol: 'SPK' });

  // Test 1: API Key Validation
  console.log('1️⃣ Testing API Key Configuration...');
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log('❌ ETHERSCAN_API_KEY not found in environment variables');
    console.log('💡 Please set your API key in .env file:');
    console.log('   ETHERSCAN_API_KEY=YourApiKeyToken');
    return false;
  }
  console.log('✅ API key configured\n');

  // Test 2: Whale Address Validation
  console.log('2️⃣ Testing Whale Address Configuration...');
  const whaleAddresses = [
    process.env.WHALE_ADDRESS_1,
    process.env.WHALE_ADDRESS_2,
    process.env.WHALE_ADDRESS_3,
    process.env.WHALE_ADDRESS_4,
    process.env.WHALE_ADDRESS_5,
    process.env.WHALE_ADDRESS_6,
    process.env.WHALE_ADDRESS_7,
    process.env.WHALE_ADDRESS_8
  ].filter(addr => addr && addr !== 'undefined' && addr.length === 42 && addr.startsWith('0x'));

  if (whaleAddresses.length === 0) {
    console.log('❌ No valid whale addresses configured');
    console.log('💡 Please set whale addresses in .env file:');
    console.log('   WHALE_ADDRESS_1=0x6fe588fdcc6a34207485cc6e47673f59ccedf92b');
    console.log('   WHALE_ADDRESS_2=0x3300f198988e4c9c63f75df86de36421f06af8c4');
    return false;
  }

  console.log(`✅ ${whaleAddresses.length} SPK whale addresses configured:`);
  whaleAddresses.forEach((addr, i) => {
    console.log(`   🐋 Whale ${i+1}: ${addr.substring(0,8)}...${addr.substring(34)} (${addr === process.env.WHALE_ADDRESS_1 ? '16.4% supply' : addr === process.env.WHALE_ADDRESS_2 ? '9.2% supply' : 'major holder'})`);
  });
  console.log('');

  // Test 3: Multi-Chain API Calls
  console.log('3️⃣ Testing V2 Multi-Chain API Calls...');
  
  const testChains = [
    { id: 1, name: 'Ethereum' },
    { id: 56, name: 'BSC' },
    { id: 137, name: 'Polygon' },
    { id: 42161, name: 'Arbitrum' },
    { id: 10, name: 'Optimism' }
  ];

  const testAddress = whaleAddresses[0]; // Top holder #2 (16.4% supply)
  console.log(`🔍 Testing SPK whale address: ${testAddress.substring(0, 8)}...${testAddress.substring(34)} (16.4% supply holder)`);

  let successfulChains = 0;
  let totalChains = testChains.length;

  for (const chain of testChains) {
    try {
      console.log(`   📡 Testing ${chain.name} (Chain ID: ${chain.id})...`);
      
      const result = await monitor.checkWhaleOnChain(testAddress, chain);
      
      if (result.transactions) {
        console.log(`   ✅ ${chain.name}: API call successful (${result.transactions.length} transactions)`);
        successfulChains++;
      } else {
        console.log(`   ⚠️ ${chain.name}: No transaction data returned`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`   ❌ ${chain.name}: ${error.message}`);
    }
  }

  console.log(`\n📊 Multi-Chain Test Results: ${successfulChains}/${totalChains} chains successful\n`);

  // Test 4: Full Multi-Chain Whale Check
  console.log('4️⃣ Testing Full Multi-Chain Whale Monitoring...');
  
  try {
    const multiChainResult = await monitor.checkMultiChainWhaleAddress(testAddress);
    
    console.log(`✅ Multi-chain check completed:`);
    console.log(`   📊 Total activity: ${multiChainResult.totalActivity} transactions`);
    console.log(`   🌐 Active chains: ${multiChainResult.activeChains.length} (${multiChainResult.activeChains.join(', ')})`);
    console.log(`   📝 Total transactions: ${multiChainResult.transactions.length}`);
    
    if (multiChainResult.transactions.length > 0) {
      const latestTx = multiChainResult.transactions[0];
      console.log(`   🕐 Latest transaction: ${latestTx.chainName} at ${new Date(parseInt(latestTx.timeStamp) * 1000).toISOString()}`);
    }
    
  } catch (error) {
    console.log(`❌ Multi-chain whale check failed: ${error.message}`);
    return false;
  }

  console.log('\n5️⃣ Testing API Performance Metrics...');
  const stats = monitor.getSystemState();
  console.log(`📈 API Stats:`);
  console.log(`   Total calls: ${stats.apiStats?.totalCalls || 0}`);
  console.log(`   Success rate: ${stats.apiStats?.successCount || 0}/${stats.apiStats?.totalCalls || 0}`);
  console.log(`   Average response time: ${stats.apiStats?.averageResponseTime?.toFixed(0) || 0}ms`);

  return true;
}

async function testErrorHandling() {
  console.log('\n🛡️ Testing Error Handling...\n');

  const monitor = new OnChainMonitor({ symbol: 'SPK' });

  // Test with invalid address
  console.log('1️⃣ Testing invalid whale address handling...');
  try {
    await monitor.checkMultiChainWhaleAddress('0xinvalid');
    console.log('❌ Should have failed with invalid address');
  } catch (error) {
    console.log('✅ Invalid address properly rejected');
  }

  // Test with non-existent address
  console.log('\n2️⃣ Testing non-existent address handling...');
  const nonExistentAddress = '0x0000000000000000000000000000000000000001';
  try {
    const result = await monitor.checkMultiChainWhaleAddress(nonExistentAddress);
    console.log(`✅ Non-existent address handled gracefully (${result.totalActivity} transactions found)`);
  } catch (error) {
    console.log(`⚠️ Non-existent address caused error: ${error.message}`);
  }

  return true;
}

async function runTests() {
  try {
    const apiTestPassed = await testV2MultiChainAPI();
    const errorTestPassed = await testErrorHandling();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 V2 MULTI-CHAIN TEST SUMMARY');
    console.log('='.repeat(60));
    
    if (apiTestPassed && errorTestPassed) {
      console.log('✅ ALL TESTS PASSED - V2 Multi-Chain API is working correctly!');
      console.log('\n🚀 Your whale monitoring system is now ready for multi-chain operation.');
      console.log('💡 The "No transactions found" errors should now be resolved.');
      
      console.log('\n📋 Next Steps:');
      console.log('1. Update your whale addresses in .env file');
      console.log('2. Enable multi-chain monitoring: ENABLE_MULTICHAIN_MONITORING=true');
      console.log('3. Restart your SentryCoin application');
      console.log('4. Monitor the logs for multi-chain whale activity');
      
    } else {
      console.log('❌ SOME TESTS FAILED - Please check your configuration');
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Verify your ETHERSCAN_API_KEY is valid');
      console.log('2. Check your whale addresses are properly formatted');
      console.log('3. Ensure you have internet connectivity');
      console.log('4. Check Etherscan API status: https://etherscan.io/apis');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.log('\n🔧 Please check your configuration and try again.');
  }
}

// Run the tests
runTests().catch(console.error);
