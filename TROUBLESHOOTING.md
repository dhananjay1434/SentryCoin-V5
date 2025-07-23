# 🔧 SentryCoin Flash Crash Predictor - Troubleshooting Guide

## 🚨 Current Issues Identified

### 1. **HTTP 451 Error - Critical Issue**
**Problem**: Binance API returning "451 Unavailable For Legal Reasons"
**Cause**: Geographic/IP-based blocking by Binance for compliance reasons
**Impact**: Complete failure of order book data and WebSocket connections

### 2. **Missing Environment Configuration**
**Problem**: Required Telegram credentials not configured
**Cause**: No `.env` file with proper values
**Impact**: Application exits on startup

### 3. **Deployment Configuration**
**Problem**: Render.yaml configured as "worker" instead of "web" service
**Cause**: Incorrect service type for Express server
**Impact**: Port binding issues on deployment platform

## ✅ Solutions Implemented

### 1. **Multi-Endpoint Fallback System**
- Added multiple Binance API endpoints for redundancy
- Implemented automatic endpoint rotation on failures
- Added proper error handling with specific 451 error detection

### 2. **Environment Configuration**
- Created `.env` file with your Telegram bot credentials
- Updated with proper bot token and chat ID
- Added all required environment variables

### 3. **Deployment Configuration Fix**
- Changed `render.yaml` from "worker" to "web" service type
- Ensures proper port binding for Express server

### 4. **Graceful Degradation Mode**
- System continues running even when primary services fail
- Web server remains available for health checks
- Automatic recovery attempts every 5 minutes
- Enhanced error reporting and statistics

### 5. **Enhanced Error Handling**
- Better WebSocket reconnection with endpoint rotation
- Improved timeout handling
- Non-blocking Telegram connection testing
- Comprehensive logging for debugging

## 🧪 Testing & Diagnostics

### Run Connectivity Tests
```bash
node src/connectivity-test.js
```

This will test:
- ✅ General network connectivity
- ✅ Binance REST API endpoints
- ✅ Binance order book API
- ✅ Binance WebSocket connections
- ✅ Telegram bot functionality

### Run Application Tests
```bash
npm test
```

### Start Application
```bash
npm start
```

## 🌐 Alternative Solutions for HTTP 451

### Option 1: Use VPN/Proxy (Recommended)
```bash
# If using a VPS, configure VPN
# Popular options: NordVPN, ExpressVPN, ProtonVPN
```

### Option 2: Alternative Hosting Providers
Consider hosting on providers with different IP ranges:
- **AWS EC2** (different regions)
- **Google Cloud Platform**
- **DigitalOcean**
- **Linode**
- **Vultr**

### Option 3: Alternative Cryptocurrency Exchanges
Modify the code to use exchanges that don't block your region:
- **Coinbase Pro API**
- **Kraken API**
- **Bitfinex API**
- **KuCoin API**

### Option 4: Proxy/Relay Service
Set up a proxy server in an allowed region to relay API calls.

## 📊 Monitoring & Health Checks

### Health Check Endpoints
- `GET /` - Main status page
- `GET /health` - Simple health check
- `GET /status` - Detailed status information

### Status Indicators
- ✅ **Normal Mode**: All services operational
- ⚠️ **Degraded Mode**: Web server running, limited functionality
- ❌ **Failed**: Complete system failure

### Log Monitoring
Watch for these key indicators:
```bash
# Success indicators
✅ WebSocket connected successfully
✅ Order book initialized
✅ Telegram connection verified

# Warning indicators
⚠️ Entering degraded mode
⚠️ HTTP 451: This region may be blocked

# Error indicators
❌ WebSocket error: Unexpected server response: 451
❌ Failed to initialize order book
❌ Max reconnection attempts reached
```

## 🔧 Configuration Tuning

### For Testing (More Sensitive)
```env
SYMBOL=DOGEUSDT
DANGER_RATIO=2.0
COOLDOWN_MINUTES=2
ORDER_BOOK_DEPTH=25
```

### For Production (Less Sensitive)
```env
SYMBOL=BTCUSDT
DANGER_RATIO=3.5
COOLDOWN_MINUTES=10
ORDER_BOOK_DEPTH=100
```

### For High-Volume Trading
```env
SYMBOL=ETHUSDT
DANGER_RATIO=2.8
COOLDOWN_MINUTES=5
ORDER_BOOK_DEPTH=75
```

## 🚀 Deployment Checklist

### Before Deployment
- [ ] Environment variables configured in Render dashboard
- [ ] Telegram bot tested and working
- [ ] Connectivity tests passing
- [ ] Application tests passing

### Environment Variables for Render
```
TELEGRAM_BOT_TOKEN=7394664393:AAFCuCfvwgu-6qFhYUlsdTFJYVZzQ38N-YQ
TELEGRAM_CHAT_ID=6049830025
TELEGRAM_API_ID=29395164
TELEGRAM_API_HASH=4fd72e3993e581776c5aabd3c88771cc
SYMBOL=SOLUSDT
DANGER_RATIO=2.5
ORDER_BOOK_DEPTH=50
COOLDOWN_MINUTES=5
LOG_LEVEL=info
NODE_ENV=production
```

### After Deployment
- [ ] Health check endpoint responding
- [ ] Logs showing successful startup
- [ ] Telegram test message received
- [ ] WebSocket connection established

## 🆘 Emergency Procedures

### If System Completely Fails
1. Check Render logs for error messages
2. Verify environment variables are set
3. Run connectivity tests locally
4. Consider switching to degraded mode manually

### If Only Binance Fails (HTTP 451)
1. System will automatically enter degraded mode
2. Web server continues running
3. Consider alternative hosting or VPN
4. Monitor for automatic recovery attempts

### If Only Telegram Fails
1. Verify bot token and chat ID
2. Ensure bot is started (/start command)
3. Check Telegram API status
4. System continues monitoring without alerts

## 📞 Support & Resources

### Useful Commands
```bash
# Test connectivity
node src/connectivity-test.js

# Run full test suite
npm test

# Start with debug logging
LOG_LEVEL=debug npm start

# Check application status
curl https://sentrycoin.onrender.com/status
```

### Key Files Modified
- `render.yaml` - Fixed service type
- `.env` - Added credentials
- `src/predictor.js` - Enhanced error handling
- `src/connectivity-test.js` - New diagnostic tool

### Next Steps
1. Deploy with updated configuration
2. Monitor logs for 451 errors
3. If 451 persists, consider VPN/alternative hosting
4. Test Telegram alerts functionality
5. Monitor system performance and adjust thresholds
