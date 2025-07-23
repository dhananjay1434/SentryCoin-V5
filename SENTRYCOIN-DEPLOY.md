# 🛡️ SentryCoin - Advanced Crypto Alert System

## 🚀 Quick Deploy to Render.com

### 1. **Repository Setup**
```bash
# Ensure all files are committed
git add .
git commit -m "SentryCoin MVP - Advanced crypto alerts with time-based analysis"
git push origin main
```

### 2. **Generate VAPID Keys**
```bash
cd backend
npx web-push generate-vapid-keys
```
**SAVE THESE KEYS!** You'll need them for Render.

### 3. **Deploy to Render**
1. Go to [render.com](https://render.com) and login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Service will auto-configure from `render.yaml`

### 4. **Environment Variables**
Set these in Render dashboard:
```
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=your_email@example.com
NODE_ENV=production
MAX_PRICE_HISTORY_HOURS=6
```

---

## 🎯 Alert Types Guide

### 📊 **Price Threshold Alerts**
Traditional price crossing alerts.

**Example**: "Alert when BTC goes above $50,000"
```json
{
  "coin": "BTC",
  "alertType": "THRESHOLD", 
  "params": {
    "condition": "ABOVE",
    "price": 50000
  }
}
```

### 📉 **Percentage Drop Over Time**
Monitors price drops over specified time windows.

**Example**: "Alert if SOL drops 4% within any 2-hour period"
```json
{
  "coin": "SOL",
  "alertType": "PERCENT_DROP",
  "params": {
    "percentage": 4,
    "windowHours": 2
  }
}
```

### ⚡ **Sudden Velocity Changes**
Detects rapid price movements in short timeframes.

**Example**: "Alert if BTC drops 2% in the last 5 minutes"
```json
{
  "coin": "BTC", 
  "alertType": "VELOCITY_DROP",
  "params": {
    "percentage": 2,
    "windowMinutes": 5
  }
}
```

---

## 🧠 How It Works

### **Price History Management**
- **Real-time Collection**: Binance WebSocket streams all crypto prices
- **In-Memory Storage**: Rolling cache of recent price data
- **Automatic Pruning**: Old data removed every 5 minutes
- **Memory Efficient**: Configurable history retention (default: 6 hours)

### **Alert Engine**
- **Threshold Checking**: Simple price comparisons
- **Percentage Calculations**: Time-window analysis for drops
- **Velocity Detection**: Rapid movement identification
- **One-Shot Triggers**: Alerts fire once and are removed

### **Data Structure**
```javascript
// Price History
{
  "BTCUSDT": [
    { timestamp: 1678886400000, price: 60000.50 },
    { timestamp: 1678886460000, price: 59800.25 }
  ]
}

// Active Alerts
[
  {
    id: "1678886400000",
    coin: "BTC",
    alertType: "VELOCITY_DROP",
    params: { percentage: 2, windowMinutes: 5 },
    pushSubscription: { ... }
  }
]
```

---

## 📱 Mobile Usage

### **Setting Alerts**
1. **Visit your deployed URL** (e.g., `https://sentrycoin.onrender.com`)
2. **Allow notifications** when prompted
3. **Choose alert type**:
   - Price Threshold: Traditional alerts
   - Percentage Drop: Time-based analysis
   - Velocity Drop: Rapid movement detection
4. **Configure parameters** based on alert type
5. **Submit** and wait for notifications!

### **Alert Examples**
```
🚨 Emergency Scenarios:
- BTC velocity drop 3% in 5 minutes (flash crash detection)
- ETH drops 10% in 1 hour (major dump alert)
- SOL drops 15% in 4 hours (bear market warning)

⚠️ Trading Signals:
- BTC above $100,000 (bull run confirmation)
- ETH drops 5% in 2 hours (buy the dip opportunity)
- SOL velocity drop 2% in 10 minutes (quick scalp alert)

📊 Portfolio Monitoring:
- Your altcoin drops 8% in 6 hours
- Stablecoin depegs below $0.98
- DeFi token pumps above resistance
```

---

## 🔧 API Endpoints

### **Set Alert**
```bash
POST /api/set-alert
Content-Type: application/json

{
  "coin": "BTC",
  "alertType": "VELOCITY_DROP",
  "params": {
    "percentage": 2,
    "windowMinutes": 5
  },
  "pushSubscription": { ... }
}
```

### **Health Check**
```bash
GET /api/health
# Returns: active alerts count + price history stats
```

### **Price History Stats**
```bash
GET /api/price-history/stats
# Returns: detailed price history statistics
```

---

## ⚠️ Important Limitations

### **Memory-Only Storage**
- **All alerts lost** on server restart
- **All price history lost** on server restart
- **No persistence** - this is intentional for MVP simplicity

### **Resource Usage**
- Price history grows over time
- Automatic cleanup every 5 minutes
- Configurable retention period
- Monitor memory usage in production

### **Rate Limits**
- No built-in rate limiting
- Consider adding for production use
- Binance WebSocket has its own limits

---

## 🛠️ Troubleshooting

### **Alerts Not Triggering**
1. Check if enough price history exists
2. Verify coin symbol format (BTC, ETH, SOL)
3. Ensure realistic percentage/time parameters
4. Check server logs for errors

### **Memory Issues**
1. Reduce `MAX_PRICE_HISTORY_HOURS`
2. Monitor price history stats endpoint
3. Check cleanup logs every 5 minutes
4. Consider restarting if memory grows too large

### **WebSocket Connection**
1. Check Binance API status
2. Verify internet connectivity
3. Monitor reconnection attempts in logs
4. Restart service if connection fails repeatedly

---

## 🎯 Production Recommendations

1. **Add Database**: Replace in-memory storage with PostgreSQL
2. **User Authentication**: Add user accounts and alert management
3. **Rate Limiting**: Prevent abuse with request limits
4. **Monitoring**: Add health checks and alerting
5. **Scaling**: Consider multiple instances with shared storage

**Your SentryCoin is ready to monitor the crypto markets! 🛡️📈**
