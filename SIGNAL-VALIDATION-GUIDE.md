# 🎯 SentryCoin Signal Validation System

## Overview

The Signal Validation System automatically tracks and validates every flash crash prediction made by your SentryCoin system. It measures the accuracy of predictions by monitoring price movements after each alert.

## 🔍 How It Works

### 1. Signal Recording
When a flash crash alert is triggered:
- **Exact price** at signal time is recorded
- **Market conditions** (ask/bid ratio, volumes) are saved
- **Risk level** and timestamp are logged
- **Unique signal ID** is generated for tracking

### 2. Price Tracking
The system automatically tracks price movements:
- **T+1 minute**: Price after 1 minute
- **T+3 minutes**: Price after 3 minutes  
- **T+5 minutes**: Price after 5 minutes

### 3. Validation Logic
After 5 minutes, the system determines if the prediction was correct:
- **Correct**: If price dropped ≥2% from signal price
- **Incorrect**: If price remained stable or increased
- **Maximum drop** during the 5-minute window is recorded

## 📊 Real-Time Example

```
🚨 FLASH CRASH SIGNAL DETECTED!
📊 Signal ID: SIG_1642951234_abc123def
💰 Price at Signal: $0.162197
⚠️ Risk Level: 🟡 HIGH
📈 Ask/Bid Ratio: 3.06x

⏰ Tracking Progress:
T+1min: $0.158432 (-2.32%) ✅
T+3min: $0.155891 (-3.89%) ✅  
T+5min: $0.154223 (-4.91%) ✅

✅ PREDICTION CORRECT: Max drop -4.91%
```

## 📈 Accuracy Metrics

### Overall Performance
- **Total Signals**: Number of flash crash alerts triggered
- **Validated Signals**: Signals with complete 5-minute tracking
- **Accuracy Rate**: Percentage of correct predictions
- **Average Max Drop**: Average price drop across all signals

### Risk Level Breakdown
- **🟢 MODERATE** (2.5x - 3.0x ratio): Accuracy rate
- **🟡 HIGH** (3.0x - 4.0x ratio): Accuracy rate  
- **🟠 VERY HIGH** (4.0x - 5.0x ratio): Accuracy rate
- **🔴 EXTREME** (5.0x+ ratio): Accuracy rate

## 🛠️ Usage Commands

### View Current Validation Report
```bash
# View report for current symbol (SPKUSDT)
npm run validation-report

# View report for specific symbol
npm run validation-report BTCUSDT
```

### Example Output
```
🛡️ SentryCoin Signal Validation Report
=====================================

📊 Symbol: SPKUSDT
📈 Total Signals: 15
✅ Validated Signals: 12
⏳ Pending Validation: 3

🎯 ACCURACY SUMMARY
==================
Total Validated: 12
Correct Predictions: 9
Accuracy: 75.00%
Average Max Drop: -3.24%

📊 Accuracy by Risk Level:
   🟡 HIGH: 6/8 (75.0%)
   🟠 VERY HIGH: 2/3 (66.7%)
   🔴 EXTREME: 1/1 (100.0%)
```

## 📁 Data Files

The validation system creates these files:

### `signal-validation-SYMBOL.json`
Complete tracking data for all signals:
```json
{
  "signals": [
    {
      "id": "SIG_1642951234_abc123def",
      "timestamp": "2025-07-23T14:02:34.293Z",
      "istTime": "2025-07-23 19:32:34 IST",
      "symbol": "SPKUSDT",
      "signalPrice": 0.162197,
      "askBidRatio": 3.06,
      "priceTracking": {
        "t0": 0.162197,
        "t1min": 0.158432,
        "t3min": 0.155891,
        "t5min": 0.154223
      },
      "validation": {
        "isValidated": true,
        "accuracy1min": -2.32,
        "accuracy3min": -3.89,
        "accuracy5min": -4.91,
        "maxDrop": -4.91,
        "predictionCorrect": true
      }
    }
  ]
}
```

### `validation-report-SYMBOL.json`
Summary analytics and performance metrics.

## 🎯 Interpreting Results

### High Accuracy (>80%)
- Your danger ratio threshold is well-calibrated
- Market conditions are suitable for flash crash detection
- Consider expanding to monitor more symbols

### Medium Accuracy (60-80%)
- Good performance, minor adjustments may help
- Consider adjusting danger ratio slightly
- Monitor which risk levels perform best

### Low Accuracy (<60%)
- May need to adjust danger ratio threshold
- Market conditions might not be suitable
- Consider different symbols or timeframes

## 🔧 Advanced Features

### Custom Validation Thresholds
You can modify the validation logic in `src/signal-validator.js`:
```javascript
// Change the drop threshold for "correct" predictions
const significantDrop = maxDrop < -2; // Currently 2%
```

### Extended Tracking
Add longer timeframes by modifying the tracking intervals:
```javascript
// Add 10-minute tracking
if (minutesElapsed >= 10 && signal.priceTracking.t10min === null) {
  signal.priceTracking.t10min = currentPrice;
}
```

## 📊 Live Monitoring

Your Azure deployment automatically:
- ✅ Records every flash crash signal
- ✅ Tracks price movements in real-time
- ✅ Validates predictions after 5 minutes
- ✅ Generates accuracy reports
- ✅ Logs validation statistics every 1000 messages

## 🎉 Benefits

1. **Measure Real Performance**: Know exactly how accurate your system is
2. **Optimize Settings**: Adjust danger ratio based on validation data
3. **Build Confidence**: See proof that your alerts are working
4. **Track Improvement**: Monitor accuracy over time
5. **Risk Assessment**: Understand which market conditions work best

## 🚀 Next Steps

1. **Deploy the validation system** to Azure
2. **Let it run for 24-48 hours** to collect data
3. **Review the validation report** to see accuracy
4. **Adjust settings** if needed based on results
5. **Expand to other symbols** if accuracy is high

Your SentryCoin system now has **scientific validation** of its predictions! 🛡️📊
