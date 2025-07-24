#!/bin/bash

# Fresh SentryCoin v4.0 Deployment Script
# Creates a completely new App Service to ensure v4.0 runs

set -e

echo "🚀 Creating Fresh SentryCoin v4.0 Deployment"
echo "============================================"

# Configuration
RESOURCE_GROUP="SentryCoinResourceGroup"
OLD_APP_NAME="sentrycoin-predictor-app"
NEW_APP_NAME="sentrycoin-v4-app"
LOCATION="East US"
SKU="F1"

echo "🔍 Checking Azure login..."
if ! az account show &> /dev/null; then
    echo "❌ Please login: az login"
    exit 1
fi

echo "✅ Azure CLI ready"

# Delete old app if needed
echo "🗑️ Cleaning up old app (if exists)..."
az webapp delete --name $OLD_APP_NAME --resource-group $RESOURCE_GROUP --yes || true

# Create new App Service plan
echo "🏗️ Creating new App Service plan..."
az appservice plan create \
    --name "${NEW_APP_NAME}-plan" \
    --resource-group $RESOURCE_GROUP \
    --sku $SKU \
    --is-linux \
    --output table

# Create new web app
echo "🌐 Creating new web app: $NEW_APP_NAME"
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan "${NEW_APP_NAME}-plan" \
    --name $NEW_APP_NAME \
    --runtime "NODE:20-lts" \
    --output table

# Configure for v4.0
echo "⚙️ Configuring for SentryCoin v4.0..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $NEW_APP_NAME \
    --settings \
        WEBSITE_NODE_DEFAULT_VERSION="20.19.1" \
        SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
        ENABLE_ORYX_BUILD="true" \
        SENTRYCOIN_VERSION="4.0" \
        NODE_ENV="production" \
    --output table

# Set startup command for v4.0
echo "🎯 Setting v4.0 startup command..."
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $NEW_APP_NAME \
    --startup-file "npm start" \
    --output table

# Configure GitHub deployment
echo "📡 Setting up GitHub deployment..."
az webapp deployment source config \
    --name $NEW_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --repo-url https://github.com/dhananjay1434/SentryCoin.git \
    --branch main \
    --manual-integration \
    --output table

echo ""
echo "🎉 Fresh SentryCoin v4.0 deployment created!"
echo "============================================="
echo ""
echo "🌐 New app URL: https://$NEW_APP_NAME.azurewebsites.net"
echo "📊 Health check: https://$NEW_APP_NAME.azurewebsites.net/health"
echo "📈 Status: https://$NEW_APP_NAME.azurewebsites.net/status"
echo ""
echo "⏳ Wait 2-3 minutes for deployment to complete, then test:"
echo "   curl https://$NEW_APP_NAME.azurewebsites.net/health"
echo ""
echo "🎯 Expected v4.0 response:"
echo '   {"status":"ok","service":"sentrycoin-v4","version":"4.0",...}'
echo ""

# Offer to set environment variables
read -p "🔐 Set Telegram environment variables now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "📱 Telegram Bot Token: " BOT_TOKEN
    read -p "💬 Telegram Chat ID: " CHAT_ID
    
    if [[ -n "$BOT_TOKEN" && -n "$CHAT_ID" ]]; then
        echo "🔧 Setting environment variables..."
        az webapp config appsettings set \
            --resource-group $RESOURCE_GROUP \
            --name $NEW_APP_NAME \
            --settings \
                TELEGRAM_BOT_TOKEN="$BOT_TOKEN" \
                TELEGRAM_CHAT_ID="$CHAT_ID" \
                SYMBOL="SPKUSDT" \
                PRESSURE_THRESHOLD="3.0" \
                LIQUIDITY_THRESHOLD="100000" \
                STRONG_MOMENTUM_THRESHOLD="-0.3" \
                WEAK_MOMENTUM_THRESHOLD="-0.1" \
            --output table
        echo "✅ Environment variables set!"
    fi
fi

echo ""
echo "✅ Fresh v4.0 deployment complete!"
echo "🧠 SentryCoin v4.0 Dual-Strategy Engine should be running!"
