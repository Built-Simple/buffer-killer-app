/**
 * Rate Limiter Module
 * 
 * Main entry point for rate limiting functionality.
 * Provides a simple API for integrating rate limiting into platform modules.
 */

const { getRateLimiter } = require('./manager');
const { RATE_LIMIT_CONFIG } = require('./config');

// Export main components
module.exports = {
  getRateLimiter,
  RATE_LIMIT_CONFIG,
  
  /**
   * Helper function to wrap API calls with rate limiting
   */
  withRateLimit: async (platform, accountId, fn, options = {}) => {
    const limiter = getRateLimiter();
    return limiter.execute(platform, accountId, fn, options);
  },
  
  /**
   * Check if it's safe to make a request
   */
  canMakeRequest: (platform, accountId = 'default') => {
    const limiter = getRateLimiter();
    const status = limiter.checkLimits(platform, accountId);
    return status.safe;
  },
  
  /**
   * Get current usage stats
   */
  getUsageStats: (platform, accountId = 'default') => {
    const limiter = getRateLimiter();
    return limiter.getStats(platform, accountId);
  },
  
  /**
   * Priority levels for different operations
   */
  PRIORITY: {
    CRITICAL: 1,    // Posts, urgent operations
    HIGH: 2,        // Media uploads, important updates
    MEDIUM: 5,      // Token refresh, normal operations
    LOW: 8,         // Analytics, non-urgent
    BACKGROUND: 10  // Cleanup, maintenance
  }
};
