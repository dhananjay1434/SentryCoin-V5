import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

class FlashCrashAlerter {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.lastAlertTime = 0;
    this.cooldownMs = (parseInt(process.env.COOLDOWN_MINUTES) || 5) * 60 * 1000;
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
      currentPrice
    } = data;

    // Convert to Indian Standard Time (IST = UTC + 5:30)
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const timestamp = istTime.toISOString().replace('T', ' ').substring(0, 19) + ' IST';
    const riskLevel = this.getRiskLevel(askToBidRatio);

    return `🚨 *SENTRYCOIN FLASH CRASH WARNING* 🚨

📊 *Asset:* ${symbol}
💰 *Current Price:* $${currentPrice.toFixed(6)}
⚠️ *Risk Level:* ${riskLevel}

📈 *Order Book Analysis:*
• Ask/Bid Ratio: *${askToBidRatio.toFixed(2)}x*
• Total Bid Volume: ${this.formatVolume(totalBidVolume)}
• Total Ask Volume: ${this.formatVolume(totalAskVolume)}

🎯 *Signal:* Severe order book imbalance detected
⚡ *Implication:* High probability of imminent sharp drop
🛡️ *Action:* Thin buy-side support - monitor closely

⏰ *Time:* ${timestamp}
🤖 *Engine:* SentryCoin Predictor v1.0`;
  }

  /**
   * Determines risk level based on ask/bid ratio
   * @param {number} ratio - Ask to bid ratio
   * @returns {string} Risk level description
   */
  getRiskLevel(ratio) {
    if (ratio >= 5.0) return '🔴 EXTREME';
    if (ratio >= 4.0) return '🟠 VERY HIGH';
    if (ratio >= 3.0) return '🟡 HIGH';
    return '🟢 MODERATE';
  }

  /**
   * Formats volume numbers for display
   * @param {number} volume - Volume to format
   * @returns {string} Formatted volume string
   */
  formatVolume(volume) {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  }

  /**
   * Sends a test alert to verify Telegram configuration
   */
  async sendTestAlert() {
    // Convert to Indian Standard Time (IST = UTC + 5:30)
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const timestamp = istTime.toISOString().replace('T', ' ').substring(0, 19) + ' IST';

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
