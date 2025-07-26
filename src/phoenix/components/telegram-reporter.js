/**
 * Phoenix v6.0 - Telegram Reporter
 * 
 * Handles all Telegram notifications and alerts for the Phoenix Engine.
 * Provides structured messaging with priority levels and rate limiting.
 */

import axios from 'axios';
import { getISTTime } from '../../utils/index.js';

export default class TelegramReporter {
  constructor(config = {}) {
    this.botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = config.chatId || process.env.TELEGRAM_CHAT_ID;
    this.enabled = !!(this.botToken && this.chatId);
    
    // Rate limiting
    this.lastMessageTime = 0;
    this.minInterval = 1000; // 1 second between messages
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    // Statistics
    this.stats = {
      messagesSent: 0,
      messagesQueued: 0,
      messagesFailed: 0,
      startTime: Date.now()
    };
    
    if (!this.enabled) {
      console.log('⚠️ Telegram Reporter disabled - missing bot token or chat ID');
    }
  }

  /**
   * Initialize Telegram reporter
   */
  async initialize() {
    if (!this.enabled) {
      return false;
    }
    
    try {
      // Test bot connection
      const response = await axios.get(`https://api.telegram.org/bot${this.botToken}/getMe`, {
        timeout: 10000
      });
      
      if (response.data.ok) {
        console.log(`📱 Telegram Reporter initialized: @${response.data.result.username}`);
        
        // Start queue processor
        this.startQueueProcessor();
        
        return true;
      } else {
        throw new Error('Invalid bot token');
      }
      
    } catch (error) {
      console.error('❌ Telegram Reporter initialization failed:', error.message);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Send alert message
   */
  async sendAlert(alert) {
    if (!this.enabled) {
      return false;
    }
    
    const message = this.formatAlert(alert);
    return this.queueMessage(message, alert.priority);
  }

  /**
   * Send custom message
   */
  async sendMessage(text, priority = 'NORMAL') {
    if (!this.enabled) {
      return false;
    }
    
    return this.queueMessage(text, priority);
  }

  /**
   * Format alert into Telegram message
   */
  formatAlert(alert) {
    const { type, title, message, priority, data } = alert;
    
    let emoji = '📊';
    switch (priority) {
      case 'CRITICAL':
        emoji = '🚨';
        break;
      case 'HIGH':
        emoji = '⚠️';
        break;
      case 'NORMAL':
        emoji = '📊';
        break;
      case 'LOW':
        emoji = 'ℹ️';
        break;
    }
    
    let formattedMessage = `${emoji} *${title}*\n\n${message}`;
    
    // Add timestamp
    formattedMessage += `\n\n🕐 ${getISTTime()}`;
    
    // Add data if provided
    if (data && Object.keys(data).length > 0) {
      formattedMessage += '\n\n📋 *Details:*';
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object') {
          formattedMessage += `\n• ${key}: \`${JSON.stringify(value)}\``;
        } else {
          formattedMessage += `\n• ${key}: \`${value}\``;
        }
      });
    }
    
    return formattedMessage;
  }

  /**
   * Queue message for sending
   */
  async queueMessage(text, priority = 'NORMAL') {
    const message = {
      text,
      priority,
      timestamp: Date.now(),
      retries: 0
    };
    
    // Insert based on priority
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 };
    const messagePriority = priorityOrder[priority] || 2;
    
    let insertIndex = this.messageQueue.length;
    for (let i = 0; i < this.messageQueue.length; i++) {
      const queuedPriority = priorityOrder[this.messageQueue[i].priority] || 2;
      if (messagePriority < queuedPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.messageQueue.splice(insertIndex, 0, message);
    this.stats.messagesQueued++;
    
    return true;
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    const processQueue = async () => {
      if (this.messageQueue.length === 0) {
        setTimeout(processQueue, 1000);
        return;
      }
      
      // Check rate limiting
      const now = Date.now();
      if (now - this.lastMessageTime < this.minInterval) {
        setTimeout(processQueue, this.minInterval - (now - this.lastMessageTime));
        return;
      }
      
      const message = this.messageQueue.shift();
      const success = await this.sendMessageDirect(message);
      
      if (!success && message.retries < 3) {
        message.retries++;
        this.messageQueue.unshift(message); // Retry at front of queue
      }
      
      this.lastMessageTime = Date.now();
      setTimeout(processQueue, this.minInterval);
    };
    
    processQueue();
  }

  /**
   * Send message directly to Telegram
   */
  async sendMessageDirect(message) {
    try {
      const response = await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.chatId,
        text: message.text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }, {
        timeout: 10000
      });
      
      if (response.data.ok) {
        this.stats.messagesSent++;
        return true;
      } else {
        throw new Error(response.data.description || 'Unknown Telegram API error');
      }
      
    } catch (error) {
      console.error('❌ Telegram message failed:', error.message);
      this.stats.messagesFailed++;
      return false;
    }
  }

  /**
   * Send whale alert
   */
  async sendWhaleAlert(intent) {
    const { whaleAddress, estimatedValue, targetExchange, threatLevel, detectionLatency } = intent;
    
    let emoji = '🐋';
    if (threatLevel === 'CRITICAL') emoji = '🚨🐋';
    else if (threatLevel === 'HIGH') emoji = '⚠️🐋';
    
    const message = `${emoji} *WHALE INTENT DETECTED*

🏦 *Address:* \`${whaleAddress.substring(0, 10)}...${whaleAddress.substring(whaleAddress.length - 8)}\`
💰 *Value:* $${estimatedValue.toLocaleString()}
🏢 *Exchange:* ${targetExchange || 'Unknown'}
⚡ *Detection:* ${detectionLatency}ms
🎯 *Threat Level:* ${threatLevel}`;
    
    return this.queueMessage(message, threatLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH');
  }

  /**
   * Send system status update
   */
  async sendSystemStatus(status) {
    const { version, systemHealth, metrics } = status;
    
    const healthEmojis = {
      'ONLINE': '✅',
      'OFFLINE': '❌',
      'WARNING': '⚠️'
    };
    
    let message = `🔥 *PHOENIX ENGINE STATUS*

🛡️ *Version:* ${version}
📊 *Uptime:* ${Math.floor(metrics.systemUptime / 60)} minutes

🎯 *Component Health:*`;
    
    Object.entries(systemHealth).forEach(([component, health]) => {
      const emoji = healthEmojis[health] || '❓';
      message += `\n• ${component}: ${emoji} ${health}`;
    });
    
    message += `\n\n📈 *Performance:*
• Whale Intents: ${metrics.whaleIntentsDetected}
• Derivatives Updates: ${metrics.derivativesUpdates}
• Tasks Executed: ${metrics.tasksExecuted}`;
    
    return this.queueMessage(message, 'NORMAL');
  }

  /**
   * Send derivatives alert
   */
  async sendDerivativesAlert(alert) {
    const { type, data } = alert;
    
    let emoji = '📊';
    let title = 'Derivatives Alert';
    
    switch (type) {
      case 'FUNDING_SPIKE':
        emoji = '💸';
        title = 'Funding Rate Spike';
        break;
      case 'OI_SPIKE':
        emoji = '📈';
        title = 'Open Interest Spike';
        break;
      case 'HIGH_VOLATILITY':
        emoji = '⚡';
        title = 'High Volatility';
        break;
    }
    
    const message = `${emoji} *${title.toUpperCase()}*

📊 *Type:* ${type}
🏢 *Exchange:* ${data.exchange || 'Multiple'}
📈 *Details:* \`${JSON.stringify(data, null, 2)}\``;
    
    return this.queueMessage(message, 'NORMAL');
  }

  /**
   * Get statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      enabled: this.enabled,
      queueSize: this.messageQueue.length,
      messagesPerMinute: Math.round((this.stats.messagesSent / (uptime / 60000)) * 100) / 100
    };
  }

  /**
   * Shutdown reporter
   */
  async shutdown() {
    console.log('📱 Shutting down Telegram Reporter...');
    
    // Send final message
    if (this.enabled && this.messageQueue.length === 0) {
      await this.sendMessage('🛑 Phoenix Engine shutting down gracefully', 'NORMAL');
      
      // Wait for message to send
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    this.isProcessingQueue = false;
  }
}
