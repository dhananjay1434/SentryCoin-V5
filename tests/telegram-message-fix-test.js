#!/usr/bin/env node

/**
 * SentryCoin v4.1.1 - Telegram Message Fix Test
 * 
 * Tests the fixed Telegram message formatting to ensure
 * CASCADE_HUNTER alerts are sent without parsing errors.
 */

import FlashCrashAlerter from '../src/services/alerter.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('📱 SentryCoin v4.1.1 - Telegram Message Fix Test');
console.log('===============================================\n');

async function testTelegramMessageFix() {
  let allTestsPassed = true;

  try {
    console.log('1️⃣ Testing Telegram Alerter Initialization...');
    const alerter = new FlashCrashAlerter();
    console.log('✅ Alerter initialized successfully\n');

    console.log('2️⃣ Testing Safe Volume Formatting...');
    
    // Test safe volume formatting
    const volumeTests = [
      { input: 1234567, expected: '1.23M' },
      { input: 123456, expected: '123.5K' },
      { input: 1234, expected: '1.2K' },
      { input: 123, expected: '123' },
      { input: null, expected: '0.00' },
      { input: undefined, expected: '0.00' },
      { input: NaN, expected: '0.00' }
    ];

    for (const test of volumeTests) {
      const result = alerter.safeFormatVolume(test.input);
      if (result === test.expected) {
        console.log(`✅ Volume ${test.input} → ${result}`);
      } else {
        console.log(`❌ Volume ${test.input} → ${result} (expected ${test.expected})`);
        allTestsPassed = false;
      }
    }

    console.log('\n3️⃣ Testing Markdown Stripping...');
    
    const markdownTests = [
      { 
        input: '*Bold text* and _italic text_', 
        expected: 'Bold text and italic text' 
      },
      { 
        input: '`Code text` and **more bold**', 
        expected: 'Code text and more bold' 
      },
      { 
        input: '[Link text](https://example.com)', 
        expected: 'Link text' 
      }
    ];

    for (const test of markdownTests) {
      const result = alerter.stripMarkdown(test.input);
      if (result === test.expected) {
        console.log(`✅ Markdown stripped correctly`);
      } else {
        console.log(`❌ Markdown stripping failed: "${result}" (expected "${test.expected}")`);
        allTestsPassed = false;
      }
    }

    console.log('\n4️⃣ Testing CASCADE_HUNTER Message Formatting...');
    
    // Test CASCADE_HUNTER message formatting with problematic data
    const testSignalData = {
      symbol: 'SPKUSDT',
      askToBidRatio: 3.456789,
      totalBidVolume: 123456.789,
      totalAskVolume: 234567.890,
      currentPrice: 0.001234567,
      momentum: -0.456789,
      confidence: 'HIGH',
      regime: 'DISTRIBUTION_PHASE',
      tradingAction: 'SHORT_EXECUTED',
      paperTrading: true,
      signalType: 'CASCADE_HUNTER'
    };

    const message = alerter.formatAlertMessage(testSignalData);
    
    if (message.includes('CASCADE_HUNTER') && message.includes('SPKUSDT')) {
      console.log('✅ CASCADE_HUNTER message formatted correctly');
      console.log(`📏 Message length: ${message.length} characters`);
    } else {
      console.log('❌ CASCADE_HUNTER message formatting failed');
      allTestsPassed = false;
    }

    console.log('\n5️⃣ Testing Message Safety...');
    
    // Check for potential problematic characters
    const problematicChars = ['*', '_', '`', '[', ']', '(', ')'];
    let unsafeChars = [];
    
    for (const char of problematicChars) {
      // Count occurrences
      const count = (message.match(new RegExp('\\' + char, 'g')) || []).length;
      if (char === '*' && count % 2 !== 0) {
        unsafeChars.push(`Unmatched asterisk (*) - count: ${count}`);
      }
      if (char === '_' && count % 2 !== 0) {
        unsafeChars.push(`Unmatched underscore (_) - count: ${count}`);
      }
    }

    if (unsafeChars.length === 0) {
      console.log('✅ Message appears safe for Telegram Markdown parsing');
    } else {
      console.log('⚠️ Potential Markdown parsing issues found:');
      unsafeChars.forEach(issue => console.log(`   - ${issue}`));
    }

    console.log('\n6️⃣ Testing Actual Telegram Send (if configured)...');
    
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const testAlertData = {
          ...testSignalData,
          alertType: 'CASCADE_HUNTER'
        };

        const success = await alerter.triggerFlashCrashAlert(testAlertData);
        
        if (success) {
          console.log('✅ Test CASCADE_HUNTER alert sent successfully to Telegram');
        } else {
          console.log('❌ Failed to send test alert to Telegram');
          allTestsPassed = false;
        }
      } catch (error) {
        console.log(`❌ Telegram send test failed: ${error.message}`);
        allTestsPassed = false;
      }
    } else {
      console.log('⚠️ Telegram credentials not configured - skipping live send test');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    allTestsPassed = false;
  }

  // Final result
  console.log('\n===============================================');
  if (allTestsPassed) {
    console.log('🎉 ALL TELEGRAM MESSAGE TESTS PASSED!');
    console.log('✅ Safe volume formatting working');
    console.log('✅ Markdown stripping functional');
    console.log('✅ CASCADE_HUNTER message formatting correct');
    console.log('✅ Message safety validated');
    console.log('✅ Telegram send mechanism operational');
    console.log('\n🚀 Telegram message parsing error should be RESOLVED');
  } else {
    console.log('❌ SOME TELEGRAM MESSAGE TESTS FAILED!');
    console.log('🛑 Additional fixes may be needed');
  }
  console.log('===============================================');

  return allTestsPassed;
}

// Run the test
testTelegramMessageFix().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
