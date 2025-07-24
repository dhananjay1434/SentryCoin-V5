# 🛡️ SentryCoin v4.0 Azure Deployment Fixes

## Issues Identified and Fixed

### 1. **web.config pointing to wrong entry point** ❌➡️✅
- **Problem**: `web.config` was pointing to `src/index.js` (v3.0) instead of `src/index-v4.js`
- **Fix**: Updated all references in `web.config` to point to `src/index-v4.js`

### 2. **Package.json configuration** ✅
- **Status**: Already correctly configured
- **Verified**: `"start": "node src/index-v4.js"` is correct
- **Added**: `"start:azure": "node src/index-v4.js"` for explicit Azure deployment

### 3. **Azure startup command not set** ❌➡️✅
- **Problem**: Azure was using default npm start but web.config was overriding
- **Fix**: Created scripts to explicitly set startup command: `node src/index-v4.js`

## Files Created/Modified

### Modified Files:
1. **web.config** - Updated to point to v4.0 entry point
2. **package.json** - Added Azure-specific start script

### New Files Created:
1. **deploy-azure-v4.sh** - Complete v4.0 deployment script
2. **fix-azure-v4.sh** - Quick fix for existing deployments
3. **startup.sh** - Azure startup verification script
4. **.deployment** - Azure deployment configuration
5. **deploy.cmd** - Windows deployment script

## Quick Fix for Existing Deployment

If you already have the app deployed but it's running v3.0, run:

```bash
chmod +x fix-azure-v4.sh
./fix-azure-v4.sh
```

This will:
- Set startup command to `node src/index-v4.js`
- Add v4.0 environment variables
- Restart the app
- Show you the logs to verify v4.0 is running

## Expected v4.0 Log Output

When v4.0 is running correctly, you should see:

```
🛡️ SentryCoin v4.0 - Dual-Strategy Market Engine
📊 Market Microstructure Classification System
🎯 Trifecta Conviction + Absorption Squeeze Strategies

🌐 SentryCoin v4.0 API server running on port 8080
🧠 Market Classifier v4.0 initialized for SPKUSDT
🎯 Trifecta Conviction Trader initialized for SPKUSDT
🔄 Absorption Squeeze Trader initialized for SPKUSDT
```

## v4.0 API Endpoints

Once v4.0 is running, you'll have access to:

- **Health**: `https://your-app.azurewebsites.net/health`
- **Status**: `https://your-app.azurewebsites.net/status`
- **Performance**: `https://your-app.azurewebsites.net/performance`
- **Classifications**: `https://your-app.azurewebsites.net/classifications`
- **Reports**: `https://your-app.azurewebsites.net/reports`

## Environment Variables for v4.0

Required:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

v4.0 Specific (with defaults):
- `PRESSURE_THRESHOLD=3.0`
- `LIQUIDITY_THRESHOLD=100000`
- `STRONG_MOMENTUM_THRESHOLD=-0.3`
- `WEAK_MOMENTUM_THRESHOLD=-0.1`
- `TRIFECTA_TRADING_ENABLED=false`
- `SQUEEZE_TRADING_ENABLED=false`
- `PAPER_TRADING=true`

## Verification Commands

```bash
# Check if v4.0 is running
curl https://your-app.azurewebsites.net/health

# View live logs
az webapp log tail --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup

# Restart app
az webapp restart --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup
```

## Next Steps

1. **Run the fix script**: `./fix-azure-v4.sh`
2. **Check the logs** to verify v4.0 startup messages
3. **Test the API endpoints** to confirm v4.0 functionality
4. **Monitor the classifications** to see the dual-strategy system in action

The key difference: v3.0 shows "TRIFECTA RESEARCH SIGNAL" while v4.0 shows "MARKET CLASSIFICATION" with dual strategies.
