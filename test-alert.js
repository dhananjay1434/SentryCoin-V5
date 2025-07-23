// Simple test script to verify the alert system
import fetch from 'node-fetch';

const testAlert = async () => {
  try {
    // Mock push subscription (for testing purposes)
    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: {
        p256dh: 'test-key',
        auth: 'test-auth'
      }
    };

    const alertData = {
      coin: 'BTC',
      condition: 'ABOVE',
      price: 1, // Very low price to trigger immediately
      pushSubscription: mockSubscription
    };

    console.log('Setting test alert...');
    const response = await fetch('http://localhost:3000/api/set-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alertData)
    });

    const result = await response.json();
    console.log('Alert response:', result);

    // Check alerts count
    const countResponse = await fetch('http://localhost:3000/api/alerts/count');
    const countResult = await countResponse.json();
    console.log('Active alerts count:', countResult.count);

  } catch (error) {
    console.error('Test failed:', error);
  }
};

testAlert();
