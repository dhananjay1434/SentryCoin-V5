#!/bin/bash

# Quick Fix Script: Update existing Azure deployment to run SentryCoin v4.0
# This script fixes the startup command to ensure v4.0 runs instead of v3.0

set -e

echo "🔧 SentryCoin v4.0 Azure Fix Script"
echo "==================================="
echo "🎯 Updating existing deployment to run v4.0"
echo ""

# Configuration
RESOURCE_GROUP="SentryCoinResourceGroup"
APP_NAME="sentrycoin-predictor-app"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed."
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure: az login"
    exit 1
fi

echo "🔍 Checking if app exists..."
if ! az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "❌ App $APP_NAME not found in resource group $RESOURCE_GROUP"
    echo "💡 Run deploy-azure-v4.sh to create a new deployment"
    exit 1
fi

echo "✅ Found existing app: $APP_NAME"

# CRITICAL FIX: Update startup command to force v4.0
echo "🎯 Setting startup command to force v4.0..."
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --startup-file "node src/index-v4.js" \
    --output table

# Update app settings to indicate v4.0
echo "⚙️ Updating app settings for v4.0..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        SENTRYCOIN_VERSION="4.0" \
        NODE_ENV="production" \
        WEBSITE_NODE_DEFAULT_VERSION="20.19.1" \
    --output table

# Add v4.0 specific environment variables if not set
echo "🔧 Adding v4.0 configuration variables..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        PRESSURE_THRESHOLD="3.0" \
        LIQUIDITY_THRESHOLD="100000" \
        STRONG_MOMENTUM_THRESHOLD="-0.3" \
        WEAK_MOMENTUM_THRESHOLD="-0.1" \
        TRIFECTA_TRADING_ENABLED="false" \
        SQUEEZE_TRADING_ENABLED="false" \
        PAPER_TRADING="true" \
    --output table

# Restart the app to apply changes
echo "🔄 Restarting app to apply v4.0 configuration..."
az webapp restart \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --output table

echo ""
echo "✅ Azure app updated to run SentryCoin v4.0!"
echo ""
echo "🌐 App URL: https://$APP_NAME.azurewebsites.net"
echo "📊 Health check: https://$APP_NAME.azurewebsites.net/health"
echo "📈 Status: https://$APP_NAME.azurewebsites.net/status"
echo ""
echo "🎯 Expected v4.0 logs:"
echo "  🛡️ SentryCoin v4.0 - Dual-Strategy Market Engine"
echo "  📊 Market Microstructure Classification System"
echo "  🎯 Trifecta Conviction + Absorption Squeeze Strategies"
echo ""
echo "📋 Check logs with:"
echo "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""

# Offer to show logs
read -p "🔍 Show live logs now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Showing live logs (Ctrl+C to exit)..."
    az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
fi

echo "🎉 Fix completed! Your app should now be running SentryCoin v4.0"
