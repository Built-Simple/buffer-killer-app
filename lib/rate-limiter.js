// Rate Limiter - Main entry point
// Re-exports from the rate-limiter directory

const RateLimiterManager = require('./rate-limiter/manager');
const config = require('./rate-limiter/config');

// Create singleton instance
let instance = null;

function getRateLimiter() {
  if (!instance) {
    instance = new RateLimiterManager(config);
  }
  return instance;
}

// For backward compatibility
class RateLimiter {
  constructor(options = {}) {
    this.manager = new RateLimiterManager(options);
  }

  async checkLimit(platform, accountId) {
    return this.manager.checkLimit(platform, accountId);
  }

  async consumeRequest(platform, accountId) {
    return this.manager.consumeRequest(platform, accountId);
  }

  resetLimiter(platform, accountId) {
    return this.manager.resetLimiter(platform, accountId);
  }

  getStats() {
    return this.manager.getStats();
  }
}

module.exports = { 
  RateLimiter,
  getRateLimiter,
  RateLimiterManager
};
