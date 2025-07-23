// Service Worker for handling push notifications with mobile alarm features
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);

  if (event.data) {
    const data = event.data.json();
    console.log('Push notification data:', data);

    // Determine vibration pattern based on alert type
    let vibrationPattern = [200, 100, 200]; // Default
    let requireInteraction = false;
    let silent = false;

    if (data.alertType === 'URGENT') {
      vibrationPattern = [300, 100, 300, 100, 300];
      requireInteraction = true;
    } else if (data.alertType === 'EMERGENCY') {
      vibrationPattern = [500, 200, 500, 200, 500, 200, 500];
      requireInteraction = true;
    }

    // Disable vibration if user opted out
    if (data.vibrationEnabled === false) {
      vibrationPattern = [];
    }

    // Disable sound if user opted out
    if (data.soundEnabled === false) {
      silent = true;
    }

    const options = {
      body: data.body || 'Price alert triggered!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: vibrationPattern,
      data: data,
      requireInteraction: requireInteraction,
      silent: silent,
      tag: `pumpalarm-${data.coin}-${Date.now()}`,
      renotify: true,
      actions: [
        {
          action: 'view',
          title: '👀 View Details',
          icon: '/icon-192.png'
        },
        {
          action: 'snooze',
          title: '⏰ Snooze 5min',
          icon: '/icon-192.png'
        },
        {
          action: 'close',
          title: '❌ Close',
          icon: '/icon-192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'PumpAlarm!', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view') {
    // Open the app when notification is clicked
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'snooze') {
    // Snooze for 5 minutes - re-show notification
    setTimeout(() => {
      self.registration.showNotification('🔔 Snoozed Alert Reminder', {
        body: `Reminder: ${event.notification.data.body}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: `pumpalarm-snooze-${Date.now()}`,
        data: event.notification.data
      });
    }, 5 * 60 * 1000); // 5 minutes
  } else if (event.action === 'close') {
    // Just close, no action needed
    console.log('Notification dismissed');
  } else {
    // Default click - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});
