#!/bin/bash

echo "🔍 Finding your Azure resources for PumpAlarm/SentryCoin..."
echo "=================================================="

# Check if Azure CLI is logged in
if ! az account show &>/dev/null; then
    echo "❌ Not logged into Azure CLI. Please run: az login"
    exit 1
fi

echo "✅ Azure CLI is authenticated"
echo ""

# Show current subscription
echo "📋 Current Subscription:"
az account show --query "{Name:name, Id:id}" --output table
echo ""

# List all resource groups
echo "📁 All Resource Groups:"
az group list --query "[].{Name:name, Location:location}" --output table
echo ""

# List all App Services
echo "🌐 All App Services:"
az webapp list --query "[].{Name:name, ResourceGroup:resourceGroup, DefaultHostName:defaultHostName, State:state}" --output table
echo ""

# Search for SentryCoin/PumpAlarm related apps
echo "🎯 Searching for SentryCoin/PumpAlarm related apps..."

# Common search terms
search_terms=("sentrycoin" "pump" "flash" "crash" "predictor")

for term in "${search_terms[@]}"; do
    echo "🔍 Searching for apps containing '$term':"
    results=$(az webapp list --query "[?contains(toLower(name), '$term')]" --output table 2>/dev/null)
    if [ -n "$results" ] && [ "$results" != "[]" ]; then
        echo "$results"
    else
        echo "   No apps found containing '$term'"
    fi
    echo ""
done

# Check for Node.js apps (likely to be your app)
echo "🟢 Node.js Applications:"
az webapp list --query "[?contains(siteConfig.linuxFxVersion, 'NODE') || contains(kind, 'app')]" --output table
echo ""

# Look for recently created apps
echo "📅 Recently Created Apps (last 30 days):"
thirty_days_ago=$(date -d "30 days ago" +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d 2>/dev/null || echo "2024-01-01")
az webapp list --query "[?createdTime >= '$thirty_days_ago'].{Name:name, ResourceGroup:resourceGroup, Created:createdTime, URL:defaultHostName}" --output table
echo ""

# Provide next steps
echo "🚀 Next Steps:"
echo "1. Identify your app from the lists above"
echo "2. Note the App Name and Resource Group"
echo "3. Use them in the download commands:"
echo ""
echo "   az webapp deployment list-publishing-credentials \\"
echo "     --name \"YOUR_APP_NAME\" \\"
echo "     --resource-group \"YOUR_RESOURCE_GROUP\""
echo ""
echo "4. Or test your app URL directly:"
echo "   curl https://YOUR_APP_NAME.azurewebsites.net/status"
echo ""

# Try to find apps by checking common URLs
echo "🌐 Testing Common URLs..."
common_names=("sentrycoin-flash-crash-predictor" "pumpalarm" "sentrycoin-predictor" "flash-crash-predictor" "sentrycoin")

for name in "${common_names[@]}"; do
    url="https://${name}.azurewebsites.net/status"
    echo -n "Testing $url ... "
    if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
        echo "✅ FOUND!"
        echo "   Your app might be: $name"
        echo "   URL: $url"
    else
        echo "❌ Not found"
    fi
done

echo ""
echo "💡 If you still can't find your app, check the Azure Portal at:"
echo "   https://portal.azure.com → App Services"
