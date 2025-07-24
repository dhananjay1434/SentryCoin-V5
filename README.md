# 🛡️ SentryCoin Flash Crash Predictor

**A sophisticated quantitative engine that analyzes real-time cryptocurrency market microstructure data to predict and alert on potential flash crashes.**

## 🎯 Core Theory

### The Flash Crash Heuristic

Flash crashes are often preceded by **liquidity crises** in the order book. When the volume of sell orders (asks) dramatically outweighs the volume of buy orders (bids), even small market sell orders can cause the price to plummet through thin buy-side support.

**Key Insight**: By monitoring the ask/bid volume ratio in real-time, we can detect these imbalances before they trigger cascading liquidations.

### Algorithm Overview

```
1. Connect to Binance WebSocket depth stream
2. Maintain real-time order book (top 50 levels)
3. Calculate: askToBidRatio = totalAskVolume / totalBidVolume
4. Alert when: askToBidRatio > DANGER_RATIO (default: 3.0x)
5. Implement cooldown to prevent spam
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Telegram account
- Telegram bot token

### 1. Setup Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot: `/newbot`
3. Save your bot token
4. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)

### 2. Installation

```bash
git clone https://github.com/dhananjay1434/SentryCoin.git
cd SentryCoin
npm install
```

### 3. Configuration

```bash
cp .env.example .env
# Edit .env with your Telegram credentials
```

Required environment variables:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 4. Run Locally

```bash
npm start
```

## 📊 Configuration Parameters

### Core Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `SYMBOL` | SPKUSDT | Trading pair to monitor |
| `DANGER_RATIO` | 2.5 | Ask/bid ratio threshold for alerts |
| `ORDER_BOOK_DEPTH` | 50 | Number of order book levels to analyze |
| `COOLDOWN_MINUTES` | 5 | Minutes between alerts |

### Tuning the Algorithm

**For Testing (more alerts):**
```env
SYMBOL=DOGEUSDT
DANGER_RATIO=2.0
COOLDOWN_MINUTES=2
```

**For Bitcoin (conservative):**
```env
SYMBOL=BTCUSDT
DANGER_RATIO=4.0
COOLDOWN_MINUTES=10
```

**For SPK/USDT (recommended):**
```env
SYMBOL=SPKUSDT
DANGER_RATIO=2.5
COOLDOWN_MINUTES=5
```

## 🔧 How It Works

### 1. Order Book Initialization
- Fetches current order book snapshot via REST API
- Establishes baseline state with top 50 bid/ask levels

### 2. Real-Time Processing
- Connects to Binance WebSocket depth stream
- Processes order book updates in real-time
- Maintains synchronized local order book state

### 3. Flash Crash Detection
```javascript
// Core algorithm
const totalBidVolume = sumTopBids(50);
const totalAskVolume = sumTopAsks(50);
const askToBidRatio = totalAskVolume / totalBidVolume;

if (askToBidRatio > DANGER_RATIO && !isOnCooldown) {
    triggerFlashCrashAlert();
}
```

### 4. Alert Delivery
- Sends formatted alert to Telegram
- Includes risk level, volumes, and actionable insights
- Implements cooldown to prevent spam

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
