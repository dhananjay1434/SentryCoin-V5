/**
 * Quantitative Analysis API Endpoints
 * 
 * Provides REST API access to the advanced quantitative features:
 * - Shadow trading performance metrics
 * - Feature pipeline data and statistics
 * - Wavelet analysis results and scalograms
 * - Real-time P&L tracking
 * - Predictive signal analytics
 */

import express from 'express';
import { getISTTime } from './utils.js';

class QuantitativeAPI {
  constructor(sentryCoinInstance) {
    this.sentrycoin = sentryCoinInstance;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Shadow Trading Endpoints
    this.router.get('/shadow-trading/performance', this.getShadowTradingPerformance.bind(this));
    this.router.get('/shadow-trading/positions', this.getShadowPositions.bind(this));
    this.router.get('/shadow-trading/trades', this.getShadowTrades.bind(this));
    
    // Feature Pipeline Endpoints
    this.router.get('/features/current', this.getCurrentFeatures.bind(this));
    this.router.get('/features/timeseries/:feature', this.getFeatureTimeSeries.bind(this));
    this.router.get('/features/statistics', this.getFeatureStatistics.bind(this));
    
    // Wavelet Analysis Endpoints
    this.router.get('/wavelet/signals', this.getWaveletSignals.bind(this));
    this.router.get('/wavelet/scalogram', this.getScalogram.bind(this));
    this.router.get('/wavelet/energy', this.getEnergyScores.bind(this));
    this.router.get('/wavelet/predictions', this.getPredictionAccuracy.bind(this));
    
    // Combined Analytics
    this.router.get('/analytics/dashboard', this.getAnalyticsDashboard.bind(this));
    this.router.get('/analytics/export', this.exportAnalyticsData.bind(this));
  }

  /**
   * Get shadow trading performance metrics
   */
  async getShadowTradingPerformance(req, res) {
    try {
      if (!this.sentrycoin.shadowTrading) {
        return res.status(404).json({ error: 'Shadow trading not initialized' });
      }

      const performance = this.sentrycoin.shadowTrading.getPerformanceStats();
      
      res.json({
        timestamp: new Date().toISOString(),
        performance,
        summary: {
          totalPnL: performance.totalPnL,
          winRate: performance.winRate,
          totalTrades: performance.totalTrades,
          sharpeRatio: performance.sharpeRatio,
          maxDrawdown: performance.maxDrawdown,
          profitFactor: performance.profitFactor
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get active shadow positions
   */
  async getShadowPositions(req, res) {
    try {
      if (!this.sentrycoin.shadowTrading) {
        return res.status(404).json({ error: 'Shadow trading not initialized' });
      }

      const positions = Array.from(this.sentrycoin.shadowTrading.positions.values());
      
      res.json({
        timestamp: new Date().toISOString(),
        activePositions: positions.length,
        positions: positions.map(pos => ({
          id: pos.id,
          type: pos.type,
          size: pos.size,
          entryPrice: pos.entryPrice,
          currentPrice: pos.currentPrice,
          unrealizedPnL: pos.unrealizedPnL,
          holdTime: Date.now() - new Date(pos.entryTime).getTime(),
          signal: pos.signal.type
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get shadow trading history
   */
  async getShadowTrades(req, res) {
    try {
      if (!this.sentrycoin.shadowTrading) {
        return res.status(404).json({ error: 'Shadow trading not initialized' });
      }

      const limit = parseInt(req.query.limit) || 50;
      const trades = this.sentrycoin.shadowTrading.trades.slice(-limit);
      
      res.json({
        timestamp: new Date().toISOString(),
        totalTrades: this.sentrycoin.shadowTrading.trades.length,
        trades: trades.map(trade => ({
          id: trade.id,
          type: trade.type,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          realizedPnL: trade.realizedPnL,
          holdTime: trade.holdTimeMs,
          signal: trade.signal.type,
          closeReason: trade.closeReason
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get current feature vector
   */
  async getCurrentFeatures(req, res) {
    try {
      if (!this.sentrycoin.featurePipeline) {
        return res.status(404).json({ error: 'Feature pipeline not initialized' });
      }

      const recentFeatures = this.sentrycoin.featurePipeline.getRecentFeatures(1);
      const currentFeature = recentFeatures[0] || null;
      
      res.json({
        timestamp: new Date().toISOString(),
        currentFeature,
        dataQuality: currentFeature ? currentFeature.dataQuality : 0,
        calculationLatency: currentFeature ? currentFeature.calculationLatency : 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get time series for specific feature
   */
  async getFeatureTimeSeries(req, res) {
    try {
      if (!this.sentrycoin.featurePipeline) {
        return res.status(404).json({ error: 'Feature pipeline not initialized' });
      }

      const featureName = req.params.feature;
      const count = parseInt(req.query.count) || 300;
      
      const timeSeries = this.sentrycoin.featurePipeline.getFeatureTimeSeries(featureName, count);
      
      res.json({
        timestamp: new Date().toISOString(),
        feature: featureName,
        dataPoints: timeSeries.length,
        timeSeries
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get feature pipeline statistics
   */
  async getFeatureStatistics(req, res) {
    try {
      if (!this.sentrycoin.featurePipeline) {
        return res.status(404).json({ error: 'Feature pipeline not initialized' });
      }

      const stats = this.sentrycoin.featurePipeline.getStats();
      
      res.json({
        timestamp: new Date().toISOString(),
        statistics: stats
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get wavelet predictive signals
   */
  async getWaveletSignals(req, res) {
    try {
      if (!this.sentrycoin.waveletAnalyzer) {
        return res.status(404).json({ error: 'Wavelet analyzer not initialized' });
      }

      const stats = this.sentrycoin.waveletAnalyzer.getStats();
      
      res.json({
        timestamp: new Date().toISOString(),
        predictiveSignals: stats.predictiveSignals,
        confirmedPredictions: stats.confirmedPredictions,
        falsePositives: stats.falsePositives,
        accuracy: stats.accuracy,
        averageLeadTime: stats.averageLeadTime
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get wavelet scalogram data
   */
  async getScalogram(req, res) {
    try {
      if (!this.sentrycoin.waveletAnalyzer) {
        return res.status(404).json({ error: 'Wavelet analyzer not initialized' });
      }

      const timePoints = parseInt(req.query.timePoints) || 60;
      const scalogram = this.sentrycoin.waveletAnalyzer.getRecentScalogram(timePoints);
      
      res.json({
        timestamp: new Date().toISOString(),
        timePoints,
        scalogram
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get energy scores time series
   */
  async getEnergyScores(req, res) {
    try {
      if (!this.sentrycoin.waveletAnalyzer) {
        return res.status(404).json({ error: 'Wavelet analyzer not initialized' });
      }

      const count = parseInt(req.query.count) || 300;
      const energyScores = this.sentrycoin.waveletAnalyzer.energyScores.slice(-count);
      
      res.json({
        timestamp: new Date().toISOString(),
        dataPoints: energyScores.length,
        energyScores
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get prediction accuracy metrics
   */
  async getPredictionAccuracy(req, res) {
    try {
      if (!this.sentrycoin.waveletAnalyzer) {
        return res.status(404).json({ error: 'Wavelet analyzer not initialized' });
      }

      const stats = this.sentrycoin.waveletAnalyzer.getStats();
      
      res.json({
        timestamp: new Date().toISOString(),
        accuracy: stats.accuracy,
        totalPredictions: stats.predictiveSignals,
        confirmed: stats.confirmedPredictions,
        falsePositives: stats.falsePositives,
        averageLeadTime: stats.averageLeadTime,
        lastAnalysis: stats.lastAnalysisTime
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getAnalyticsDashboard(req, res) {
    try {
      const dashboard = {
        timestamp: new Date().toISOString(),
        system: this.sentrycoin.getSystemStatus(),
        shadowTrading: this.sentrycoin.shadowTrading ? this.sentrycoin.shadowTrading.getPerformanceStats() : null,
        features: this.sentrycoin.featurePipeline ? this.sentrycoin.featurePipeline.getStats() : null,
        wavelet: this.sentrycoin.waveletAnalyzer ? this.sentrycoin.waveletAnalyzer.getStats() : null,
        recentFeatures: this.sentrycoin.featurePipeline ? this.sentrycoin.featurePipeline.getRecentFeatures(10) : [],
        recentTrades: this.sentrycoin.shadowTrading ? this.sentrycoin.shadowTrading.trades.slice(-10) : []
      };
      
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Export analytics data for offline analysis
   */
  async exportAnalyticsData(req, res) {
    try {
      const format = req.query.format || 'json';
      const timeRange = parseInt(req.query.hours) || 24; // Last 24 hours
      
      const exportData = {
        metadata: {
          exportTime: new Date().toISOString(),
          timeRange: `${timeRange} hours`,
          system: this.sentrycoin.getSystemStatus()
        },
        features: this.sentrycoin.featurePipeline ? this.sentrycoin.featurePipeline.getRecentFeatures(timeRange * 3600) : [],
        trades: this.sentrycoin.shadowTrading ? this.sentrycoin.shadowTrading.trades : [],
        waveletSignals: this.sentrycoin.waveletAnalyzer ? this.sentrycoin.waveletAnalyzer.energyScores : []
      };
      
      if (format === 'csv') {
        // Convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sentrycoin-analytics.csv');
        res.send(this.convertToCSV(exportData));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=sentrycoin-analytics.json');
        res.json(exportData);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simplified CSV conversion - could be enhanced
    const features = data.features || [];
    if (features.length === 0) return 'No data available';
    
    const headers = Object.keys(features[0]).join(',');
    const rows = features.map(feature => Object.values(feature).join(','));
    
    return [headers, ...rows].join('\n');
  }

  /**
   * Get the router for mounting in Express app
   */
  getRouter() {
    return this.router;
  }
}

export default QuantitativeAPI;
