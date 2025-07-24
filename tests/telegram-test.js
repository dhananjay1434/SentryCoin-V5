#!/usr/bin/env node

/**
 * SentryCoin v4.0 - Telegram Configuration Test
 * 
 * Quick test to verify Telegram bot setup
 */

import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

console.log('📱 SentryCoin v4.0 Telegram Test\n');

// Check environment variables
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log('🔍 Configuration Check:');
console.log(`   Bot Token: ${botToken ? '✅ SET' : '❌ MISSING'} ${botToken ? `(${botToken.substring(0, 10)}...)` : ''}`);
console.log(`   Chat ID: ${chatId ? '✅ SET' : '❌ MISSING'} ${chatId ? `(${chatId})` : ''}`);

if (!botToken || !chatId) {
  console.log('\n❌ TELEGRAM CONFIGURATION MISSING!');
  console.log('\n📋 Setup Instructions:');
  console.log('1. Message @BotFather on Telegram');
  console.log('2. Send: /newbot');
  console.log('3. Follow prompts to create bot');
  console.log('4. Copy the bot token');
  console.log('5. Message @userinfobot to get your chat ID');
  console.log('6. Add to .env file:');
  console.log('   TELEGRAM_BOT_TOKEN=your_bot_token_here');
  console.log('   TELEGRAM_CHAT_ID=your_chat_id_here');
  process.exit(1);
}

// Test message
const testMessage = `🧪 SentryCoin v4.0 Test Message

✅ Telegram configuration is working!
🤖 Bot Token: Configured
💬 Chat ID: ${chatId}
⏰ Time: ${new Date().toISOString()}

🚀 Your SentryCoin alerts will be delivered here!`;

console.log('\n📤 Sending test message...');

// Send test message
const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
const data = JSON.stringify({
  chat_id: chatId,
  text: testMessage,
  parse_mode: 'Markdown'
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(url, options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      
      if (response.ok) {
        console.log('✅ TEST MESSAGE SENT SUCCESSFULLY!');
        console.log(`   Message ID: ${response.result.message_id}`);
        console.log(`   Chat: ${response.result.chat.first_name || response.result.chat.title}`);
        console.log('\n🎉 Telegram configuration is working correctly!');
        console.log('📱 Check your Telegram for the test message.');
      } else {
        console.log('❌ TELEGRAM API ERROR:');
        console.log(`   Error Code: ${response.error_code}`);
        console.log(`   Description: ${response.description}`);
        
        if (response.error_code === 400) {
          console.log('\n💡 Common fixes:');
          console.log('   - Check your Chat ID is correct');
          console.log('   - Make sure you started a chat with your bot first');
        } else if (response.error_code === 401) {
          console.log('\n💡 Common fixes:');
          console.log('   - Check your Bot Token is correct');
          console.log('   - Make sure the token is from @BotFather');
        }
      }
    } catch (error) {
      console.log('❌ FAILED TO PARSE RESPONSE:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ REQUEST FAILED:', error.message);
  console.log('\n💡 Possible issues:');
  console.log('   - Internet connection problem');
  console.log('   - Telegram API temporarily unavailable');
});

req.write(data);
req.end();
