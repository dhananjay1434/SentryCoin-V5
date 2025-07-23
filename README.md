# SentryCoin MVP

An advanced cryptocurrency price alert system with time-based percentage drops and velocity change detection.

## 🎯 Core Concept

SentryCoin is an intelligent crypto monitoring application that supports three types of alerts:

1. **Price Threshold Alerts**: Traditional "notify when BTC goes above $50,000"
2. **Time-Window Percentage Drops**: "Alert me if SOL drops 4% within any 2-hour period"
3. **Sudden Velocity Changes**: "Alert me if BTC has a sudden 2% drop in the last 5 minutes"

## ⚠️ MVP Trade-offs

**⚠️ CRITICAL: Data Loss on Restart**: This MVP stores ALL data in server memory:
- **Active Alerts**: All user-defined alerts are lost on restart
- **Price History**: All historical price data for calculations is lost on restart
- **No Persistence**: No database or file storage is used

This is an intentional design choice for MVP simplicity. **All alerts and price history will be completely lost if the server restarts for any reason.**

**Single Alert per Target**: Each alert is "one-shot" - it triggers once and is then removed.

## 🏗️ Architecture

- **Frontend**: Vite + React application with dynamic alert forms and Web Push API integration
- **Backend**: Single Node.js process with sophisticated alert engine and price history management
- **Price Data**: Real-time updates via Binance WebSocket with in-memory historical storage
- **Alert Engine**: Advanced logic for percentage calculations and time-window analysis
- **Notifications**: Browser push notifications (no external services required)

## 🚨 Alert Types Supported

### 1. **Price Threshold Alerts**
Traditional price crossing alerts:
- "Notify when BTC goes above $50,000"
- "Alert when ETH drops below $2,000"

### 2. **Time-Window Percentage Drops**
Percentage change over specified time periods:
- "Alert if SOL drops 4% within any 2-hour period"
- "Notify if DOGE falls 10% in 6 hours"

### 3. **Sudden Velocity Changes**
Rapid price movements in short timeframes:
- "Alert if BTC drops 2% in the last 5 minutes"
- "Notify if ETH pumps 3% in 10 minutes"

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Modern browser with push notification support

### Local Development

1. **Clone and setup**:
```bash
git clone <repository-url>
cd PumpAlarm
```

2. **Setup Backend**:
```bash
cd backend
npm install
```

3. **Generate VAPID Keys** (required for push notifications):
```bash
npx web-push generate-vapid-keys
```

4. **Configure Environment**:
Create `backend/.env`:
```
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=your_email@example.com
```

5. **Setup Frontend**:
```bash
cd ../frontend
npm install
npm run build
```

6. **Start the Application**:
```bash
cd ../backend
npm start
```

7. **Open Browser**:
Navigate to `http://localhost:3000` and allow push notifications when prompted.

## 📁 Project Structure

```
/SentryCoin
├── /frontend           # Vite + React App
│   ├── public/
│   │   └── service-worker.js  # Push notification handler
│   ├── src/
│   │   ├── App.jsx            # Dynamic alert forms
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── /backend            # Node.js Server + Advanced Alert Engine
│   ├── src/
│   │   ├── alert-engine.js    # Core alert checking logic
│   │   ├── price-monitor.js   # WebSocket + price history
│   │   └── server.js          # Express server
│   ├── package.json
│   └── .env                   # VAPID keys
├── .gitignore
├── README.md
└── render.yaml         # Deployment config
```

## 🔧 How It Works

1. **User Sets Alert**: Frontend sends complex alert data + push subscription to backend
2. **Price Monitoring**: Backend connects to Binance WebSocket and maintains price history
3. **History Management**: Rolling in-memory cache of recent prices for time-based calculations
4. **Alert Engine**: Sophisticated checking logic for all three alert types
5. **Notification**: When condition is met, push notification is sent and alert is removed

## 💾 In-Memory Data Structure

### Active Alerts Array
```javascript
[
  {
    id: "1678886400000",
    coin: "BTCUSDT",
    alertType: "THRESHOLD",
    params: { condition: "ABOVE", price: 50000 },
    pushSubscription: { ... }
  },
  {
    id: "1678886401000",
    coin: "SOLUSDT",
    alertType: "PERCENT_DROP",
    params: { percentage: 4, windowHours: 2 },
    pushSubscription: { ... }
  },
  {
    id: "1678886402000",
    coin: "BTCUSDT",
    alertType: "VELOCITY_DROP",
    params: { percentage: 2, windowMinutes: 5 },
    pushSubscription: { ... }
  }
]
```

### Price History Dictionary
```javascript
{
  "BTCUSDT": [
    { timestamp: 1678886400000, price: 60000.50 },
    { timestamp: 1678886460000, price: 60005.10 },
    { timestamp: 1678886520000, price: 59800.25 }
  ],
  "SOLUSDT": [
    { timestamp: 1678886400000, price: 150.75 },
    { timestamp: 1678886460000, price: 148.20 }
  ]
}
```

## 🌐 Deployment

Deploy to Render.com using the included `render.yaml`:

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY` 
   - `VAPID_EMAIL`
3. Deploy as a Web Service

## 🛣️ Next Steps (Post-MVP)

- **Persistence**: Add PostgreSQL database to survive server restarts
- **User Accounts**: Authentication and personal alert management
- **Multiple Channels**: Telegram, SMS, email notifications
- **Advanced Features**:
  - Portfolio-wide alerts
  - Technical indicator alerts (RSI, MACD)
  - Social sentiment integration
  - Alert backtesting
- **Alert History**: Track triggered alerts and performance analytics
- **Mobile App**: Native iOS/Android applications
- **API Rate Limiting**: Production-ready request throttling

## 🔒 Security Notes

- VAPID keys should be kept secure
- This MVP has no authentication - anyone can set alerts
- Production deployment should add rate limiting and input validation

## 📝 License

MIT License - See LICENSE file for details
