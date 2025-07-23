# 🛡️ SentryCoin Azure Deployment Checklist

## ✅ Pre-Deployment Checklist

### Step 1: Verify Azure CLI Installation
- [ ] Open a **new PowerShell window** (as Administrator)
- [ ] Run: `az --version`
- [ ] If command not found, restart your computer and try again
- [ ] Expected output: Azure CLI version 2.75.0 or higher

### Step 2: Login to Azure
- [ ] Run: `az login`
- [ ] Browser opens for authentication
- [ ] Login with your Azure for Students account
- [ ] Verify success message in terminal

### Step 3: Verify Subscription
- [ ] Run: `az account show`
- [ ] Confirm subscription type: `MS-AZR-0170P` (Azure for Students)
- [ ] Note your subscription ID

## 🚀 Deployment Steps

### Step 4: Create Azure Resources
Copy and paste these commands **one by one** in PowerShell:

```powershell
# 1. Create Resource Group
az group create --name SentryCoinResourceGroup --location "Germany West Central"
```
**Expected**: Resource group created successfully

```powershell
# 2. Create App Service Plan (F1 Free tier)
az appservice plan create --name SentryCoinServicePlan --resource-group SentryCoinResourceGroup --sku F1 --is-linux
```
**Expected**: App service plan created with SKU F1

```powershell
# 3. Create Web App (use unique name if taken)
az webapp create --name sentrycoin-predictor-app --plan SentryCoinServicePlan --resource-group SentryCoinResourceGroup --runtime "NODE:18-lts"
```
**Expected**: Web app created with URL: `https://sentrycoin-predictor-app.azurewebsites.net`

**If name is taken**, try:
```powershell
az webapp create --name sentrycoin-predictor-app-2024 --plan SentryCoinServicePlan --resource-group SentryCoinResourceGroup --runtime "NODE:18-lts"
```

### Step 5: Configure Environment Variables
```powershell
# 4. Set basic environment variables
az webapp config appsettings set --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup --settings "NODE_ENV=production" "SYMBOL=SOLUSDT" "EXCHANGE=binance" "DANGER_RATIO=2.5" "ORDER_BOOK_DEPTH=50" "COOLDOWN_MINUTES=10" "LOG_LEVEL=info" "SCM_DO_BUILD_DURING_DEPLOYMENT=true"
```
**Expected**: Settings configured successfully

### Step 6: Set Telegram Secrets (Azure Portal)
- [ ] Go to [Azure Portal](https://portal.azure.com)
- [ ] Search for "sentrycoin-predictor-app"
- [ ] Click on your Web App
- [ ] Go to **Settings** → **Environment variables**
- [ ] Click **+ Add** and add:
  - **Name**: `TELEGRAM_BOT_TOKEN`, **Value**: `[Your Bot Token]`
  - **Name**: `TELEGRAM_CHAT_ID`, **Value**: `[Your Chat ID]`
- [ ] Click **Apply** and **Confirm**

### Step 7: Deploy Code
Choose one method:

#### Option A: GitHub Deployment (Recommended)
- [ ] Push your code to GitHub
- [ ] In Azure Portal → **Deployment** → **Deployment Center**
- [ ] Select **GitHub** and authorize
- [ ] Choose repository: `your-username/PumpAlarm`
- [ ] Branch: `main`
- [ ] Click **Save**
- [ ] Wait for deployment to complete

#### Option B: Local Git Deployment
```powershell
# Get deployment URL
az webapp deployment source config-local-git --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup

# Add Azure remote (replace URL with output from above)
git remote add azure https://sentrycoin-predictor-app.scm.azurewebsites.net:443/sentrycoin-predictor-app.git

# Deploy
git push azure main
```

## 🔄 Post-Deployment Setup

### Step 8: Test Deployment
- [ ] Visit: `https://sentrycoin-predictor-app.azurewebsites.net/health`
- [ ] Expected response: `{"status":"ok","service":"flash-crash-predictor",...}`
- [ ] Visit: `https://sentrycoin-predictor-app.azurewebsites.net/status`
- [ ] Check logs: `az webapp log tail --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup`

### Step 9: Set Up UptimeRobot (24/7 Monitoring)
- [ ] Go to [UptimeRobot.com](https://uptimerobot.com)
- [ ] Sign up for free account
- [ ] Click **+ Add New Monitor**
- [ ] Configure:
  - **Monitor Type**: `HTTP(s)`
  - **Friendly Name**: `SentryCoin Predictor`
  - **URL**: `https://sentrycoin-predictor-app.azurewebsites.net/health`
  - **Monitoring Interval**: `5 minutes`
- [ ] Click **Create Monitor**
- [ ] Verify monitor shows "Up" status

### Step 10: Final Verification
- [ ] UptimeRobot monitor is active
- [ ] Azure app is responding to health checks
- [ ] Telegram bot is configured and working
- [ ] Application logs show WebSocket connections to Binance
- [ ] No error messages in logs

## 🎯 Success Criteria

Your deployment is successful when ALL of these are true:

✅ **Health Check**: `https://your-app.azurewebsites.net/health` returns 200 OK  
✅ **UptimeRobot**: Shows "Up" status and 5-minute intervals  
✅ **Telegram**: Bot token and chat ID are configured  
✅ **Logs**: Show successful WebSocket connections  
✅ **24/7 Operation**: App doesn't sleep (thanks to UptimeRobot)  

## 🆘 Troubleshooting

### Common Issues:

**1. Azure CLI not found**
- Restart PowerShell as Administrator
- Or restart your computer
- Check PATH includes: `C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin`

**2. App name already taken**
- Use: `sentrycoin-predictor-app-2024` or add random numbers

**3. Deployment fails**
- Check: `az webapp log deployment list --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup`

**4. App not starting**
- Check: `az webapp log tail --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup`
- Verify environment variables are set

**5. Telegram not working**
- Double-check bot token and chat ID in Azure Portal
- Test bot token with: `https://api.telegram.org/bot[TOKEN]/getMe`

## 📞 Need Help?

If you encounter issues:
1. Check the logs first: `az webapp log tail --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup`
2. Verify all environment variables are set in Azure Portal
3. Ensure UptimeRobot is pinging the correct URL
4. Check Azure Portal for any service health issues

---

**🛡️ Once complete, your SentryCoin Flash Crash Predictor will be running 24/7 on Azure!**
