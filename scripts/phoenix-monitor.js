#!/usr/bin/env node

/**
 * SentryCoin v6.0 - Phoenix Engine Monitoring Dashboard
 * 
 * CLASSIFICATION: TOP SECRET - OPERATIONAL MONITORING
 * 
 * Real-time monitoring dashboard for Operation Chimera deployment.
 * Provides continuous oversight of Phoenix Engine operational status.
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PhoenixMonitoringDashboard {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3000,
      wsPort: config.wsPort || 3001,
      updateInterval: config.updateInterval || 5000,
      ...config
    };
    
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ port: this.config.wsPort });
    
    this.phoenixEngine = null;
    this.monitoringData = {
      systemStatus: {},
      performanceMetrics: {},
      alerts: [],
      whaleActivity: [],
      derivativesUpdates: [],
      lastUpdate: Date.now()
    };
    
    this.setupRoutes();
    this.setupWebSocket();
    
    console.log('🖥️ Phoenix Monitoring Dashboard initializing...');
  }

  /**
   * Setup Express routes
   */
  setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../dashboard')));
    
    // System status endpoint
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'operational',
        timestamp: Date.now(),
        data: this.monitoringData.systemStatus
      });
    });
    
    // Performance metrics endpoint
    this.app.get('/api/performance', (req, res) => {
      res.json({
        status: 'operational',
        timestamp: Date.now(),
        data: this.monitoringData.performanceMetrics
      });
    });
    
    // Alerts endpoint
    this.app.get('/api/alerts', (req, res) => {
      res.json({
        status: 'operational',
        timestamp: Date.now(),
        data: this.monitoringData.alerts.slice(-50) // Last 50 alerts
      });
    });
    
    // Whale activity endpoint
    this.app.get('/api/whale-activity', (req, res) => {
      res.json({
        status: 'operational',
        timestamp: Date.now(),
        data: this.monitoringData.whaleActivity.slice(-20) // Last 20 whale events
      });
    });
    
    // Emergency stop endpoint
    this.app.post('/api/emergency-stop', async (req, res) => {
      console.log('🚨 EMERGENCY STOP TRIGGERED');
      
      try {
        if (this.phoenixEngine) {
          await this.phoenixEngine.shutdown();
        }
        
        res.json({
          status: 'emergency_stop_executed',
          timestamp: Date.now(),
          message: 'Phoenix Engine emergency shutdown initiated'
        });
        
      } catch (error) {
        res.status(500).json({
          status: 'emergency_stop_failed',
          timestamp: Date.now(),
          error: error.message
        });
      }
    });
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'phoenix-monitor',
        timestamp: Date.now(),
        uptime: process.uptime()
      });
    });
    
    // Dashboard HTML
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML());
    });
  }

  /**
   * Setup WebSocket for real-time updates
   */
  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('📡 Dashboard client connected');
      
      // Send initial data
      ws.send(JSON.stringify({
        type: 'initial_data',
        data: this.monitoringData
      }));
      
      ws.on('close', () => {
        console.log('📡 Dashboard client disconnected');
      });
    });
  }

  /**
   * Connect to Phoenix Engine for monitoring
   */
  connectToPhoenixEngine(engine) {
    this.phoenixEngine = engine;
    
    // Setup event listeners
    engine.on('CRITICAL_WHALE_ALERT', (intent) => {
      this.addWhaleActivity({
        type: 'CRITICAL',
        whaleAddress: intent.whaleAddress,
        estimatedValue: intent.estimatedValue,
        targetExchange: intent.targetExchange,
        timestamp: Date.now()
      });
      
      this.addAlert({
        level: 'CRITICAL',
        message: 'Critical whale intent detected',
        data: intent,
        timestamp: Date.now()
      });
    });
    
    engine.on('HIGH_WHALE_ALERT', (intent) => {
      this.addWhaleActivity({
        type: 'HIGH',
        whaleAddress: intent.whaleAddress,
        estimatedValue: intent.estimatedValue,
        timestamp: Date.now()
      });
    });
    
    engine.on('SYSTEM_EVENT', (event) => {
      this.addAlert({
        level: 'INFO',
        message: `System event: ${event.type}`,
        data: event,
        timestamp: Date.now()
      });
    });
    
    engine.on('DERIVATIVES_INTELLIGENCE', (update) => {
      this.monitoringData.derivativesUpdates.push({
        type: update.type,
        exchange: update.exchange,
        timestamp: Date.now()
      });
      
      // Keep only last 100 updates
      if (this.monitoringData.derivativesUpdates.length > 100) {
        this.monitoringData.derivativesUpdates.shift();
      }
    });
    
    console.log('🔗 Connected to Phoenix Engine for monitoring');
  }

  /**
   * Add whale activity event
   */
  addWhaleActivity(activity) {
    this.monitoringData.whaleActivity.push(activity);
    
    // Keep only last 50 whale activities
    if (this.monitoringData.whaleActivity.length > 50) {
      this.monitoringData.whaleActivity.shift();
    }
    
    this.broadcastUpdate('whale_activity', activity);
  }

  /**
   * Add system alert
   */
  addAlert(alert) {
    this.monitoringData.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.monitoringData.alerts.length > 100) {
      this.monitoringData.alerts.shift();
    }
    
    this.broadcastUpdate('alert', alert);
  }

  /**
   * Update monitoring data
   */
  updateMonitoringData() {
    if (!this.phoenixEngine) return;
    
    try {
      // Get system status
      this.monitoringData.systemStatus = this.phoenixEngine.getSystemStatus();
      
      // Get performance metrics from components
      if (this.phoenixEngine.liquidityAnalyzer) {
        this.monitoringData.performanceMetrics.liquidityAnalyzer = 
          this.phoenixEngine.liquidityAnalyzer.getStats();
      }
      
      if (this.phoenixEngine.mempoolStreamer) {
        this.monitoringData.performanceMetrics.mempoolStreamer = 
          this.phoenixEngine.mempoolStreamer.getStats();
      }
      
      if (this.phoenixEngine.derivativesMonitor) {
        this.monitoringData.performanceMetrics.derivativesMonitor = 
          this.phoenixEngine.derivativesMonitor.getStats();
      }
      
      if (this.phoenixEngine.taskScheduler) {
        this.monitoringData.performanceMetrics.taskScheduler = 
          this.phoenixEngine.taskScheduler.getStats();
      }
      
      this.monitoringData.lastUpdate = Date.now();
      
      // Broadcast update to connected clients
      this.broadcastUpdate('monitoring_data', this.monitoringData);
      
    } catch (error) {
      console.error('❌ Error updating monitoring data:', error.message);
    }
  }

  /**
   * Broadcast update to WebSocket clients
   */
  broadcastUpdate(type, data) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });
    
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  /**
   * Generate dashboard HTML
   */
  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 Phoenix Engine - Operation Chimera Dashboard</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            color: #00ff00;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #00ff00;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .panel {
            border: 1px solid #00ff00;
            padding: 15px;
            background: #001100;
        }
        .panel h3 {
            margin-top: 0;
            color: #ffff00;
        }
        .status-online { color: #00ff00; }
        .status-offline { color: #ff0000; }
        .alert-critical { color: #ff0000; font-weight: bold; }
        .alert-warning { color: #ffaa00; }
        .alert-info { color: #00aaff; }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }
        .whale-activity {
            max-height: 300px;
            overflow-y: auto;
        }
        .emergency-btn {
            background: #ff0000;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
        }
        .emergency-btn:hover {
            background: #cc0000;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔥 PHOENIX ENGINE - OPERATION CHIMERA</h1>
        <h2>🛡️ SentryCoin v6.0 Monitoring Dashboard</h2>
        <p>CLASSIFICATION: TOP SECRET - OPERATIONAL MONITORING</p>
        <button class="emergency-btn" onclick="emergencyStop()">🚨 EMERGENCY STOP</button>
    </div>

    <div class="grid">
        <div class="panel">
            <h3>🎯 System Status</h3>
            <div id="system-status">Loading...</div>
        </div>

        <div class="panel">
            <h3>📊 Performance Metrics</h3>
            <div id="performance-metrics">Loading...</div>
        </div>

        <div class="panel">
            <h3>🐋 Whale Activity</h3>
            <div id="whale-activity" class="whale-activity">Loading...</div>
        </div>

        <div class="panel">
            <h3>🚨 System Alerts</h3>
            <div id="alerts" class="whale-activity">Loading...</div>
        </div>
    </div>

    <script>
        const ws = new WebSocket('ws://localhost:${this.config.wsPort}');
        
        ws.onmessage = function(event) {
            const message = JSON.parse(event.data);
            
            switch(message.type) {
                case 'initial_data':
                    updateDashboard(message.data);
                    break;
                case 'monitoring_data':
                    updateDashboard(message.data);
                    break;
                case 'whale_activity':
                    addWhaleActivity(message.data);
                    break;
                case 'alert':
                    addAlert(message.data);
                    break;
            }
        };
        
        function updateDashboard(data) {
            updateSystemStatus(data.systemStatus);
            updatePerformanceMetrics(data.performanceMetrics);
            updateWhaleActivity(data.whaleActivity);
            updateAlerts(data.alerts);
        }
        
        function updateSystemStatus(status) {
            const html = \`
                <div class="metric">
                    <span>Version:</span>
                    <span>\${status.version || 'Unknown'}</span>
                </div>
                <div class="metric">
                    <span>Strategic Viability:</span>
                    <span class="status-online">\${status.strategicViability || 'Unknown'}</span>
                </div>
                <div class="metric">
                    <span>Mandates Implemented:</span>
                    <span>\${status.mandatesImplemented || 0}/5</span>
                </div>
                <div class="metric">
                    <span>Uptime:</span>
                    <span>\${status.uptime || 0} seconds</span>
                </div>
                <div class="metric">
                    <span>Liquidity Analyzer:</span>
                    <span class="\${status.systemHealth?.liquidityAnalyzer === 'ONLINE' ? 'status-online' : 'status-offline'}">\${status.systemHealth?.liquidityAnalyzer || 'Unknown'}</span>
                </div>
                <div class="metric">
                    <span>Mempool Streamer:</span>
                    <span class="\${status.systemHealth?.mempoolStreamer === 'ONLINE' ? 'status-online' : 'status-offline'}">\${status.systemHealth?.mempoolStreamer || 'Unknown'}</span>
                </div>
                <div class="metric">
                    <span>Derivatives Monitor:</span>
                    <span class="\${status.systemHealth?.derivativesMonitor === 'ONLINE' ? 'status-online' : 'status-offline'}">\${status.systemHealth?.derivativesMonitor || 'Unknown'}</span>
                </div>
                <div class="metric">
                    <span>Task Scheduler:</span>
                    <span class="\${status.systemHealth?.taskScheduler === 'ONLINE' ? 'status-online' : 'status-offline'}">\${status.systemHealth?.taskScheduler || 'Unknown'}</span>
                </div>
            \`;
            document.getElementById('system-status').innerHTML = html;
        }
        
        function updatePerformanceMetrics(metrics) {
            const html = \`
                <div class="metric">
                    <span>Whale Intents Detected:</span>
                    <span>\${metrics.mempoolStreamer?.whaleTransactions || 0}</span>
                </div>
                <div class="metric">
                    <span>Avg Detection Latency:</span>
                    <span>\${metrics.mempoolStreamer?.avgDetectionLatency || 0}ms</span>
                </div>
                <div class="metric">
                    <span>Liquidity Validations:</span>
                    <span>\${metrics.liquidityAnalyzer?.dlsCalculations || 0}</span>
                </div>
                <div class="metric">
                    <span>Derivatives Updates:</span>
                    <span>\${metrics.derivativesMonitor?.totalUpdates || 0}</span>
                </div>
                <div class="metric">
                    <span>Tasks Executed:</span>
                    <span>\${metrics.taskScheduler?.tasksCompleted || 0}</span>
                </div>
                <div class="metric">
                    <span>Log Filter Efficiency:</span>
                    <span>\${metrics.logger?.filterEfficiency || 0}%</span>
                </div>
            \`;
            document.getElementById('performance-metrics').innerHTML = html;
        }
        
        function updateWhaleActivity(activities) {
            const html = activities.slice(-10).map(activity => \`
                <div style="margin: 5px 0; padding: 5px; border-left: 3px solid \${activity.type === 'CRITICAL' ? '#ff0000' : '#ffaa00'};">
                    <strong>\${activity.type}</strong> - \${activity.whaleAddress?.substring(0, 10)}...
                    <br>Value: $\${activity.estimatedValue?.toLocaleString() || 'Unknown'}
                    <br>Time: \${new Date(activity.timestamp).toLocaleTimeString()}
                </div>
            \`).join('');
            document.getElementById('whale-activity').innerHTML = html || 'No whale activity detected';
        }
        
        function updateAlerts(alerts) {
            const html = alerts.slice(-10).map(alert => \`
                <div style="margin: 5px 0; padding: 5px;" class="alert-\${alert.level.toLowerCase()}">
                    <strong>[\${alert.level}]</strong> \${alert.message}
                    <br><small>\${new Date(alert.timestamp).toLocaleTimeString()}</small>
                </div>
            \`).join('');
            document.getElementById('alerts').innerHTML = html || 'No alerts';
        }
        
        function addWhaleActivity(activity) {
            // Real-time whale activity updates handled by updateWhaleActivity
        }
        
        function addAlert(alert) {
            // Real-time alert updates handled by updateAlerts
        }
        
        async function emergencyStop() {
            if (confirm('🚨 EMERGENCY STOP: Are you sure you want to halt the Phoenix Engine?')) {
                try {
                    const response = await fetch('/api/emergency-stop', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const result = await response.json();
                    alert('Emergency stop executed: ' + result.message);
                } catch (error) {
                    alert('Emergency stop failed: ' + error.message);
                }
            }
        }
        
        // Auto-refresh every 5 seconds
        setInterval(() => {
            fetch('/api/status').then(r => r.json()).then(data => {
                if (data.data) updateSystemStatus(data.data);
            });
        }, 5000);
    </script>
</body>
</html>
    `;
  }

  /**
   * Start monitoring dashboard
   */
  async start() {
    // Start periodic data updates
    setInterval(() => {
      this.updateMonitoringData();
    }, this.config.updateInterval);
    
    // Start HTTP server
    this.server.listen(this.config.port, () => {
      console.log(`🖥️ Phoenix Monitoring Dashboard running on http://localhost:${this.config.port}`);
      console.log(`📡 WebSocket server running on ws://localhost:${this.config.wsPort}`);
      console.log('🎯 Dashboard ready for Operation Chimera monitoring');
    });
  }

  /**
   * Stop monitoring dashboard
   */
  async stop() {
    this.server.close();
    this.wss.close();
    console.log('🖥️ Phoenix Monitoring Dashboard stopped');
  }
}

// Export for use in other modules
export default PhoenixMonitoringDashboard;

// Start dashboard if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new PhoenixMonitoringDashboard();
  dashboard.start().catch(error => {
    console.error('❌ Dashboard startup failed:', error.message);
    process.exit(1);
  });
}
