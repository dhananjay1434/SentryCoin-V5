# SentryCoin Azure Deployment Script (PowerShell)
# This script deploys the Flash Crash Predictor to Azure App Service (F1 Free tier)

param(
    [string]$ResourceGroup = "SentryCoinResourceGroup",
    [string]$AppServicePlan = "SentryCoinServicePlan", 
    [string]$WebAppName = "sentrycoin-predictor-app",
    [string]$Location = "Germany West Central",
    [string]$Sku = "F1",
    [string]$Runtime = "NODE:18-lts"
)

Write-Host "🛡️ SentryCoin Azure Deployment Script" -ForegroundColor Cyan
Write-Host "📊 Deploying Flash Crash Predictor to Azure App Service" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
try {
    az --version | Out-Null
    Write-Host "✅ Azure CLI is ready" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    az account show | Out-Null
} catch {
    Write-Host "❌ You are not logged in to Azure CLI." -ForegroundColor Red
    Write-Host "💡 Please run: az login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 1: Create Resource Group
Write-Host "📦 Creating Resource Group: $ResourceGroup" -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location --output table

Write-Host ""

# Step 2: Create App Service Plan (F1 Free tier)
Write-Host "🏗️ Creating App Service Plan: $AppServicePlan (SKU: $Sku)" -ForegroundColor Yellow
az appservice plan create --name $AppServicePlan --resource-group $ResourceGroup --sku $Sku --is-linux --output table

Write-Host ""

# Step 3: Create Web App
Write-Host "🌐 Creating Web App: $WebAppName" -ForegroundColor Yellow
az webapp create --name $WebAppName --plan $AppServicePlan --resource-group $ResourceGroup --runtime $Runtime --output table

Write-Host ""

# Step 4: Configure App Settings (Environment Variables)
Write-Host "⚙️ Configuring Environment Variables" -ForegroundColor Yellow
Write-Host "⚠️  You will need to set the following secrets manually in Azure Portal:" -ForegroundColor Red
Write-Host "   - TELEGRAM_BOT_TOKEN" -ForegroundColor Red
Write-Host "   - TELEGRAM_CHAT_ID" -ForegroundColor Red
Write-Host ""

az webapp config appsettings set --name $WebAppName --resource-group $ResourceGroup --settings "NODE_ENV=production" "SYMBOL=SOLUSDT" "EXCHANGE=binance" "DANGER_RATIO=2.5" "ORDER_BOOK_DEPTH=50" "COOLDOWN_MINUTES=10" "LOG_LEVEL=info" "SCM_DO_BUILD_DURING_DEPLOYMENT=true" --output table

Write-Host ""

# Step 5: Enable logging
Write-Host "📝 Enabling Application Logging" -ForegroundColor Yellow
az webapp log config --name $WebAppName --resource-group $ResourceGroup --application-logging filesystem --level information --output table

Write-Host ""

# Step 6: Deployment information
Write-Host "🚀 Setting up deployment source" -ForegroundColor Yellow
Write-Host "💡 You can set up GitHub deployment manually in Azure Portal or use:" -ForegroundColor Cyan
Write-Host "   az webapp deployment source config --name $WebAppName --resource-group $ResourceGroup --repo-url <YOUR_GITHUB_REPO> --branch main --manual-integration" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Azure deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your app URL: https://$WebAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "📡 Health check: https://$WebAppName.azurewebsites.net/health" -ForegroundColor Cyan
Write-Host "📊 Status page: https://$WebAppName.azurewebsites.net/status" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Yellow
Write-Host "1. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Azure Portal" -ForegroundColor White
Write-Host "2. Set up UptimeRobot monitoring for 24/7 uptime" -ForegroundColor White
Write-Host "3. Test the deployment" -ForegroundColor White
Write-Host ""
Write-Host "📖 Azure Portal: https://portal.azure.com" -ForegroundColor Cyan
