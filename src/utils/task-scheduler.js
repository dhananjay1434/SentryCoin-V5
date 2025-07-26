/**
 * SentryCoin v6.0 - Microservice Task Scheduler
 * 
 * PROJECT PHOENIX - MANDATE 5 IMPLEMENTATION
 * 
 * Decomposes monolithic scans into distributed worker pool architecture
 * to prevent I/O contention and eliminate single points of failure.
 * 
 * RED TEAM MANDATE: "Create task scheduler/worker pool utility for distributed load."
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { getLogger } from './stateful-logger.js';
import { getISTTime } from './index.js';

const logger = getLogger();

/**
 * Task Definition Structure
 */
export class Task {
  constructor({
    id,
    type,
    priority = 5,
    payload = {},
    retryCount = 0,
    maxRetries = 3,
    timeout = 30000,
    scheduledTime = Date.now(),
    dependencies = []
  }) {
    this.id = id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.priority = priority; // 1-10, higher = more priority
    this.payload = payload;
    this.retryCount = retryCount;
    this.maxRetries = maxRetries;
    this.timeout = timeout;
    this.scheduledTime = scheduledTime;
    this.dependencies = dependencies;
    this.status = 'PENDING';
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.result = null;
    this.error = null;
    this.workerId = null;
  }

  /**
   * Check if task is ready to execute
   */
  isReady(completedTasks = new Set()) {
    if (this.status !== 'PENDING') return false;
    if (Date.now() < this.scheduledTime) return false;
    
    // Check dependencies
    for (const depId of this.dependencies) {
      if (!completedTasks.has(depId)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Mark task as started
   */
  start(workerId) {
    this.status = 'RUNNING';
    this.startedAt = Date.now();
    this.workerId = workerId;
  }

  /**
   * Mark task as completed
   */
  complete(result) {
    this.status = 'COMPLETED';
    this.completedAt = Date.now();
    this.result = result;
  }

  /**
   * Mark task as failed
   */
  fail(error) {
    this.status = 'FAILED';
    this.completedAt = Date.now();
    this.error = error;
  }

  /**
   * Get task execution time
   */
  getExecutionTime() {
    if (!this.startedAt || !this.completedAt) return 0;
    return this.completedAt - this.startedAt;
  }
}

/**
 * Worker Pool Manager
 */
export class WorkerPool {
  constructor(config = {}) {
    this.maxWorkers = config.maxWorkers || 4;
    this.workerScript = config.workerScript || './task-worker.js';
    this.workers = new Map();
    this.availableWorkers = [];
    this.busyWorkers = new Set();
    
    this.stats = {
      workersCreated: 0,
      workersDestroyed: 0,
      tasksExecuted: 0,
      tasksFailed: 0,
      avgExecutionTime: 0
    };
  }

  /**
   * Initialize worker pool
   */
  async initialize() {
    logger.info('worker_pool_init', `Initializing worker pool with ${this.maxWorkers} workers`);
    
    for (let i = 0; i < this.maxWorkers; i++) {
      await this.createWorker();
    }
    
    logger.info('worker_pool_ready', `Worker pool ready with ${this.workers.size} workers`);
  }

  /**
   * Create a new worker
   */
  async createWorker() {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      const worker = new Worker(this.workerScript, {
        workerData: { workerId }
      });
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(workerId, message);
      });
      
      worker.on('error', (error) => {
        this.handleWorkerError(workerId, error);
      });
      
      worker.on('exit', (code) => {
        this.handleWorkerExit(workerId, code);
      });
      
      this.workers.set(workerId, worker);
      this.availableWorkers.push(workerId);
      this.stats.workersCreated++;
      
      logger.debug('worker_created', workerId);
      
    } catch (error) {
      logger.error('worker_creation_failed', { workerId, error: error.message });
      throw error;
    }
  }

  /**
   * Get available worker
   */
  getAvailableWorker() {
    if (this.availableWorkers.length === 0) {
      return null;
    }
    
    const workerId = this.availableWorkers.shift();
    this.busyWorkers.add(workerId);
    return workerId;
  }

  /**
   * Release worker back to available pool
   */
  releaseWorker(workerId) {
    if (this.busyWorkers.has(workerId)) {
      this.busyWorkers.delete(workerId);
      this.availableWorkers.push(workerId);
    }
  }

  /**
   * Execute task on worker
   */
  async executeTask(task, workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
      }, task.timeout);
      
      const messageHandler = (message) => {
        if (message.taskId === task.id) {
          clearTimeout(timeout);
          worker.off('message', messageHandler);
          
          if (message.success) {
            resolve(message.result);
          } else {
            reject(new Error(message.error));
          }
        }
      };
      
      worker.on('message', messageHandler);
      
      // Send task to worker
      worker.postMessage({
        taskId: task.id,
        type: task.type,
        payload: task.payload
      });
    });
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(workerId, message) {
    logger.debug('worker_message', { workerId, message });
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(workerId, error) {
    logger.error('worker_error', { workerId, error: error.message });
    
    // Remove failed worker and create replacement
    this.destroyWorker(workerId);
    this.createWorker();
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(workerId, code) {
    logger.warn('worker_exit', { workerId, code });
    this.destroyWorker(workerId);
  }

  /**
   * Destroy worker
   */
  destroyWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
      this.stats.workersDestroyed++;
    }
    
    // Remove from pools
    this.busyWorkers.delete(workerId);
    const availableIndex = this.availableWorkers.indexOf(workerId);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
  }

  /**
   * Shutdown worker pool
   */
  async shutdown() {
    logger.info('worker_pool_shutdown', 'Shutting down worker pool');
    
    for (const [workerId, worker] of this.workers) {
      await worker.terminate();
      logger.debug('worker_terminated', workerId);
    }
    
    this.workers.clear();
    this.availableWorkers.length = 0;
    this.busyWorkers.clear();
  }

  /**
   * Get worker pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalWorkers: this.workers.size,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      utilizationRate: (this.busyWorkers.size / this.workers.size) * 100
    };
  }
}

/**
 * Microservice Task Scheduler - Core Engine
 */
export default class TaskScheduler extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 10,
      maxQueueSize: config.maxQueueSize || 1000,
      schedulerInterval: config.schedulerInterval || 1000, // 1 second
      enablePriority: config.enablePriority !== false,
      enableRetries: config.enableRetries !== false,
      ...config
    };
    
    // Task management
    this.taskQueue = [];
    this.runningTasks = new Map();
    this.completedTasks = new Set();
    this.failedTasks = new Map();
    
    // Worker pool
    this.workerPool = new WorkerPool(config.workerPool || {});
    
    // Scheduler state
    this.isRunning = false;
    this.schedulerTimer = null;
    
    // Performance tracking
    this.stats = {
      tasksScheduled: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksRetried: 0,
      avgExecutionTime: 0,
      queueSize: 0,
      startTime: Date.now()
    };
    
    logger.info('task_scheduler_init', {
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      maxQueueSize: this.config.maxQueueSize
    });
  }

  /**
   * Start task scheduler
   */
  async start() {
    if (this.isRunning) {
      logger.warn('task_scheduler_already_running', 'Task scheduler already running');
      return;
    }
    
    logger.info('task_scheduler_start', 'Starting task scheduler');
    
    // Initialize worker pool
    await this.workerPool.initialize();
    
    // Start scheduler loop
    this.isRunning = true;
    this.schedulerTimer = setInterval(() => {
      this.processTaskQueue();
    }, this.config.schedulerInterval);
    
    this.stats.startTime = Date.now();
    
    logger.info('task_scheduler_active', 'Task scheduler is active');
  }

  /**
   * Schedule a new task
   */
  scheduleTask(taskConfig) {
    if (this.taskQueue.length >= this.config.maxQueueSize) {
      throw new Error('Task queue is full');
    }
    
    const task = new Task(taskConfig);
    
    // Insert task based on priority
    if (this.config.enablePriority) {
      this.insertTaskByPriority(task);
    } else {
      this.taskQueue.push(task);
    }
    
    this.stats.tasksScheduled++;
    this.stats.queueSize = this.taskQueue.length;
    
    logger.debug('task_scheduled', {
      taskId: task.id,
      type: task.type,
      priority: task.priority,
      queueSize: this.taskQueue.length
    });
    
    this.emit('taskScheduled', task);
    return task.id;
  }

  /**
   * Insert task by priority (higher priority first)
   */
  insertTaskByPriority(task) {
    let insertIndex = this.taskQueue.length;
    
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (task.priority > this.taskQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.taskQueue.splice(insertIndex, 0, task);
  }

  /**
   * Process task queue
   */
  async processTaskQueue() {
    if (!this.isRunning) return;
    
    // Check for available workers and ready tasks
    while (this.runningTasks.size < this.config.maxConcurrentTasks && this.taskQueue.length > 0) {
      const workerId = this.workerPool.getAvailableWorker();
      if (!workerId) break;
      
      // Find next ready task
      const readyTaskIndex = this.taskQueue.findIndex(task => task.isReady(this.completedTasks));
      if (readyTaskIndex === -1) break;
      
      const task = this.taskQueue.splice(readyTaskIndex, 1)[0];
      await this.executeTask(task, workerId);
    }
    
    this.stats.queueSize = this.taskQueue.length;
  }

  /**
   * Execute task on worker
   */
  async executeTask(task, workerId) {
    task.start(workerId);
    this.runningTasks.set(task.id, task);
    
    logger.debug('task_execution_start', {
      taskId: task.id,
      type: task.type,
      workerId
    });
    
    try {
      const result = await this.workerPool.executeTask(task, workerId);
      
      task.complete(result);
      this.completedTasks.add(task.id);
      this.stats.tasksCompleted++;
      
      logger.info('task_execution_success', {
        taskId: task.id,
        executionTime: task.getExecutionTime()
      });
      
      this.emit('taskCompleted', task);
      
    } catch (error) {
      task.fail(error.message);
      
      // Handle retries
      if (this.config.enableRetries && task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'PENDING';
        task.startedAt = null;
        task.error = null;
        
        // Re-schedule with delay
        task.scheduledTime = Date.now() + (1000 * Math.pow(2, task.retryCount)); // Exponential backoff
        this.taskQueue.push(task);
        
        this.stats.tasksRetried++;
        
        logger.warn('task_retry_scheduled', {
          taskId: task.id,
          retryCount: task.retryCount,
          nextAttempt: task.scheduledTime
        });
        
      } else {
        this.failedTasks.set(task.id, task);
        this.stats.tasksFailed++;
        
        logger.error('task_execution_failed', {
          taskId: task.id,
          error: error.message,
          retryCount: task.retryCount
        });
        
        this.emit('taskFailed', task);
      }
    } finally {
      this.runningTasks.delete(task.id);
      this.workerPool.releaseWorker(workerId);
      
      // Update average execution time
      if (task.status === 'COMPLETED') {
        this.updateAverageExecutionTime(task.getExecutionTime());
      }
    }
  }

  /**
   * Update average execution time
   */
  updateAverageExecutionTime(executionTime) {
    if (this.stats.avgExecutionTime === 0) {
      this.stats.avgExecutionTime = executionTime;
    } else {
      this.stats.avgExecutionTime = (this.stats.avgExecutionTime + executionTime) / 2;
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId) {
    // Check running tasks
    if (this.runningTasks.has(taskId)) {
      return this.runningTasks.get(taskId);
    }
    
    // Check failed tasks
    if (this.failedTasks.has(taskId)) {
      return this.failedTasks.get(taskId);
    }
    
    // Check queue
    const queuedTask = this.taskQueue.find(task => task.id === taskId);
    if (queuedTask) {
      return queuedTask;
    }
    
    // Check completed
    if (this.completedTasks.has(taskId)) {
      return { id: taskId, status: 'COMPLETED' };
    }
    
    return null;
  }

  /**
   * Cancel task
   */
  cancelTask(taskId) {
    // Remove from queue
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.status = 'CANCELLED';
      logger.info('task_cancelled', taskId);
      return true;
    }
    
    // Cannot cancel running tasks (would require worker termination)
    return false;
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const workerStats = this.workerPool.getStats();
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      isRunning: this.isRunning,
      runningTasks: this.runningTasks.size,
      completedTasksCount: this.completedTasks.size,
      failedTasksCount: this.failedTasks.size,
      tasksPerSecond: Math.round((this.stats.tasksCompleted / (uptime / 1000)) * 100) / 100,
      workerPool: workerStats
    };
  }

  /**
   * Stop task scheduler
   */
  async stop() {
    if (!this.isRunning) return;
    
    logger.info('task_scheduler_stop', 'Stopping task scheduler');
    
    this.isRunning = false;
    
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    
    // Wait for running tasks to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.runningTasks.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Shutdown worker pool
    await this.workerPool.shutdown();
    
    logger.info('task_scheduler_stopped', {
      finalStats: this.getStats()
    });
  }
}
