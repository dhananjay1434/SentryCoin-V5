import React, { useState, useEffect } from 'react';

function App() {
  const [coin, setCoin] = useState('');
  const [alertType, setAlertType] = useState('THRESHOLD');

  // Threshold alert fields
  const [condition, setCondition] = useState('ABOVE');
  const [price, setPrice] = useState('');

  // Percentage drop alert fields
  const [percentage, setPercentage] = useState('');
  const [windowHours, setWindowHours] = useState('');

  // Velocity drop alert fields
  const [velocityPercentage, setVelocityPercentage] = useState('');
  const [windowMinutes, setWindowMinutes] = useState('');

  // App state
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      initializeServiceWorker();
    } else {
      setMessage('Push notifications are not supported in this browser.');
    }
  }, []);

  const initializeServiceWorker = async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration);

      // Check current permission
      setPermission(Notification.permission);

      // If permission is granted, get existing subscription
      if (Notification.permission === 'granted') {
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          setSubscription(existingSubscription);
        }
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      setMessage('Failed to register service worker.');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await subscribeToPush();
        setMessage('Notifications enabled! You can now set alerts.');
      } else {
        setMessage('Notifications denied. Please enable them to receive alerts.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setMessage('Error requesting notification permission.');
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from backend
      const response = await fetch('/api/vapid-public-key');
      const { publicKey } = await response.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      setSubscription(subscription);
      console.log('Push subscription:', subscription);
    } catch (error) {
      console.error('Error subscribing to push:', error);
      setMessage('Error setting up push notifications.');
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subscription) {
      setMessage('Please enable notifications first.');
      return;
    }

    if (!coin) {
      setMessage('Please enter a cryptocurrency symbol.');
      return;
    }

    // Validate fields based on alert type
    let alertData = {
      coin: coin.toUpperCase(),
      alertType,
      pushSubscription: subscription
    };

    if (alertType === 'THRESHOLD') {
      if (!price) {
        setMessage('Please enter a target price.');
        return;
      }
      alertData.params = {
        condition,
        price: parseFloat(price)
      };
    } else if (alertType === 'PERCENT_DROP') {
      if (!percentage || !windowHours) {
        setMessage('Please enter percentage and time window.');
        return;
      }
      alertData.params = {
        percentage: parseFloat(percentage),
        windowHours: parseInt(windowHours)
      };
    } else if (alertType === 'VELOCITY_DROP') {
      if (!velocityPercentage || !windowMinutes) {
        setMessage('Please enter percentage and time window.');
        return;
      }
      alertData.params = {
        percentage: parseFloat(velocityPercentage),
        windowMinutes: parseInt(windowMinutes)
      };
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/set-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
      });

      const result = await response.json();

      if (response.ok) {
        let successMessage = `Alert set for ${coin.toUpperCase()}! `;

        if (alertType === 'THRESHOLD') {
          successMessage += `You'll be notified when it goes ${condition.toLowerCase()} $${price}`;
        } else if (alertType === 'PERCENT_DROP') {
          successMessage += `You'll be notified if it drops ${percentage}% within ${windowHours} hours`;
        } else if (alertType === 'VELOCITY_DROP') {
          successMessage += `You'll be notified if it drops ${velocityPercentage}% within ${windowMinutes} minutes`;
        }

        setMessage(successMessage);

        // Reset form
        setCoin('');
        setPrice('');
        setPercentage('');
        setWindowHours('');
        setVelocityPercentage('');
        setWindowMinutes('');
      } else {
        setMessage(result.error || 'Failed to set alert.');
      }
    } catch (error) {
      console.error('Error setting alert:', error);
      setMessage('Error setting alert. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🛡️ SentryCoin</h1>
        <p style={styles.subtitle}>Advanced crypto monitoring with intelligent alerts</p>

        {!isSupported && (
          <div style={styles.error}>
            Push notifications are not supported in this browser.
          </div>
        )}

        {isSupported && permission !== 'granted' && (
          <div style={styles.permissionSection}>
            <p style={styles.permissionText}>
              Enable notifications to receive price alerts
            </p>
            <button 
              onClick={requestNotificationPermission}
              style={styles.permissionButton}
            >
              Enable Notifications
            </button>
          </div>
        )}

        {permission === 'granted' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Cryptocurrency Symbol</label>
              <input
                type="text"
                value={coin}
                onChange={(e) => setCoin(e.target.value)}
                placeholder="e.g., BTC, ETH, SOL"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Alert Type</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                style={styles.select}
              >
                <option value="THRESHOLD">📊 Price Crosses Threshold</option>
                <option value="PERCENT_DROP">📉 Percentage Drop Over Time</option>
                <option value="VELOCITY_DROP">⚡ Sudden Price Drop</option>
              </select>
            </div>

            {alertType === 'THRESHOLD' && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    style={styles.select}
                  >
                    <option value="ABOVE">Price goes above</option>
                    <option value="BELOW">Price goes below</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Target Price (USD)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    style={styles.input}
                    required
                  />
                </div>
              </>
            )}

            {alertType === 'PERCENT_DROP' && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Percentage Drop (%)</label>
                  <input
                    type="number"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="e.g., 4"
                    step="0.1"
                    min="0.1"
                    max="50"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Time Window (Hours)</label>
                  <input
                    type="number"
                    value={windowHours}
                    onChange={(e) => setWindowHours(e.target.value)}
                    placeholder="e.g., 2"
                    min="1"
                    max="24"
                    style={styles.input}
                    required
                  />
                </div>
              </>
            )}

            {alertType === 'VELOCITY_DROP' && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Percentage Drop (%)</label>
                  <input
                    type="number"
                    value={velocityPercentage}
                    onChange={(e) => setVelocityPercentage(e.target.value)}
                    placeholder="e.g., 2"
                    step="0.1"
                    min="0.1"
                    max="20"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Time Window (Minutes)</label>
                  <input
                    type="number"
                    value={windowMinutes}
                    onChange={(e) => setWindowMinutes(e.target.value)}
                    placeholder="e.g., 5"
                    min="1"
                    max="60"
                    style={styles.input}
                    required
                  />
                </div>
              </>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              style={{
                ...styles.submitButton,
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Setting Alert...' : 'Set Alert'}
            </button>
          </form>
        )}

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.includes('Error') || message.includes('Failed') || message.includes('denied') 
              ? '#fee' : '#efe',
            color: message.includes('Error') || message.includes('Failed') || message.includes('denied')
              ? '#c33' : '#363'
          }}>
            {message}
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            ⚠️ MVP Notice: All alerts and price history are stored in memory and will be completely lost if the server restarts.
          </p>
          <div style={styles.alertExamples}>
            <h4 style={styles.examplesTitle}>💡 Example Alerts:</h4>
            <ul style={styles.examplesList}>
              <li><strong>Threshold:</strong> "BTC above $50,000"</li>
              <li><strong>% Drop:</strong> "SOL drops 4% in 2 hours"</li>
              <li><strong>Velocity:</strong> "ETH drops 2% in 5 minutes"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 10px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '30px',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  permissionSection: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  permissionText: {
    color: '#666',
    marginBottom: '15px',
  },
  permissionButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '2px solid #e1e5e9',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '12px',
    border: '2px solid #e1e5e9',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'white',
  },
  submitButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  message: {
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
  },
  footer: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  },
  footerText: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center',
    margin: '0 0 20px 0',
  },
  alertExamples: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '15px',
  },
  examplesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 10px 0',
  },
  examplesList: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
    paddingLeft: '20px',
  },
};

export default App;
