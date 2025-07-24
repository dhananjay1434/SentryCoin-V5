import TelegramBot from 'node-telegram-bot-api';
import { getISTTime, getRiskLevel, formatVolume, parseIntEnv } from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

class FlashCrashAlerter {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;

    // Validate Telegram configuration
    if (!this.botToken || !this.chatId) {
      console.warn('⚠️ Telegram configuration missing:');
      console.warn(`   Bot Token: ${this.botToken ? '✅ Set' : '❌ Missing'}`);
      console.warn(`   Chat ID: ${this.chatId ? '✅ Set' : '❌ Missing'}`);
    } else {
      console.log('✅ Telegram configuration loaded successfully');
    }

    this.bot = new TelegramBot(this.botToken, { polling: false });
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
    // Check Telegram configuration
    if (!this.botToken || !this.chatId) {
      console.error('❌ Cannot send alert: Telegram configuration missing');
      console.error('   Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables');
      return false;
    }

    if (this.isOnCooldown()) {
      console.log(`⏰ Alert suppressed - still in cooldown period`);
      return false;
    }

    const message = this.formatAlertMessage(alertData);

    try {
      console.log(`📤 Sending Telegram alert to chat ${this.chatId}...`);

      await this.bot.sendMessage(this.chatId, message, {
        disable_web_page_preview: true
      });

      this.lastAlertTime = Date.now();
      console.log(`🚨 Flash crash alert sent successfully for ${alertData.symbol}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send Telegram alert:', error.message);
      console.error('   Bot Token:', this.botToken ? 'Present' : 'Missing');
      console.error('   Chat ID:', this.chatId ? this.chatId : 'Missing');

      // Try to provide helpful error messages
      if (error.message.includes('chat not found')) {
        console.error('💡 Tip: Make sure the chat ID is correct and the bot has access to the chat');
      } else if (error.message.includes('bot was blocked')) {
        console.error('💡 Tip: The bot was blocked by the user. Unblock it in Telegram');
      } else if (error.message.includes('Unauthorized')) {
        console.error('💡 Tip: Check if the bot token is correct');
      }

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
      algorithmVersion,
      alertType,
      premiumSignal,
      tradingAction,
      confidence
    } = data;

    const timestamp = getISTTime();
    const riskLevel = getRiskLevel(askToBidRatio);
    const signalType = data.signalType || alertType || 'CRITICAL';
    const finalConfidence = confidence || data.confidence || 'HIGH';
    const version = algorithmVersion || 'v4.0';

    // SentryCoin v4.0 Trifecta Conviction Alert
    if (alertType === 'TRIFECTA_CONVICTION' || signalType === 'TRIFECTA_CONVICTION_SIGNAL') {
      return `🚨 SENTRYCOIN v4.0 TRIFECTA CONVICTION 🚨

📊 Asset: ${symbol}
💰 Current Price: $${currentPrice.toFixed(6)}
⚠️ Risk Level: ${riskLevel}

📈 Market Analysis:
• Ask/Bid Ratio: ${askToBidRatio.toFixed(2)}x
• Total Bid Volume: ${formatVolume(totalBidVolume)}
• Total Ask Volume: ${formatVolume(totalAskVolume)}
• Price Momentum: ${momentum.toFixed(2)}%

🎯 Signal Analysis:
• Type: LIQUIDITY CASCADE
• Confidence: ${finalConfidence}
• Strategy: SHORT RECOMMENDED
• Expected: CONTINUED DECLINE

⚡ Implication: Strong negative momentum with severe order book imbalance
🛡️ Action: HIGH probability flash crash - Consider protective measures

⏰ Time: ${timestamp}
🤖 Engine: SentryCoin v4.0 Dual-Strategy Engine`;
    }

    // Trifecta Algorithm (v3.0) formatting - legacy support
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
