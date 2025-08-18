/**
 * Rate Limiting Configuration for All Platforms
 * 
 * Each platform has specific rate limits that we must respect to avoid being throttled or banned.
 * This configuration provides conservative limits to ensure reliable operation.
 */

const RATE_LIMIT_CONFIG = {
  twitter: {
    // OAuth 2.0 limits: 900 requests per 15 minutes
    // We'll use 800 to be safe
    standard: {
      reservoir: 800,          // Maximum number of requests
      reservoirRefreshAmount: 800,
      reservoirRefreshInterval: 15 * 60 * 1000, // 15 minutes in ms
      maxConcurrent: 5,        // Max concurrent requests
      minTime: 1000,           // Min time between requests (1 second)
      // Priority levels for different operations
      priority: {
        post: 1,               // Highest priority
        mediaUpload: 1,
        refresh: 2,
        analytics: 3,
        search: 4              // Lowest priority
      }
    },
    // OAuth 1.0a limits (legacy): 300 requests per 15 minutes
    legacy: {
      reservoir: 250,          // Conservative limit
      reservoirRefreshAmount: 250,
      reservoirRefreshInterval: 15 * 60 * 1000,
      maxConcurrent: 2,
      minTime: 3000            // 3 seconds between requests
    },
    // Specific endpoints with different limits
    endpoints: {
      mediaUpload: {
        maxConcurrent: 1,      // Only 1 concurrent upload
        minTime: 5000          // 5 seconds between uploads
      },
      search: {
        reservoir: 180,        // Search has lower limits
        reservoirRefreshAmount: 180,
        reservoirRefreshInterval: 15 * 60 * 1000
      }
    }
  },

  linkedin: {
    // LinkedIn has unpublished daily limits, we'll be conservative
    // Estimated: 1000 requests per day for member context
    daily: {
      reservoir: 800,          // Conservative daily limit
      reservoirRefreshAmount: 800,
      reservoirRefreshInterval: 24 * 60 * 60 * 1000, // 24 hours
      maxConcurrent: 2,
      minTime: 5000            // 5 seconds between requests
    },
    // Application-level throttling (estimated)
    throttle: {
      maxConcurrent: 3,
      minTime: 2000,           // 2 seconds minimum
      highWater: 50,           // Start throttling at 50 queued
      strategy: 'OVERFLOW'     // Drop requests when overloaded
    }
  },

  mastodon: {
    // Default: 300 requests per 5 minutes per instance
    // This can vary by instance, so we'll be conservative
    perInstance: {
      reservoir: 250,          // Conservative limit
      reservoirRefreshAmount: 250,
      reservoirRefreshInterval: 5 * 60 * 1000, // 5 minutes
      maxConcurrent: 3,
      minTime: 1200            // 1.2 seconds between requests
    },
    // Some instances have stricter limits for media
    mediaUpload: {
      maxConcurrent: 1,
      minTime: 3000,           // 3 seconds between uploads
      maxSize: 8 * 1024 * 1024 // 8MB max file size (common limit)
    }
  },

  facebook: {
    // Facebook uses a complex DAU-based system
    // We'll implement a conservative approach
    standard: {
      reservoir: 200,          // Conservative hourly limit
      reservoirRefreshAmount: 200,
      reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
      maxConcurrent: 2,
      minTime: 3000            // 3 seconds between requests
    },
    // Graph API has different tiers based on MAU
    graphApi: {
      development: {
        callsPerHour: 200,
        uniqueUsersPerHour: 10
      },
      standard: {
        callsPerHour: 200 * 200, // 200 calls per hour per 200 MAU
        uniqueUsersPerHour: 10000
      }
    },
    // Business Use Case Rate Limits
    businessUseCase: {
      type: 'ads_management',
      callLimit: 40,           // Percentage of calls allowed
      duration: 3600           // Reset period in seconds
    }
  },

  github: {
    // GitHub: 5000 requests per hour for authenticated users
    authenticated: {
      reservoir: 4500,         // Conservative limit
      reservoirRefreshAmount: 4500,
      reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
      maxConcurrent: 5,
      minTime: 800             // 0.8 seconds between requests
    },
    // GraphQL API has different limits (points-based)
    graphql: {
      pointLimit: 5000,        // Points per hour
      nodeLimit: 500000,       // Total nodes per hour
      maxConcurrent: 2,
      minTime: 1000
    },
    // Search API has stricter limits
    search: {
      reservoir: 30,           // 30 searches per minute
      reservoirRefreshAmount: 30,
      reservoirRefreshInterval: 60 * 1000, // 1 minute
      maxConcurrent: 1,
      minTime: 2000
    }
  },

  // Generic fallback for unknown platforms
  default: {
    reservoir: 100,
    reservoirRefreshAmount: 100,
    reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
    maxConcurrent: 1,
    minTime: 5000              // 5 seconds between requests
  }
};

// Helper function to get config for a platform
function getConfigForPlatform(platform, authType = 'standard') {
  const platformConfig = RATE_LIMIT_CONFIG[platform.toLowerCase()];
  
  if (!platformConfig) {
    console.warn(`No rate limit config for platform: ${platform}, using default`);
    return RATE_LIMIT_CONFIG.default;
  }

  // Handle platform-specific auth types
  if (platform === 'twitter' && authType === 'legacy') {
    return platformConfig.legacy;
  }
  
  if (platform === 'linkedin') {
    return platformConfig.daily;
  }

  // Return the standard/default config for the platform
  return platformConfig.standard || 
         platformConfig.authenticated || 
         platformConfig.perInstance || 
         platformConfig;
}

// Calculate dynamic limits based on usage patterns
function calculateDynamicLimit(platform, currentUsage, timeWindow) {
  const config = getConfigForPlatform(platform);
  const usageRate = currentUsage / timeWindow;
  
  // If we're using more than 80% of our limit, slow down
  if (usageRate > config.reservoir * 0.8) {
    return {
      ...config,
      minTime: config.minTime * 2, // Double the time between requests
      maxConcurrent: Math.max(1, Math.floor(config.maxConcurrent / 2))
    };
  }
  
  return config;
}

// Export rate limit configurations
module.exports = {
  RATE_LIMIT_CONFIG,
  getConfigForPlatform,
  calculateDynamicLimit
};
