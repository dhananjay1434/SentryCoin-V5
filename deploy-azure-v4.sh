#!/bin/bash

# SentryCoin v4.0 Azure Deployment Script
# Deploys the dual-strategy market classification engine to Azure App Service

set -e

echo "🛡️ SentryCoin v4.0 Azure Deployment Script"
echo "==========================================="
echo "📊 Deploying Dual-Strategy Market Classification Engine"
echo ""

# Configuration
RESOURCE_GROUP="SentryCoinResourceGroup"
APP_NAME="sentrycoin-predictor-app"
LOCATION="East US"
SKU="F1"  # Free tier

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    echo "   Run: winget install Microsoft.AzureCLI"
    exit 1
fi

# Login check
echo "🔐 Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "🔑 Please login to Azure..."
    az login
fi

# Verify v4.0 files exist
echo "🔍 Verifying SentryCoin v4.0 files..."
if [ ! -f "src/index-v4.js" ]; then
    echo "❌ ERROR: src/index-v4.js not found!"
    echo "   Make sure you're in the SentryCoin project directory"
    exit 1
fi

if [ ! -f "src/sentrycoin-v4.js" ]; then
    echo "❌ ERROR: src/sentrycoin-v4.js not found!"
    echo "   v4.0 system files are missing"
    exit 1
fi

echo "✅ SentryCoin v4.0 files verified"

# Create or update resource group
echo "📦 Creating/updating resource group: $RESOURCE_GROUP"
az group create --name $RESOURCE_GROUP --location "$LOCATION" --output table

# Create App Service plan
echo "🏗️ Creating App Service plan..."
az appservice plan create \
    --name "${APP_NAME}-plan" \
    --resource-group $RESOURCE_GROUP \
    --sku $SKU \
    --is-linux \
    --output table

# Create web app
echo "🌐 Creating web app: $APP_NAME"
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan "${APP_NAME}-plan" \
    --name $APP_NAME \
    --runtime "NODE:20-lts" \
    --output table

# Configure app settings for v4.0
echo "⚙️ Configuring app settings for SentryCoin v4.0..."

# Set Node.js version and startup command specifically for v4.0
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        WEBSITE_NODE_DEFAULT_VERSION="20.19.1" \
        SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
        ENABLE_ORYX_BUILD="true" \
        SENTRYCOIN_VERSION="4.0" \
        NODE_ENV="production" \
    --output table

# CRITICAL: Set startup command to ensure v4.0 runs
echo "🎯 Setting startup command to force v4.0..."
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --startup-file "node src/index-v4.js" \
    --output table

echo ""
echo "🔐 Environment Variables Setup for v4.0"
echo "======================================="
echo "SentryCoin v4.0 requires these environment variables:"
echo ""
echo "Required:"
echo "  TELEGRAM_BOT_TOKEN=your_bot_token"
echo "  TELEGRAM_CHAT_ID=your_chat_id"
echo ""

read -p "📱 Enter your Telegram Bot Token: " BOT_TOKEN
read -p "💬 Enter your Telegram Chat ID: " CHAT_ID

if [[ -n "$BOT_TOKEN" && -n "$CHAT_ID" ]]; then
    echo "🔧 Setting v4.0 environment variables..."
    az webapp config appsettings set \
        --resource-group $RESOURCE_GROUP \
        --name $APP_NAME \
        --settings \
            TELEGRAM_BOT_TOKEN="$BOT_TOKEN" \
            TELEGRAM_CHAT_ID="$CHAT_ID" \
            SYMBOL="SPKUSDT" \
            PRESSURE_THRESHOLD="3.0" \
            LIQUIDITY_THRESHOLD="100000" \
            STRONG_MOMENTUM_THRESHOLD="-0.3" \
            WEAK_MOMENTUM_THRESHOLD="-0.1" \
            TRIFECTA_TRADING_ENABLED="false" \
            SQUEEZE_TRADING_ENABLED="false" \
            PAPER_TRADING="true" \
        --output table
    echo "✅ SentryCoin v4.0 environment variables configured!"
else
    echo "❌ Bot token and chat ID are required for v4.0"
    exit 1
fi

# Deploy the application
echo ""
echo "🚀 Deploying SentryCoin v4.0..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git add .
    git commit -m "SentryCoin v4.0 deployment - Dual-Strategy Market Engine"
fi

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

echo ""
echo "📡 Deployment URL: $DEPLOY_URL"
echo "🔄 Pushing SentryCoin v4.0 to Azure..."

# Add Azure as remote and push
git remote remove azure 2>/dev/null || true
git remote add azure $DEPLOY_URL
git push azure main

echo ""
echo "🎉 SentryCoin v4.0 Deployment Completed!"
echo "========================================"
echo ""
echo "🌐 Your v4.0 app: https://$APP_NAME.azurewebsites.net"
echo "📊 Health check: https://$APP_NAME.azurewebsites.net/health"
echo "📈 System status: https://$APP_NAME.azurewebsites.net/status"
echo "🎯 Performance: https://$APP_NAME.azurewebsites.net/performance"
echo "🧠 Classifications: https://$APP_NAME.azurewebsites.net/classifications"
echo ""
echo "🎯 Expected v4.0 Log Output:"
echo "  🛡️ SentryCoin v4.0 - Dual-Strategy Market Engine"
echo "  📊 Market Microstructure Classification System"
echo "  🎯 Trifecta Conviction + Absorption Squeeze Strategies"
echo "  🌐 SentryCoin v4.0 API server running on port 8080"
echo ""
echo "📋 Management Commands:"
echo "  View logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "  Restart: az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""

echo "✅ SentryCoin v4.0 Azure deployment completed!"
echo "🧠 The Dual-Strategy Market Classification Engine is now running!"
