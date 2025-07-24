#!/bin/bash

# SentryCoin v4.1.1 Production Startup Script
# Ensures reliable startup with proper error handling

echo "🛡️ Starting SentryCoin v4.1.1 Market Intelligence Engine..."
echo "📊 Environment: $NODE_ENV"
echo "💰 Symbol: $SYMBOL"
echo "🛡️ Paper Trading: $PAPER_TRADING"

# Check Node.js version
echo "🔍 Node.js version: $(node --version)"

# Verify critical environment variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ ERROR: TELEGRAM_BOT_TOKEN not set"
    exit 1
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "❌ ERROR: TELEGRAM_CHAT_ID not set"
    exit 1
fi

echo "✅ Environment variables validated"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run syntax check
echo "🔍 Running syntax validation..."
node --check src/index.js
if [ $? -ne 0 ]; then
    echo "❌ Syntax validation failed"
    exit 1
fi

echo "✅ Syntax validation passed"

# Start the application with proper error handling
echo "🚀 Starting SentryCoin v4.0..."
exec node src/index.js
