# 🚀 SentryCoin v4.0 - Render Deployment Guide

Complete guide for deploying SentryCoin v4.0 to Render with 24/7 uptime monitoring.

## 📋 **Prerequisites**

- ✅ GitHub repository: `https://github.com/dhananjay1434/SentryCoin.git`
- ✅ Render account (free tier available)
- ✅ Telegram Bot Token and Chat ID
- ✅ Clean v4.0 codebase (completed)

## 🚀 **Step 1: Deploy to Render**

### **1.1 Create New Web Service**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `dhananjay1434/SentryCoin`
4. Configure the service:

```yaml
Name: sentrycoin-v4-production
Environment: Node
Region: Oregon (US West)
Branch: main
Build Command: npm install
Start Command: npm start
```

### **1.2 Environment Variables**

Add these environment variables in Render Dashboard:

#### **Required (Sensitive)**
```env
TELEGRAM_BOT_TOKEN=7394664393:AAFCuCfvwgu-6qFhYUlsdTFJYVZzQ38N-YQ
TELEGRAM_CHAT_ID=6049830025
TELEGRAM_API_ID=29395164
TELEGRAM_API_HASH=4fd72e3993e581776c5aabd3c88771cc
ALPHA_VANTAGE_API_KEY=GYFR9H9CE8EUFHP2
```

#### **Trading Configuration**
```env
NODE_ENV=production
SYMBOL=SPKUSDT
PAPER_TRADING=true
TRIFECTA_TRADING_ENABLED=true
SQUEEZE_TRADING_ENABLED=true
```

#### **Risk Management**
```env
TRIFECTA_MAX_POSITION=1000
TRIFECTA_STOP_LOSS=2.0
TRIFECTA_TAKE_PROFIT=5.0
SQUEEZE_MAX_POSITION=500
SQUEEZE_STOP_LOSS=1.5
SQUEEZE_TAKE_PROFIT=3.0
SQUEEZE_TIME_EXIT=300
```

#### **Classification Thresholds**
```env
PRESSURE_THRESHOLD=3.0
LIQUIDITY_THRESHOLD=100000
STRONG_MOMENTUM_THRESHOLD=-0.3
WEAK_MOMENTUM_THRESHOLD=-0.1
DANGER_RATIO=2.5
ORDER_BOOK_DEPTH=50
COOLDOWN_MINUTES=5
```

#### **System Settings**
```env
LOG_LEVEL=info
EXCHANGE=binance
CLOUD_STORAGE_ENABLED=false
```

### **1.3 Health Check Configuration**

```yaml
Health Check Path: /health
```

## 🔄 **Step 2: 24/7 Uptime Monitoring**

### **2.1 UptimeRobot Setup (Recommended)**

1. Go to [UptimeRobot](https://uptimerobot.com/) (free tier available)
2. Create new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://your-app-name.onrender.com/health`
   - **Interval**: 5 minutes
   - **Alert Contacts**: Your email/SMS

### **2.2 Alternative: Self-Hosted Monitor**

Run the included uptime monitor locally or on another server:

```bash
# Set your Render URL
export RENDER_URL=https://your-app-name.onrender.com

# Start uptime monitoring
npm run uptime
```

### **2.3 Cron Job Setup (Linux/Mac)**

```bash
# Add to crontab (runs every 10 minutes)
*/10 * * * * curl -s https://your-app-name.onrender.com/health > /dev/null
```

## 📊 **Step 3: Monitoring & Verification**

### **3.1 Service Health Endpoints**

- **Health Check**: `https://your-app.onrender.com/health`
- **System Status**: `https://your-app.onrender.com/status`
- **Performance**: `https://your-app.onrender.com/performance`

### **3.2 Expected Response**

```json
{
  "status": "ok",
  "service": "sentrycoin-v4",
  "version": "4.0.0",
  "timestamp": "2024-01-XX..."
}
```

### **3.3 Telegram Verification**

You should receive a startup message in your Telegram chat:
```
🛡️ SentryCoin v4.0 is fully operational!
📊 Symbol: SPKUSDT
🛡️ Paper Trading: ACTIVE
🎯 Dual-Strategy Trading: MONITORING
```

## ⚠️ **Step 4: Important Notes**

### **4.1 Free Tier Limitations**

- **Sleep Mode**: Render free tier sleeps after 15 minutes of inactivity
- **Solution**: Uptime monitoring pings every 14 minutes to keep it awake
- **Monthly Hours**: 750 hours/month on free tier (sufficient for 24/7)

### **4.2 Safety Features**

- **Paper Trading**: Enabled by default (`PAPER_TRADING=true`)
- **No Real Money**: System will not execute real trades until you change this
- **Conservative Limits**: Position sizes and risk management are conservative

### **4.3 Scaling to Paid Tier**

When ready for production:
1. Upgrade to Render paid tier ($7/month)
2. Change `PAPER_TRADING=false`
3. Monitor closely and adjust position sizes
4. Set up additional monitoring and alerts

## 🛠️ **Step 5: Troubleshooting**

### **5.1 Common Issues**

**Service Won't Start:**
- Check environment variables are set correctly
- Verify Telegram credentials
- Check logs in Render dashboard

**No Telegram Messages:**
- Verify bot token and chat ID
- Check bot permissions
- Test with `/start` command to your bot

**Service Sleeping:**
- Ensure uptime monitoring is active
- Check UptimeRobot or cron job status
- Verify health endpoint responds

### **5.2 Log Analysis**

Check Render logs for:
```
✅ SentryCoin v4.0 initialization complete!
🎉 SentryCoin v4.0 is fully operational!
🌐 SentryCoin v4.0 API server running on port XXXX
```

## 🎯 **Step 6: Next Steps**

1. **Monitor Performance**: Watch Telegram alerts and system metrics
2. **Analyze Signals**: Review classification accuracy and signal quality
3. **Optimize Thresholds**: Adjust based on market conditions
4. **Scale Gradually**: When ready, move to live trading with small positions

## 📞 **Support**

- **GitHub Issues**: Report problems or feature requests
- **Logs**: Check Render dashboard for detailed error logs
- **Health Endpoints**: Use API endpoints for real-time diagnostics

---

**🛡️ Your SentryCoin v4.0 system is now ready for 24/7 operation on Render!**
