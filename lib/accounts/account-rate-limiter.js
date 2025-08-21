// Account-specific rate limiter for multi-account management
// Uses bottleneck for rate limiting

const Bottleneck = require('bottleneck');
const { EventEmitter } = require('events');

class AccountRateLimiter extends EventEmitter {
  constructor() {
    super();
    this.limiters = new Map();
    this.configs = {
      twitter: {
        maxConcurrent: 1,
        minTime: 200,
        reservoir: 300,
        reservoirRefreshInterval: 15 * 60 * 1000, // 15 minutes
        reservoirRefreshAmount: 300
      },
      mastodon: {
        maxConcurrent: 1,
        minTime: 100,
        reservoir: 300,
        reservoirRefreshInterval: 5 * 60 * 1000, // 5 minutes
        reservoirRefreshAmount: 300
      },
      linkedin: {
        maxConcurrent: 1,
        minTime: 1000,
        reservoir: 100,
        reservoirRefreshInterval: 24 * 60 * 60 * 1000, // 24 hours
        reservoirRefreshAmount: 100
      },
      facebook: {
        maxConcurrent: 1,
        minTime: 500,
        reservoir: 200,
        reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
        reservoirRefreshAmount: 200
      },
      github: {
        maxConcurrent: 1,
        minTime: 100,
        reservoir: 5000,
        reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
        reservoirRefreshAmount: 5000
      }
    };
  }

  getKey(platform, accountId) {
    return `${platform}:${accountId}`;
  }

  getLimiter(platform, accountId) {
    const key = this.getKey(platform, accountId);
    
    if (!this.limiters.has(key)) {
      const config = this.configs[platform] || {
        maxConcurrent: 1,
        minTime: 1000,
        reservoir: 100,
        reservoirRefreshInterval: 60 * 60 * 1000,
        reservoirRefreshAmount: 100
      };
      
      const limiter = new Bottleneck(config);
      
      // Set up event forwarding
      limiter.on('error', (error) => {
        this.emit('error', { platform, accountId, error });
      });
      
      limiter.on('depleted', () => {
        this.emit('rate-limit-exceeded', { 
          platform, 
          accountId,
          message: `Rate limit exceeded for ${platform}:${accountId}`
        });
      });
      
      limiter.on('empty', () => {
        this.emit('queue-empty', { platform, accountId });
      });
      
      // Monitor approaching limits
      limiter.on('executing', () => {
        limiter.currentReservoir().then(remaining => {
          const total = config.reservoir || 100;
          const percentUsed = ((total - remaining) / total) * 100;
          
          if (percentUsed >= 80) {
            this.emit('approaching-limit', {
              platform,
              accountId,
              remaining,
              total,
              percentUsed
            });
          }
          
          if (percentUsed >= 90) {
            this.emit('rate-limit-warning', {
              platform,
              accountId,
              remaining,
              total,
              percentUsed,
              message: `Only ${remaining} requests remaining for ${platform}`
            });
          }
        });
      });
      
      this.limiters.set(key, limiter);
    }
    
    return this.limiters.get(key);
  }

  async execute(platform, accountId, fn) {
    const limiter = this.getLimiter(platform, accountId);
    
    try {
      const result = await limiter.schedule(fn);
      
      // Check remaining capacity
      const reservoir = await limiter.currentReservoir();
      const config = this.configs[platform] || {};
      const total = config.reservoir || 100;
      
      if (reservoir <= 5) {
        this.emit('rate-limit-critical', {
          platform,
          accountId,
          remaining: reservoir,
          total
        });
      }
      
      return result;
    } catch (error) {
      this.emit('execution-error', {
        platform,
        accountId,
        error
      });
      throw error;
    }
  }

  async checkLimit(platform, accountId) {
    const limiter = this.getLimiter(platform, accountId);
    const reservoir = await limiter.currentReservoir();
    const running = limiter.running();
    const done = limiter.done();
    const config = this.configs[platform] || {};
    const total = config.reservoir || 100;
    
    return {
      platform,
      accountId,
      remaining: reservoir,
      total,
      running,
      done,
      percentUsed: ((total - reservoir) / total) * 100,
      willRateLimitNext: reservoir <= 1
    };
  }

  async waitForCapacity(platform, accountId) {
    const limiter = this.getLimiter(platform, accountId);
    const reservoir = await limiter.currentReservoir();
    
    if (reservoir > 0) {
      return true;
    }
    
    // Wait for next refresh
    return new Promise((resolve) => {
      limiter.once('idle', () => {
        resolve(true);
      });
    });
  }

  resetLimiter(platform, accountId) {
    const key = this.getKey(platform, accountId);
    if (this.limiters.has(key)) {
      const limiter = this.limiters.get(key);
      limiter.stop();
      this.limiters.delete(key);
    }
  }

  resetAll() {
    for (const [key, limiter] of this.limiters) {
      limiter.stop();
    }
    this.limiters.clear();
  }

  getStats() {
    const stats = {};
    for (const [key, limiter] of this.limiters) {
      const [platform, accountId] = key.split(':');
      const config = this.configs[platform] || {};
      stats[key] = {
        running: limiter.running(),
        done: limiter.done(),
        queued: limiter.queued(),
        reservoir: limiter.reservoir || 0,
        total: config.reservoir || 100
      };
    }
    return stats;
  }

  // Method to manually trigger a check on all limiters
  async checkAllLimits() {
    const checks = [];
    for (const [key] of this.limiters) {
      const [platform, accountId] = key.split(':');
      checks.push(this.checkLimit(platform, accountId));
    }
    return Promise.all(checks);
  }
}

module.exports = AccountRateLimiter;
