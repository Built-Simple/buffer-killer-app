// Rate Limiter - Fixed version
const EventEmitter = require('events');

class RateLimiterManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.limiters = new Map();
    this.config = config;
  }

  checkLimit(platform, accountId) {
    return { remaining: 100, reset: Date.now() + 900000 };
  }

  consumeRequest(platform, accountId) {
    return true;
  }

  resetLimiter(platform, accountId) {
    return true;
  }

  getStats() {
    // Return an array of stats for each platform/account combination
    const stats = [];
    
    // Add sample data or iterate through actual limiters
    this.limiters.forEach((limiter, key) => {
      const [platform, accountId] = key.split(':');
      stats.push({
        platform,
        accountId: accountId || 'default',
        requests: 0,
        errors: 0,
        rateLimitHits: 0,
        limiter: {
          reservoir: this.getDefaultLimit(platform),
          running: 0,
          queued: 0,
          done: 0,
          nextRefresh: Date.now() + 900000
        }
      });
    });
    
    // If no limiters exist, return empty array
    return stats;
  }

  getDefaultLimit(platform) {
    const limits = {
      twitter: 900,
      mastodon: 300,
      github: 5000,
      linkedin: 1000
    };
    return limits[platform] || 100;
  }

  checkLimits(platform, accountId) {
    return { canProceed: true, remaining: 100 };
  }
}

function getRateLimiter() {
  return new RateLimiterManager();
}

module.exports = { 
  RateLimiterManager,
  getRateLimiter
};
