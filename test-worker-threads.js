#!/usr/bin/env node

/**
 * Worker Thread Diagnostic Test
 * 
 * Tests the Phoenix Engine task scheduler worker threads
 * to diagnose the exit code 1 issues.
 */

import TaskScheduler from './src/phoenix/components/task-scheduler.js';
import StatefulLogger from './src/phoenix/components/stateful-logger.js';

class WorkerThreadTester {
  constructor() {
    this.logger = new StatefulLogger({
      enableFileLogging: false,
      stateChangeOnly: false // Show all logs for debugging
    });
    
    this.taskScheduler = null;
    
    console.log('🧪 WORKER THREAD DIAGNOSTIC TEST');
    console.log('🔧 Testing Phoenix Engine task scheduler worker threads');
    console.log('🎯 Diagnosing exit code 1 issues\n');
  }

  /**
   * Test worker thread creation and basic functionality
   */
  async testWorkerCreation() {
    console.log('📋 TEST 1: Worker Thread Creation');
    console.log('=' .repeat(50));
    
    try {
      this.taskScheduler = new TaskScheduler({
        maxWorkers: 2,
        maxConcurrentTasks: 4,
        logger: this.logger
      });
      
      console.log('✅ TaskScheduler created successfully');
      
      // Initialize task scheduler
      const initialized = await this.taskScheduler.initialize();
      if (!initialized) {
        throw new Error('TaskScheduler initialization failed');
      }
      
      console.log('✅ TaskScheduler initialized successfully');
      console.log(`📊 Workers created: ${this.taskScheduler.workers.size}`);
      console.log(`📊 Available workers: ${this.taskScheduler.availableWorkers.length}`);
      
      // Wait a moment to see if workers exit immediately
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`📊 Workers after 2s: ${this.taskScheduler.workers.size}`);
      console.log(`📊 Available workers after 2s: ${this.taskScheduler.availableWorkers.length}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Worker creation test failed:', error.message);
      console.error(error.stack);
      return false;
    }
  }

  /**
   * Test simple task execution
   */
  async testTaskExecution() {
    console.log('\n📋 TEST 2: Simple Task Execution');
    console.log('=' .repeat(50));
    
    if (!this.taskScheduler) {
      console.error('❌ TaskScheduler not available for testing');
      return false;
    }
    
    try {
      // Start the task scheduler
      const started = await this.taskScheduler.start();
      if (!started) {
        throw new Error('TaskScheduler failed to start');
      }
      
      console.log('✅ TaskScheduler started successfully');
      
      // Schedule a simple system health check task
      const taskId = this.taskScheduler.scheduleTask({
        type: 'SYSTEM_HEALTH_CHECK',
        priority: 8,
        payload: { timestamp: Date.now() }
      });
      
      console.log(`✅ Task scheduled: ${taskId}`);
      
      // Wait for task completion
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const stats = this.taskScheduler.getStats();
      console.log(`📊 Tasks completed: ${stats.tasksCompleted}`);
      console.log(`📊 Tasks failed: ${stats.tasksFailed}`);
      console.log(`📊 Workers running: ${stats.totalWorkers}`);
      
      return stats.tasksCompleted > 0;
      
    } catch (error) {
      console.error('❌ Task execution test failed:', error.message);
      console.error(error.stack);
      return false;
    }
  }

  /**
   * Test worker error handling
   */
  async testWorkerErrorHandling() {
    console.log('\n📋 TEST 3: Worker Error Handling');
    console.log('=' .repeat(50));
    
    if (!this.taskScheduler) {
      console.error('❌ TaskScheduler not available for testing');
      return false;
    }
    
    try {
      // Schedule a task with invalid type to trigger error
      const taskId = this.taskScheduler.scheduleTask({
        type: 'INVALID_TASK_TYPE',
        priority: 5,
        payload: { test: true }
      });
      
      console.log(`✅ Invalid task scheduled: ${taskId}`);
      
      // Wait for task processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const stats = this.taskScheduler.getStats();
      console.log(`📊 Tasks failed: ${stats.tasksFailed}`);
      console.log(`📊 Workers still running: ${stats.totalWorkers}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Worker error handling test failed:', error.message);
      return false;
    }
  }

  /**
   * Test graceful shutdown
   */
  async testGracefulShutdown() {
    console.log('\n📋 TEST 4: Graceful Shutdown');
    console.log('=' .repeat(50));
    
    if (!this.taskScheduler) {
      console.error('❌ TaskScheduler not available for testing');
      return false;
    }
    
    try {
      console.log('🛑 Initiating graceful shutdown...');
      
      await this.taskScheduler.stop();
      
      console.log('✅ Graceful shutdown completed');
      console.log(`📊 Workers remaining: ${this.taskScheduler.workers.size}`);
      
      return this.taskScheduler.workers.size === 0;
      
    } catch (error) {
      console.error('❌ Graceful shutdown test failed:', error.message);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 STARTING WORKER THREAD DIAGNOSTIC TESTS\n');
    
    const results = [];
    
    // Test 1: Worker Creation
    const test1 = await this.testWorkerCreation();
    results.push({ test: 'Worker Creation', passed: test1 });
    
    // Test 2: Task Execution
    const test2 = await this.testTaskExecution();
    results.push({ test: 'Task Execution', passed: test2 });
    
    // Test 3: Error Handling
    const test3 = await this.testWorkerErrorHandling();
    results.push({ test: 'Error Handling', passed: test3 });
    
    // Test 4: Graceful Shutdown
    const test4 = await this.testGracefulShutdown();
    results.push({ test: 'Graceful Shutdown', passed: test4 });
    
    // Generate report
    this.generateTestReport(results);
  }

  /**
   * Generate test report
   */
  generateTestReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('🔥 WORKER THREAD DIAGNOSTIC TEST REPORT');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`📊 OVERALL RESULT: ${passed}/${total} tests passed`);
    console.log('');
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.test}`);
    });
    
    console.log('');
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED - Worker threads are functioning correctly');
      console.log('💡 The exit code 1 issue may be related to specific task types or timing');
    } else {
      console.log('🚨 SOME TESTS FAILED - Worker thread issues detected');
      console.log('🔧 Review the error messages above for specific issues');
    }
    
    console.log('\n🔍 DIAGNOSTIC RECOMMENDATIONS:');
    console.log('1. Check that all required dependencies are installed');
    console.log('2. Verify ES module configuration in package.json');
    console.log('3. Ensure worker script path is correct');
    console.log('4. Check for any missing environment variables');
    console.log('5. Review system resource availability');
    
    console.log('\n🛠️ NEXT STEPS:');
    console.log('- If tests pass, the issue may be task-specific');
    console.log('- If tests fail, focus on worker thread configuration');
    console.log('- Check Phoenix Engine logs for more detailed error information');
    
    console.log('\n🔥 WORKER THREAD DIAGNOSTIC COMPLETE');
  }
}

// Run the diagnostic tests
const tester = new WorkerThreadTester();
tester.runAllTests().catch(error => {
  console.error('💥 DIAGNOSTIC TEST EXECUTION FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
});
