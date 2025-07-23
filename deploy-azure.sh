#!/bin/bash

# SentryCoin Azure Deployment Script
# This script deploys the Flash Crash Predictor to Azure App Service (F1 Free tier)

set -e  # Exit on any error

echo "🛡️ SentryCoin Azure Deployment Script"
echo "📊 Deploying Flash Crash Predictor to Azure App Service"
echo ""

# Configuration
RESOURCE_GROUP="SentryCoinResourceGroup"
APP_SERVICE_PLAN="SentryCoinServicePlan"
WEB_APP_NAME="sentrycoin-predictor-app"
LOCATION="Germany West Central"
SKU="F1"  # Free tier for Azure for Students
RUNTIME="NODE:18-lts"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "❌ You are not logged in to Azure CLI."
    echo "💡 Please run: az login"
    exit 1
fi

echo "✅ Azure CLI is ready"
echo ""

# Step 1: Create Resource Group
echo "📦 Creating Resource Group: $RESOURCE_GROUP"
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output table

echo ""

# Step 2: Create App Service Plan (F1 Free tier)
echo "🏗️ Creating App Service Plan: $APP_SERVICE_PLAN (SKU: $SKU)"
az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --sku "$SKU" \
    --is-linux \
    --output table

echo ""

# Step 3: Create Web App
echo "🌐 Creating Web App: $WEB_APP_NAME"
az webapp create \
    --name "$WEB_APP_NAME" \
    --plan "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --runtime "$RUNTIME" \
    --output table

echo ""

# Step 4: Configure App Settings (Environment Variables)
echo "⚙️ Configuring Environment Variables"
echo "⚠️  You will need to set the following secrets manually in Azure Portal:"
echo "   - TELEGRAM_BOT_TOKEN"
echo "   - TELEGRAM_CHAT_ID"
echo ""

az webapp config appsettings set \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        "NODE_ENV=production" \
        "SYMBOL=SOLUSDT" \
        "EXCHANGE=binance" \
        "DANGER_RATIO=2.5" \
        "ORDER_BOOK_DEPTH=50" \
        "COOLDOWN_MINUTES=10" \
        "LOG_LEVEL=info" \
        "SCM_DO_BUILD_DURING_DEPLOYMENT=true" \
    --output table

echo ""

# Step 5: Enable logging
echo "📝 Enabling Application Logging"
az webapp log config \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --application-logging filesystem \
    --level information \
    --output table

echo ""

# Step 6: Deploy from GitHub (if repository is available)
echo "🚀 Setting up deployment source"
echo "💡 You can set up GitHub deployment manually in Azure Portal or use:"
echo "   az webapp deployment source config --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --repo-url <YOUR_GITHUB_REPO> --branch main --manual-integration"

echo ""
echo "✅ Azure deployment completed!"
echo ""
echo "🌐 Your app URL: https://$WEB_APP_NAME.azurewebsites.net"
echo "📡 Health check: https://$WEB_APP_NAME.azurewebsites.net/health"
echo "📊 Status page: https://$WEB_APP_NAME.azurewebsites.net/status"
echo ""
echo "🔧 Next steps:"
echo "1. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Azure Portal"
echo "2. Set up UptimeRobot monitoring for 24/7 uptime"
echo "3. Test the deployment"
echo ""
echo "📖 Azure Portal: https://portal.azure.com"
