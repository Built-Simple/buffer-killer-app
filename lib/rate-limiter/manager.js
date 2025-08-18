/**
 * Rate Limiter Manager
 * 
 * Manages rate limiting for all social media platforms using Bottleneck.
 * Supports multi-account isolation, priority queuing, and automatic throttling.
 */

const Bottleneck = require('bottleneck');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { getConfigForPlatform, calculateDynamicLimit } = require('./config');

class RateLimiterManager extends EventEmitter {
  constructor() {
    super();
    this.limiters = new Map(); // Map of platform-account to limiter
    this.stats = new Map();    // Usage statistics per limiter
    this.queues = new Map();   // Priority queues per limiter
    this.retryAttempts = new Map(); // Track retry attempts
    
    // State persistence
    this.statePath = path.join(__dirname, '..', '..', 'data', 'rate-limit-stats.json');
    
    // Start monitoring
    this.startMonitoring();
    
    // Load persisted stats
    this.loadStats();
  }

  /**
   * Get or create a rate limiter for a specific platform and account
   */
  getLimiter(platform, accountId = 'default', endpoint = null) {
    const key = `${platform}-${accountId}${endpoint ? `-${endpoint}` : ''}`;
    
    if (!this.limiters.has(key)) {
      const config = getConfigForPlatform(platform);
      
      // Apply endpoint-specific config if available
      let finalConfig = { ...config };
      if (endpoint && config.endpoints && config.endpoints[endpoint]) {
        finalConfig = { ...config, ...config.endpoints[endpoint] };
      }
      
      // Create Bottleneck limiter with configuration
      const limiter = new Bottleneck({
        // Reservoir configuration
        reservoir: finalConfig.reservoir,
        reservoirRefreshAmount: finalConfig.reservoirRefreshAmount,
        reservoirRefreshInterval: finalConfig.reservoirRefreshInterval,
        
        // Concurrency and timing
        maxConcurrent: finalConfig.maxConcurrent,
        minTime: finalConfig.minTime,
        
        // Queue configuration
        highWater: finalConfig.highWater || 100,
        strategy: finalConfig.strategy 
          ? Bottleneck.strategy[finalConfig.strategy] 
          : Bottleneck.strategy.LEAK,
        
        // Retry configuration
        retryCond: (error, jobInfo) => {
          // Retry on rate limit errors
          if (error && error.statusCode === 429) {
            const attempts = this.retryAttempts.get(jobInfo.id) || 0;
            if (attempts < 3) {
              this.retryAttempts.set(jobInfo.id, attempts + 1);
              
              // Use retry-after header if available
              const retryAfter = error.retryAfter || 60;
              this.emit('rate-limit-hit', {
                platform,
                accountId,
                endpoint,
                retryAfter,
                attempt: attempts + 1
              });
              
              return retryAfter * 1000; // Return delay in ms
            }
          }
          return false; // Don't retry other errors
        }
      });
      
      // Set up event listeners
      this.setupLimiterEvents(limiter, key, platform, accountId);
      
      // Store the limiter
      this.limiters.set(key, limiter);
      
      // Initialize stats
      this.stats.set(key, {
        platform,
        accountId,
        endpoint,
        requests: 0,
        errors: 0,
        rateLimitHits: 0,
        avgResponseTime: 0,
        lastReset: Date.now(),
        queue: {
          running: 0,
          queued: 0,
          done: 0
        }
      });
    }
    
    return this.limiters.get(key);
  }

  /**
   * Set up event listeners for a limiter
   */
  setupLimiterEvents(limiter, key, platform, accountId) {
    // Track successful completions
    limiter.on('done', (info) => {
      const stats = this.stats.get(key);
      if (stats) {
        stats.requests++;
        stats.queue.done++;
        stats.queue.running = Math.max(0, stats.queue.running - 1);
        
        // Update average response time
        const responseTime = Date.now() - info.options.startTime;
        stats.avgResponseTime = 
          (stats.avgResponseTime * (stats.requests - 1) + responseTime) / stats.requests;
      }
      
      // Clear retry attempts
      this.retryAttempts.delete(info.options.id);
      
      this.emit('request-complete', {
        platform,
        accountId,
        duration: Date.now() - info.options.startTime
      });
    });
    
    // Track errors
    limiter.on('failed', (error, info) => {
      const stats = this.stats.get(key);
      if (stats) {
        stats.errors++;
        if (error && error.statusCode === 429) {
          stats.rateLimitHits++;
        }
      }
      
      this.emit('request-failed', {
        platform,
        accountId,
        error: error.message,
        statusCode: error.statusCode
      });
    });
    
    // Track queue changes
    limiter.on('queued', (info) => {
      const stats = this.stats.get(key);
      if (stats) {
        stats.queue.queued++;
      }
    });
    
    limiter.on('received', (info) => {
      const stats = this.stats.get(key);
      if (stats) {
        stats.queue.running++;
        stats.queue.queued = Math.max(0, stats.queue.queued - 1);
      }
    });
    
    // Handle depleted reservoir
    limiter.on('depleted', () => {
      this.emit('limiter-depleted', {
        platform,
        accountId,
        nextRefresh: limiter._store.nextRefresh
      });
    });
  }

  /**
   * Execute a request with rate limiting
   */
  async execute(platform, accountId, fn, options = {}) {
    const { priority = 5, endpoint = null, weight = 1 } = options;
    const limiter = this.getLimiter(platform, accountId, endpoint);
    
    // Add metadata to the job
    const jobOptions = {
      priority,
      weight,
      id: `${platform}-${accountId}-${Date.now()}-${Math.random()}`,
      startTime: Date.now()
    };
    
    try {
      // Schedule the job with the limiter
      const result = await limiter.schedule(jobOptions, fn);
      return result;
    } catch (error) {
      // Enhanced error handling
      if (error.statusCode === 429) {
        // Rate limit exceeded
        const retryAfter = error.headers?.['retry-after'] || 60;
        error.retryAfter = parseInt(retryAfter);
        
        this.emit('rate-limit-exceeded', {
          platform,
          accountId,
          endpoint,
          retryAfter: error.retryAfter,
          message: 'Rate limit exceeded, will retry automatically'
        });
      }
      
      throw error;
    }
  }

  /**
   * Execute multiple requests in batch with rate limiting
   */
  async executeBatch(platform, accountId, requests, options = {}) {
    const results = [];
    const errors = [];
    
    for (const request of requests) {
      try {
        const result = await this.execute(
          platform,
          accountId,
          request.fn,
          { ...options, ...request.options }
        );
        results.push({ success: true, data: result, id: request.id });
      } catch (error) {
        errors.push({ success: false, error, id: request.id });
      }
    }
    
    return { results, errors };
  }

  /**
   * Get current stats for a platform/account
   */
  getStats(platform = null, accountId = null) {
    if (!platform) {
      // Return all stats
      return Array.from(this.stats.entries()).map(([key, stats]) => ({
        key,
        ...stats
      }));
    }
    
    const key = `${platform}-${accountId || 'default'}`;
    const stats = this.stats.get(key);
    
    if (!stats) return null;
    
    const limiter = this.limiters.get(key);
    return {
      ...stats,
      limiter: {
        running: limiter.running(),
        queued: limiter.queued(),
        done: limiter.done(),
        reservoir: limiter._store?.storeOptions?.reservoir
      }
    };
  }

  /**
   * Reset limits for a specific platform/account
   */
  resetLimiter(platform, accountId = 'default') {
    const key = `${platform}-${accountId}`;
    const limiter = this.limiters.get(key);
    
    if (limiter) {
      limiter.updateSettings({
        reservoir: getConfigForPlatform(platform).reservoir
      });
      
      // Reset stats
      const stats = this.stats.get(key);
      if (stats) {
        stats.lastReset = Date.now();
        stats.requests = 0;
        stats.errors = 0;
        stats.rateLimitHits = 0;
      }
      
      this.emit('limiter-reset', { platform, accountId });
    }
  }

  /**
   * Check if we're approaching rate limits
   */
  checkLimits(platform, accountId = 'default') {
    const key = `${platform}-${accountId}`;
    const limiter = this.limiters.get(key);
    const stats = this.stats.get(key);
    
    if (!limiter || !stats) return { safe: true };
    
    const reservoir = limiter._store?.storeOptions?.reservoir || 0;
    const current = limiter._store?.storeInstance?.reservoir || 0;
    const usage = ((reservoir - current) / reservoir) * 100;
    
    return {
      safe: usage < 80,
      usage: usage.toFixed(2),
      remaining: current,
      total: reservoir,
      willResetAt: limiter._store?.nextRefresh,
      stats
    };
  }

  /**
   * Start monitoring rate limits
   */
  startMonitoring() {
    // Check limits every minute
    this.monitorInterval = setInterval(() => {
      for (const [key, stats] of this.stats.entries()) {
        const { platform, accountId } = stats;
        const status = this.checkLimits(platform, accountId);
        
        if (!status.safe) {
          this.emit('approaching-limit', {
            platform,
            accountId,
            usage: status.usage,
            remaining: status.remaining
          });
        }
      }
      
      // Save stats periodically
      this.saveStats();
    }, 60000); // Every minute
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Save stats to disk
   */
  async saveStats() {
    try {
      const statsData = Array.from(this.stats.entries()).map(([key, stats]) => ({
        key,
        ...stats
      }));
      
      await fs.mkdir(path.dirname(this.statePath), { recursive: true });
      await fs.writeFile(
        this.statePath,
        JSON.stringify(statsData, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save rate limit stats:', error);
    }
  }

  /**
   * Load stats from disk
   */
  async loadStats() {
    try {
      const data = await fs.readFile(this.statePath, 'utf8');
      const statsData = JSON.parse(data);
      
      for (const stat of statsData) {
        const { key, ...stats } = stat;
        this.stats.set(key, stats);
      }
    } catch (error) {
      // File might not exist yet
      if (error.code !== 'ENOENT') {
        console.error('Failed to load rate limit stats:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.stopMonitoring();
    await this.saveStats();
    
    // Stop all limiters
    for (const limiter of this.limiters.values()) {
      await limiter.stop();
    }
    
    this.limiters.clear();
    this.stats.clear();
    this.retryAttempts.clear();
  }
}

// Create singleton instance
let instance = null;

function getRateLimiter() {
  if (!instance) {
    instance = new RateLimiterManager();
  }
  return instance;
}

module.exports = {
  RateLimiterManager,
  getRateLimiter
};
