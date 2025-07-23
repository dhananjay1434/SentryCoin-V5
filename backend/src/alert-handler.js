import webpush from 'web-push';
import dotenv from 'dotenv';
import { getPriceFromTimeAgo, calculatePercentageChange } from './price-monitor.js';

// Load environment variables
dotenv.config();

// Configure web-push
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Main alert checking function - processes all active alerts against new price data
 * @param {object} priceData - Current price data { symbol, price, timestamp }
 * @param {array} activeAlerts - Array of active alert objects
 */
export function checkAllAlerts(priceData, activeAlerts) {
  const { symbol, price } = priceData;

  // Find alerts that match this symbol
  const matchingAlerts = activeAlerts.filter(alert => {
    // Convert coin symbol to Binance format (e.g., BTC -> BTCUSDT)
    const binanceSymbol = alert.coin + 'USDT';
    return symbol === binanceSymbol;
  });

  if (matchingAlerts.length === 0) {
    return; // No alerts for this symbol
  }

  // Check each matching alert
  matchingAlerts.forEach(async (alert) => {
    let shouldTrigger = false;
    let triggerReason = '';

    // Use switch statement to handle different alert types
    switch (alert.alertType) {
      case 'THRESHOLD':
        const result = checkThresholdAlert(alert, price);
        shouldTrigger = result.triggered;
        triggerReason = result.reason;
        break;

      case 'PERCENT_DROP':
        const percentResult = checkPercentageDropAlert(alert, symbol, price);
        shouldTrigger = percentResult.triggered;
        triggerReason = percentResult.reason;
        break;

      case 'VELOCITY_DROP':
        const velocityResult = checkVelocityDropAlert(alert, symbol, price);
        shouldTrigger = velocityResult.triggered;
        triggerReason = velocityResult.reason;
        break;

      default:
        console.warn(`⚠️ Unknown alert type: ${alert.alertType}`);
        return;
    }

    if (shouldTrigger) {
      console.log(`🚨 Alert triggered: ${alert.coin} - ${triggerReason}`);

      try {
        // Send push notification
        await sendPushNotification(alert, price, triggerReason);

        // Remove the alert from active alerts (one-shot alert)
        const alertIndex = activeAlerts.findIndex(a => a.id === alert.id);
        if (alertIndex > -1) {
          activeAlerts.splice(alertIndex, 1);
          console.log(`✅ Alert removed. Remaining alerts: ${activeAlerts.length}`);
        }

      } catch (error) {
        console.error('❌ Error sending push notification:', error);

        // If push notification fails, still remove the alert to prevent spam
        const alertIndex = activeAlerts.findIndex(a => a.id === alert.id);
        if (alertIndex > -1) {
          activeAlerts.splice(alertIndex, 1);
          console.log(`⚠️ Alert removed due to notification error. Remaining alerts: ${activeAlerts.length}`);
        }
      }
    }
  });
}

/**
 * Checks threshold-based alerts (traditional price crossing)
 * @param {object} alert - The alert object
 * @param {number} currentPrice - Current price
 * @returns {object} - { triggered: boolean, reason: string }
 */
function checkThresholdAlert(alert, currentPrice) {
  const { condition, price } = alert.params;

  if (condition === 'ABOVE' && currentPrice >= price) {
    return {
      triggered: true,
      reason: `Price went above $${price.toFixed(2)} (Current: $${currentPrice.toFixed(2)})`
    };
  } else if (condition === 'BELOW' && currentPrice <= price) {
    return {
      triggered: true,
      reason: `Price went below $${price.toFixed(2)} (Current: $${currentPrice.toFixed(2)})`
    };
  }

  return { triggered: false, reason: '' };
}

/**
 * Checks percentage drop alerts over a time window
 * @param {object} alert - The alert object
 * @param {string} symbol - Trading pair symbol
 * @param {number} currentPrice - Current price
 * @returns {object} - { triggered: boolean, reason: string }
 */
function checkPercentageDropAlert(alert, symbol, currentPrice) {
  const { percentage, windowHours } = alert.params;
  const windowMs = windowHours * 60 * 60 * 1000;

  // Get price from the specified time ago
  const oldPrice = getPriceFromTimeAgo(symbol, windowMs);

  if (!oldPrice) {
    // Not enough price history yet
    return { triggered: false, reason: 'Insufficient price history' };
  }

  // Calculate percentage change
  const percentChange = calculatePercentageChange(oldPrice, currentPrice);

  // Check if it's a drop (negative change) and exceeds threshold
  if (percentChange <= -percentage) {
    return {
      triggered: true,
      reason: `Dropped ${Math.abs(percentChange).toFixed(2)}% in ${windowHours}h (${oldPrice.toFixed(2)} → ${currentPrice.toFixed(2)})`
    };
  }

  return { triggered: false, reason: '' };
}

/**
 * Checks sudden velocity drop alerts (rapid price changes)
 * @param {object} alert - The alert object
 * @param {string} symbol - Trading pair symbol
 * @param {number} currentPrice - Current price
 * @returns {object} - { triggered: boolean, reason: string }
 */
function checkVelocityDropAlert(alert, symbol, currentPrice) {
  const { percentage, windowMinutes } = alert.params;
  const windowMs = windowMinutes * 60 * 1000;

  // Get price from the specified time ago
  const oldPrice = getPriceFromTimeAgo(symbol, windowMs);

  if (!oldPrice) {
    // Not enough price history yet
    return { triggered: false, reason: 'Insufficient price history' };
  }

  // Calculate percentage change
  const percentChange = calculatePercentageChange(oldPrice, currentPrice);

  // Check if it's a drop (negative change) and exceeds threshold
  if (percentChange <= -percentage) {
    return {
      triggered: true,
      reason: `Sudden drop of ${Math.abs(percentChange).toFixed(2)}% in ${windowMinutes}min (${oldPrice.toFixed(2)} → ${currentPrice.toFixed(2)})`
    };
  }

  return { triggered: false, reason: '' };
}

async function sendPushNotification(alert, currentPrice, triggerReason) {
  const { coin, alertType, pushSubscription } = alert;

  // Customize title and body based on alert type
  let title = '🛡️ SentryCoin Alert!';
  let body = `${coin}: ${triggerReason}`;

  // Customize notification based on alert type
  switch (alertType) {
    case 'THRESHOLD':
      title = '📊 Price Threshold Alert!';
      break;
    case 'PERCENT_DROP':
      title = '📉 Percentage Drop Alert!';
      break;
    case 'VELOCITY_DROP':
      title = '⚡ Sudden Price Movement!';
      break;
  }

  const payload = JSON.stringify({
    title,
    body,
    data: {
      coin,
      alertType,
      currentPrice,
      triggerReason,
      timestamp: new Date().toISOString()
    }
  });

  const options = {
    TTL: 60 * 60 * 24, // 24 hours
    vapidDetails: {
      subject: `mailto:${process.env.VAPID_EMAIL}`,
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    }
  };

  try {
    const result = await webpush.sendNotification(pushSubscription, payload, options);
    console.log('✅ Push notification sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Push notification failed:', error);
    
    // If the subscription is invalid, we should handle it gracefully
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('📱 Push subscription is no longer valid');
    }
    
    throw error;
  }
}
