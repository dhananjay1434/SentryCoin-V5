// SentryCoin Alert Testing Script
// Run with: node test-sentrycoin.js

const BASE_URL = 'http://localhost:3000';

// Mock push subscription for testing
const mockSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  keys: {
    p256dh: 'test-key',
    auth: 'test-auth'
  }
};

async function testAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    console.log(`✅ ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ ${endpoint}:`, error.message);
    return null;
  }
}

async function testSentryCoin() {
  console.log('🛡️ Testing SentryCoin Advanced Alert System\n');

  // Test health endpoint
  console.log('1. Testing Health Check...');
  await testAPI('/api/health');
  console.log('');

  // Test price history stats
  console.log('2. Testing Price History Stats...');
  const stats = await testAPI('/api/price-history/stats');
  if (stats) {
    console.log(`   📊 Tracking ${stats.symbolCount} symbols with ${stats.totalPoints} price points`);
  }
  console.log('');

  // Test threshold alert
  console.log('3. Testing Threshold Alert...');
  await testAPI('/api/set-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coin: 'BTC',
      alertType: 'THRESHOLD',
      params: {
        condition: 'ABOVE',
        price: 1 // Very low to trigger immediately
      },
      pushSubscription: mockSubscription
    })
  });
  console.log('');

  // Test percentage drop alert
  console.log('4. Testing Percentage Drop Alert...');
  await testAPI('/api/set-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coin: 'ETH',
      alertType: 'PERCENT_DROP',
      params: {
        percentage: 0.1, // Very small percentage
        windowHours: 1
      },
      pushSubscription: mockSubscription
    })
  });
  console.log('');

  // Test velocity drop alert
  console.log('5. Testing Velocity Drop Alert...');
  await testAPI('/api/set-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coin: 'SOL',
      alertType: 'VELOCITY_DROP',
      params: {
        percentage: 0.1, // Very small percentage
        windowMinutes: 5
      },
      pushSubscription: mockSubscription
    })
  });
  console.log('');

  // Check alert count
  console.log('6. Checking Alert Count...');
  await testAPI('/api/alerts/count');
  console.log('');

  // Test invalid alert
  console.log('7. Testing Invalid Alert (should fail)...');
  await testAPI('/api/set-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coin: 'BTC',
      alertType: 'INVALID_TYPE',
      params: {},
      pushSubscription: mockSubscription
    })
  });
  console.log('');

  console.log('🎉 SentryCoin testing complete!');
  console.log('💡 Check server logs for alert triggers and price history updates.');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSentryCoin().catch(console.error);
}

export { testSentryCoin };
