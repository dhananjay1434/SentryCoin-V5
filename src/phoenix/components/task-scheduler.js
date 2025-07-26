/**
 * Phoenix v6.0 - Microservice Task Scheduler (Mandate 5)
 * 
 * Distributed worker pool architecture to eliminate I/O contention
 * and single points of failure from monolithic scanning loops.
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class TaskScheduler extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 8,
      maxQueueSize: config.maxQueueSize || 500,
      enablePriority: config.enablePriority !== false,
      enableRetries: config.enableRetries !== false,
      workerScript: config.workerScript || path.join(__dirname, 'task-worker.js'),
      maxWorkers: config.maxWorkers || 4,
      ...config
    };
    
    this.logger = config.logger;
    
    // Task management
    this.taskQueue = [];
    this.runningTasks = new Map();
    this.completedTasks = new Set();
    this.failedTasks = new Map();
    
    // Worker pool
    this.workers = new Map();
    this.availableWorkers = [];
    this.busyWorkers = new Set();
    
    // Scheduler state
    this.isRunning = false;
    this.schedulerTimer = null;
    
    // Performance stats
    this.stats = {
      tasksScheduled: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksRetried: 0,
      avgExecutionTime: 0,
      queueSize: 0,
      workersCreated: 0,
      startTime: Date.now()
    };
    
    this.logger?.info('task_scheduler_init', {
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      maxWorkers: this.config.maxWorkers
    });
  }

  /**
   * Initialize task scheduler
   */
  async initialize() {
    this.logger?.info('task_scheduler_initialize', 'Initializing worker pool');
    
    try {
      // Create worker pool
      for (let i = 0; i < this.config.maxWorkers; i++) {
        await this.createWorker();
      }
      
      this.logger?.info('task_scheduler_ready', `Worker pool ready with ${this.workers.size} workers`);
      return true;
      
    } catch (error) {
      this.logger?.error('task_scheduler_init_failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Create a new worker
   */
  async createWorker() {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      const worker = new Worker(this.config.workerScript, {
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
      
      this.logger?.debug('worker_created', workerId);
      
    } catch (error) {
      this.logger?.error('worker_creation_failed', {
        workerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start task scheduler
   */
  async start() {
    if (this.isRunning) {
      this.logger?.warn('task_scheduler_already_running', 'Task scheduler already running');
      return true;
    }
    
    this.logger?.info('task_scheduler_start', 'Starting task scheduler');
    
    this.isRunning = true;
    this.stats.startTime = Date.now();
    
    // Start scheduler loop
    this.schedulerTimer = setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Every second
    
    this.logger?.info('task_scheduler_active', 'Task scheduler is active');
    return true;
  }

  /**
   * Schedule a new task
   */
  scheduleTask(taskConfig) {
    if (this.taskQueue.length >= this.config.maxQueueSize) {
      throw new Error('Task queue is full');
    }
    
    const task = this.createTask(taskConfig);
    
    // Insert task based on priority
    if (this.config.enablePriority) {
      this.insertTaskByPriority(task);
    } else {
      this.taskQueue.push(task);
    }
    
    this.stats.tasksScheduled++;
    this.stats.queueSize = this.taskQueue.length;
    
    this.logger?.debug('task_scheduled', {
      taskId: task.id,
      type: task.type,
      priority: task.priority,
      queueSize: this.taskQueue.length
    });
    
    return task.id;
  }

  /**
   * Create task object
   */
  createTask(config) {
    return {
      id: config.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: config.type,
      priority: config.priority || 5,
      payload: config.payload || {},
      retryCount: 0,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      scheduledTime: config.scheduledTime || Date.now(),
      dependencies: config.dependencies || [],
      status: 'PENDING',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      workerId: null,
      executionTime: 0
    };
  }

  /**
   * Insert task by priority
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
    
    // Process available tasks
    while (this.runningTasks.size < this.config.maxConcurrentTasks && this.taskQueue.length > 0) {
      const workerId = this.getAvailableWorker();
      if (!workerId) break;
      
      // Find next ready task
      const readyTaskIndex = this.taskQueue.findIndex(task => this.isTaskReady(task));
      if (readyTaskIndex === -1) break;
      
      const task = this.taskQueue.splice(readyTaskIndex, 1)[0];
      await this.executeTask(task, workerId);
    }
    
    this.stats.queueSize = this.taskQueue.length;
  }

  /**
   * Check if task is ready to execute
   */
  isTaskReady(task) {
    if (task.status !== 'PENDING') return false;
    if (Date.now() < task.scheduledTime) return false;
    
    // Check dependencies
    for (const depId of task.dependencies) {
      if (!this.completedTasks.has(depId)) {
        return false;
      }
    }
    
    return true;
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
    task.status = 'RUNNING';
    task.startedAt = Date.now();
    task.workerId = workerId;
    
    this.runningTasks.set(task.id, task);
    
    this.logger?.debug('task_execution_start', {
      taskId: task.id,
      type: task.type,
      workerId
    });
    
    try {
      const result = await this.executeTaskOnWorker(task, workerId);
      
      task.status = 'COMPLETED';
      task.completedAt = Date.now();
      task.result = result;
      task.executionTime = task.completedAt - task.startedAt;
      
      this.completedTasks.add(task.id);
      this.stats.tasksCompleted++;
      
      this.updateAverageExecutionTime(task.executionTime);
      
      this.logger?.info('task_execution_success', {
        taskId: task.id,
        executionTime: task.executionTime
      });
      
      this.emit('TASK_COMPLETED', task);
      
    } catch (error) {
      await this.handleTaskFailure(task, error);
    } finally {
      this.runningTasks.delete(task.id);
      this.releaseWorker(workerId);
    }
  }

  /**
   * Execute task on worker
   */
  async executeTaskOnWorker(task, workerId) {
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
   * Handle task failure
   */
  async handleTaskFailure(task, error) {
    task.status = 'FAILED';
    task.completedAt = Date.now();
    task.error = error.message;
    task.executionTime = task.completedAt - task.startedAt;
    
    // Handle retries
    if (this.config.enableRetries && task.retryCount < task.maxRetries) {
      task.retryCount++;
      task.status = 'PENDING';
      task.startedAt = null;
      task.error = null;
      
      // Re-schedule with exponential backoff
      task.scheduledTime = Date.now() + (1000 * Math.pow(2, task.retryCount));
      this.taskQueue.push(task);
      
      this.stats.tasksRetried++;
      
      this.logger?.warn('task_retry_scheduled', {
        taskId: task.id,
        retryCount: task.retryCount,
        nextAttempt: task.scheduledTime
      });
      
    } else {
      this.failedTasks.set(task.id, task);
      this.stats.tasksFailed++;
      
      this.logger?.error('task_execution_failed', {
        taskId: task.id,
        error: error.message,
        retryCount: task.retryCount
      });
      
      this.emit('TASK_FAILED', task);
    }
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(workerId, message) {
    this.logger?.debug('worker_message', { workerId, message });
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(workerId, error) {
    this.logger?.error('worker_error', {
      workerId,
      error: error.message
    });
    
    // Remove failed worker and create replacement
    this.destroyWorker(workerId);
    this.createWorker();
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(workerId, code) {
    this.logger?.warn('worker_exit', { workerId, code });
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
    }
    
    // Remove from pools
    this.busyWorkers.delete(workerId);
    const availableIndex = this.availableWorkers.indexOf(workerId);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
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
   * Stop accepting new tasks
   */
  async stopAcceptingTasks() {
    this.logger?.info('task_scheduler_stop_accepting', 'Stopping task acceptance');
    this.isRunning = false;

    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  /**
   * Wait for active tasks to complete
   */
  async waitForActiveTasks(timeoutMs = 10000) {
    const startTime = Date.now();

    while (this.runningTasks.size > 0 && (Date.now() - startTime) < timeoutMs) {
      this.logger?.info('waiting_for_tasks', `${this.runningTasks.size} tasks still active`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (this.runningTasks.size > 0) {
      this.logger?.warn('task_timeout', `${this.runningTasks.size} tasks did not complete within timeout`);
    } else {
      this.logger?.info('all_tasks_complete', 'All active tasks completed');
    }
  }

  /**
   * Terminate all workers with confirmation
   */
  async terminateAllWorkers() {
    this.logger?.info('terminating_workers', `Terminating ${this.workers.size} workers`);

    const terminationPromises = [];

    for (const [workerId, worker] of this.workers) {
      terminationPromises.push(new Promise((resolve) => {
        worker.once('exit', (code) => {
          if (code === 0) {
            this.logger?.info('worker_terminated_cleanly', `Worker ${workerId} exited with code ${code}`);
          } else {
            this.logger?.warn('worker_terminated_error', `Worker ${workerId} exited with code ${code}`);
          }
          resolve();
        });

        worker.terminate();
      }));
    }

    await Promise.all(terminationPromises);

    this.workers.clear();
    this.availableWorkers.length = 0;
    this.busyWorkers.clear();
    this.runningTasks.clear();

    this.logger?.info('all_workers_terminated', 'All workers terminated cleanly');
  }

  /**
   * Stop task scheduler (legacy method - now uses sequential shutdown)
   */
  async stop() {
    if (!this.isRunning) return;

    this.logger?.info('task_scheduler_stop', 'Stopping task scheduler');

    // Use sequential shutdown approach
    await this.stopAcceptingTasks();
    await this.waitForActiveTasks(30000); // 30 second timeout
    await this.terminateAllWorkers();

    this.logger?.info('task_scheduler_stopped', 'Task scheduler shutdown complete');
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      isRunning: this.isRunning,
      totalWorkers: this.workers.size,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      runningTasks: this.runningTasks.size,
      utilizationRate: (this.busyWorkers.size / this.workers.size) * 100 || 0,
      tasksPerSecond: Math.round((this.stats.tasksCompleted / (uptime / 1000)) * 100) / 100
    };
  }
}
