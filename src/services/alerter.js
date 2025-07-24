import TelegramBot from 'node-telegram-bot-api';
import { getISTTime, getRiskLevel, formatVolume, parseIntEnv } from '../utils/index.js';
import dotenv from 'dotenv';

dotenv.config();

class FlashCrashAlerter {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.lastAlertTime = 0;
    this.cooldownMs = parseIntEnv('COOLDOWN_MINUTES', 5) * 60 * 1000;
  }

  /**
   * Checks if we're still in cooldown period
   * @returns {boolean} True if in cooldown, false if ready to send alert
   */
  isOnCooldown() {
    return Date.now() - this.lastAlertTime < this.cooldownMs;
  }

  /**
   * Sends flash crash alert to Telegram
   * @param {Object} alertData - Alert information
   * @param {string} alertData.symbol - Trading pair symbol
   * @param {number} alertData.askToBidRatio - Current ask/bid volume ratio
   * @param {number} alertData.totalBidVolume - Total bid volume
   * @param {number} alertData.totalAskVolume - Total ask volume
   * @param {number} alertData.currentPrice - Current market price
   */
  async triggerFlashCrashAlert(alertData) {
    // v4.1: Check for custom message (COIL_WATCHER, SHAKEOUT_DETECTOR)
    if (alertData.message) {
      return await this.sendCustomMessage(alertData.message, alertData.alertType);
    }

    // Legacy cooldown check for CASCADE_HUNTER signals
    if (alertData.alertType === 'CASCADE_HUNTER' && this.isOnCooldown()) {
      console.log(`⏰ CASCADE_HUNTER alert suppressed - still in cooldown period`);
      return false;
    }

    const {
      symbol,
      askToBidRatio,
      totalBidVolume,
      totalAskVolume,
      currentPrice
    } = alertData;

    const message = this.formatAlertMessage({
      ...alertData,
      symbol,
      askToBidRatio,
      totalBidVolume,
      totalAskVolume,
      currentPrice
    });

    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      // Only update cooldown for CASCADE_HUNTER signals
      if (alertData.alertType === 'CASCADE_HUNTER') {
        this.lastAlertTime = Date.now();
      }

      console.log(`🚨 ${alertData.alertType || 'Flash crash'} alert sent for ${symbol}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send Telegram alert:', error.message);
      return false;
    }
  }

  /**
   * Send custom message for v4.1 alert types (COIL_WATCHER, SHAKEOUT_DETECTOR)
   */
  async sendCustomMessage(message, alertType) {
    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      console.log(`📱 ${alertType} custom message sent successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to send ${alertType} message:`, error.message);
      return false;
    }
  }

  /**
   * Send test alert to verify Telegram connection
   */
  async sendTestAlert() {
    const testMessage = `🧪 *SENTRYCOIN v4.1 TEST ALERT* 🧪

✅ Telegram connection verified
🤖 Engine: SentryCoin v4.1
📱 Paper Trading Mode: ACTIVE
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

🎯 All three regime detectors are operational:
• CASCADE_HUNTER (Active SHORT Trading)
• COIL_WATCHER (Accumulation Alerts)
• SHAKEOUT_DETECTOR (Stop Hunt Alerts)

🚀 System Status: READY FOR DEPLOYMENT`;

    try {
      await this.bot.sendMessage(this.chatId, testMessage, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      console.log('✅ Test alert sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to send test alert:', error.message);
      return false;
    }
  }

  /**
   * Formats the alert message for Telegram
   * @param {Object} data - Alert data
   * @returns {string} Formatted message
   */
  formatAlertMessage(data) {
    const {
      symbol,
      askToBidRatio,
      totalBidVolume,
      totalAskVolume,
      currentPrice,
      momentum,
      algorithmVersion
    } = data;

    const timestamp = getISTTime();
    const riskLevel = getRiskLevel(askToBidRatio);
    const signalType = data.signalType || data.alertType || 'CRITICAL';
    const confidence = data.confidence || 'HIGH';
    const version = algorithmVersion || 'v4.1';

    // SentryCoin v4.1 CASCADE_HUNTER Signal Formatting
    if (signalType === 'CASCADE_HUNTER' || signalType === 'TRIFECTA_CONVICTION_SIGNAL') {
      const tradingMode = data.paperTrading !== false ? 'PAPER TRADING' : 'LIVE TRADING';

      return `🚨 *SENTRYCOIN v4.1 CASCADE_HUNTER* 🚨

📊 *Asset:* ${symbol} (BINANCE)
💰 *Current Price:* $${currentPrice.toFixed(6)}
⚠️ *Strategy:* SHORT (${confidence} Confidence)
🎯 *Regime:* ${data.regime || 'DISTRIBUTION_PHASE'}
📝 *Mode:* ${tradingMode}

🔥 *CASCADE CONDITIONS MET:*
• *Pressure:* ${askToBidRatio.toFixed(2)}x ✅ (≥3.0x)
• *Liquidity:* ${formatVolume(totalBidVolume)} ✅ (≥100k HIGH)
• *Momentum:* ${momentum.toFixed(3)}% ✅ (≤-0.3% STRONG)

📈 *Market Analysis:*
High liquidity being overwhelmed by massive sell pressure. Active dumping detected in distribution phase.

🎯 *Expected Outcome:* CONTINUED DECLINE
⚡ *Action:* ${data.tradingAction || 'SHORT_EXECUTED'}

⏰ *Time:* ${timestamp}
🤖 *Engine:* SentryCoin v4.1 (Market Intelligence Platform)`;
    }

    // Legacy v4.0 Trifecta formatting for backward compatibility
    if (signalType === 'TRIFECTA_CONVICTION_SIGNAL_LEGACY') {
      return `🚨 *SENTRYCOIN v4.0 TRIFECTA CONVICTION* 🚨

📊 *Asset:* ${symbol} (BINANCE)
💰 *Current Price:* $${currentPrice.toFixed(6)}
⚠️ *Strategy:* SHORT (${confidence} Confidence)
🎯 *Phenomenon:* LIQUIDITY CASCADE

🔥 *TRIFECTA CONDITIONS MET:*
• **Pressure:** ${askToBidRatio.toFixed(2)}x ✅ (≥3.0x)
• **Liquidity:** ${formatVolume(totalBidVolume)} ✅ (≥100k HIGH)
• **Momentum:** ${momentum.toFixed(3)}% ✅ (≤-0.3% STRONG)

📈 *Market Analysis:*
High liquidity being overwhelmed by massive sell pressure. Classic flash crash setup with strong downward momentum.

🎯 *Expected Outcome:* CONTINUED DECLINE
⚡ *Action:* Consider SHORT position or protective measures
🛡️ *Risk:* HIGH - Liquidity cascade in progress

⏰ *Time:* ${timestamp}
🤖 *Engine:* SentryCoin v4.0 (Binance Edition)`;
    }

    if (signalType === 'ABSORPTION_SQUEEZE_SIGNAL') {
      return `🔄 *SENTRYCOIN v4.0 ABSORPTION SQUEEZE* 🔄

📊 *Asset:* ${symbol} (BINANCE)
💰 *Current Price:* $${currentPrice.toFixed(6)}
⚠️ *Strategy:* LONG (${confidence} Confidence)
🎯 *Phenomenon:* FORCED ABSORPTION

🔄 *SQUEEZE CONDITIONS MET:*
• **Pressure:** ${askToBidRatio.toFixed(2)}x ✅ (≥3.0x)
• **Liquidity:** ${formatVolume(totalBidVolume)} ✅ (<50k LOW)
• **Momentum:** ${momentum.toFixed(3)}% ✅ (-0.2% to +0.2% WEAK)

📈 *Market Analysis:*
Thin liquidity absorbing sell pressure with weak momentum. Sellers being absorbed by resilient buyers.

🎯 *Expected Outcome:* MEAN REVERSION UP
⚡ *Action:* Consider LONG position on absorption
🛡️ *Risk:* MEDIUM - Forced absorption pattern

⏰ *Time:* ${timestamp}
🤖 *Engine:* SentryCoin v4.0 (Binance Edition)`;
    }

    if (signalType === 'PRESSURE_SPIKE_SIGNAL') {
      return `🔥 *SENTRYCOIN v4.0 PRESSURE SPIKE* 🔥

📊 *Asset:* ${symbol} (BINANCE)
💰 *Current Price:* $${currentPrice.toFixed(6)}
⚠️ *Strategy:* NEUTRAL (${confidence} Confidence)
🎯 *Phenomenon:* VOLATILITY BREAKOUT PENDING

🔥 *PRESSURE SPIKE CONDITIONS MET:*
• **Pressure:** ${askToBidRatio.toFixed(2)}x ✅ (≥3.0x)
• **Liquidity:** ${formatVolume(totalBidVolume)} ✅ (50k-100k MID)
• **Momentum:** ${momentum.toFixed(3)}% ✅ (-0.2% to +0.2% WEAK)

📈 *Market Analysis:*
High pressure building in mid-liquidity zone. Market is coiled and ready to break in either direction.

🎯 *Expected Outcome:* VOLATILITY BREAKOUT
⚡ *Action:* Prepare for directional breakout - high volatility imminent
🛡️ *Risk:* HIGH - Explosive move pending

⏰ *Time:* ${timestamp}
🤖 *Engine:* SentryCoin v4.0 (Binance Edition)`;
    }

    // Legacy Trifecta Algorithm (v3.0) formatting - fallback
    if (signalType === 'TRIFECTA' && version === 'v3.0') {
      const pressureCondition = askToBidRatio > 3.0;
      const liquidityCondition = totalBidVolume < 100000;
      const momentumCondition = momentum <= -0.1;

      return `🚨 *SENTRYCOIN v3.0 TRIFECTA ALERT* 🚨

📊 *Asset:* ${symbol}
💰 *Current Price:* $${currentPrice.toFixed(6)}
⚠️ *Risk Level:* ${riskLevel}
🎯 *Signal Type:* ${signalType} (${confidence} Confidence)

🔥 *TRIFECTA CONDITIONS MET:*
• **Pressure:** ${askToBidRatio.toFixed(2)}x ${pressureCondition ? '✅' : '❌'} (>3.0x)
• **Liquidity:** ${formatVolume(totalBidVolume)} ${liquidityCondition ? '✅' : '❌'} (<100k)
• **Momentum:** ${momentum.toFixed(2)}% ${momentumCondition ? '✅' : '❌'} (≤-0.1%)

📈 *Market Analysis:*
• Total Ask Volume: ${formatVolume(totalAskVolume)}
• Sell Pressure: EXTREME
• Buy Support: FRAGILE
• Market Trend: BEARISH

🎯 *Analysis:* PERFECT STORM - All three crash conditions aligned
⚡ *Implication:* VERY HIGH probability of imminent flash crash
🛡️ *Action:* IMMEDIATE attention required - Consider protective measures

⏰ *Time:* ${timestamp}
🤖 *Engine:* SentryCoin Predictor v3.0 (Trifecta Algorithm)`;
    }

    // Golden Signal Algorithm (v2.0) formatting - fallback
    const isGoldenSignal = askToBidRatio >= 2.75 && totalBidVolume < 100000;

    return `🚨 *SENTRYCOIN v2.0 ${signalType} ALERT* 🚨

📊 *Asset:* ${symbol}
💰 *Current Price:* $${currentPrice.toFixed(6)}
⚠️ *Risk Level:* ${riskLevel}
🎯 *Signal Type:* ${signalType} (${confidence} Confidence)

📈 *Golden Signal Analysis:*
• Ask/Bid Ratio: *${askToBidRatio.toFixed(2)}x* ${askToBidRatio >= 2.75 ? '✅' : '❌'} (Threshold: ≥2.75x)
• Total Bid Volume: ${formatVolume(totalBidVolume)} ${totalBidVolume < 100000 ? '✅' : '❌'} (Threshold: <100k)
• Total Ask Volume: ${formatVolume(totalAskVolume)}
• Golden Signal: ${isGoldenSignal ? '🟢 CONFIRMED' : '🟡 PARTIAL'}

🎯 *Analysis:* ${isGoldenSignal ? 'CRITICAL liquidity crisis detected' : 'Market stress indicators present'}
⚡ *Implication:* ${isGoldenSignal ? 'HIGH probability of imminent flash crash' : 'Elevated crash risk - monitor closely'}
🛡️ *Action:* ${isGoldenSignal ? 'IMMEDIATE attention required' : 'Increased vigilance recommended'}

⏰ *Time:* ${timestamp}
🤖 *Engine:* SentryCoin Predictor v2.0 (Golden Signal Algorithm)`;
  }



  /**
   * Sends a test alert to verify Telegram configuration
   */
  async sendTestAlert() {
    const timestamp = getISTTime();

    const testMessage = `🧪 *SentryCoin Test Alert*

This is a test message to verify your Telegram configuration is working correctly.

⏰ Time: ${timestamp}
🤖 Status: System operational`;

    try {
      await this.bot.sendMessage(this.chatId, testMessage, {
        parse_mode: 'Markdown'
      });
      console.log('✅ Test alert sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Test alert failed:', error.message);
      return false;
    }
  }
}

export default FlashCrashAlerter;
