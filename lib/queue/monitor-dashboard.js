// Queue Monitor Dashboard Component
// Provides real-time monitoring of posting queues across all platforms and accounts

class QueueMonitorDashboard {
  constructor() {
    this.container = null;
    this.updateInterval = null;
    this.mockQueues = this.generateMockQueues();
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Queue monitor container not found');
      return;
    }

    this.render();
    this.startAutoUpdate();
  }

  generateMockQueues() {
    return {
      twitter: {
        accountId: 'twitter_user_1',
        username: '@demo_user',
        status: 'active',
        queued: 3,
        processing: 1,
        failed: 0,
        rateLimit: {
          remaining: 285,
          total: 300,
          resetAt: new Date(Date.now() + 15 * 60 * 1000)
        },
        posts: [
          { id: 1, content: 'Scheduled tweet #1', scheduledAt: new Date(Date.now() + 5 * 60 * 1000), status: 'processing' },
          { id: 2, content: 'Scheduled tweet #2', scheduledAt: new Date(Date.now() + 30 * 60 * 1000), status: 'queued' },
          { id: 3, content: 'Scheduled tweet #3', scheduledAt: new Date(Date.now() + 60 * 60 * 1000), status: 'queued' }
        ]
      },
      mastodon: {
        accountId: 'mastodon_user_1',
        username: '@user@mastodon.social',
        status: 'active',
        queued: 2,
        processing: 0,
        failed: 0,
        rateLimit: {
          remaining: 295,
          total: 300,
          resetAt: new Date(Date.now() + 5 * 60 * 1000)
        },
        posts: [
          { id: 4, content: 'Mastodon post #1', scheduledAt: new Date(Date.now() + 15 * 60 * 1000), status: 'queued' },
          { id: 5, content: 'Mastodon post #2', scheduledAt: new Date(Date.now() + 45 * 60 * 1000), status: 'queued' }
        ]
      },
      github: {
        accountId: 'github_user_1',
        username: '@github_demo',
        status: 'idle',
        queued: 0,
        processing: 0,
        failed: 0,
        rateLimit: {
          remaining: 4998,
          total: 5000,
          resetAt: new Date(Date.now() + 60 * 60 * 1000)
        },
        posts: []
      }
    };
  }

  render() {
    this.container.innerHTML = `
      <div class="queue-monitor">
        <div class="monitor-header">
          <h2>Queue Monitor</h2>
          <div class="monitor-controls">
            <button class="btn btn-small btn-secondary" onclick="window.queueMonitor.refreshAll()">
              🔄 Refresh
            </button>
            <button class="btn btn-small btn-secondary" onclick="window.queueMonitor.pauseAll()">
              ⏸️ Pause All
            </button>
            <button class="btn btn-small btn-danger" onclick="window.queueMonitor.clearAll()">
              🗑️ Clear All
            </button>
          </div>
        </div>

        <div class="queue-summary">
          <div class="summary-card">
            <span class="summary-label">Total Queued</span>
            <span class="summary-value" id="total-queued">5</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Processing</span>
            <span class="summary-value" id="total-processing">1</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Failed</span>
            <span class="summary-value error" id="total-failed">0</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Active Accounts</span>
            <span class="summary-value success" id="active-accounts">2</span>
          </div>
        </div>

        <div class="platform-queues" id="platform-queues-list">
          ${this.renderQueues()}
        </div>
      </div>

      <style>
        .queue-monitor {
          padding: 20px;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .monitor-controls {
          display: flex;
          gap: 10px;
        }

        .queue-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-card {
          background: var(--darker-bg);
          padding: 20px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .summary-label {
          color: var(--muted-text);
          font-size: 0.9rem;
        }

        .summary-value {
          font-size: 2rem;
          font-weight: bold;
          color: var(--light-text);
        }

        .summary-value.success {
          color: var(--success-color);
        }

        .summary-value.error {
          color: var(--danger-color);
        }

        .platform-queue {
          background: var(--darker-bg);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .queue-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .queue-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .queue-platform {
          font-size: 1.2rem;
          font-weight: bold;
        }

        .queue-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .status-active {
          background: rgba(76, 175, 80, 0.2);
          color: var(--success-color);
        }

        .status-idle {
          background: rgba(158, 158, 158, 0.2);
          color: var(--muted-text);
        }

        .status-paused {
          background: rgba(255, 193, 7, 0.2);
          color: var(--warning-color);
        }

        .queue-stats {
          display: flex;
          gap: 20px;
          margin: 15px 0;
          padding: 15px;
          background: var(--dark-bg);
          border-radius: 6px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--muted-text);
        }

        .stat-value {
          font-size: 1.1rem;
          font-weight: bold;
        }

        .queue-posts {
          margin-top: 15px;
        }

        .queue-post {
          padding: 10px;
          background: var(--dark-bg);
          border-radius: 6px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .post-info {
          flex: 1;
        }

        .post-content {
          color: var(--light-text);
          margin-bottom: 5px;
        }

        .post-time {
          font-size: 0.85rem;
          color: var(--muted-text);
        }

        .post-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .status-queued {
          background: rgba(33, 150, 243, 0.2);
          color: #2196F3;
        }

        .status-processing {
          background: rgba(255, 193, 7, 0.2);
          color: var(--warning-color);
        }

        .rate-limit-bar {
          margin-top: 15px;
          background: var(--dark-bg);
          border-radius: 4px;
          height: 20px;
          position: relative;
          overflow: hidden;
        }

        .rate-limit-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--success-color), var(--primary-color));
          transition: width 0.3s ease;
        }

        .rate-limit-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.85rem;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
      </style>
    `;
  }

  renderQueues() {
    return Object.entries(this.mockQueues).map(([platform, queue]) => `
      <div class="platform-queue">
        <div class="queue-header">
          <div class="queue-info">
            <span class="queue-platform">${this.getPlatformIcon(platform)} ${platform}</span>
            <span class="queue-username">${queue.username}</span>
            <span class="queue-status status-${queue.status}">${queue.status}</span>
          </div>
          <div class="queue-actions">
            <button class="btn btn-small btn-secondary" onclick="window.queueMonitor.pauseAccount('${platform}', '${queue.accountId}')">
              ⏸️
            </button>
            <button class="btn btn-small btn-secondary" onclick="window.queueMonitor.clearAccount('${platform}', '${queue.accountId}')">
              🗑️
            </button>
          </div>
        </div>

        <div class="queue-stats">
          <div class="stat">
            <span class="stat-label">Queued</span>
            <span class="stat-value">${queue.queued}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Processing</span>
            <span class="stat-value">${queue.processing}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Failed</span>
            <span class="stat-value" style="color: ${queue.failed > 0 ? 'var(--danger-color)' : 'inherit'}">
              ${queue.failed}
            </span>
          </div>
          <div class="stat">
            <span class="stat-label">Rate Limit</span>
            <span class="stat-value">${queue.rateLimit.remaining}/${queue.rateLimit.total}</span>
          </div>
        </div>

        <div class="rate-limit-bar">
          <div class="rate-limit-fill" style="width: ${(queue.rateLimit.remaining / queue.rateLimit.total) * 100}%"></div>
          <span class="rate-limit-text">
            ${Math.round((queue.rateLimit.remaining / queue.rateLimit.total) * 100)}% remaining
          </span>
        </div>

        ${queue.posts.length > 0 ? `
          <div class="queue-posts">
            <h4 style="margin-bottom: 10px;">Upcoming Posts</h4>
            ${queue.posts.slice(0, 3).map(post => `
              <div class="queue-post">
                <div class="post-info">
                  <div class="post-content">${this.truncate(post.content, 50)}</div>
                  <div class="post-time">Scheduled: ${this.formatTime(post.scheduledAt)}</div>
                </div>
                <span class="post-status status-${post.status}">${post.status}</span>
              </div>
            `).join('')}
          </div>
        ` : '<p style="color: var(--muted-text); margin-top: 15px;">No posts in queue</p>'}
      </div>
    `).join('');
  }

  getPlatformIcon(platform) {
    const icons = {
      twitter: '🐦',
      mastodon: '🐘',
      github: '🐙',
      linkedin: '💼',
      facebook: '📘'
    };
    return icons[platform] || '📱';
  }

  truncate(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  formatTime(date) {
    const now = new Date();
    const diff = date - now;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) {
      return `in ${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }

  startAutoUpdate() {
    this.updateInterval = setInterval(() => {
      this.updateDashboard();
    }, 30000); // Update every 30 seconds
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateDashboard() {
    // In production, this would fetch real data from the main process
    // For now, just re-render with mock data
    const queuesContainer = document.getElementById('platform-queues-list');
    if (queuesContainer) {
      queuesContainer.innerHTML = this.renderQueues();
    }
  }

  async pauseAccount(platform, accountId) {
    console.log(`Pausing ${platform} account ${accountId}`);
    // In production, this would call the main process API
    this.mockQueues[platform].status = 'paused';
    this.updateDashboard();
  }

  async clearAccount(platform, accountId) {
    if (confirm(`Clear all queued posts for ${platform}?`)) {
      console.log(`Clearing ${platform} account ${accountId}`);
      // In production, this would call the main process API
      this.mockQueues[platform].posts = [];
      this.mockQueues[platform].queued = 0;
      this.updateDashboard();
    }
  }

  destroy() {
    this.stopAutoUpdate();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Extend window.queueMonitor with additional methods
window.QueueMonitorDashboard = QueueMonitorDashboard;
window.queueMonitor = window.queueMonitor || {};

window.queueMonitor.refreshAll = function() {
  if (window.queueMonitorDashboard) {
    window.queueMonitorDashboard.updateDashboard();
  }
};

window.queueMonitor.pauseAll = function() {
  console.log('Pausing all queues...');
  // In production, this would call the main process API
};

window.queueMonitor.clearAll = function() {
  if (confirm('Clear ALL queued posts across all platforms?')) {
    console.log('Clearing all queues...');
    // In production, this would call the main process API
  }
};
