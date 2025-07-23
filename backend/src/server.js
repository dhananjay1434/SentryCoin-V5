import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import webpush from 'web-push';
import { startPriceMonitor, getPriceHistoryStats } from './price-monitor.js';
import { checkAllAlerts } from './alert-handler.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for alerts (MVP trade-off)
export let activeAlerts = [];

// Configure web-push
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend build
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// API Routes
app.get('/api/vapid-public-key', (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
});

app.post('/api/set-alert', (req, res) => {
  try {
    const { coin, alertType, params, pushSubscription } = req.body;

    // Validate basic input
    if (!coin || !alertType || !params || !pushSubscription) {
      return res.status(400).json({ error: 'Missing required fields: coin, alertType, params, pushSubscription' });
    }

    // Validate alert type
    if (!['THRESHOLD', 'PERCENT_DROP', 'VELOCITY_DROP'].includes(alertType)) {
      return res.status(400).json({ error: 'Invalid alertType. Must be THRESHOLD, PERCENT_DROP, or VELOCITY_DROP' });
    }

    // Validate parameters based on alert type
    let validationError = null;

    switch (alertType) {
      case 'THRESHOLD':
        if (!params.condition || !params.price) {
          validationError = 'THRESHOLD alerts require condition and price';
        } else if (!['ABOVE', 'BELOW'].includes(params.condition)) {
          validationError = 'condition must be ABOVE or BELOW';
        } else if (typeof params.price !== 'number' || params.price <= 0) {
          validationError = 'price must be a positive number';
        }
        break;

      case 'PERCENT_DROP':
        if (!params.percentage || !params.windowHours) {
          validationError = 'PERCENT_DROP alerts require percentage and windowHours';
        } else if (typeof params.percentage !== 'number' || params.percentage <= 0) {
          validationError = 'percentage must be a positive number';
        } else if (typeof params.windowHours !== 'number' || params.windowHours <= 0) {
          validationError = 'windowHours must be a positive number';
        }
        break;

      case 'VELOCITY_DROP':
        if (!params.percentage || !params.windowMinutes) {
          validationError = 'VELOCITY_DROP alerts require percentage and windowMinutes';
        } else if (typeof params.percentage !== 'number' || params.percentage <= 0) {
          validationError = 'percentage must be a positive number';
        } else if (typeof params.windowMinutes !== 'number' || params.windowMinutes <= 0) {
          validationError = 'windowMinutes must be a positive number';
        }
        break;
    }

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Create alert object
    const alert = {
      id: Date.now().toString(),
      coin: coin.toUpperCase(),
      alertType,
      params,
      pushSubscription,
      createdAt: new Date().toISOString()
    };

    // Add to active alerts
    activeAlerts.push(alert);

    // Log alert creation with details
    let logMessage = `✅ New ${alertType} alert set for ${coin.toUpperCase()}`;
    if (alertType === 'THRESHOLD') {
      logMessage += ` (${params.condition} $${params.price})`;
    } else if (alertType === 'PERCENT_DROP') {
      logMessage += ` (${params.percentage}% drop in ${params.windowHours}h)`;
    } else if (alertType === 'VELOCITY_DROP') {
      logMessage += ` (${params.percentage}% drop in ${params.windowMinutes}min)`;
    }
    logMessage += ` (Total alerts: ${activeAlerts.length})`;
    console.log(logMessage);

    res.json({
      success: true,
      message: 'Alert set successfully',
      alertId: alert.id,
      alertType: alertType
    });

  } catch (error) {
    console.error('Error setting alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/alerts/count', (req, res) => {
  res.json({ count: activeAlerts.length });
});

// Price history stats endpoint
app.get('/api/price-history/stats', (req, res) => {
  const stats = getPriceHistoryStats();
  res.json(stats);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const historyStats = getPriceHistoryStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeAlerts: activeAlerts.length,
    priceHistorySymbols: historyStats.symbolCount,
    totalPricePoints: historyStats.totalPoints
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 PumpAlarm server running on port ${PORT}`);
  console.log(`📱 Frontend available at: http://localhost:${PORT}`);
  console.log(`🔔 VAPID configured: ${!!process.env.VAPID_PUBLIC_KEY}`);
  
  // Start price monitoring with the new alert engine
  startPriceMonitor((priceData) => {
    checkAllAlerts(priceData, activeAlerts);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});


