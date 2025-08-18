/**
 * Rate Limit Dashboard
 * 
 * Displays real-time rate limit status for all connected platforms
 * and provides controls for managing API usage.
 */

class RateLimitDashboard {
  constructor() {
    this.container = null;
    this.updateInterval = null;
    this.platforms = new Map();
  }

  // Initialize the dashboard
  init(containerId = 'rate-limit-dashboard') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with ID ${containerId} not found`);
      return;
    }

    this.render();
    this.startMonitoring();
    this.attachEventListeners();
  }

  // Render the dashboard HTML
  render() {
    this.container.innerHTML = `
      <div class="rate-limit-dashboard">
        <div class="dashboard-header">
          <h3>API Rate Limits</h3>
          <button id="refresh-limits" class="btn-icon" title="Refresh">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
        
        <div class="platforms-grid" id="platforms-grid">
          <!-- Platform cards will be inserted here -->
        </div>
        
        <div class="rate-limit-legend">
          <div class="legend-item">
            <span class="status-dot safe"></span>
            <span>Safe (&lt;50%)</span>
          </div>
          <div class="legend-item">
            <span class="status-dot warning"></span>
            <span>Warning (50-80%)</span>
          </div>
          <div class="legend-item">
            <span class="status-dot danger"></span>
            <span>Critical (&gt;80%)</span>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  // Add CSS styles for the dashboard
  addStyles() {
    if (document.getElementById('rate-limit-styles')) return;

    const style = document.createElement('style');
    style.id = 'rate-limit-styles';
    style.textContent = `
      .rate-limit-dashboard {
        background: #2a2a2a;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .dashboard-header h3 {
        margin: 0;
        color: #fff;
      }

      .btn-icon {
        background: transparent;
        border: 1px solid #444;
        color: #888;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
      }

      .btn-icon:hover {
        background: #333;
        color: #fff;
        border-color: #555;
      }

      .btn-icon svg {
        display: block;
      }

      .platforms-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }

      .platform-card {
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 15px;
        position: relative;
        transition: all 0.3s;
      }

      .platform-card.safe {
        border-color: #4CAF50;
      }

      .platform-card.warning {
        border-color: #FFC107;
      }

      .platform-card.danger {
        border-color: #F44336;
      }

      .platform-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .platform-name {
        font-weight: bold;
        text-transform: capitalize;
        color: #fff;
      }

      .platform-account {
        font-size: 0.85em;
        color: #888;
      }

      .status-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }

      .status-indicator.safe {
        background: #4CAF50;
      }

      .status-indicator.warning {
        background: #FFC107;
      }

      .status-indicator.danger {
        background: #F44336;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      .usage-bar {
        background: #333;
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        margin: 10px 0;
      }

      .usage-fill {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      .usage-fill.safe {
        background: linear-gradient(90deg, #4CAF50, #45a049);
      }

      .usage-fill.warning {
        background: linear-gradient(90deg, #FFC107, #ffb300);
      }

      .usage-fill.danger {
        background: linear-gradient(90deg, #F44336, #da190b);
      }

      .rate-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 10px;
        font-size: 0.9em;
      }

      .stat-item {
        display: flex;
        justify-content: space-between;
        color: #aaa;
      }

      .stat-label {
        color: #888;
      }

      .stat-value {
        font-weight: bold;
        color: #fff;
      }

      .reset-time {
        text-align: center;
        font-size: 0.85em;
        color: #888;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #333;
      }

      .rate-limit-legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        padding-top: 15px;
        border-top: 1px solid #333;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9em;
        color: #888;
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      .status-dot.safe {
        background: #4CAF50;
      }

      .status-dot.warning {
        background: #FFC107;
      }

      .status-dot.danger {
        background: #F44336;
      }

      .no-data {
        text-align: center;
        color: #666;
        padding: 40px 20px;
      }

      .queue-info {
        display: flex;
        gap: 15px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #333;
        font-size: 0.85em;
      }

      .queue-item {
        flex: 1;
        text-align: center;
      }

      .queue-label {
        color: #666;
        display: block;
        margin-bottom: 2px;
      }

      .queue-value {
        color: #fff;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }

  // Start monitoring rate limits
  startMonitoring() {
    // Initial update
    this.updateRateLimits();

    // Update every 10 seconds
    this.updateInterval = setInterval(() => {
      this.updateRateLimits();
    }, 10000);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Update rate limit display
  async updateRateLimits() {
    try {
      // Use window.electronAPI if available, otherwise use sample data
      let stats;
      if (window.electronAPI && window.electronAPI.getRateLimitStats) {
        stats = await window.electronAPI.getRateLimitStats();
      } else if (window.bufferKillerAPI && window.bufferKillerAPI.getRateLimitStats) {
        stats = await window.bufferKillerAPI.getRateLimitStats();
      } else {
        // Use sample data for demonstration
        stats = this.getSampleStats();
      }
      this.renderPlatformCards(stats);
    } catch (error) {
      console.error('Failed to get rate limit stats:', error);
      // Fallback to sample data
      this.renderPlatformCards(this.getSampleStats());
    }
  }

  // Get sample stats for demonstration
  getSampleStats() {
    return [
      {
        platform: 'twitter',
        accountId: 'default',
        requests: 150,
        errors: 2,
        rateLimitHits: 1,
        limiter: {
          reservoir: 900,
          running: 2,
          queued: 5,
          done: 143,
          nextRefresh: Date.now() + 900000 // 15 minutes from now
        }
      },
      {
        platform: 'mastodon',
        accountId: 'mastodon.social',
        requests: 50,
        errors: 0,
        rateLimitHits: 0,
        limiter: {
          reservoir: 300,
          running: 0,
          queued: 2,
          done: 48,
          nextRefresh: Date.now() + 300000 // 5 minutes from now
        }
      },
      {
        platform: 'github',
        accountId: 'default',
        requests: 200,
        errors: 1,
        rateLimitHits: 0,
        limiter: {
          reservoir: 5000,
          running: 1,
          queued: 0,
          done: 199,
          nextRefresh: Date.now() + 3600000 // 1 hour from now
        }
      }
    ];
  }

  // Render platform cards
  renderPlatformCards(stats) {
    const grid = document.getElementById('platforms-grid');
    
    if (!stats || stats.length === 0) {
      grid.innerHTML = '<div class="no-data">No platforms connected yet</div>';
      return;
    }

    grid.innerHTML = stats.map(stat => {
      const usage = this.calculateUsage(stat);
      const status = this.getStatus(usage);
      const resetTime = this.formatResetTime(stat.limiter?.nextRefresh);

      return `
        <div class="platform-card ${status}" data-platform="${stat.platform}" data-account="${stat.accountId}">
          <div class="platform-header">
            <div>
              <div class="platform-name">${stat.platform}</div>
              <div class="platform-account">${stat.accountId !== 'default' ? stat.accountId : 'Primary Account'}</div>
            </div>
            <div class="status-indicator ${status}"></div>
          </div>
          
          <div class="usage-bar">
            <div class="usage-fill ${status}" style="width: ${usage}%"></div>
          </div>
          
          <div class="rate-stats">
            <div class="stat-item">
              <span class="stat-label">Used:</span>
              <span class="stat-value">${stat.requests || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Remaining:</span>
              <span class="stat-value">${stat.limiter?.reservoir - stat.requests || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Errors:</span>
              <span class="stat-value">${stat.errors || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Rate Hits:</span>
              <span class="stat-value">${stat.rateLimitHits || 0}</span>
            </div>
          </div>
          
          <div class="queue-info">
            <div class="queue-item">
              <span class="queue-label">Running</span>
              <span class="queue-value">${stat.limiter?.running || 0}</span>
            </div>
            <div class="queue-item">
              <span class="queue-label">Queued</span>
              <span class="queue-value">${stat.limiter?.queued || 0}</span>
            </div>
            <div class="queue-item">
              <span class="queue-label">Done</span>
              <span class="queue-value">${stat.limiter?.done || 0}</span>
            </div>
          </div>
          
          ${resetTime ? `<div class="reset-time">Resets: ${resetTime}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Calculate usage percentage
  calculateUsage(stat) {
    if (!stat.limiter?.reservoir) return 0;
    const used = stat.requests || 0;
    const total = stat.limiter.reservoir;
    return Math.min(100, Math.round((used / total) * 100));
  }

  // Get status based on usage
  getStatus(usage) {
    if (usage < 50) return 'safe';
    if (usage < 80) return 'warning';
    return 'danger';
  }

  // Format reset time
  formatResetTime(timestamp) {
    if (!timestamp) return null;
    
    const now = Date.now();
    const reset = new Date(timestamp);
    const diff = reset - now;
    
    if (diff <= 0) return 'Now';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  // Attach event listeners
  attachEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-limits');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.updateRateLimits();
        
        // Rotate animation
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          refreshBtn.style.transform = '';
        }, 500);
      });
    }

    // Listen for rate limit events from main process if available
    if (window.electronAPI && window.electronAPI.onRateLimitWarning) {
      window.electronAPI.onRateLimitWarning((data) => {
        this.showWarning(data);
      });
    }

    if (window.electronAPI && window.electronAPI.onRateLimitExceeded) {
      window.electronAPI.onRateLimitExceeded((data) => {
        this.showError(data);
      });
    }
  }

  // Show warning notification
  showWarning(data) {
    const message = `⚠️ ${data.platform} is at ${data.usage}% capacity. ${data.remaining} requests remaining.`;
    this.showNotification(message, 'warning');
  }

  // Show error notification
  showError(data) {
    const message = `🚫 ${data.platform} rate limit exceeded! Retry in ${data.retryAfter}s`;
    this.showNotification(message, 'error');
  }

  // Show notification
  showNotification(message, type = 'info') {
    // You can integrate this with your existing notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Or create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#F44336' : type === 'warning' ? '#FFC107' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // Cleanup
  destroy() {
    this.stopMonitoring();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for use in renderer
window.RateLimitDashboard = RateLimitDashboard;
