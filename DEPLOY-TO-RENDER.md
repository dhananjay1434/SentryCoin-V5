# 🚀 Deploy PumpAlarm to Render.com

## Quick Deploy Guide

### 1. **Prepare Your Repository**

```bash
# Make sure all files are committed
git add .
git commit -m "PumpAlarm MVP with mobile alarm features"
git push origin main
```

### 2. **Generate VAPID Keys for Production**

```bash
cd backend
npx web-push generate-vapid-keys
```

**SAVE THESE KEYS!** You'll need them for Render environment variables.

### 3. **Deploy to Render**

1. **Go to [render.com](https://render.com)** and sign up/login
2. **Connect GitHub**: Link your GitHub account
3. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your PumpAlarm repository
   - Choose your repository from the list

4. **Configure Service**:
   - **Name**: `pumpalarm-mvp` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: (auto-detected from render.yaml)
   - **Start Command**: (auto-detected from render.yaml)

### 4. **Set Environment Variables**

In Render dashboard, go to "Environment" tab and add:

```
VAPID_PUBLIC_KEY=your_public_key_from_step_2
VAPID_PRIVATE_KEY=your_private_key_from_step_2
VAPID_EMAIL=your_email@example.com
NODE_ENV=production
```

### 5. **Deploy!**

Click "Create Web Service" - Render will:
- Build your frontend
- Install backend dependencies  
- Start your server
- Give you a live URL like `https://pumpalarm-mvp.onrender.com`

---

## 📱 Mobile Setup Instructions for Users

### **Android Setup**

1. **Open Chrome/Firefox** on your Android device
2. **Visit your deployed URL** (e.g., `https://pumpalarm-mvp.onrender.com`)
3. **Allow Notifications** when prompted
4. **Install as App** (optional):
   - Chrome: Tap menu → "Add to Home screen"
   - Firefox: Tap menu → "Install"
5. **Set Your First Alert**:
   - Choose coin (BTC, ETH, SOL, etc.)
   - Select "Emergency/SOS Alert" for maximum impact
   - Enable sound and vibration
   - Set realistic price target

### **iOS Setup**

1. **Open Safari** on your iPhone/iPad
2. **Visit your deployed URL**
3. **Allow Notifications** when prompted
4. **Add to Home Screen**:
   - Tap Share button (square with arrow)
   - Tap "Add to Home Screen"
   - Tap "Add"
5. **Set Your First Alert** (same as Android)

---

## 🚨 Mobile Alarm Features

### **Alert Types**
- **🔔 Normal Alert**: Standard notification
- **⚠️ Urgent Alert**: Longer vibration, requires interaction
- **🚨 Emergency/SOS Alert**: Maximum vibration, persistent notification, emergency-style message

### **Mobile Features**
- **📳 Vibration Patterns**: Different patterns for each alert type
- **🔊 Sound Control**: Enable/disable notification sounds
- **⏰ Snooze**: 5-minute snooze option on notifications
- **📱 PWA Support**: Install as native-like app
- **🔄 Offline Ready**: Works even when browser is closed

### **Emergency/SOS Mode**
When you select "Emergency/SOS Alert":
- **Persistent notifications** that require user interaction
- **Maximum vibration** pattern (500ms pulses)
- **Critical messaging** with "IMMEDIATE ACTION REQUIRED"
- **Red alert styling** in notifications

---

## 🔧 Configuration Tips

### **For Maximum Mobile Impact**

1. **Use Emergency Alerts** for critical price movements
2. **Enable both sound and vibration** for important alerts
3. **Set realistic price targets** based on current market
4. **Install as PWA** for native app experience

### **Popular Alert Examples**

```
🚨 Emergency Alerts:
- BTC below $25,000 (bear market warning)
- ETH above $5,000 (bull run confirmation)
- SOL below $10 (major dump alert)

⚠️ Urgent Alerts:
- BTC above $100,000 (moon alert)
- ETH above $10,000 (mega pump)
- Your favorite altcoin +50% moves

🔔 Normal Alerts:
- Daily price targets
- Small percentage moves
- Regular trading signals
```

---

## 🛠️ Troubleshooting

### **Notifications Not Working?**
1. Check browser permissions (allow notifications)
2. Ensure HTTPS (required for push notifications)
3. Try different browser (Chrome recommended)
4. Check if service worker is registered

### **App Not Installing?**
1. Use supported browser (Chrome, Safari, Firefox)
2. Ensure PWA manifest is loading
3. Try "Add to Home Screen" manually

### **Alerts Not Triggering?**
1. Check if WebSocket is connected (server logs)
2. Verify coin symbol is correct (BTC, ETH, SOL)
3. Ensure price target is realistic
4. Check server is running and accessible

---

## 🔒 Security Notes

- **VAPID keys are sensitive** - keep them secure
- **No authentication** in MVP - anyone can set alerts
- **Rate limiting recommended** for production
- **HTTPS required** for push notifications

---

## 🎯 Next Steps After Deployment

1. **Test thoroughly** on different devices
2. **Share with friends** to test load
3. **Monitor server logs** for issues
4. **Consider adding**:
   - User authentication
   - Alert management
   - Database persistence
   - Multiple notification channels

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Review Render deployment logs
3. Verify environment variables are set
4. Test with popular cryptocurrencies first

**Your PumpAlarm is now ready to alert the world! 🚨📱**
