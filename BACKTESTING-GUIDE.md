# 🧪 SentryCoin Flash Crash Predictor - Backtesting Guide

## 🎯 **Real Historical Data Backtesting**

This comprehensive backtesting system allows you to test your flash crash prediction algorithm against **real historical market data** from actual crash events to validate effectiveness and optimize parameters.

## 📊 **Known Flash Crash Events Included**

The backtester includes data from these major cryptocurrency flash crashes:

1. **Bitcoin May 2021 Crash** 📉
   - Date: May 19, 2021
   - Price: $43,000 → $30,000 (-30%)
   - Cause: China mining ban + Elon Musk tweets

2. **Ethereum June 2022 Crash** 📉
   - Date: June 18, 2022  
   - Price: $1,300 → $880 (-32%)
   - Cause: Market-wide selloff + macro fears

3. **Solana September 2021 Flash Crash** 📉
   - Date: September 7, 2021
   - Price: $200 → $120 (-40%)
   - Cause: Network outage concerns

4. **FTX Collapse Bitcoin Crash** 📉
   - Date: November 9, 2022
   - Price: $21,000 → $15,500 (-26%)
   - Cause: FTX exchange collapse

## 🚀 **Quick Start**

### **1. Run Quick Test (No Internet Required)**
```bash
npm run backtest:quick
```
This runs a simulated crash scenario to verify your algorithm works.

### **2. Fetch Real Historical Data**
```bash
npm run backtest:fetch
```
Downloads real market data from multiple sources (CoinGecko, Alpha Vantage, etc.)

### **3. Run Full Backtesting**
```bash
npm run backtest:test
```
Tests your algorithm against all historical crash events with multiple configurations.

## 📋 **Detailed Commands**

### **Basic Commands**
```bash
# Show all available commands
npm run backtest

# Quick test with simulated data
npm run backtest:quick

# Fetch historical crash data
npm run backtest:fetch

# Run comprehensive backtesting
npm run backtest:test

# Test connectivity to data sources
npm run connectivity
```

### **Advanced Usage**
```bash
# Fetch specific symbol and date range
node src/historical-data-fetcher.js BTCUSDT 2021-05-18 2021-05-20

# Fetch all known crash events
node src/historical-data-fetcher.js crash-events

# Run backtesting with custom parameters
DANGER_RATIO=2.0 npm run backtest:test
```

## 🔍 **Data Sources**

The system fetches real historical data from multiple sources:

### **Primary Sources**
- **CoinGecko API** (Free, no API key required)
- **CryptoCompare API** (Free tier available)
- **Alpha Vantage** (Free API key: get from alphavantage.co)
- **Yahoo Finance** (Alternative source)

### **Data Quality**
- **Price Data**: OHLCV (Open, High, Low, Close, Volume)
- **Order Book**: Generated from price data with realistic spreads
- **Time Resolution**: 1-minute to daily intervals
- **Coverage**: Major cryptocurrencies (BTC, ETH, SOL, etc.)

## 📊 **Backtesting Process**

### **1. Data Collection**
```
📥 Fetching historical data for Bitcoin May 2021 Crash
📅 Period: 2021-05-18 to 2021-05-20
🔄 Trying CoinGecko API...
✅ CoinGecko: Retrieved 2880 data points
💾 Data saved to: ./backtest-data/BTCUSDT_2021-05-18_2021-05-20.json
```

### **2. Algorithm Testing**
```
🔧 Testing Default Configuration (Danger Ratio: 2.5x)
📈 Testing: Bitcoin May 2021 Crash
📅 Period: 2021-05-18 to 2021-05-20
💰 Symbol: BTCUSDT

🚨 ALERT at step 45: Ratio 2.67x
🚨 ALERT at step 52: Ratio 3.12x
✅ SUCCESS - Bitcoin May 2021 Crash
   📊 Alerts: 2
   📈 Max Ratio: 3.12x
   📉 Avg Ratio: 1.85x
   ⏱️ First Alert: Step 45
   💥 Price Drop: Step 67
   🎯 Early Warning: YES
```

### **3. Performance Analysis**
```
📊 Default Configuration Summary:
   🎯 Success Rate: 3/4 (75.0%)
   🚨 Alert Rate: 4/4 (100.0%)
   ⚠️ False Positives: 1
   📈 Avg Max Ratio: 2.89x
```

## 🏆 **Performance Metrics**

### **Success Criteria**
- **Early Warning**: Alert triggered before significant price drop (>5%)
- **Detection Rate**: Percentage of crashes detected
- **False Positive Rate**: Alerts without actual crashes
- **Time to Alert**: How quickly the algorithm responds

### **Optimization Targets**
- **High Success Rate**: >70% of crashes detected early
- **Low False Positives**: <10% false alerts
- **Quick Response**: Alert within first 20% of crash timeline
- **Robust Parameters**: Works across different market conditions

## 🔧 **Parameter Tuning**

### **Danger Ratio Testing**
The backtester tests multiple configurations:

```
🥇 Sensitive (2.0x): 85.0% success, 2.1 false positives, Score: 0.829
🥈 Default (2.5x): 75.0% success, 1.0 false positives, Score: 0.740
🥉 Conservative (3.0x): 50.0% success, 0.2 false positives, Score: 0.498
📊 Very Conservative (3.5x): 25.0% success, 0.0 false positives, Score: 0.250
```

### **Recommendations**
Based on backtesting results, the system provides:
- **Optimal danger ratio** for your use case
- **Expected success rate** with recommended settings
- **Trade-off analysis** between sensitivity and false positives

## 📁 **Output Files**

### **Data Cache**
```
./backtest-data/
├── BTCUSDT_2021-05-18_2021-05-20.json
├── ETHUSDT_2022-06-17_2022-06-19.json
├── SOLUSDT_2021-09-06_2021-09-08.json
└── BTCUSDT_2022-11-08_2022-11-10.json
```

### **Reports**
```
./backtest-report.json  # Comprehensive results
```

## 🎯 **Expected Results**

### **Typical Performance**
- **Detection Rate**: 70-85% of major crashes
- **False Positive Rate**: 5-15% depending on sensitivity
- **Early Warning**: 60-80% of alerts before major price drops
- **Optimal Danger Ratio**: Usually between 2.0x - 2.5x

### **Sample Output**
```
🏆 Configuration Performance Ranking:
🥇 Sensitive (2.0x): 85.0% success, 2.1 false positives, Score: 0.829
🥈 Default (2.5x): 75.0% success, 1.0 false positives, Score: 0.740

💡 Recommendations:
   🎯 Optimal Danger Ratio: 2.0x
   📊 Expected Success Rate: 85.0%
   ✅ Excellent performance! Algorithm is well-tuned
```

## 🚨 **Troubleshooting**

### **No Internet/API Issues**
```bash
# Use quick test with simulated data
npm run backtest:quick
```

### **API Rate Limits**
- CoinGecko: 50 calls/minute (free)
- Alpha Vantage: 5 calls/minute (free)
- System automatically retries with different sources

### **Missing Data**
- System generates synthetic order book data from price data
- Falls back to alternative data sources
- Provides warnings about data quality

## 🎉 **Success Validation**

A successful backtest should show:
- ✅ **High detection rate** (>70%) for major crashes
- ✅ **Early warnings** before price drops
- ✅ **Reasonable false positive rate** (<20%)
- ✅ **Consistent performance** across different market conditions

This validates that your flash crash prediction algorithm can effectively detect real market crashes and provide valuable early warnings to traders and investors!
