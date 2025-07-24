#!/bin/bash

# SentryCoin v4.0 - Azure Telegram Alerts Fix Deployment Script
# This script applies the Telegram alerts fix to your Azure Linux deployment

set -e

echo "🚀 SentryCoin v4.0 - Azure Telegram Alerts Fix"
echo "=============================================="
echo ""

# Configuration (update these if your Azure setup is different)
RESOURCE_GROUP="SentryCoinResourceGroup"
APP_NAME="sentrycoin-predictor-app"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    echo "   Ubuntu/Debian: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    echo "   CentOS/RHEL: sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc"
    exit 1
fi

# Check Azure login
echo "🔐 Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "🔑 Please login to Azure..."
    az login
fi

echo "📋 Applied Fixes:"
echo "✅ Modified trifecta-trader.js to always send alerts"
echo "✅ Enhanced alerter.js with better error handling"
echo "✅ Added v4.0 Trifecta alert formatting"
echo "✅ Added Telegram configuration validation"
echo "✅ Created test-telegram.js for testing"
echo "✅ Added troubleshooting guide"
echo ""

# Test Telegram configuration locally (if .env exists)
if [ -f ".env" ]; then
    echo "🧪 Testing Telegram configuration locally..."
    if command -v npm &> /dev/null; then
        npm run test:telegram
    else
        echo "⚠️ npm not found locally, skipping local test"
    fi
    echo ""
fi

# Check if the Azure app exists
echo "🔍 Checking Azure app status..."
if ! az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "❌ Azure app '$APP_NAME' not found in resource group '$RESOURCE_GROUP'"
    echo "   Please update the RESOURCE_GROUP and APP_NAME variables in this script"
    echo "   Or run the deployment script first: ./deploy-azure-v4.sh"
    exit 1
fi

echo "✅ Found Azure app: $APP_NAME"

# Update environment variables to ensure alerts are enabled
echo "⚙️ Updating Azure environment variables..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        TRIFECTA_TRADING_ENABLED="true" \
        SQUEEZE_TRADING_ENABLED="true" \
        ALERTS_ENABLED="true" \
        PAPER_TRADING="true" \
    --output table

echo "✅ Environment variables updated"

# Commit the changes
echo "📝 Committing fixes to git..."
git add .
git commit -m "Fix: Ensure Telegram alerts are sent for Trifecta signals

- Modified trifecta-trader.js to send alerts regardless of trading status
- Enhanced alerter.js with v4.0 Trifecta alert formatting
- Added comprehensive error handling and validation
- Created test-telegram.js for configuration testing
- Added TELEGRAM-TROUBLESHOOTING.md guide"

echo "✅ Changes committed to git"

# Deploy to Azure
echo ""
echo "🚀 Deploying fixes to Azure..."

# Check if azure remote exists
if git remote get-url azure &> /dev/null; then
    echo "📡 Pushing to existing Azure remote..."
    git push azure main
else
    echo "📡 Setting up Azure deployment..."
    
    # Configure deployment source
    az webapp deployment source config-local-git \
        --resource-group $RESOURCE_GROUP \
        --name $APP_NAME \
        --output table
    
    # Get deployment URL
    DEPLOY_URL=$(az webapp deployment list-publishing-credentials \
        --resource-group $RESOURCE_GROUP \
        --name $APP_NAME \
        --query scmUri \
        --output tsv)
    
    echo "📡 Adding Azure remote: $DEPLOY_URL"
    git remote add azure $DEPLOY_URL
    git push azure main
fi

echo ""
echo "🎉 Deployment completed!"
echo ""

# Show app URLs
echo "🌐 Your SentryCoin v4.0 URLs:"
echo "   App: https://$APP_NAME.azurewebsites.net"
echo "   Status: https://$APP_NAME.azurewebsites.net/status"
echo "   Performance: https://$APP_NAME.azurewebsites.net/performance"
echo ""

# Show log monitoring command
echo "📊 Monitor deployment and alerts:"
echo "   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""

echo "🔍 What to look for in logs:"
echo "✅ '✅ Telegram configuration loaded successfully'"
echo "✅ '🚨 TRIFECTA CONVICTION SIGNAL RECEIVED'"
echo "✅ '📤 Sending Telegram alert to chat...'"
echo "✅ '🚨 Flash crash alert sent successfully'"
echo ""

echo "⏱️ Timeline:"
echo "• Deployment: 2-3 minutes"
echo "• App restart: 30-60 seconds"
echo "• First alert: Within 5-10 minutes (when next signal occurs)"
echo ""

echo "🔧 If alerts still don't work:"
echo "1. Check Telegram bot token and chat ID in Azure portal"
echo "2. Verify bot is not blocked and conversation is started"
echo "3. Check logs for specific error messages"
echo "4. Read TELEGRAM-TROUBLESHOOTING.md for detailed help"
echo ""

echo "✅ Azure Telegram alerts fix deployment complete!"
echo "🎯 You should start receiving Trifecta alerts in Telegram soon!"
