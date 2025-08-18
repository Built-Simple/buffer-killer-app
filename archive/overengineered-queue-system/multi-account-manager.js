// Multi-Account Queue Manager
// Manages separate PQueue instances for each platform-account combination

const { default: PQueue } = require('p-queue');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class MultiAccountQueueManager extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map(); // Map<accountKey, PQueue>
    this.accountStats = new Map(); // Map<accountKey, stats>
    this.loadBalancer = new LoadBalancer(this);
    this.rateLimits = {
      twitter: { concurrent: 2, interval: 1000, intervalCap: 5, timeout: 30000 },
      linkedin: { concurrent: 1, interval: 2000, intervalCap: 3, timeout: 30000 },
      mastodon: { concurrent: 3, interval: 500, intervalCap: 10, timeout: 20000 },
      github: { concurrent: 5, interval: 200, intervalCap: 20, timeout: 20000 },
      facebook: { concurrent: 2, interval: 1500, intervalCap: 4, timeout: 30000 }
    };
    
    this.initializeQueues();
    this.startMonitoring();
  }

  // Generate unique key for platform-account combination
  getAccountKey(platform, accountId) {
    return `${platform}:${accountId}`;
  }

  // Initialize queue for a specific account
  async initializeQueue(platform, accountId, customLimits = null) {
    const key = this.getAccountKey(platform, accountId);
    
    if (this.queues.has(key)) {
      console.log(`Queue already exists for ${key}`);
      return this.queues.get(key);
    }

    const limits = customLimits || this.rateLimits[platform] || {
      concurrent: 1,
      interval: 1000,
      intervalCap: 5,
      timeout: 30000
    };

    const queue = new PQueue({
      concurrency: limits.concurrent,
      interval: limits.interval,
      intervalCap: limits.intervalCap,
      timeout: limits.timeout,
      throwOnTimeout: false
    });

    // Track statistics
    this.accountStats.set(key, {
      platform,
      accountId,
      processed: 0,
      failed: 0,
      pending: 0,
      rateLimit: limits,
      lastActivity: Date.now(),
      health: 'healthy',
      averageResponseTime: 0,
      errorRate: 0
    });

    // Queue event listeners
    queue.on('active', () => {
      const stats = this.accountStats.get(key);
      stats.pending = queue.pending;
      stats.lastActivity = Date.now();
      this.emit('queue:active', { key, stats });
    });

    queue.on('idle', () => {
      this.emit('queue:idle', { key });
    });

    queue.on('error', (error) => {
      const stats = this.accountStats.get(key);
      stats.failed++;
      stats.errorRate = stats.failed / (stats.processed + stats.failed);
      this.emit('queue:error', { key, error, stats });
    });

    this.queues.set(key, queue);
    console.log(`Initialized queue for ${key} with limits:`, limits);
    
    return queue;
  }

  // Add task to appropriate queue
  async addTask(platform, accountId, task, priority = 0) {
    const key = this.getAccountKey(platform, accountId);
    let queue = this.queues.get(key);

    if (!queue) {
      queue = await this.initializeQueue(platform, accountId);
    }

    const stats = this.accountStats.get(key);
    stats.pending++;

    const startTime = Date.now();
    
    try {
      const result = await queue.add(async () => {
        try {
          const taskResult = await task();
          
          // Update statistics
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          stats.processed++;
          stats.pending = queue.pending;
          stats.averageResponseTime = 
            (stats.averageResponseTime * (stats.processed - 1) + responseTime) / stats.processed;
          
          this.emit('task:success', { key, responseTime, stats });
          return taskResult;
        } catch (error) {
          stats.failed++;
          stats.pending = queue.pending;
          stats.errorRate = stats.failed / (stats.processed + stats.failed);
          
          // Check if we should mark account as unhealthy
          if (stats.errorRate > 0.3) {
            stats.health = 'unhealthy';
            this.emit('account:unhealthy', { key, stats });
          }
          
          throw error;
        }
      }, { priority });

      return result;
    } catch (error) {
      this.emit('task:error', { key, error });
      throw error;
    }
  }

  // Get all accounts for a platform
  getAccountsForPlatform(platform) {
    const accounts = [];
    for (const [key, stats] of this.accountStats) {
      if (stats.platform === platform) {
        accounts.push({
          key,
          accountId: stats.accountId,
          stats: { ...stats },
          queue: this.queues.get(key)
        });
      }
    }
    return accounts;
  }

  // Get healthiest account for a platform (for load balancing)
  getHealthiestAccount(platform) {
    const accounts = this.getAccountsForPlatform(platform);
    
    if (accounts.length === 0) {
      return null;
    }

    // Sort by health score (lower error rate, less pending, more recent activity)
    accounts.sort((a, b) => {
      // Prioritize healthy accounts
      if (a.stats.health !== b.stats.health) {
        return a.stats.health === 'healthy' ? -1 : 1;
      }
      
      // Then by error rate (lower is better)
      if (a.stats.errorRate !== b.stats.errorRate) {
        return a.stats.errorRate - b.stats.errorRate;
      }
      
      // Then by pending tasks (fewer is better)
      if (a.stats.pending !== b.stats.pending) {
        return a.stats.pending - b.stats.pending;
      }
      
      // Finally by response time (faster is better)
      return a.stats.averageResponseTime - b.stats.averageResponseTime;
    });

    return accounts[0];
  }

  // Pause a specific queue
  pauseQueue(platform, accountId) {
    const key = this.getAccountKey(platform, accountId);
    const queue = this.queues.get(key);
    
    if (queue) {
      queue.pause();
      const stats = this.accountStats.get(key);
      stats.health = 'paused';
      this.emit('queue:paused', { key });
      return true;
    }
    
    return false;
  }

  // Resume a specific queue
  resumeQueue(platform, accountId) {
    const key = this.getAccountKey(platform, accountId);
    const queue = this.queues.get(key);
    
    if (queue) {
      queue.start();
      const stats = this.accountStats.get(key);
      stats.health = 'healthy';
      this.emit('queue:resumed', { key });
      return true;
    }
    
    return false;
  }

  // Clear all tasks for a specific account
  clearQueue(platform, accountId) {
    const key = this.getAccountKey(platform, accountId);
    const queue = this.queues.get(key);
    
    if (queue) {
      queue.clear();
      const stats = this.accountStats.get(key);
      stats.pending = 0;
      this.emit('queue:cleared', { key });
      return true;
    }
    
    return false;
  }

  // Get statistics for all queues
  getAllStats() {
    const stats = [];
    for (const [key, queueStats] of this.accountStats) {
      const queue = this.queues.get(key);
      stats.push({
        key,
        ...queueStats,
        queueSize: queue ? queue.size : 0,
        queuePending: queue ? queue.pending : 0,
        isPaused: queue ? queue.isPaused : false
      });
    }
    return stats;
  }

  // Initialize default queues from stored accounts
  async initializeQueues() {
    try {
      const dbPath = path.join(__dirname, '../../data/database.json');
      const data = await fs.readFile(dbPath, 'utf8');
      const db = JSON.parse(data);
      
      if (db.accounts && db.accounts.length > 0) {
        for (const account of db.accounts) {
          if (account.connected && account.accountId) {
            await this.initializeQueue(account.platform, account.accountId);
          }
        }
      }
    } catch (error) {
      console.log('No existing accounts found, queues will be initialized on demand');
    }
  }

  // Monitor queue health
  startMonitoring() {
    setInterval(() => {
      for (const [key, stats] of this.accountStats) {
        const queue = this.queues.get(key);
        
        if (queue) {
          // Update pending count
          stats.pending = queue.pending;
          
          // Check for stale queues (no activity for 5 minutes)
          const inactiveTime = Date.now() - stats.lastActivity;
          if (inactiveTime > 5 * 60 * 1000 && stats.pending === 0) {
            stats.health = 'idle';
          }
          
          // Auto-recovery for unhealthy accounts
          if (stats.health === 'unhealthy' && stats.errorRate < 0.1) {
            stats.health = 'healthy';
            this.emit('account:recovered', { key, stats });
          }
        }
      }
      
      this.emit('stats:update', this.getAllStats());
    }, 5000); // Check every 5 seconds
  }

  // Shutdown all queues gracefully
  async shutdown() {
    console.log('Shutting down all queues...');
    
    const promises = [];
    for (const [key, queue] of this.queues) {
      promises.push(queue.onIdle());
    }
    
    await Promise.all(promises);
    console.log('All queues shut down successfully');
  }
}

// Load Balancer for distributing tasks across accounts
class LoadBalancer {
  constructor(manager) {
    this.manager = manager;
    this.strategies = {
      roundRobin: new RoundRobinStrategy(),
      leastPending: new LeastPendingStrategy(),
      healthiest: new HealthiestStrategy(),
      weighted: new WeightedStrategy()
    };
    this.currentStrategy = 'healthiest';
  }

  setStrategy(strategy) {
    if (this.strategies[strategy]) {
      this.currentStrategy = strategy;
      console.log(`Load balancer strategy set to: ${strategy}`);
    }
  }

  async distribute(platform, task, priority = 0) {
    const strategy = this.strategies[this.currentStrategy];
    const account = strategy.selectAccount(this.manager, platform);
    
    if (!account) {
      throw new Error(`No available accounts for platform: ${platform}`);
    }
    
    return await this.manager.addTask(platform, account.accountId, task, priority);
  }
}

// Load balancing strategies
class RoundRobinStrategy {
  constructor() {
    this.lastUsed = new Map();
  }

  selectAccount(manager, platform) {
    const accounts = manager.getAccountsForPlatform(platform);
    if (accounts.length === 0) return null;
    
    const lastIndex = this.lastUsed.get(platform) || -1;
    const nextIndex = (lastIndex + 1) % accounts.length;
    this.lastUsed.set(platform, nextIndex);
    
    return accounts[nextIndex];
  }
}

class LeastPendingStrategy {
  selectAccount(manager, platform) {
    const accounts = manager.getAccountsForPlatform(platform);
    if (accounts.length === 0) return null;
    
    return accounts.reduce((best, current) => {
      return current.stats.pending < best.stats.pending ? current : best;
    });
  }
}

class HealthiestStrategy {
  selectAccount(manager, platform) {
    return manager.getHealthiestAccount(platform);
  }
}

class WeightedStrategy {
  selectAccount(manager, platform) {
    const accounts = manager.getAccountsForPlatform(platform);
    if (accounts.length === 0) return null;
    
    // Calculate weights based on multiple factors
    const weightedAccounts = accounts.map(account => {
      const healthWeight = account.stats.health === 'healthy' ? 1.0 : 0.5;
      const errorWeight = 1.0 - account.stats.errorRate;
      const pendingWeight = 1.0 / (account.stats.pending + 1);
      const responseWeight = 1.0 / (account.stats.averageResponseTime + 1);
      
      const totalWeight = healthWeight * errorWeight * pendingWeight * responseWeight;
      
      return { account, weight: totalWeight };
    });
    
    // Select based on weighted random
    const totalWeight = weightedAccounts.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    
    let accumulator = 0;
    for (const item of weightedAccounts) {
      accumulator += item.weight;
      if (random <= accumulator) {
        return item.account;
      }
    }
    
    return weightedAccounts[0].account;
  }
}

module.exports = MultiAccountQueueManager;
