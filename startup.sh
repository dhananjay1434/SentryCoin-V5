#!/bin/bash

# SentryCoin v4.0 Azure Startup Script
# Ensures v4.0 system starts correctly on Azure App Service

echo "🛡️ Starting SentryCoin v4.0 on Azure App Service..."
echo "📅 $(date)"
echo "🌍 NODE_ENV: ${NODE_ENV:-development}"
echo "🔧 PORT: ${PORT:-8080}"

# Verify Node.js version
echo "📦 Node.js version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Check if v4.0 entry point exists
if [ ! -f "src/index-v4.js" ]; then
    echo "❌ ERROR: src/index-v4.js not found!"
    echo "📁 Available files in src/:"
    ls -la src/
    exit 1
fi

# Verify required dependencies
echo "🔍 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ ERROR: node_modules not found!"
    echo "🔄 Running npm install..."
    npm install
fi

# Check for required environment variables
echo "🔐 Checking environment variables..."
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "⚠️ WARNING: TELEGRAM_BOT_TOKEN not set"
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "⚠️ WARNING: TELEGRAM_CHAT_ID not set"
fi

# Set production environment if not specified
export NODE_ENV=${NODE_ENV:-production}

# Start SentryCoin v4.0
echo "🚀 Starting SentryCoin v4.0..."
echo "📂 Working directory: $(pwd)"
echo "🎯 Command: node src/index-v4.js"

# Execute v4.0 system
exec node src/index-v4.js
