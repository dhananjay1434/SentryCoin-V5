# 📱 Telegram Alerts Troubleshooting Guide

## 🚨 **Issue: Not Receiving Telegram Alerts**

If you're seeing Trifecta signals in the logs but not receiving Telegram messages, follow this troubleshooting guide.

## 🔍 **Step 1: Check Environment Variables**

Run the Telegram test script:
```bash
npm run test:telegram
```

This will verify:
- ✅ TELEGRAM_BOT_TOKEN is set
- ✅ TELEGRAM_CHAT_ID is set  
- ✅ Bot can send messages
- ✅ Alert formatting works

## 🔧 **Step 2: Verify Telegram Configuration**

### **Get Your Bot Token**
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Follow instructions to create your bot
4. Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### **Get Your Chat ID**
1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It will reply with your user ID (this is your chat ID)
3. Or start a chat with your bot and message [@RawDataBot](https://t.me/RawDataBot)

### **Test Bot Access**
1. Start a conversation with your bot
2. Send `/start` to your bot
3. Make sure the bot is not blocked

## ⚙️ **Step 3: Environment Variable Setup**

### **Local Development (.env file)**
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### **Render.com Deployment**
1. Go to your Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Add/update these variables:
   - `TELEGRAM_BOT_TOKEN`: Your bot token
   - `TELEGRAM_CHAT_ID`: Your chat ID

### **Azure Deployment**
```bash
az webapp config appsettings set \
  --name your-app-name \
  --resource-group your-resource-group \
  --settings \
    TELEGRAM_BOT_TOKEN="your_bot_token" \
    TELEGRAM_CHAT_ID="your_chat_id"
```

## 🐛 **Step 4: Common Issues & Solutions**

### **Issue: "chat not found"**
- ✅ **Solution**: Double-check your chat ID
- ✅ **Solution**: Make sure you've started a conversation with the bot

### **Issue: "bot was blocked by the user"**
- ✅ **Solution**: Unblock the bot in Telegram
- ✅ **Solution**: Delete and restart the conversation

### **Issue: "Unauthorized"**
- ✅ **Solution**: Verify your bot token is correct
- ✅ **Solution**: Make sure there are no extra spaces in the token

### **Issue: Signals detected but no alerts**
- ✅ **Solution**: Check if `TRIFECTA_TRADING_ENABLED=true`
- ✅ **Solution**: Verify cooldown period hasn't suppressed alerts
- ✅ **Solution**: Check logs for Telegram errors

## 📊 **Step 5: Force Test Alert**

Create a test script to force send an alert:

```javascript
// test-force-alert.js
import FlashCrashAlerter from './src/alerter.js';

const alerter = new FlashCrashAlerter();
await alerter.triggerFlashCrashAlert({
  symbol: 'SPKUSDT',
  currentPrice: 0.139879,
  askToBidRatio: 3.54,
  totalBidVolume: 98064,
  totalAskVolume: 347000,
  momentum: -3.08,
  alertType: 'TRIFECTA_CONVICTION'
});
```

## 🔄 **Step 6: Check System Status**

### **Via API Endpoint**
```bash
curl https://your-app.onrender.com/status
```

### **Check Logs**
Look for these log messages:
- ✅ `✅ Telegram configuration loaded successfully`
- ✅ `📤 Sending Telegram alert to chat...`
- ✅ `🚨 Flash crash alert sent successfully`

### **Error Messages to Watch For**
- ❌ `❌ Cannot send alert: Telegram configuration missing`
- ❌ `❌ Failed to send Telegram alert:`
- ❌ `⚠️ Telegram configuration missing:`

## 🎯 **Step 7: Verify Alert Flow**

The alert flow should be:
1. **Signal Detection**: `🚨 TRIFECTA CONVICTION SIGNAL RECEIVED`
2. **Alert Preparation**: `📤 Sending Telegram alert to chat...`
3. **Alert Success**: `🚨 Flash crash alert sent successfully`
4. **Cooldown**: `⏰ Alert cooldown activated for 5 minutes`

## 🚀 **Quick Fix Commands**

### **Test Everything**
```bash
# Test Telegram configuration
npm run test:telegram

# Check system status
curl https://your-app.onrender.com/status

# View recent logs
# (Check your hosting platform's log viewer)
```

### **Reset Cooldown** (if needed)
The system has a 5-minute cooldown between alerts. If you want to test immediately, restart the service.

## 📞 **Still Not Working?**

If alerts still aren't working after following this guide:

1. **Check the exact error message** in the logs
2. **Verify bot permissions** - make sure the bot can send messages
3. **Test with a different chat** - try your bot token with a different chat ID
4. **Check rate limits** - Telegram has rate limits for bots

## ✅ **Success Indicators**

You'll know it's working when you see:
- ✅ Test alerts arrive in Telegram
- ✅ Logs show successful message sending
- ✅ No error messages about Telegram configuration
- ✅ Trifecta signals trigger actual Telegram messages

The system is designed to send alerts **regardless of trading status**, so you should receive notifications even when trading is disabled.
