# 🚀 SentryCoin v5.1 - Render.com Deployment Guide

## 📋 **DEPLOYMENT CHECKLIST**

### **🔧 Pre-Deployment Setup**

1. **Repository Preparation**
   - Ensure all code is committed to your Git repository
   - Verify `render.yaml` is in the root directory
   - Confirm `package.json` has correct start script

2. **Environment Variables Preparation**
   - Have your Telegram Bot Token ready
   - Have your Telegram Chat ID ready
   - Have your API keys ready (Etherscan, Alpha Vantage, etc.)

---

## **🌐 RENDER.COM DEPLOYMENT STEPS**

### **Step 1: Create New Web Service**

1. **Login to Render.com**
   - Go to https://render.com
   - Sign in with your GitHub account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the SentryCoin repository

3. **Configure Service Settings**
   ```
   Name: sentrycoin-v5-apex-predator
   Environment: Node
   Region: Oregon (US West)
   Branch: main (or your deployment branch)
   Build Command: npm install --production
   Start Command: npm start
   ```

### **Step 2: Configure Environment Variables**

**CRITICAL: Set these in Render Dashboard → Environment**

```bash
# === REQUIRED TELEGRAM SETTINGS ===
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
TELEGRAM_ADMIN_CHAT_ID=your_chat_id_here
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here

# === REQUIRED API KEYS ===
ETHERSCAN_API_KEY=your_etherscan_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# === OPTIONAL API KEYS (for enhanced features) ===
# COINGLASS_API_KEY=your_coinglass_key_here
# BYBIT_API_KEY=your_bybit_key_here
# VELO_DATA_API_KEY=your_velo_key_here
```

**Note:** All other environment variables are pre-configured in `render.yaml`

### **Step 3: Deploy Service**

1. **Initial Deployment**
   - Click "Create Web Service"
   - Wait for initial build and deployment (5-10 minutes)
   - Monitor build logs for any errors

2. **Verify Deployment**
   - Check service URL: `https://your-app-name.onrender.com/health`
   - Should return JSON with service status
   - Check logs for successful startup messages

---

## **🔍 MONITORING & MAINTENANCE**

### **Health Check Endpoints**

```bash
# Basic health check
GET https://your-app.onrender.com/health

# Detailed system status
GET https://your-app.onrender.com/status

# Performance metrics
GET https://your-app.onrender.com/performance
```

### **24/7 Uptime Monitoring**

**Option 1: External Uptime Monitor**
1. Deploy `uptime-pinger.js` on a separate service (Vercel, Netlify)
2. Set environment variable: `HEALTH_ENDPOINT=https://your-app.onrender.com/health`
3. Run continuously to prevent Render free tier sleep

**Option 2: UptimeRobot (Recommended)**
1. Sign up at https://uptimerobot.com (free)
2. Create HTTP(s) monitor
3. URL: `https://your-app.onrender.com/health`
4. Interval: 5 minutes
5. Set up email/SMS alerts

**Option 3: Local Uptime Pinger**
```bash
# Set your Render URL
export HEALTH_ENDPOINT=https://your-app.onrender.com/health
export PING_INTERVAL_MINUTES=10

# Run the pinger
node uptime-pinger.js
```

---

## **⚙️ CONFIGURATION MANAGEMENT**

### **Phase-Based Deployment**

**Phase 1: System Shakedown (Current)**
```bash
PAPER_TRADING=true
STRATEGY_ETH_UNWIND_ENABLED=false
STRATEGY_CASCADE_HUNTER_ENABLED=true
```

**Phase 2: Full Simulation**
```bash
PAPER_TRADING=true
STRATEGY_ETH_UNWIND_ENABLED=true
```

**Phase 3: Live Trading**
```bash
PAPER_TRADING=false
ETH_UNWIND_MAX_POSITION_SIZE=0.5  # Reduced for initial live deployment
```

### **Environment Variable Updates**

1. **Via Render Dashboard**
   - Go to your service → Environment
   - Add/modify variables
   - Click "Save Changes"
   - Service will auto-redeploy

2. **Via render.yaml** (for non-sensitive values)
   - Update render.yaml in your repository
   - Commit and push changes
   - Render will auto-deploy

---

## **🚨 TROUBLESHOOTING**

### **Common Issues**

**Build Failures**
```bash
# Check Node.js version compatibility
"engines": {
  "node": ">=18.0.0"
}

# Verify all dependencies are in package.json
npm install --production
```

**Environment Variable Issues**
- Ensure no trailing spaces in values
- Use quotes for values with special characters
- Verify all required variables are set

**Memory Issues**
- Upgrade from Free to Starter plan ($7/month)
- Monitor memory usage in Render dashboard
- Optimize code for lower memory footprint

**Connection Issues**
- Check Binance API connectivity
- Verify Telegram bot token is valid
- Test API keys individually

### **Log Analysis**

**Successful Startup Logs:**
```
🛡️ SentryCoin v5.0 - "Apex Predator" Market Intelligence Engine
✅ Cloud storage initialized
✅ Market regime classifier initialized
✅ v5.0 Strategy Manager initialized
✅ v5.0 Strategy modules initialized and registered
🎉 SentryCoin v5.0 "Apex Predator" is fully operational!
```

**Error Patterns to Watch:**
- `Missing required environment variables`
- `WebSocket connection failed`
- `Strategy Manager initialization failed`
- `Memory allocation errors`

---

## **📊 PERFORMANCE OPTIMIZATION**

### **Resource Management**

**Memory Optimization:**
- Use Starter plan for production ($7/month)
- Monitor memory usage patterns
- Implement garbage collection optimization

**Network Optimization:**
- Use Oregon region for US markets
- Implement connection pooling
- Add request retry logic

### **Scaling Considerations**

**Horizontal Scaling:**
- Multiple instances for redundancy
- Load balancing for high availability
- Database separation for data persistence

**Vertical Scaling:**
- Upgrade to higher-tier plans for more resources
- Monitor CPU and memory usage
- Optimize for single-instance performance

---

## **🔐 SECURITY BEST PRACTICES**

1. **Never commit sensitive data to Git**
2. **Use Render's environment variables for secrets**
3. **Regularly rotate API keys**
4. **Monitor access logs for suspicious activity**
5. **Enable HTTPS-only communication**
6. **Implement rate limiting for API endpoints**

---

## **✅ DEPLOYMENT VERIFICATION**

After deployment, verify:

- [ ] Service is running and accessible
- [ ] Health endpoint returns 200 OK
- [ ] Telegram bot responds to commands
- [ ] Strategy Manager is operational
- [ ] Data feeds are connected
- [ ] Logs show no critical errors
- [ ] Uptime monitoring is active

---

**🎯 Your SentryCoin v5.1 "Apex Predator" is now ready for 24/7 operation!**
