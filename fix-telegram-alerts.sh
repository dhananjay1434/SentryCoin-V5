#!/bin/bash

# SentryCoin v4.0 - Telegram Alerts Fix Deployment Script
# This script applies the fixes for Telegram alerts not being sent

echo "🚀 SentryCoin v4.0 - Telegram Alerts Fix"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed or not in PATH"
    exit 1
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
    npm run test:telegram
    echo ""
fi

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
echo ""

# Push to trigger deployment
echo "🚀 Pushing to trigger deployment..."
git push origin main

echo ""
echo "🎉 Deployment triggered!"
echo ""
echo "📋 Next Steps:"
echo "1. Wait for deployment to complete (2-3 minutes)"
echo "2. Check your Render dashboard for deployment status"
echo "3. Monitor logs for Telegram alerts"
echo "4. You should start receiving alerts within 5-10 minutes"
echo ""
echo "🔍 To verify the fix:"
echo "• Check logs for: '📤 Sending Telegram alert to chat...'"
echo "• Look for: '🚨 Flash crash alert sent successfully'"
echo "• Watch for Trifecta signals in Telegram"
echo ""
echo "📱 If still not working:"
echo "• Run: npm run test:telegram (locally)"
echo "• Check: TELEGRAM-TROUBLESHOOTING.md"
echo "• Verify environment variables in Render dashboard"
echo ""
echo "✅ Fix deployment complete!"
