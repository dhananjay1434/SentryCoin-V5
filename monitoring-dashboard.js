/**
 * Real-time Monitoring Dashboard for Quantitative Analysis
 * 
 * Provides live monitoring of:
 * - Predictive cascade alerts and their outcomes
 * - Shadow trading P&L and performance metrics
 * - Wavelet energy scores and OFI time series
 * - Strategy comparison (Trifecta vs Wavelet)
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MonitoringDashboard {
  constructor(sentryCoinInstance) {
    this.sentrycoin = sentryCoinInstance;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server);
    
    // Monitoring data
    this.predictiveAlerts = [];
    this.strategyComparison = {
      trifecta: { trades: 0, pnl: 0, winRate: 0 },
      wavelet: { trades: 0, pnl: 0, winRate: 0 }
    };
    
    this.setupRoutes();
    this.setupWebSocket();
    this.setupEventListeners();
  }

  setupRoutes() {
    // Serve static dashboard files
    this.app.use(express.static(path.join(__dirname, 'dashboard')));
    
    // API endpoints for dashboard data
    this.app.get('/api/dashboard/overview', this.getDashboardOverview.bind(this));
    this.app.get('/api/dashboard/predictive-alerts', this.getPredictiveAlerts.bind(this));
    this.app.get('/api/dashboard/strategy-comparison', this.getStrategyComparison.bind(this));
    this.app.get('/api/dashboard/wavelet-energy', this.getWaveletEnergy.bind(this));
    this.app.get('/api/dashboard/live-metrics', this.getLiveMetrics.bind(this));
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log('📊 Dashboard client connected');
      
      // Send initial data
      socket.emit('dashboard-data', this.getDashboardData());
      
      socket.on('disconnect', () => {
        console.log('📊 Dashboard client disconnected');
      });
    });
  }

  setupEventListeners() {
    if (!this.sentrycoin) return;

    // Monitor predictive signals
    if (this.sentrycoin.waveletAnalyzer) {
      this.sentrycoin.waveletAnalyzer.on('predictiveSignal', (signal) => {
        this.handlePredictiveSignal(signal);
      });

      this.sentrycoin.waveletAnalyzer.on('predictionConfirmed', (confirmation) => {
        this.handlePredictionConfirmation(confirmation);
      });
    }

    // Monitor shadow trading
    if (this.sentrycoin.shadowTrading) {
      this.sentrycoin.shadowTrading.on('positionClosed', (position) => {
        this.handleShadowTradeClose(position);
      });
    }

    // Monitor classifier signals
    if (this.sentrycoin.classifier) {
      this.sentrycoin.classifier.on('TRIFECTA_CONVICTION_SIGNAL', (signal) => {
        this.handleTrifectaSignal(signal);
      });
    }
  }

  handlePredictiveSignal(signal) {
    const alertData = {
      id: signal.timestamp,
      timestamp: signal.timestamp,
      type: 'PREDICTIVE_CASCADE_ALERT',
      energyScore: signal.energyScore,
      zScore: signal.zScore,
      confidence: signal.confidence,
      leadTimeEstimate: signal.leadTimeEstimate,
      confirmed: false,
      outcome: 'PENDING'
    };

    this.predictiveAlerts.push(alertData);
    
    // Keep only last 100 alerts
    if (this.predictiveAlerts.length > 100) {
      this.predictiveAlerts = this.predictiveAlerts.slice(-100);
    }

    // Broadcast to dashboard
    this.io.emit('predictive-alert', alertData);
    
    console.log(`📊 Dashboard: Predictive alert logged (Z-score: ${signal.zScore.toFixed(2)})`);
  }

  handlePredictionConfirmation(confirmation) {
    const alert = this.predictiveAlerts.find(a => a.id === confirmation.predictiveTimestamp);
    if (alert) {
      alert.confirmed = true;
      alert.outcome = 'CONFIRMED';
      alert.actualLeadTime = confirmation.leadTime;
      
      this.io.emit('prediction-confirmed', alert);
      console.log(`📊 Dashboard: Prediction confirmed (Lead time: ${confirmation.leadTime}s)`);
    }
  }

  handleShadowTradeClose(position) {
    const strategy = position.signal.type === 'PREDICTIVE_CASCADE_ALERT' ? 'wavelet' : 'trifecta';
    
    this.strategyComparison[strategy].trades++;
    this.strategyComparison[strategy].pnl += position.realizedPnL;
    
    // Calculate win rate
    const wins = position.realizedPnL > 0 ? 1 : 0;
    const totalTrades = this.strategyComparison[strategy].trades;
    this.strategyComparison[strategy].winRate = 
      ((this.strategyComparison[strategy].winRate * (totalTrades - 1)) + wins) / totalTrades * 100;

    this.io.emit('strategy-update', this.strategyComparison);
    console.log(`📊 Dashboard: ${strategy} trade closed (P&L: $${position.realizedPnL.toFixed(2)})`);
  }

  handleTrifectaSignal(signal) {
    // Check if this confirms any pending predictive alerts
    const recentAlerts = this.predictiveAlerts.filter(
      alert => alert.outcome === 'PENDING' && 
      (signal.timestamp - alert.timestamp) < 120000 // Within 2 minutes
    );

    recentAlerts.forEach(alert => {
      alert.confirmed = true;
      alert.outcome = 'CONFIRMED';
      alert.actualLeadTime = (signal.timestamp - alert.timestamp) / 1000;
    });

    this.io.emit('trifecta-signal', { signal, confirmedAlerts: recentAlerts });
  }

  getDashboardOverview(req, res) {
    const overview = {
      timestamp: new Date().toISOString(),
      system: this.sentrycoin ? this.sentrycoin.getSystemStatus() : null,
      predictiveAlerts: {
        total: this.predictiveAlerts.length,
        confirmed: this.predictiveAlerts.filter(a => a.confirmed).length,
        pending: this.predictiveAlerts.filter(a => a.outcome === 'PENDING').length,
        accuracy: this.calculatePredictionAccuracy()
      },
      strategyComparison: this.strategyComparison
    };

    res.json(overview);
  }

  getPredictiveAlerts(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = this.predictiveAlerts.slice(-limit);
    
    res.json({
      timestamp: new Date().toISOString(),
      alerts,
      summary: {
        total: alerts.length,
        confirmed: alerts.filter(a => a.confirmed).length,
        averageLeadTime: this.calculateAverageLeadTime(alerts)
      }
    });
  }

  getStrategyComparison(req, res) {
    res.json({
      timestamp: new Date().toISOString(),
      comparison: this.strategyComparison,
      analysis: {
        waveletAdvantage: this.strategyComparison.wavelet.pnl - this.strategyComparison.trifecta.pnl,
        winRateDifference: this.strategyComparison.wavelet.winRate - this.strategyComparison.trifecta.winRate
      }
    });
  }

  getWaveletEnergy(req, res) {
    if (!this.sentrycoin.waveletAnalyzer) {
      return res.status(404).json({ error: 'Wavelet analyzer not available' });
    }

    const count = parseInt(req.query.count) || 300;
    const energyScores = this.sentrycoin.waveletAnalyzer.energyScores.slice(-count);
    
    res.json({
      timestamp: new Date().toISOString(),
      energyScores,
      statistics: {
        current: energyScores[energyScores.length - 1]?.energy || 0,
        average: energyScores.reduce((sum, e) => sum + e.energy, 0) / energyScores.length,
        threshold: this.sentrycoin.waveletAnalyzer.energyThreshold
      }
    });
  }

  getLiveMetrics(req, res) {
    const metrics = {
      timestamp: new Date().toISOString(),
      ofi: this.getCurrentOFI(),
      waveletEnergy: this.getCurrentWaveletEnergy(),
      shadowTradingPnL: this.getCurrentShadowPnL(),
      activePositions: this.getActivePositionsCount(),
      lastPredictiveAlert: this.getLastPredictiveAlert()
    };

    res.json(metrics);
  }

  getCurrentOFI() {
    if (!this.sentrycoin.featurePipeline) return 0;
    const recent = this.sentrycoin.featurePipeline.getRecentFeatures(1);
    return recent[0]?.ofi || 0;
  }

  getCurrentWaveletEnergy() {
    if (!this.sentrycoin.waveletAnalyzer) return 0;
    const energyScores = this.sentrycoin.waveletAnalyzer.energyScores;
    return energyScores[energyScores.length - 1]?.energy || 0;
  }

  getCurrentShadowPnL() {
    if (!this.sentrycoin.shadowTrading) return 0;
    return this.sentrycoin.shadowTrading.getPerformanceStats().totalPnL;
  }

  getActivePositionsCount() {
    if (!this.sentrycoin.shadowTrading) return 0;
    return this.sentrycoin.shadowTrading.positions.size;
  }

  getLastPredictiveAlert() {
    return this.predictiveAlerts[this.predictiveAlerts.length - 1] || null;
  }

  calculatePredictionAccuracy() {
    const confirmed = this.predictiveAlerts.filter(a => a.confirmed).length;
    const total = this.predictiveAlerts.filter(a => a.outcome !== 'PENDING').length;
    return total > 0 ? (confirmed / total) * 100 : 0;
  }

  calculateAverageLeadTime(alerts) {
    const confirmedAlerts = alerts.filter(a => a.confirmed && a.actualLeadTime);
    if (confirmedAlerts.length === 0) return 0;
    
    const totalLeadTime = confirmedAlerts.reduce((sum, a) => sum + a.actualLeadTime, 0);
    return totalLeadTime / confirmedAlerts.length;
  }

  getDashboardData() {
    return {
      overview: {
        system: this.sentrycoin ? this.sentrycoin.getSystemStatus() : null,
        predictiveAlerts: this.predictiveAlerts.slice(-10),
        strategyComparison: this.strategyComparison
      },
      liveMetrics: {
        ofi: this.getCurrentOFI(),
        waveletEnergy: this.getCurrentWaveletEnergy(),
        shadowPnL: this.getCurrentShadowPnL()
      }
    };
  }

  start(port = 3001) {
    this.server.listen(port, () => {
      console.log(`📊 Monitoring Dashboard running on http://localhost:${port}`);
      console.log(`🔍 Real-time analytics and strategy comparison available`);
    });
  }

  stop() {
    this.server.close();
    console.log('📊 Monitoring Dashboard stopped');
  }
}

export default MonitoringDashboard;
