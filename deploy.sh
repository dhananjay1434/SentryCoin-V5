#!/bin/bash

# ===================================================================
# SentryCoin v6.0 - Operation Chimera Deployment Script
# CLASSIFICATION: TOP SECRET - OPERATIONAL GREEN LIGHT
# 
# This script executes the complete Phoenix Engine deployment
# as authorized by the Head of Quantitative Strategy.
# ===================================================================

echo "🔥 OPERATION CHIMERA - DEPLOYMENT PROTOCOL INITIATED"
echo "🛡️ SentryCoin v6.0 Phoenix Engine - Live Deployment"
echo "⚡ CLASSIFICATION: TOP SECRET - OPERATIONAL GREEN LIGHT"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node -v)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
fi

# Load environment configuration
if [ -f ".env.production" ]; then
    echo "🔧 Loading production environment configuration..."
    export $(cat .env.production | grep -v '^#' | xargs)
    echo "✅ Production environment loaded"
else
    echo "❌ .env.production file not found"
    exit 1
fi

# Validate critical environment variables
echo "🔍 Validating environment configuration..."

REQUIRED_VARS=("TELEGRAM_BOT_TOKEN" "TELEGRAM_CHAT_ID" "ETHERSCAN_API_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "🛑 Please configure the missing variables in .env.production"
    exit 1
fi

echo "✅ Environment validation complete"

# Display deployment configuration
echo ""
echo "🎯 DEPLOYMENT CONFIGURATION:"
echo "   Symbol: ${SYMBOL:-ETHUSDT}"
echo "   Paper Trading: ${PAPER_TRADING:-true}"
echo "   Log Level: ${LOG_LEVEL:-info}"
echo "   Dashboard Port: ${DASHBOARD_PORT:-3000}"
echo ""

# Check for Phoenix v6.0 components
echo "🔍 Verifying Phoenix Engine v6.0 components..."

PHOENIX_COMPONENTS=(
    "src/core/sentrycoin-engine-v6.js"
    "src/core/liquidity-analyzer.js"
    "src/services/mempool-streamer.js"
    "src/services/realtime-derivatives-monitor.js"
    "src/utils/stateful-logger.js"
    "src/utils/task-scheduler.js"
    "src/utils/task-worker.js"
    "scripts/deploy-phoenix.js"
    "scripts/phoenix-monitor.js"
    "production.js"
)

MISSING_COMPONENTS=()

for component in "${PHOENIX_COMPONENTS[@]}"; do
    if [ ! -f "$component" ]; then
        MISSING_COMPONENTS+=("$component")
    fi
done

if [ ${#MISSING_COMPONENTS[@]} -ne 0 ]; then
    echo "❌ Missing Phoenix Engine components:"
    printf '   - %s\n' "${MISSING_COMPONENTS[@]}"
    echo ""
    echo "🛑 Project Phoenix deployment incomplete"
    exit 1
fi

echo "✅ All Phoenix Engine v6.0 components verified"

# Execute final validation
echo ""
echo "🧪 Executing Project Phoenix final validation..."
node tests/project-phoenix-validation.js
if [ $? -ne 0 ]; then
    echo "❌ Project Phoenix validation failed"
    echo "🛑 Deployment aborted - system not ready"
    exit 1
fi

echo "✅ Project Phoenix validation PASSED"

# Deployment options
echo ""
echo "🚀 DEPLOYMENT OPTIONS:"
echo "   1. Full Production Deployment (production.js)"
echo "   2. Phoenix Deployment Protocol (scripts/deploy-phoenix.js)"
echo "   3. Monitoring Dashboard Only (scripts/phoenix-monitor.js)"
echo "   4. Exit"
echo ""

read -p "Select deployment option (1-4): " OPTION

case $OPTION in
    1)
        echo ""
        echo "🔥 EXECUTING FULL PRODUCTION DEPLOYMENT"
        echo "🛡️ Starting SentryCoin v6.0 Phoenix Engine..."
        echo ""
        node production.js
        ;;
    2)
        echo ""
        echo "🔥 EXECUTING PHOENIX DEPLOYMENT PROTOCOL"
        echo "🛡️ Running Operation Chimera deployment sequence..."
        echo ""
        node scripts/deploy-phoenix.js
        ;;
    3)
        echo ""
        echo "🖥️ STARTING MONITORING DASHBOARD ONLY"
        echo "📊 Dashboard will be available at http://localhost:${DASHBOARD_PORT:-3000}"
        echo ""
        node scripts/phoenix-monitor.js
        ;;
    4)
        echo ""
        echo "🛑 Deployment cancelled by user"
        exit 0
        ;;
    *)
        echo ""
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac
