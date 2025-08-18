// Failover Manager
// Handles automatic failover when accounts hit rate limits or errors

const EventEmitter = require('events');

class FailoverManager extends EventEmitter {
  constructor(queueManager) {
    super();
    this.queueManager = queueManager;
    this.failoverRules = new Map();
    this.blacklist = new Map(); // Temporarily disabled accounts
    this.setupDefaultRules();
    this.startHealthCheck();
  }

  setupDefaultRules() {
    // Default failover rules for each platform
    this.failoverRules.set('twitter', {
      maxErrorRate: 0.3,
      maxConsecutiveErrors: 5,
      cooldownPeriod: 5 * 60 * 1000, // 5 minutes
      rateLimitCooldown: 15 * 60 * 1000, // 15 minutes for Twitter
      autoRetry: true
    });

    this.failoverRules.set('linkedin', {
      maxErrorRate: 0.25,
      maxConsecutiveErrors: 3,
      cooldownPeriod: 10 * 60 * 1000, // 10 minutes
      rateLimitCooldown: 60 * 60 * 1000, // 1 hour for LinkedIn
      autoRetry: true
    });

    this.failoverRules.set('mastodon', {
      maxErrorRate: 0.4,
      maxConsecutiveErrors: 10,
      cooldownPeriod: 2 * 60 * 1000, // 2 minutes
      rateLimitCooldown: 5 * 60 * 1000, // 5 minutes for Mastodon
      autoRetry: true
    });

    this.failoverRules.set('github', {
      maxErrorRate: 0.2,
      maxConsecutiveErrors: 3,
      cooldownPeriod: 5 * 60 * 1000, // 5 minutes
      rateLimitCooldown: 60 * 60 * 1000, // 1 hour for GitHub
      autoRetry: true
    });

    this.failoverRules.set('facebook', {
      maxErrorRate: 0.25,
      maxConsecutiveErrors: 4,
      cooldownPeriod: 10 * 60 * 1000, // 10 minutes
      rateLimitCooldown: 30 * 60 * 1000, // 30 minutes for Facebook
      autoRetry: true
    });
  }

  // Handle task failure and determine if failover is needed
  async handleTaskFailure(platform, accountId, error, task) {
    const key = this.queueManager.getAccountKey(platform, accountId);
    const stats = this.queueManager.accountStats.get(key);
    const rules = this.failoverRules.get(platform);

    if (!stats || !rules) {
      console.error(`No stats or rules found for ${key}`);
      return null;
    }

    // Check if this is a rate limit error
    const isRateLimit = this.isRateLimitError(error);
    
    if (isRateLimit) {
      console.log(`Rate limit detected for ${key}, initiating failover...`);
      await this.blacklistAccount(platform, accountId, rules.rateLimitCooldown);
      return await this.failoverTask(platform, accountId, task);
    }

    // Check if account should be blacklisted due to errors
    if (stats.errorRate > rules.maxErrorRate) {
      console.log(`High error rate for ${key}, initiating failover...`);
      await this.blacklistAccount(platform, accountId, rules.cooldownPeriod);
      return await this.failoverTask(platform, accountId, task);
    }

    // Try immediate retry with different account
    if (rules.autoRetry) {
      console.log(`Attempting failover for failed task on ${key}`);
      return await this.failoverTask(platform, accountId, task);
    }

    return null;
  }

  // Detect rate limit errors
  isRateLimitError(error) {
    if (!error) return false;
    
    const rateLimitIndicators = [
      'rate limit',
      'too many requests',
      '429',
      'throttled',
      'quota exceeded',
      'limit exceeded',
      'retry-after'
    ];

    const errorString = error.toString().toLowerCase();
    return rateLimitIndicators.some(indicator => errorString.includes(indicator));
  }

  // Temporarily blacklist an account
  async blacklistAccount(platform, accountId, duration) {
    const key = this.queueManager.getAccountKey(platform, accountId);
    
    // Pause the queue
    this.queueManager.pauseQueue(platform, accountId);
    
    // Add to blacklist
    this.blacklist.set(key, {
      platform,
      accountId,
      blacklistedAt: Date.now(),
      duration,
      reason: 'Rate limit or high error rate'
    });

    this.emit('account:blacklisted', { key, duration });

    // Schedule automatic recovery
    setTimeout(() => {
      this.recoverAccount(platform, accountId);
    }, duration);
  }

  // Recover a blacklisted account
  recoverAccount(platform, accountId) {
    const key = this.queueManager.getAccountKey(platform, accountId);
    
    if (this.blacklist.has(key)) {
      this.blacklist.delete(key);
      this.queueManager.resumeQueue(platform, accountId);
      
      // Reset error statistics
      const stats = this.queueManager.accountStats.get(key);
      if (stats) {
        stats.failed = 0;
        stats.errorRate = 0;
        stats.health = 'healthy';
      }
      
      this.emit('account:recovered', { key });
      console.log(`Account ${key} recovered and resumed`);
    }
  }

  // Failover task to another account
  async failoverTask(platform, failedAccountId, task) {
    const availableAccounts = this.getAvailableAccounts(platform, failedAccountId);
    
    if (availableAccounts.length === 0) {
      console.error(`No available accounts for failover on ${platform}`);
      this.emit('failover:failed', { platform, reason: 'No available accounts' });
      throw new Error(`All accounts for ${platform} are unavailable`);
    }

    // Try each available account in order of health
    for (const account of availableAccounts) {
      try {
        console.log(`Attempting failover to ${account.key}`);
        const result = await this.queueManager.addTask(
          platform, 
          account.accountId, 
          task, 
          1 // Higher priority for failover tasks
        );
        
        this.emit('failover:success', { 
          from: failedAccountId, 
          to: account.accountId, 
          platform 
        });
        
        return result;
      } catch (error) {
        console.error(`Failover to ${account.key} failed:`, error);
        continue;
      }
    }

    // All failover attempts failed
    this.emit('failover:exhausted', { platform });
    throw new Error(`All failover attempts failed for ${platform}`);
  }

  // Get available accounts for failover
  getAvailableAccounts(platform, excludeAccountId = null) {
    const accounts = this.queueManager.getAccountsForPlatform(platform);
    
    return accounts
      .filter(account => {
        // Exclude the failed account
        if (account.accountId === excludeAccountId) return false;
        
        // Exclude blacklisted accounts
        const key = this.queueManager.getAccountKey(platform, account.accountId);
        if (this.blacklist.has(key)) return false;
        
        // Exclude unhealthy accounts
        if (account.stats.health === 'unhealthy') return false;
        
        // Exclude paused accounts
        if (account.stats.health === 'paused') return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by health score
        const scoreA = this.calculateHealthScore(a.stats);
        const scoreB = this.calculateHealthScore(b.stats);
        return scoreB - scoreA;
      });
  }

  // Calculate health score for an account
  calculateHealthScore(stats) {
    const errorPenalty = stats.errorRate * 100;
    const pendingPenalty = Math.min(stats.pending * 5, 50);
    const responsePenalty = Math.min(stats.averageResponseTime / 100, 30);
    const activityBonus = (Date.now() - stats.lastActivity) < 60000 ? 10 : 0;
    
    return Math.max(0, 100 - errorPenalty - pendingPenalty - responsePenalty + activityBonus);
  }

  // Monitor health and automatically manage failover
  startHealthCheck() {
    setInterval(() => {
      // Check blacklisted accounts for early recovery
      for (const [key, blacklistInfo] of this.blacklist) {
        const elapsed = Date.now() - blacklistInfo.blacklistedAt;
        const remaining = blacklistInfo.duration - elapsed;
        
        if (remaining <= 0) {
          this.recoverAccount(blacklistInfo.platform, blacklistInfo.accountId);
        }
      }

      // Check for accounts that need preemptive failover
      const allStats = this.queueManager.getAllStats();
      for (const stats of allStats) {
        const rules = this.failoverRules.get(stats.platform);
        if (!rules) continue;

        // Preemptive pause if approaching rate limits
        if (stats.errorRate > rules.maxErrorRate * 0.8) {
          console.warn(`Account ${stats.key} approaching error threshold`);
          this.emit('account:warning', { 
            key: stats.key, 
            errorRate: stats.errorRate,
            threshold: rules.maxErrorRate 
          });
        }
      }
    }, 10000); // Check every 10 seconds
  }

  // Get failover status for monitoring
  getStatus() {
    const status = {
      blacklisted: [],
      available: {},
      rules: {}
    };

    // Get blacklisted accounts
    for (const [key, info] of this.blacklist) {
      const remaining = Math.max(0, info.duration - (Date.now() - info.blacklistedAt));
      status.blacklisted.push({
        key,
        ...info,
        remainingMs: remaining,
        remainingMinutes: Math.ceil(remaining / 60000)
      });
    }

    // Get available accounts by platform
    const platforms = ['twitter', 'linkedin', 'mastodon', 'github', 'facebook'];
    for (const platform of platforms) {
      const available = this.getAvailableAccounts(platform);
      status.available[platform] = available.map(a => ({
        accountId: a.accountId,
        health: a.stats.health,
        healthScore: this.calculateHealthScore(a.stats),
        errorRate: a.stats.errorRate,
        pending: a.stats.pending
      }));
    }

    // Include rules
    status.rules = Object.fromEntries(this.failoverRules);

    return status;
  }

  // Manual failover trigger
  async triggerManualFailover(platform, accountId, reason = 'Manual trigger') {
    const rules = this.failoverRules.get(platform);
    if (!rules) {
      throw new Error(`No failover rules defined for ${platform}`);
    }

    console.log(`Manual failover triggered for ${platform}:${accountId} - ${reason}`);
    await this.blacklistAccount(platform, accountId, rules.cooldownPeriod);
    
    this.emit('failover:manual', { platform, accountId, reason });
  }

  // Update failover rules
  updateRules(platform, newRules) {
    const existingRules = this.failoverRules.get(platform) || {};
    this.failoverRules.set(platform, { ...existingRules, ...newRules });
    
    this.emit('rules:updated', { platform, rules: this.failoverRules.get(platform) });
  }
}

module.exports = FailoverManager;
