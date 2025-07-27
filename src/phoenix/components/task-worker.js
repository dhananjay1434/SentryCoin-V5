/**
 * Phoenix v6.1 - Task Worker - PROJECT FORTRESS HARDENING
 *
 * Worker thread implementation for distributed task execution.
 * Handles various task types for the Phoenix Engine with comprehensive
 * error handling and graceful shutdown protocols.
 */

import { parentPort, workerData } from 'worker_threads';
import axios from 'axios';
import ResilientAPIClient from './resilient-api-client.js';

const { workerId } = workerData;

// Worker state management
let isShuttingDown = false;
let activeTask = null;
const startTime = Date.now();

// CRUCIBLE MANDATE 3: Initialize resilient API client for worker
const apiClient = new ResilientAPIClient({
  logger: {
    info: (key, data) => console.log(`[INFO] Worker ${workerId}:`, key, JSON.stringify(data)),
    warn: (key, data) => console.warn(`[WARN] Worker ${workerId}:`, key, JSON.stringify(data)),
    error: (key, data) => console.error(`[ERROR] Worker ${workerId}:`, key, JSON.stringify(data)),
    debug: (key, data) => console.log(`[DEBUG] Worker ${workerId}:`, key, JSON.stringify(data))
  },
  providers: {
    etherscan: {
      name: 'etherscan',
      enabled: true,
      baseUrl: 'https://api.etherscan.io',
      headers: {},
      timeout: 10000,
      priority: 1
    },
    alchemy: {
      name: 'alchemy',
      enabled: !!process.env.ALCHEMY_API_KEY,
      baseUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
      priority: 2
    }
  }
});

/**
 * FORTRESS v6.1: Enhanced error logging with full context
 */
function logError(errorType, error, context = {}) {
  const errorLog = {
    logType: 'WORKER_ERROR',
    workerId,
    errorType,
    error: error.message,
    stack: error.stack,
    context,
    activeTask,
    timestamp: new Date().toISOString(),
    workerUptime: Date.now() - startTime
  };

  console.error(`[ERROR] Worker ${workerId}:`, JSON.stringify(errorLog, null, 2));
}

/**
 * FORTRESS v6.1: Graceful exit with proper cleanup
 */
function gracefulExit(exitCode = 0) {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`[INFO] Worker ${workerId}: Initiating graceful shutdown (exit code: ${exitCode})`);

  // Clean up any active resources
  if (activeTask) {
    console.log(`[WARN] Worker ${workerId}: Terminating with active task: ${activeTask.taskId}`);
  }

  // CRUCIBLE MANDATE 3: Shutdown resilient API client
  if (apiClient) {
    apiClient.shutdown();
  }

  // Final status log
  console.log(`[INFO] Worker ${workerId}: Shutdown complete - uptime: ${Date.now() - startTime}ms`);

  process.exit(exitCode);
}

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
 * FORTRESS v6.1: Enhanced message handler with comprehensive error handling
 */
parentPort.on('message', async (message) => {
  // Handle shutdown message
  if (message.type === 'SHUTDOWN') {
    console.log(`[INFO] Worker ${workerId}: Received shutdown signal`);
    gracefulExit(0);
    return;
  }

  const { taskId, type, payload } = message;

  // Set active task for monitoring
  activeTask = { taskId, type, startTime: Date.now() };

  try {
    const handler = taskHandlers[type];
    if (!handler) {
      throw new Error(`Unknown task type: ${type}`);
    }

    console.log(`[DEBUG] Worker ${workerId}: Executing task ${taskId} (${type})`);

    const result = await handler(payload);

    parentPort.postMessage({
      taskId,
      success: true,
      result,
      workerId,
      executionTime: Date.now() - activeTask.startTime
    });

    console.log(`[DEBUG] Worker ${workerId}: Task ${taskId} completed successfully`);

  } catch (error) {
    logError('task_execution_error', error, { taskId, type, payload });

    parentPort.postMessage({
      taskId,
      success: false,
      error: error.message,
      stack: error.stack,
      workerId,
      executionTime: Date.now() - activeTask.startTime
    });
  } finally {
    activeTask = null;
  }
});

/**
 * Handle whale balance check task (FORTRESS v6.1 - Enhanced Error Handling)
 */
async function handleWhaleBalanceCheck(payload) {
  const { whaleAddress, apiKey } = payload;

  try {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));

    // CRUCIBLE MANDATE 3: Use resilient API client with circuit breaker
    const response = await apiClient.request({
      url: `/api?module=account&action=balance&address=${whaleAddress}&tag=latest&apikey=${apiKey}`,
      method: 'GET',
      providers: ['etherscan'],
      timeout: 15000
    });

    // Enhanced error handling for Etherscan responses
    if (!response.data) {
      throw new Error('Etherscan API: No response data received');
    }

    if (response.data.status !== '1') {
      const errorMsg = response.data.message || response.data.result || 'Unknown error';

      // CRUCIBLE MANDATE 3: Handle API errors gracefully - don't crash workers
      console.warn(`[WARN] Worker ${workerId}: Etherscan API business error: ${errorMsg}`);

      return {
        whaleAddress,
        balanceETH: 0,
        balanceUSD: 0,
        error: `Etherscan API Error: ${errorMsg}`,
        errorType: 'API_BUSINESS_ERROR',
        timestamp: new Date().toISOString(),
        success: false
      };
    }

    const balanceWei = response.data.result;
    if (!balanceWei || balanceWei === '0x') {
      throw new Error('Etherscan API: Invalid balance data received');
    }

    const balanceEth = parseFloat(balanceWei) / 1e18;
    const balanceUSD = balanceEth * 3500; // Approximate ETH price

    return {
      whaleAddress,
      balanceEth: Math.round(balanceEth * 100) / 100,
      balanceUSD: Math.round(balanceUSD),
      timestamp: Date.now(),
      source: 'etherscan',
      apiKeyUsed: apiKey.slice(0, 8) + '...' // Log partial key for debugging
    };

  } catch (error) {
    // Enhanced error logging
    console.error(`[ERROR] Etherscan whale balance check failed for ${whaleAddress}:`, {
      error: error.message,
      apiKey: apiKey ? apiKey.slice(0, 8) + '...' : 'missing',
      timestamp: new Date().toISOString()
    });

    // FORTRESS v6.1: Fallback to Alchemy if Etherscan fails
    try {
      console.log(`[INFO] Attempting Alchemy fallback for ${whaleAddress}`);
      return await handleWhaleBalanceCheckAlchemy(whaleAddress);
    } catch (fallbackError) {
      console.error(`[ERROR] Alchemy fallback also failed:`, fallbackError.message);
      throw new Error(`All balance check methods failed - Etherscan: ${error.message}, Alchemy: ${fallbackError.message}`);
    }
  }
}

/**
 * FORTRESS v6.1: Alchemy fallback for whale balance checks
 */
async function handleWhaleBalanceCheckAlchemy(whaleAddress) {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;

  if (!alchemyApiKey) {
    throw new Error('Alchemy API key not configured');
  }

  try {
    const response = await axios.post(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [whaleAddress, 'latest']
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.error) {
      throw new Error(`Alchemy API Error: ${response.data.error.message}`);
    }

    const balanceWei = parseInt(response.data.result, 16);
    const balanceEth = balanceWei / 1e18;
    const balanceUSD = balanceEth * 3500; // Approximate ETH price

    return {
      whaleAddress,
      balanceEth: Math.round(balanceEth * 100) / 100,
      balanceUSD: Math.round(balanceUSD),
      timestamp: Date.now(),
      source: 'alchemy_fallback'
    };

  } catch (error) {
    throw new Error(`Alchemy balance check failed: ${error.message}`);
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

    // CRUCIBLE MANDATE 3: Use resilient API client for health checks
    const response = await apiClient.request({
      url: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'Phoenix-Engine-v6-HealthCheck'
      },
      timeout
    });

    const latency = Date.now() - startTime;

    return {
      apiName,
      status: 'HEALTHY',
      latency,
      timestamp: Date.now(),
      resilientClient: true
    };

  } catch (error) {
    // CRUCIBLE MANDATE 3: Graceful error handling - don't crash worker
    console.warn(`[WARN] Worker ${workerId}: API health check failed for ${apiName}: ${error.message}`);

    return {
      apiName,
      status: 'UNHEALTHY',
      error: error.message,
      timestamp: Date.now(),
      resilientClient: true
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
 * FORTRESS v6.1: Enhanced worker initialization with error handlers
 */
console.log(`[INFO] Phoenix Task Worker ${workerId} initialized - Fortress v6.1`);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('uncaught_exception', error, { activeTask });
  gracefulExit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logError('unhandled_rejection', error, {
    activeTask,
    promise: promise.toString()
  });
  gracefulExit(1);
});

/**
 * FORTRESS v6.1: Enhanced shutdown handlers with proper cleanup
 */
process.on('SIGTERM', () => {
  console.log(`[INFO] Worker ${workerId}: Received SIGTERM`);
  gracefulExit(0);
});

process.on('SIGINT', () => {
  console.log(`[INFO] Worker ${workerId}: Received SIGINT`);
  gracefulExit(0);
});

// Handle parent process disconnect
process.on('disconnect', () => {
  console.log(`[INFO] Worker ${workerId}: Parent process disconnected`);
  gracefulExit(0);
});
