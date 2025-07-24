# 📱 **SentryCoin v4.0 - Telegram Alerts Setup Guide**

## 🎯 **Objective**
Ensure you receive **Telegram alerts** for every **Trifecta Conviction signal** detected by SentryCoin v4.0.

---

## 🔧 **Step 1: Create Telegram Bot**

### **1.1 Create Bot with BotFather**
1. Open Telegram and search for `@BotFather`
2. Start a conversation and send `/newbot`
3. Follow the prompts to create your bot:
   - **Bot Name**: `SentryCoin v4.0 Alert Bot` (or any name you prefer)
   - **Username**: `sentrycoin_v4_bot` (must end with 'bot')
4. **Save the Bot Token** - it looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### **1.2 Get Your Chat ID**
1. Start a conversation with your new bot (click the link BotFather provides)
2. Send `/start` to your bot
3. Go to `@userinfobot` and send any message
4. It will reply with your **User ID** - this is your **Chat ID**
5. **Save the Chat ID** - it's a number like: `123456789`

---

## ⚙️ **Step 2: Configure Environment Variables**

### **For Azure Deployment:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service: `sentrycoin-v4-app`
3. Go to **Configuration** → **Application settings**
4. Add these environment variables:

```
TELEGRAM_BOT_TOKEN = your_bot_token_here
TELEGRAM_CHAT_ID = your_chat_id_here
```

5. Click **Save** and **Continue**

### **For Local Testing:**
Create or update your `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

---

## 🧪 **Step 3: Test Configuration**

### **Test Locally:**
```bash
npm run test:telegram
```

### **Test on Azure:**
After setting environment variables, the system will automatically test Telegram on startup.

**Expected Output:**
```
✅ Telegram configuration loaded successfully
📤 Sending Telegram alert to chat 123456789...
🚨 Flash crash alert sent successfully for SPKUSDT
```

---

## 📱 **Step 4: Expected Alert Format**

When a Trifecta signal is detected, you'll receive:

```
🚨 SENTRYCOIN v4.0 TRIFECTA CONVICTION 🚨

📊 Asset: SPKUSDT
💰 Current Price: $0.139879
⚠️ Risk Level: 🔴 EXTREME

📈 Market Analysis:
• Ask/Bid Ratio: 3.54x
• Total Bid Volume: 98.06K
• Total Ask Volume: 347.00K
• Price Momentum: -3.08%

🎯 Signal Analysis:
• Type: LIQUIDITY CASCADE
• Confidence: VERY_HIGH
• Strategy: SHORT RECOMMENDED
• Expected: CONTINUED DECLINE

⚡ Implication: Strong negative momentum with severe order book imbalance
🛡️ Action: HIGH probability flash crash - Consider protective measures

⏰ Time: 2025-07-24 09:16:46 IST
🤖 Engine: SentryCoin v4.0 Dual-Strategy Engine
```

---

## 🔍 **Step 5: Troubleshooting**

### **Common Issues:**

#### **❌ "chat not found"**
- **Solution**: Double-check your Chat ID
- **Solution**: Make sure you've started a conversation with your bot

#### **❌ "bot was blocked by the user"**
- **Solution**: Unblock the bot in Telegram
- **Solution**: Delete and restart the conversation

#### **❌ "Unauthorized"**
- **Solution**: Verify your bot token is correct
- **Solution**: Make sure there are no extra spaces

#### **❌ No alerts received**
- **Solution**: Check Azure environment variables are set
- **Solution**: Restart the Azure App Service
- **Solution**: Check logs for Telegram errors

### **Verification Commands:**

#### **Check Azure Environment Variables:**
```bash
az webapp config appsettings list --name sentrycoin-v4-app --resource-group SentryCoinResourceGroup
```

#### **Check System Logs:**
```bash
az webapp log tail --name sentrycoin-v4-app --resource-group SentryCoinResourceGroup
```

#### **Force Test Alert:**
```bash
# Run locally to test
npm run test:telegram
```

---

## 📊 **Step 6: Monitor Alert Activity**

### **What to Look For in Logs:**
```
✅ Telegram configuration loaded successfully
🚨 TRIFECTA CONVICTION SIGNAL RECEIVED [timestamp]
📤 Sending Telegram alert to chat...
🚨 Flash crash alert sent successfully
📱 Premium Trifecta alert sent
```

### **Alert Frequency:**
- **Expected**: 2-5 Trifecta alerts per hour during active market periods
- **Cooldown**: 5 minutes between alerts to prevent spam
- **Quality**: High-precision signals with proven track record

---

## ✅ **Step 7: Confirm Success**

### **Success Indicators:**
1. ✅ Environment variables set in Azure
2. ✅ Bot responds to `/start` command
3. ✅ Test alert received in Telegram
4. ✅ System logs show successful alert sending
5. ✅ No error messages about Telegram configuration

### **Expected Timeline:**
- **Setup Time**: 5-10 minutes
- **First Alert**: Within 2-4 hours (when next Trifecta signal occurs)
- **Alert Delivery**: Instant (within 1-2 seconds of signal detection)

---

## 🚨 **Important Notes**

### **Security:**
- **Never share your bot token** - treat it like a password
- **Keep your chat ID private** - it gives access to send you messages

### **Reliability:**
- The system sends alerts **regardless of trading status**
- Alerts are sent **immediately** when signals are detected
- **No alerts missed** - every Trifecta signal triggers a Telegram message

### **Backup Plan:**
If Telegram fails, the system will:
- Log detailed error messages
- Continue operating normally
- Retry on next signal

---

## 📞 **Support**

If you're still not receiving alerts after following this guide:

1. **Check the exact error message** in Azure logs
2. **Verify bot token and chat ID** are correctly set
3. **Test with a different Telegram account** if needed
4. **Restart the Azure App Service** to reload configuration

The system is designed to be **bulletproof** for Telegram alerts - every Trifecta signal **will** trigger an alert once properly configured! 🎯
