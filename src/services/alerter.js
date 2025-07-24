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
    if (this.isOnCooldown()) {
      console.log(`⏰ Alert suppressed - still in cooldown period`);
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

      this.lastAlertTime = Date.now();
      console.log(`🚨 Flash crash alert sent for ${symbol}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send Telegram alert:', error.message);
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
    const signalType = data.signalType || 'CRITICAL';
    const confidence = data.confidence || 'HIGH';
    const version = algorithmVersion || 'v2.0';

    // Trifecta Algorithm (v3.0) formatting
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
