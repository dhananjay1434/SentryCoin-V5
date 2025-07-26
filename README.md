# 🛡️ SentryCoin v5.1 - "Apex Predator" Market Intelligence Engine

A sophisticated **multi-strategy orchestration platform** that combines real-time market microstructure analysis, derivatives intelligence, and on-chain monitoring for systematic cryptocurrency trading. Features advanced **Operation Unwind** macro strategy capabilities and comprehensive **24/7 cloud deployment** support.

## 🎯 **NEW in v5.1: "Apex Predator" Multi-Strategy Platform**
- **Multi-Strategy Orchestration**: Coordinate multiple concurrent trading strategies with sophisticated conflict resolution
- **ETH_UNWIND Macro Strategy**: Advanced macro positioning for Tier-1 assets with derivatives intelligence
- **Enhanced Signal Architecture**: Weighted scoring system with real-time thesis confirmation
- **24/7 Cloud Deployment**: Production-ready Render.com deployment with automated uptime monitoring
- **Advanced Risk Management**: Dynamic position sizing, trailing stops, and cross-strategy validation

## 🚀 **NEW in V2: Multi-Chain Whale Monitoring**
- **Single API Key**: Monitor whale addresses across 50+ chains (Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, etc.)
- **Error Resolution**: Fixes "No transactions found" errors with intelligent multi-chain detection
- **Enhanced Intelligence**: Cross-chain whale activity correlation for better trading signals
- **Unified Experience**: One configuration, multiple blockchain networks

## 🎯 **Core Features**

### **Market Intelligence**
- **Real-time Order Book Analysis**: Advanced bid/ask imbalance detection
- **Dual-Strategy Classification**: Trifecta Conviction (Short) + Absorption Squeeze (Long)
- **Market Microstructure Engine**: Proprietary liquidity crisis detection
- **Advanced Risk Management**: Position tracking with dynamic stop-loss/take-profit

### **Trading Capabilities**
- **Trifecta Conviction Strategy**: High-precision short signals for flash crash prediction
- **Absorption Squeeze Strategy**: Contrarian long positions on forced absorption patterns
- **Paper Trading Mode**: Safe testing environment (default enabled)
- **Live Trading Support**: Production-ready execution engine

### **Monitoring & Analytics**
- **Real-time Dashboard**: Web-based monitoring and control interface
- **Comprehensive Reporting**: Session, hourly, and daily performance reports
- **Telegram Alerts**: Instant notifications for premium signals
- **Performance Tracking**: Detailed P&L and win-rate analytics

## 🚀 **Quick Start**

### **🔧 Local Development**

#### **Prerequisites**
- Node.js 18+
- Telegram Bot Token & Chat ID
- API Keys (Etherscan, Alpha Vantage)

#### **Installation**
```bash
git clone https://github.com/dhananjay1434/SentryCoin-V5.git
cd SentryCoin-V5
npm install
```

#### **Environment Setup**
```bash
# Interactive environment setup
node setup-render-env.js

# Or manually create .env file with required variables
cp .env.example .env
# Edit .env with your credentials
```

#### **Running Locally**
```bash
# Start v5.1 Apex Predator engine
npm start

# Development mode with auto-reload
npm run dev

# Run comprehensive tests
npm run test

# Verify system health
npm run verify:deployment
```

### **☁️ Cloud Deployment (Render.com)**

#### **One-Click Deploy**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dhananjay1434/SentryCoin-V5)

#### **Manual Deployment**
1. **Fork this repository**
2. **Connect to Render.com**
3. **Set environment variables** (use `setup-render-env.js` for guidance)
4. **Deploy with `render.yaml` configuration**
5. **Setup 24/7 uptime monitoring**

```bash
# Verify cloud deployment
export RENDER_URL=https://your-app.onrender.com
npm run verify:deployment

# Monitor uptime (run separately)
export HEALTH_ENDPOINT=https://your-app.onrender.com/health
npm run uptime:monitor
```

### **📊 System Monitoring**
```bash
# Health check
curl https://your-app.onrender.com/health

# System status
curl https://your-app.onrender.com/status

# Performance metrics
curl https://your-app.onrender.com/performance
```

## 📊 **System Architecture**

### **Core Components (v4.1.1)**
```
src/
├── core/                         # Core trading engine
│   ├── sentrycoin-engine.js      # Main orchestrator
│   ├── predictor.js              # Order book processor
│   └── market-classifier.js     # Market regime detection
├── strategies/                   # v4.1 Trading strategies
│   ├── cascade-hunter-trader.js  # SHORT trading (Distribution Phase)
│   ├── coil-watcher.js          # Alert-only (Accumulation Phase)
│   └── shakeout-detector.js     # Alert-only (Stop Hunt Phase)
├── services/                    # External services
│   ├── alerter.js               # Telegram notifications
│   ├── cloud-storage.js         # Data persistence
│   └── signal-validator.js      # Signal validation
├── reporting/                   # Analytics & reporting
│   └── detailed-reporter.js
└── utils/                       # Shared utilities
    └── index.js
```

### **Trading Strategies**

#### **1. Trifecta Conviction (Short Strategy)**
- **Target**: Flash crash prediction with high precision
- **Signals**: Strong negative momentum + high pressure + thin liquidity
- **Execution**: Short positions with 2% stop-loss, 5% take-profit
- **Frequency**: Low (premium signals only)

#### **2. Absorption Squeeze (Long Strategy)**
- **Target**: Mean reversion on forced absorption patterns
- **Signals**: Weak/positive momentum + high pressure + thin liquidity
- **Execution**: Long positions with 1.5% stop-loss, 3% take-profit
- **Frequency**: Medium (more frequent opportunities)

## ## 🧪 Best Cryptocurrencies for Testing

### **High Volatility (More Alerts)**
- **DOGEUSDT** - Meme coin with frequent pumps/dumps
- **SHIBUSDT** - High volatility, frequent flash movements
- **PEPEUSDT** - New meme coins are very volatile
- **FLOKIUSDT** - Small cap with big swings

### **Medium Volatility (Balanced Testing)**
- **SOLUSDT** - Good balance of volume and volatility
- **ADAUSDT** - Regular price movements
- **MATICUSDT** - Decent volatility for testing
- **AVAXUSDT** - Layer 1 with good movement

### **Low Volatility (Conservative)**
- **BTCUSDT** - Most stable, fewer false positives
- **ETHUSDT** - Large cap, more predictable
- **USDCUSDT** - Stablecoin (for testing edge cases)

### **⚡ Quick Test Setup**
```env
# For immediate testing (will trigger alerts quickly)
SYMBOL=DOGEUSDT
DANGER_RATIO=1.8
COOLDOWN_MINUTES=1

# For realistic testing with SPK/USDT
SYMBOL=SPKUSDT
DANGER_RATIO=2.5
COOLDOWN_MINUTES=5
```

## 📱 Alert Format

```
🚨 SENTRYCOIN FLASH CRASH WARNING 🚨

📊 Asset: SPKUSDT
💰 Current Price: $0.162000
⚠️ Risk Level: 🔴 EXTREME

📈 Order Book Analysis:
• Ask/Bid Ratio: 4.2x
• Total Bid Volume: 125.50K
• Total Ask Volume: 527.30K

🎯 Signal: Severe order book imbalance detected
⚡ Implication: High probability of imminent sharp drop
🛡️ Action: Thin buy-side support - monitor closely

⏰ Time: 2024-01-15T14:30:25.123Z
🤖 Engine: SentryCoin Predictor v4.0
```

## 🚀 Deploy to Render.com

### 1. Push to GitHub
```bash
git add .
git commit -m "SentryCoin Flash Crash Predictor"
git push origin main
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Choose "Background Worker"
4. Service auto-configures from `render.yaml`

### 3. Set Environment Variables
In Render dashboard:
- `TELEGRAM_BOT_TOKEN`: Your bot token
- `TELEGRAM_CHAT_ID`: Your chat ID

## 📈 Performance Metrics

The engine tracks and reports:
- Messages processed per second
- Total alerts triggered
- Current ask/bid ratio
- System uptime

Example output:
```
📈 Stats: 15420 msgs | 3 alerts | 4.2 msg/s | Ratio: 1.8x
```

## ⚠️ Risk Considerations

### False Positives
- Large institutional orders can trigger alerts
- Market maker activity may cause temporary imbalances
- Consider multiple confirmation signals

### Market Conditions
- Algorithm works best in normal market conditions
- Extreme volatility periods may require parameter tuning
- Different assets may need different thresholds

### Latency Factors
- WebSocket connection quality
- Geographic distance to exchange
- Network congestion

## 🔬 Backtesting & Validation

### Historical Analysis
To validate the algorithm:
1. Collect historical order book data
2. Simulate alerts on past flash crashes
3. Measure precision and recall
4. Optimize parameters

### Known Flash Crashes to Test Against
- May 19, 2021: Crypto market crash
- September 7, 2021: El Salvador Bitcoin adoption
- November 9, 2022: FTX collapse
- March 12, 2020: COVID-19 crash

## 🛠️ Development

### Testing
```bash
npm test
```

### Debug Mode
```bash
LOG_LEVEL=debug npm start
```

## 📝 License

MIT License - See LICENSE file for details

---

**⚡ Built for speed, designed for profit, engineered for reliability.**

*SentryCoin Flash Crash Predictor - Your early warning system for crypto market crashes.*
