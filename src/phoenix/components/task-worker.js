/**
 * Phoenix v6.0 - Task Worker
 * 
 * Worker thread implementation for distributed task execution.
 * Handles various task types for the Phoenix Engine.
 */

import { parentPort, workerData } from 'worker_threads';
import axios from 'axios';

const { workerId } = workerData;

/**
 * Task execution handlers
 */
const taskHandlers = {
  'WHALE_BALANCE_CHECK': handleWhaleBalanceCheck,
  'SYSTEM_HEALTH_CHECK': handleSystemHealthCheck,
  'PERFORMANCE_METRICS': handlePerformanceMetrics,
  'API_HEALTH_CHECK': handleApiHealthCheck,
  'MEMORY_CLEANUP': handleMemoryCleanup
};

/**
 * Main message handler
 */
parentPort.on('message', async (message) => {
  const { taskId, type, payload } = message;
  
  try {
    const handler = taskHandlers[type];
    if (!handler) {
      throw new Error(`Unknown task type: ${type}`);
    }
    
    const result = await handler(payload);
    
    parentPort.postMessage({
      taskId,
      success: true,
      result,
      workerId
    });
    
  } catch (error) {
    parentPort.postMessage({
      taskId,
      success: false,
      error: error.message,
      workerId
    });
  }
});

/**
 * Handle whale balance check task
 */
async function handleWhaleBalanceCheck(payload) {
  const { whaleAddress, apiKey } = payload;
  
  try {
    const response = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'account',
        action: 'balance',
        address: whaleAddress,
        tag: 'latest',
        apikey: apiKey
      },
      timeout: 15000
    });
    
    if (response.data.status !== '1') {
      throw new Error(`Etherscan API Error: ${response.data.message}`);
    }
    
    const balanceWei = response.data.result;
    const balanceEth = parseFloat(balanceWei) / 1e18;
    const balanceUSD = balanceEth * 3500; // Approximate ETH price
    
    return {
      whaleAddress,
      balanceEth: Math.round(balanceEth * 100) / 100,
      balanceUSD: Math.round(balanceUSD),
      timestamp: Date.now(),
      source: 'etherscan'
    };
    
  } catch (error) {
    throw new Error(`Whale balance check failed: ${error.message}`);
  }
}

/**
 * Handle system health check task
 */
async function handleSystemHealthCheck(payload) {
  const { timestamp } = payload;
  
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Check system resources
    const healthStatus = {
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) // %
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.floor(process.uptime()),
      timestamp: Date.now(),
      status: 'HEALTHY'
    };
    
    // Determine health status
    if (healthStatus.memory.usage > 90) {
      healthStatus.status = 'WARNING';
    }
    
    if (healthStatus.memory.usage > 95) {
      healthStatus.status = 'CRITICAL';
    }
    
    return healthStatus;
    
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Handle performance metrics collection task
 */
async function handlePerformanceMetrics(payload) {
  const { metrics } = payload;
  
  try {
    const systemMetrics = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      timestamp: Date.now()
    };
    
    // Combine with provided metrics
    const combinedMetrics = {
      system: systemMetrics,
      application: metrics || {},
      timestamp: Date.now()
    };
    
    return combinedMetrics;
    
  } catch (error) {
    throw new Error(`Performance metrics collection failed: ${error.message}`);
  }
}

/**
 * Handle API health check task
 */
async function handleApiHealthCheck(payload) {
  const { apiName, endpoint, timeout = 10000 } = payload;
  
  try {
    const startTime = Date.now();
    
    const response = await axios.get(endpoint, {
      timeout,
      headers: {
        'User-Agent': 'Phoenix-Engine-v6-HealthCheck'
      }
    });
    
    const latency = Date.now() - startTime;
    
    return {
      apiName,
      status: response.status === 200 ? 'HEALTHY' : 'DEGRADED',
      latency,
      responseCode: response.status,
      timestamp: Date.now()
    };
    
  } catch (error) {
    return {
      apiName,
      status: 'UNHEALTHY',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Handle memory cleanup task
 */
async function handleMemoryCleanup(payload) {
  try {
    const beforeMemory = process.memoryUsage();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const afterMemory = process.memoryUsage();
    
    return {
      action: 'MEMORY_CLEANUP',
      before: {
        heapUsed: Math.round(beforeMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(beforeMemory.heapTotal / 1024 / 1024)
      },
      after: {
        heapUsed: Math.round(afterMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(afterMemory.heapTotal / 1024 / 1024)
      },
      freed: Math.round((beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024),
      gcAvailable: !!global.gc,
      timestamp: Date.now()
    };
    
  } catch (error) {
    throw new Error(`Memory cleanup failed: ${error.message}`);
  }
}

/**
 * Worker initialization
 */
console.log(`Phoenix Task Worker ${workerId} initialized`);

/**
 * Handle worker shutdown
 */
process.on('SIGTERM', () => {
  console.log(`Phoenix Task Worker ${workerId} shutting down`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`Phoenix Task Worker ${workerId} interrupted`);
  process.exit(0);
});
