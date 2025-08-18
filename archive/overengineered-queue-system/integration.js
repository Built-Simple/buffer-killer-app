// Queue System Integration for Electron Main Process
// Bridges the multi-account queue system with IPC

const MultiAccountQueueManager = require('./multi-account-manager');
const FailoverManager = require('./failover-manager');
const { ipcMain } = require('electron');
const path = require('path');

class QueueSystemIntegration {
  constructor() {
    this.queueManager = new MultiAccountQueueManager();
    this.failoverManager = new FailoverManager(this.queueManager);
    this.setupIpcHandlers();
    this.setupEventListeners();
  }

  setupIpcHandlers() {
    // Get queue statistics
    ipcMain.handle('queue:get-stats', async () => {
      return this.queueManager.getAllStats();
    });

    // Get failover status
    ipcMain.handle('queue:get-failover-status', async () => {
      return this.failoverManager.getStatus();
    });

    // Set load balancer strategy
    ipcMain.handle('queue:set-strategy', async (event, strategy) => {
      this.queueManager.loadBalancer.setStrategy(strategy);
      return { success: true, strategy };
    });

    // Pause all queues
    ipcMain.handle('queue:pause-all', async () => {
      const stats = this.queueManager.getAllStats();
      for (const stat of stats) {
        this.queueManager.pauseQueue(stat.platform, stat.accountId);
      }
      return { success: true };
    });

    // Resume all queues
    ipcMain.handle('queue:resume-all', async () => {
      const stats = this.queueManager.getAllStats();
      for (const stat of stats) {
        this.queueManager.resumeQueue(stat.platform, stat.accountId);
      }
      return { success: true };
    });

    // Toggle pause for specific queue
    ipcMain.handle('queue:toggle-pause', async (event, platform, accountId) => {
      const key = this.queueManager.getAccountKey(platform, accountId);
      const stats = this.queueManager.accountStats.get(key);
      
      if (stats && stats.health === 'paused') {
        this.queueManager.resumeQueue(platform, accountId);
      } else {
        this.queueManager.pauseQueue(platform, accountId);
      }
      
      return { success: true };
    });

    // Clear specific queue
    ipcMain.handle('queue:clear', async (event, platform, accountId) => {
      const success = this.queueManager.clearQueue(platform, accountId);
      return { success };
    });

    // Trigger manual failover
    ipcMain.handle('queue:manual-failover', async (event, platform, accountId) => {
      await this.failoverManager.triggerManualFailover(platform, accountId);
      return { success: true };
    });

    // Recover blacklisted account
    ipcMain.handle('queue:recover-account', async (event, platform, accountId) => {
      this.failoverManager.recoverAccount(platform, accountId);
      return { success: true };
    });

    // Initialize queue for new account
    ipcMain.handle('queue:initialize', async (event, platform, accountId, customLimits) => {
      await this.queueManager.initializeQueue(platform, accountId, customLimits);
      return { success: true };
    });

    // Add task to queue (with automatic failover)
    ipcMain.handle('queue:add-task', async (event, platform, accountId, taskData, priority) => {
      try {
        // Create the task function
        const task = async () => {
          // This would be the actual API call
          // For now, we'll simulate it
          return await this.executeTask(platform, accountId, taskData);
        };

        // Add to queue with failover support
        const result = await this.queueManager.addTask(platform, accountId, task, priority);
        return { success: true, result };
      } catch (error) {
        // Handle failover
        const failoverResult = await this.failoverManager.handleTaskFailure(
          platform, 
          accountId, 
          error, 
          async () => this.executeTask(platform, accountId, taskData)
        );
        
        if (failoverResult) {
          return { success: true, result: failoverResult, failover: true };
        }
        
        throw error;
      }
    });

    // Get load balanced account for platform
    ipcMain.handle('queue:get-best-account', async (event, platform) => {
      const account = this.queueManager.getHealthiestAccount(platform);
      return account ? { accountId: account.accountId, stats: account.stats } : null;
    });

    // Update failover rules
    ipcMain.handle('queue:update-failover-rules', async (event, platform, rules) => {
      this.failoverManager.updateRules(platform, rules);
      return { success: true };
    });
  }

  setupEventListeners() {
    // Forward queue events to renderer
    this.queueManager.on('queue:active', (data) => {
      this.broadcastToRenderers('queue:active', data);
    });

    this.queueManager.on('queue:idle', (data) => {
      this.broadcastToRenderers('queue:idle', data);
    });

    this.queueManager.on('queue:error', (data) => {
      this.broadcastToRenderers('queue:error', data);
    });

    this.queueManager.on('task:success', (data) => {
      this.broadcastToRenderers('task:success', data);
    });

    this.queueManager.on('task:error', (data) => {
      this.broadcastToRenderers('task:error', data);
    });

    this.queueManager.on('account:unhealthy', (data) => {
      this.broadcastToRenderers('account:unhealthy', data);
    });

    this.queueManager.on('account:recovered', (data) => {
      this.broadcastToRenderers('account:recovered', data);
    });

    this.queueManager.on('stats:update', (data) => {
      this.broadcastToRenderers('stats:update', data);
    });

    // Forward failover events
    this.failoverManager.on('account:blacklisted', (data) => {
      this.broadcastToRenderers('account:blacklisted', data);
    });

    this.failoverManager.on('account:recovered', (data) => {
      this.broadcastToRenderers('account:recovered', data);
    });

    this.failoverManager.on('failover:success', (data) => {
      this.broadcastToRenderers('failover:success', data);
    });

    this.failoverManager.on('failover:failed', (data) => {
      this.broadcastToRenderers('failover:failed', data);
    });

    this.failoverManager.on('account:warning', (data) => {
      this.broadcastToRenderers('account:warning', data);
    });
  }

  broadcastToRenderers(channel, data) {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send(channel, data);
    });
  }

  // Execute the actual task (platform-specific API calls)
  async executeTask(platform, accountId, taskData) {
    // This will be replaced with actual platform API calls
    // For now, simulate different behaviors
    
    const delay = Math.random() * 2000 + 500; // 0.5 - 2.5 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional failures
    if (Math.random() < 0.1) { // 10% failure rate for testing
      const errors = [
        'Rate limit exceeded',
        'API timeout',
        'Invalid credentials',
        'Network error'
      ];
      throw new Error(errors[Math.floor(Math.random() * errors.length)]);
    }
    
    // Return simulated success
    return {
      platform,
      accountId,
      taskData,
      timestamp: Date.now(),
      success: true
    };
  }

  // Integrate with existing posting functionality
  async postWithQueue(platform, accountId, postData) {
    // This integrates with the existing platform modules
    const platformModules = {
      twitter: require('../platforms/twitter'),
      linkedin: require('../platforms/linkedin'),
      mastodon: require('../platforms/mastodon'),
      github: require('../platforms/github'),
      facebook: require('../platforms/facebook')
    };

    const module = platformModules[platform];
    if (!module) {
      throw new Error(`Platform ${platform} not supported`);
    }

    // Create task for the queue
    const task = async () => {
      return await module.post(postData, accountId);
    };

    // Add to queue with automatic failover
    try {
      const result = await this.queueManager.addTask(platform, accountId, task, postData.priority || 0);
      return result;
    } catch (error) {
      // Try failover
      const failoverResult = await this.failoverManager.handleTaskFailure(
        platform,
        accountId,
        error,
        task
      );
      
      if (failoverResult) {
        return failoverResult;
      }
      
      throw error;
    }
  }

  // Schedule post with queue management
  async schedulePost(postData) {
    const { platforms, content, scheduledTime, media } = postData;
    const results = [];

    for (const platform of platforms) {
      // Get the best account for this platform
      const account = this.queueManager.getHealthiestAccount(platform);
      
      if (!account) {
        results.push({
          platform,
          success: false,
          error: 'No available accounts'
        });
        continue;
      }

      try {
        const result = await this.postWithQueue(platform, account.accountId, {
          content,
          scheduledTime,
          media
        });
        
        results.push({
          platform,
          accountId: account.accountId,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          platform,
          accountId: account.accountId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Graceful shutdown
  async shutdown() {
    await this.queueManager.shutdown();
  }
}

module.exports = QueueSystemIntegration;
