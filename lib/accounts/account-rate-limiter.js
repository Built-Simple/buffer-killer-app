// Account Rate Limiter - Simple, practical rate limiting per account
// Each account has its own independent rate limits

const { default: PQueue } = require('p-queue');
const EventEmitter = require('events');

class AccountRateLimiter extends EventEmitter {
  constructor() {
    super();
    this.accountQueues = new Map();
    this.rateLimits = {
      twitter: { 
        tweets: { limit: 300, window: 15 * 60 * 1000 }, // 300 per 15 min
        media: { limit: 100, window: 15 * 60 * 1000 }  // 100 media uploads per 15 min
      },
      mastodon: { 
        posts: { limit: 300, window: 5 * 60 * 1000 }   // 300 per 5 min
      },
      github: { 
        posts: { limit: 5000, window: 60 * 60 * 1000 }  // 5000 per hour
      },
      linkedin: { 
        posts: { limit: 100, window: 24 * 60 * 60 * 1000 } // 100 per day (estimated)
      },
      facebook: { 
        posts: { limit: 200, window: 60 * 60 * 1000 }   // 200 per hour (estimated)
      }
    };
  }

  // Get or create queue for a specific account
  getAccountQueue(accountId, platform) {
    const key = `${accountId}`;
    
    if (!this.accountQueues.has(key)) {
      // Create rate-limited queue for this account
      const limits = this.rateLimits[platform] || { 
        posts: { limit: 60, window: 60 * 60 * 1000 } // Default: 60 per hour
      };
      
      const queue = new PQueue({
        concurrency: 1, // One request at a time
        interval: limits.posts.window / limits.posts.limit, // Spread evenly
        intervalCap: 1 // One per interval
      });
      
      // Track usage
      const tracker = {
        queue,
        platform,
        accountId,
        usage: [],
        resets: new Map()
      };
      
      this.accountQueues.set(key, tracker);
      console.log(`Created rate limiter for ${platform} account ${accountId}`);
    }
    
    return this.accountQueues.get(key);
  }

  // Check if account can post
  async canPost(accountId, platform) {
    const tracker = this.getAccountQueue(accountId, platform);
    const limits = this.rateLimits[platform]?.posts;
    
    if (!limits) return true;
    
    // Clean old usage entries
    const now = Date.now();
    tracker.usage = tracker.usage.filter(time => 
      now - time < limits.window
    );
    
    // Check if under limit
    return tracker.usage.length < limits.limit;
  }

  // Add task to account's queue
  async addToQueue(accountId, platform, task) {
    const tracker = this.getAccountQueue(accountId, platform);
    
    // Check rate limit
    const canProceed = await this.canPost(accountId, platform);
    if (!canProceed) {
      const limits = this.rateLimits[platform]?.posts;
      const resetTime = Math.min(...tracker.usage) + limits.window;
      const waitTime = resetTime - Date.now();
      
      this.emit('rate-limit-hit', {
        accountId,
        platform,
        waitTime,
        resetTime: new Date(resetTime)
      });
      
      // Wait until rate limit resets
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Execute task through queue
    return await tracker.queue.add(async () => {
      // Record usage
      tracker.usage.push(Date.now());
      
      // Execute the actual task
      try {
        const result = await task();
        
        this.emit('task-completed', {
          accountId,
          platform,
          remaining: this.getRemainingPosts(accountId, platform)
        });
        
        return result;
      } catch (error) {
        this.emit('task-failed', {
          accountId,
          platform,
          error: error.message
        });
        throw error;
      }
    });
  }

  // Get remaining posts for account
  getRemainingPosts(accountId, platform) {
    const tracker = this.accountQueues.get(accountId);
    if (!tracker) return null;
    
    const limits = this.rateLimits[platform]?.posts;
    if (!limits) return null;
    
    // Clean old usage
    const now = Date.now();
    tracker.usage = tracker.usage.filter(time => 
      now - time < limits.window
    );
    
    return {
      used: tracker.usage.length,
      limit: limits.limit,
      remaining: limits.limit - tracker.usage.length,
      resetsIn: tracker.usage.length > 0 
        ? Math.min(...tracker.usage) + limits.window - now
        : 0
    };
  }

  // Get all account statuses
  getAllStatuses() {
    const statuses = [];
    
    for (const [accountId, tracker] of this.accountQueues) {
      const remaining = this.getRemainingPosts(accountId, tracker.platform);
      statuses.push({
        accountId,
        platform: tracker.platform,
        queueSize: tracker.queue.size,
        pending: tracker.queue.pending,
        ...remaining
      });
    }
    
    return statuses;
  }

  // Clear queue for account
  clearQueue(accountId) {
    const tracker = this.accountQueues.get(accountId);
    if (tracker) {
      tracker.queue.clear();
      this.emit('queue-cleared', { accountId });
    }
  }

  // Reset rate limit tracking for account
  resetTracking(accountId) {
    const tracker = this.accountQueues.get(accountId);
    if (tracker) {
      tracker.usage = [];
      this.emit('tracking-reset', { accountId });
    }
  }
}

module.exports = AccountRateLimiter;
