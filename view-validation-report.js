#!/usr/bin/env node

/**
 * Signal Validation Report Viewer
 * View accuracy reports for flash crash predictions
 */

import fs from 'fs';
import path from 'path';

class ValidationReportViewer {
  constructor() {
    this.symbol = process.argv[2] || process.env.SYMBOL || 'BTCUSDT';
  }

  async viewReport() {
    console.log('🛡️ SentryCoin Signal Validation Report');
    console.log('=====================================\n');

    try {
      // Load validation data
      const dataFile = `signal-validation-${this.symbol}.json`;
      const reportFile = `validation-report-${this.symbol}.json`;

      if (!fs.existsSync(dataFile)) {
        console.log(`❌ No validation data found for ${this.symbol}`);
        console.log(`💡 File expected: ${dataFile}`);
        return;
      }

      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      
      console.log(`📊 Symbol: ${this.symbol}`);
      console.log(`📈 Total Signals: ${data.signals.length}`);
      console.log(`✅ Validated Signals: ${data.validationResults.length}`);
      console.log(`⏳ Pending Validation: ${data.signals.length - data.validationResults.length}`);
      console.log('');

      if (data.validationResults.length === 0) {
        console.log('⏳ No validated signals yet. Signals need 5 minutes to complete validation.');
        this.showPendingSignals(data.signals);
        return;
      }

      // Show accuracy summary
      this.showAccuracySummary(data.validationResults);
      
      // Show recent signals
      this.showRecentSignals(data.signals.slice(-5));
      
      // Show detailed validation results
      this.showValidationDetails(data.validationResults.slice(-10));

      // Load and show report if available
      if (fs.existsSync(reportFile)) {
        const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        this.showDetailedReport(report);
      }

    } catch (error) {
      console.error('❌ Error reading validation data:', error.message);
    }
  }

  showAccuracySummary(results) {
    const total = results.length;
    const correct = results.filter(r => r.correct).length;
    const accuracy = (correct / total) * 100;

    console.log('🎯 ACCURACY SUMMARY');
    console.log('==================');
    console.log(`Total Validated: ${total}`);
    console.log(`Correct Predictions: ${correct}`);
    console.log(`Accuracy: ${accuracy.toFixed(2)}%`);
    
    // Calculate average max drop
    const avgDrop = results.reduce((sum, r) => sum + r.maxDrop, 0) / total;
    console.log(`Average Max Drop: ${avgDrop.toFixed(2)}%`);
    console.log('');
  }

  showPendingSignals(signals) {
    const pending = signals.filter(s => !s.validation.isValidated);
    if (pending.length === 0) return;

    console.log('⏳ PENDING VALIDATION');
    console.log('====================');
    pending.slice(-5).forEach(signal => {
      const timeElapsed = (Date.now() - new Date(signal.timestamp)) / (1000 * 60);
      console.log(`${signal.id}: $${signal.signalPrice.toFixed(6)} (${timeElapsed.toFixed(1)}min ago)`);
    });
    console.log('');
  }

  showRecentSignals(signals) {
    console.log('📊 RECENT SIGNALS');
    console.log('================');
    signals.forEach(signal => {
      const status = signal.validation.isValidated ? 
        (signal.validation.predictionCorrect ? '✅ CORRECT' : '❌ INCORRECT') : 
        '⏳ PENDING';
      
      console.log(`${signal.istTime}: $${signal.signalPrice.toFixed(6)} ${signal.riskLevel} - ${status}`);
      
      if (signal.validation.isValidated) {
        console.log(`   Max Drop: ${signal.validation.maxDrop.toFixed(2)}%`);
      }
    });
    console.log('');
  }

  showValidationDetails(results) {
    console.log('📈 VALIDATION DETAILS (Last 10)');
    console.log('===============================');

    results.forEach(result => {
      const status = result.correct ? '✅' : '❌';
      console.log(`${status} Signal: $${result.signalPrice.toFixed(6)} → Max Drop: ${result.maxDrop.toFixed(2)}%`);
      console.log(`   Risk Level: ${result.riskLevel} | Ratio: ${result.askBidRatio.toFixed(2)}x`);
      console.log(`   Time: ${new Date(result.timestamp).toLocaleString()}`);

      // Show detailed timeline if available
      const signal = this.findSignalById(result.signalId);
      if (signal && signal.validation.isValidated) {
        const v = signal.validation;
        console.log(`   Immediate Reaction (10s): ${v.accuracy10sec?.toFixed(2) || 'N/A'}%`);
        console.log(`   Timeline: 10s(${v.accuracy10sec?.toFixed(2) || 'N/A'}%) → 30s(${v.accuracy30sec?.toFixed(2) || 'N/A'}%) → 1m(${v.accuracy1min?.toFixed(2) || 'N/A'}%) → 3m(${v.accuracy3min?.toFixed(2) || 'N/A'}%) → 5m(${v.accuracy5min?.toFixed(2) || 'N/A'}%) → 10m(${v.accuracy10min?.toFixed(2) || 'N/A'}%) → 15m(${v.accuracy15min?.toFixed(2) || 'N/A'}%)`);
        if (v.fastestDrop) {
          console.log(`   Fastest Drop: >1% within ${v.fastestDrop}`);
        }
      }
      console.log('');
    });
  }

  findSignalById(signalId) {
    try {
      const dataFile = `signal-validation-${this.symbol}.json`;
      if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        return data.signals.find(s => s.id === signalId);
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  showDetailedReport(report) {
    console.log('📋 DETAILED ANALYSIS');
    console.log('===================');
    console.log(`Report Generated: ${report.istTime}`);
    console.log(`Overall Accuracy: ${report.accuracy.toFixed(2)}%`);
    console.log('');

    console.log('📊 Accuracy by Risk Level:');
    Object.entries(report.breakdown.byRiskLevel).forEach(([level, stats]) => {
      if (stats.total > 0) {
        console.log(`   ${level}: ${stats.correct}/${stats.total} (${stats.accuracy.toFixed(1)}%)`);
      }
    });
    console.log('');

    console.log('🔥 Recent Performance (Last 10):');
    const recent = report.breakdown.recentPerformance;
    console.log(`   ${recent.correct}/${recent.total} (${recent.accuracy.toFixed(1)}%)`);
    console.log('');
  }

  showUsage() {
    console.log('Usage: node view-validation-report.js [SYMBOL]');
    console.log('');
    console.log('Examples:');
    console.log('  node view-validation-report.js BTCUSDT');
    console.log('  node view-validation-report.js SOLUSDT');
    console.log('');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const viewer = new ValidationReportViewer();
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    viewer.showUsage();
  } else {
    viewer.viewReport();
  }
}

export default ValidationReportViewer;
