#!/bin/bash

# Update Azure Environment Variables for SentryCoin v4.0
# This script sets all necessary environment variables in Azure App Service

RESOURCE_GROUP="SentryCoinResourceGroup"
APP_NAME="sentrycoin-v4-app"

echo "🔧 Updating Azure Environment Variables for SentryCoin v4.0..."
echo "📱 App: $APP_NAME"
echo "📦 Resource Group: $RESOURCE_GROUP"
echo ""

# Check if Azure CLI is available
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install Azure CLI first."
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo "🔑 Please login to Azure..."
    az login
fi

echo "⚙️ Setting environment variables..."

# Set all environment variables
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        TELEGRAM_BOT_TOKEN="7394664393:AAFCuCfvwgu-6qFhYUlsdTFJYVZzQ38N-YQ" \
        TELEGRAM_CHAT_ID="6049830025" \
        SYMBOL="SPKUSDT" \
        DANGER_RATIO="2.5" \
        ORDER_BOOK_DEPTH="50" \
        COOLDOWN_MINUTES="5" \
        LOG_LEVEL="info" \
        NODE_ENV="production" \
        EXCHANGE="binance" \
        PAPER_TRADING="true" \
        TRIFECTA_TRADING_ENABLED="true" \
        SQUEEZE_TRADING_ENABLED="true" \
        ALERTS_ENABLED="true" \
        PRESSURE_THRESHOLD="3.0" \
        LIQUIDITY_THRESHOLD="100000" \
        STRONG_MOMENTUM_THRESHOLD="-0.3" \
        WEAK_MOMENTUM_THRESHOLD="-0.1" \
        SHADOW_ORDER_SIZE="1000" \
        SYSTEM_LATENCY="15" \
        NETWORK_LATENCY="35" \
        MARKET_IMPACT_COEFF="0.0001" \
        IMPACT_EXPONENT="0.6" \
        TRADING_FEE_RATE="0.0004" \
        FUNDING_RATE="0.0001" \
        FEATURE_HISTORY_LENGTH="3600" \
        MOMENTUM_WINDOW="60" \
        DEPTH_LEVELS="10" \
        FEATURE_PERSISTENCE="true" \
        PERSISTENCE_INTERVAL="300" \
        WAVELET_WINDOW="300" \
        WAVELET_ENERGY_THRESHOLD="3.5" \
        CONFIRMATION_WINDOW="60" \
    --output table

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Environment variables updated successfully!"
    echo ""
    echo "🚀 Restarting Azure App Service..."
    az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME
    
    if [ $? -eq 0 ]; then
        echo "✅ App Service restarted successfully!"
        echo ""
        echo "📊 Monitor deployment:"
        echo "   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
        echo ""
        echo "🌐 Check status:"
        echo "   https://$APP_NAME.azurewebsites.net/status"
        echo ""
        echo "⏱️ Expected timeline:"
        echo "   • App restart: 30-60 seconds"
        echo "   • v4.0 startup: 1-2 minutes"
        echo "   • First Telegram test: Immediate"
        echo "   • First Trifecta alert: 2-4 hours"
        echo ""
        echo "🎯 Success indicators:"
        echo "   ✅ 'SentryCoin v4.0 - Dual-Strategy Engine' in logs"
        echo "   ✅ 'Telegram configuration loaded successfully'"
        echo "   ✅ 'Shadow Trading Engine initialized'"
        echo "   ✅ 'Quantitative API: ACTIVE'"
    else
        echo "❌ Failed to restart App Service"
        exit 1
    fi
else
    echo "❌ Failed to update environment variables"
    exit 1
fi

echo ""
echo "🎉 SentryCoin v4.0 deployment complete!"
echo "📱 Telegram alerts are now configured and ready!"
