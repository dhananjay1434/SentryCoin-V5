/**
 * SentryCoin v4.4 - Manipulation Detection Service
 * 
 * Based on forensic analysis of SPKUSDT manipulation patterns:
 * - Wash trading (28-32% of volume is fake)
 * - Order book spoofing (500k SPK walls that vanish)
 * - Coordinated pump/dump cycles
 * - On-chain whale movements preceding dumps
 */

import EventEmitter from 'events';

export default class ManipulationDetector extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = config;
    this.symbol = config.symbol || 'SPKUSDT';
    
    // Manipulation detection state
    this.spoofCounter = 0;
    this.lastSpoofTime = 0;
    this.largeInflowDetected = false;
    this.inflowDetectionTime = 0;
    this.suspiciousWalls = new Map();
    
    // Configuration from forensic analysis
    this.spoofWallThreshold = parseInt(process.env.SPOOF_WALL_THRESHOLD || '300000'); // 300k SPK
    this.spoofTimeWindow = parseInt(process.env.SPOOF_TIME_WINDOW || '10000'); // 10 seconds
    this.maxSpoofCount = parseInt(process.env.MAX_SPOOF_COUNT || '3'); // 3 spoofs = manipulation
    this.whaleInflowThreshold = parseInt(process.env.WHALE_INFLOW_THRESHOLD || '3000000'); // 3M SPK
    this.inflowValidityHours = parseInt(process.env.INFLOW_VALIDITY_HOURS || '12'); // 12 hours
    
    console.log('🕵️ Manipulation Detector initialized for', this.symbol);
    console.log(`   📊 Spoof detection: ${this.spoofWallThreshold} SPK walls`);
    console.log(`   🐋 Whale threshold: ${this.whaleInflowThreshold} SPK inflows`);
  }

  /**
   * CRITICAL: Analyze order book for spoofing patterns
   * Based on forensic finding: "500k-SPK walls appear... then vanish"
   */
  analyzeOrderBookForSpoofing(orderBook) {
    const now = Date.now();
    
    // Scan for large walls in the order book
    const largeBidWalls = this.findLargeWalls(orderBook.bids);
    const largeAskWalls = this.findLargeWalls(orderBook.asks);
    
    // Track new walls
    [...largeBidWalls, ...largeAskWalls].forEach(wall => {
      const wallId = `${wall.price}_${wall.side}`;
      
      if (!this.suspiciousWalls.has(wallId)) {
        this.suspiciousWalls.set(wallId, {
          ...wall,
          firstSeen: now,
          lastSeen: now
        });
        console.log(`👀 Large ${wall.side} wall detected: ${wall.quantity} SPK at ${wall.price}`);
      } else {
        this.suspiciousWalls.get(wallId).lastSeen = now;
      }
    });
    
    // Check for vanished walls (spoofing)
    for (const [wallId, wall] of this.suspiciousWalls) {
      const wallAge = now - wall.firstSeen;
      const timeSinceLastSeen = now - wall.lastSeen;
      
      // If wall existed for short time and then vanished = potential spoof
      if (wallAge > 5000 && timeSinceLastSeen > this.spoofTimeWindow) {
        console.log(`🚨 SPOOF DETECTED: ${wall.side} wall ${wall.quantity} SPK vanished after ${wallAge}ms`);
        
        this.spoofCounter++;
        this.lastSpoofTime = now;
        this.suspiciousWalls.delete(wallId);
        
        // Check if we've hit manipulation threshold
        if (this.spoofCounter >= this.maxSpoofCount) {
          this.triggerSpoofingAlert();
        }
      }
    }
    
    // Clean up old walls
    this.cleanupOldWalls(now);
  }

  /**
   * Find walls above threshold in order book
   */
  findLargeWalls(orders) {
    const walls = [];
    
    for (const [price, quantity] of orders) {
      if (quantity >= this.spoofWallThreshold) {
        walls.push({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          side: orders === orders ? 'bid' : 'ask'
        });
      }
    }
    
    return walls;
  }

  /**
   * CRITICAL: Process on-chain whale movements
   * Based on forensic finding: "Exchange inflows historically precede double-digit draw-downs"
   */
  processWhaleInflow(inflowData) {
    const { amount, exchange, timestamp } = inflowData;
    
    if (amount >= this.whaleInflowThreshold) {
      console.log(`🐋 WHALE INFLOW DETECTED: ${amount} SPK to ${exchange}`);
      
      this.largeInflowDetected = true;
      this.inflowDetectionTime = timestamp || Date.now();
      
      // Emit high-priority alert
      this.emit('WHALE_INFLOW_DETECTED', {
        amount,
        exchange,
        timestamp: this.inflowDetectionTime,
        validUntil: this.inflowDetectionTime + (this.inflowValidityHours * 60 * 60 * 1000)
      });
      
      console.log(`🚨 CASCADE signals now HIGH PRIORITY for next ${this.inflowValidityHours} hours`);
    }
  }

  /**
   * Check if whale inflow is still valid (within time window)
   */
  isWhaleInflowActive() {
    if (!this.largeInflowDetected) return false;
    
    const now = Date.now();
    const validityWindow = this.inflowValidityHours * 60 * 60 * 1000;
    
    if (now - this.inflowDetectionTime > validityWindow) {
      this.largeInflowDetected = false;
      console.log(`⏰ Whale inflow signal expired after ${this.inflowValidityHours} hours`);
      return false;
    }
    
    return true;
  }

  /**
   * Check if market is currently being spoofed
   */
  isSpoofingActive() {
    const now = Date.now();
    const spoofWindow = 5 * 60 * 1000; // 5 minutes
    
    // Reset spoof counter if enough time has passed
    if (now - this.lastSpoofTime > spoofWindow) {
      this.spoofCounter = 0;
    }
    
    return this.spoofCounter >= this.maxSpoofCount;
  }

  /**
   * Trigger spoofing alert and defensive mode
   */
  triggerSpoofingAlert() {
    console.log(`🚨 SPOOFING MANIPULATION DETECTED! ${this.spoofCounter} spoofs in 5 minutes`);
    
    this.emit('SPOOFING_DETECTED', {
      spoofCount: this.spoofCounter,
      timestamp: Date.now(),
      defensiveModeUntil: Date.now() + (15 * 60 * 1000) // 15 minutes
    });
  }

  /**
   * Get manipulation assessment for signal validation
   */
  getManipulationAssessment() {
    return {
      whaleInflowActive: this.isWhaleInflowActive(),
      spoofingDetected: this.isSpoofingActive(),
      spoofCount: this.spoofCounter,
      riskLevel: this.calculateRiskLevel()
    };
  }

  /**
   * Calculate overall manipulation risk level
   */
  calculateRiskLevel() {
    let riskScore = 0;
    
    if (this.isSpoofingActive()) riskScore += 3;
    if (this.spoofCounter > 0) riskScore += 1;
    if (this.isWhaleInflowActive()) riskScore -= 2; // Whale inflow is GOOD for shorts
    
    if (riskScore >= 3) return 'HIGH';
    if (riskScore >= 1) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Clean up old wall tracking data
   */
  cleanupOldWalls(now) {
    const maxAge = 60000; // 1 minute
    
    for (const [wallId, wall] of this.suspiciousWalls) {
      if (now - wall.lastSeen > maxAge) {
        this.suspiciousWalls.delete(wallId);
      }
    }
  }

  /**
   * Get current manipulation statistics
   */
  getStats() {
    return {
      spoofCounter: this.spoofCounter,
      largeInflowDetected: this.largeInflowDetected,
      activeSuspiciousWalls: this.suspiciousWalls.size,
      riskLevel: this.calculateRiskLevel(),
      whaleInflowActive: this.isWhaleInflowActive(),
      spoofingActive: this.isSpoofingActive()
    };
  }
}
