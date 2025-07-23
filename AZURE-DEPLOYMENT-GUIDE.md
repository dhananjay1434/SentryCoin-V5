# 🛡️ SentryCoin Azure Deployment Guide

## 24/7 Cryptocurrency Flash Crash Monitoring on Azure for Students

This guide will help you deploy your SentryCoin Flash Crash Predictor to Azure App Service using your **Azure for Students** subscription, achieving true 24/7 uptime with the F1 Free tier.

## 🎯 Strategy Overview

Since Azure for Students restricts you to the F1 (Free) tier, we cannot use the built-in "Always On" feature. Instead, we'll use a clever workaround:

1. **Deploy to F1 Free tier** (fully covered by your credits)
2. **Use external monitoring** (UptimeRobot) to prevent sleep
3. **Achieve 24/7 uptime** without paying extra

## 📋 Prerequisites

### 1. Azure CLI Installation

✅ **Azure CLI has been installed via winget!**

**Important**: You may need to:
1. **Restart your terminal** or open a new PowerShell/Command Prompt window
2. **Or restart your computer** if the PATH isn't updated

To verify installation:
```bash
az --version
```

If `az` command is not found, try:
- Opening a **new PowerShell window as Administrator**
- Or manually add to PATH: `C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin`

### 2. Login to Azure
```bash
az login
```
This will open your browser for authentication.

### 3. Verify Your Subscription
```bash
az account show
```
Make sure you see your Azure for Students subscription (`MS-AZR-0170P`).

## 🚀 Deployment Steps

### Step 1: Run the Deployment Script

Choose your preferred method:

#### Option A: PowerShell (Recommended for Windows)
```powershell
.\deploy-azure.ps1
```

#### Option B: Bash
```bash
chmod +x deploy-azure.sh
./deploy-azure.sh
```

#### Option C: Manual Azure CLI Commands
```bash
# 1. Create Resource Group
az group create --name SentryCoinResourceGroup --location "Germany West Central"

# 2. Create App Service Plan (F1 Free tier)
az appservice plan create --name SentryCoinServicePlan --resource-group SentryCoinResourceGroup --sku F1 --is-linux

# 3. Create Web App
az webapp create --name sentrycoin-predictor-app --plan SentryCoinServicePlan --resource-group SentryCoinResourceGroup --runtime "NODE:18-lts"

# 4. Configure Environment Variables
az webapp config appsettings set --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup --settings \
"NODE_ENV=production" \
"SYMBOL=SOLUSDT" \
"EXCHANGE=binance" \
"DANGER_RATIO=2.5" \
"ORDER_BOOK_DEPTH=50" \
"COOLDOWN_MINUTES=10" \
"LOG_LEVEL=info"
```

### Step 2: Set Telegram Secrets in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Web App: `sentrycoin-predictor-app`
3. Go to **Settings** → **Environment variables**
4. Add these **Application settings**:
   - `TELEGRAM_BOT_TOKEN`: Your bot token from @BotFather
   - `TELEGRAM_CHAT_ID`: Your private channel chat ID

### Step 3: Deploy Your Code

#### Option A: GitHub Integration (Recommended)
1. Push your code to GitHub
2. In Azure Portal → **Deployment** → **Deployment Center**
3. Select **GitHub** and authorize
4. Choose your repository and branch (`main`)
5. Click **Save**

#### Option B: Local Git Deployment
```bash
# Get deployment credentials
az webapp deployment list-publishing-credentials --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup

# Add Azure remote
git remote add azure <GIT_URL_FROM_ABOVE>

# Deploy
git push azure main
```

## 🔄 Setting Up 24/7 Monitoring (UptimeRobot)

### Why This Works
The F1 Free tier sleeps after 20 minutes of inactivity. By pinging it every 5 minutes, we keep it awake 24/7.

### Setup Steps

1. **Sign up** at [UptimeRobot.com](https://uptimerobot.com) (free account)

2. **Create a Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `SentryCoin Predictor`
   - **URL**: `https://sentrycoin-predictor-app.azurewebsites.net/health`
   - **Monitoring Interval**: `5 minutes`

3. **Configure Alerts** (optional):
   - Email notifications when down
   - Slack/Discord webhooks

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://sentrycoin-predictor-app.azurewebsites.net/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "flash-crash-predictor",
  "uptime": 123.45,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Status Page
Visit: `https://sentrycoin-predictor-app.azurewebsites.net/status`

### 3. Check Logs
```bash
az webapp log tail --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup
```

## 📊 Monitoring & Maintenance

### View Application Logs
```bash
# Stream live logs
az webapp log tail --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup

# Download log files
az webapp log download --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup
```

### Update Environment Variables
```bash
az webapp config appsettings set --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup --settings "DANGER_RATIO=3.0"
```

### Restart the App
```bash
az webapp restart --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup
```

## 💰 Cost Analysis

### Azure for Students Benefits
- **$100 USD credits** (or local equivalent)
- **F1 Free tier**: $0/month
- **Bandwidth**: 1GB/month included
- **Storage**: 1GB included

### Estimated Monthly Usage
- **Compute**: $0 (F1 Free tier)
- **Bandwidth**: ~$0 (well within limits)
- **Total**: **$0/month**

## 🔧 Troubleshooting

### Common Issues

#### 1. App Name Already Taken
```bash
# Try a unique name
az webapp create --name sentrycoin-predictor-app-$(date +%s) --plan SentryCoinServicePlan --resource-group SentryCoinResourceGroup --runtime "NODE:18-lts"
```

#### 2. Deployment Fails
```bash
# Check deployment logs
az webapp log deployment list --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup
```

#### 3. App Not Starting
```bash
# Check application logs
az webapp log tail --name sentrycoin-predictor-app --resource-group SentryCoinResourceGroup
```

## 🎉 Success Indicators

Your deployment is successful when:

1. ✅ Health endpoint returns `200 OK`
2. ✅ UptimeRobot shows "Up" status
3. ✅ Telegram alerts are working
4. ✅ Application logs show WebSocket connections
5. ✅ No sleep cycles (thanks to UptimeRobot)

## 📞 Support

- **Azure Documentation**: [docs.microsoft.com/azure](https://docs.microsoft.com/azure)
- **Azure for Students**: [azure.microsoft.com/students](https://azure.microsoft.com/students)
- **UptimeRobot Help**: [uptimerobot.com/help](https://uptimerobot.com/help)

---

**🛡️ Your SentryCoin Flash Crash Predictor is now running 24/7 on Azure!**
