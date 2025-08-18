// Queue Monitoring Dashboard
// Real-time monitoring interface for multi-account queues

class QueueMonitorDashboard {
  constructor() {
    this.container = null;
    this.updateInterval = null;
    this.charts = {};
    this.colors = {
      healthy: '#10b981',
      unhealthy: '#ef4444',
      paused: '#f59e0b',
      idle: '#6b7280',
      blacklisted: '#991b1b'
    };
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    this.render();
    this.startMonitoring();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="queue-monitor">
        <div class="monitor-header">
          <h2>Queue Monitoring Dashboard</h2>
          <div class="monitor-controls">
            <select id="strategy-selector" class="control-select">
              <option value="healthiest">Healthiest First</option>
              <option value="roundRobin">Round Robin</option>
              <option value="leastPending">Least Pending</option>
              <option value="weighted">Weighted Random</option>
            </select>
            <button id="refresh-monitor" class="btn-secondary">
              <span class="icon">🔄</span> Refresh
            </button>
            <button id="pause-all" class="btn-warning">
              <span class="icon">⏸️</span> Pause All
            </button>
            <button id="resume-all" class="btn-success">
              <span class="icon">▶️</span> Resume All
            </button>
          </div>
        </div>

        <div class="monitor-stats">
          <div class="stat-card">
            <div class="stat-value" id="total-queues">0</div>
            <div class="stat-label">Total Queues</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="active-tasks">0</div>
            <div class="stat-label">Active Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="pending-tasks">0</div>
            <div class="stat-label">Pending Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="failed-tasks">0</div>
            <div class="stat-label">Failed Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="blacklisted-accounts">0</div>
            <div class="stat-label">Blacklisted</div>
          </div>
        </div>

        <div class="platform-sections">
          <div class="platform-section" data-platform="twitter">
            <h3>Twitter Accounts</h3>
            <div class="accounts-grid" id="twitter-accounts"></div>
          </div>
          <div class="platform-section" data-platform="linkedin">
            <h3>LinkedIn Accounts</h3>
            <div class="accounts-grid" id="linkedin-accounts"></div>
          </div>
          <div class="platform-section" data-platform="mastodon">
            <h3>Mastodon Accounts</h3>
            <div class="accounts-grid" id="mastodon-accounts"></div>
          </div>
          <div class="platform-section" data-platform="github">
            <h3>GitHub Accounts</h3>
            <div class="accounts-grid" id="github-accounts"></div>
          </div>
          <div class="platform-section" data-platform="facebook">
            <h3>Facebook Accounts</h3>
            <div class="accounts-grid" id="facebook-accounts"></div>
          </div>
        </div>

        <div class="failover-status">
          <h3>Failover Status</h3>
          <div id="failover-content"></div>
        </div>

        <div class="charts-section">
          <div class="chart-container">
            <h3>Queue Activity</h3>
            <canvas id="activity-chart"></canvas>
          </div>
          <div class="chart-container">
            <h3>Error Rates</h3>
            <canvas id="error-chart"></canvas>
          </div>
          <div class="chart-container">
            <h3>Response Times</h3>
            <canvas id="response-chart"></canvas>
          </div>
        </div>
      </div>

      <style>
        .queue-monitor {
          padding: 20px;
          background: #1a1a1a;
          color: white;
          min-height: 100vh;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #333;
        }

        .monitor-header h2 {
          margin: 0;
          font-size: 24px;
        }

        .monitor-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .control-select {
          padding: 8px 12px;
          background: #2a2a2a;
          color: white;
          border: 1px solid #444;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-secondary, .btn-warning, .btn-success {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
        }

        .btn-secondary {
          background: #4b5563;
          color: white;
        }

        .btn-warning {
          background: #f59e0b;
          color: white;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .monitor-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 14px;
          color: #9ca3af;
        }

        .platform-sections {
          margin-bottom: 30px;
        }

        .platform-section {
          margin-bottom: 25px;
        }

        .platform-section h3 {
          margin-bottom: 15px;
          color: #e5e7eb;
        }

        .accounts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }

        .account-card {
          background: #2a2a2a;
          border-radius: 8px;
          padding: 15px;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .account-card.healthy {
          border-color: #10b981;
        }

        .account-card.unhealthy {
          border-color: #ef4444;
        }

        .account-card.paused {
          border-color: #f59e0b;
        }

        .account-card.idle {
          border-color: #6b7280;
        }

        .account-card.blacklisted {
          border-color: #991b1b;
          opacity: 0.7;
        }

        .account-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .account-id {
          font-weight: bold;
          font-size: 14px;
        }

        .account-status {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          text-transform: uppercase;
        }

        .account-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          font-size: 12px;
        }

        .metric {
          display: flex;
          justify-content: space-between;
        }

        .metric-label {
          color: #9ca3af;
        }

        .metric-value {
          font-weight: bold;
        }

        .account-actions {
          display: flex;
          gap: 5px;
          margin-top: 10px;
        }

        .account-actions button {
          flex: 1;
          padding: 5px;
          background: #374151;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .account-actions button:hover {
          background: #4b5563;
        }

        .failover-status {
          background: #2a2a2a;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .failover-status h3 {
          margin-bottom: 15px;
        }

        .blacklist-item {
          background: #1a1a1a;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .blacklist-info {
          flex: 1;
        }

        .blacklist-timer {
          color: #f59e0b;
          font-weight: bold;
        }

        .charts-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .chart-container {
          background: #2a2a2a;
          border-radius: 8px;
          padding: 20px;
        }

        .chart-container h3 {
          margin-bottom: 15px;
        }

        .health-bar {
          width: 100%;
          height: 8px;
          background: #1a1a1a;
          border-radius: 4px;
          margin-top: 10px;
          overflow: hidden;
        }

        .health-fill {
          height: 100%;
          background: linear-gradient(to right, #ef4444, #f59e0b, #10b981);
          transition: width 0.3s ease;
        }
      </style>
    `;
  }

  startMonitoring() {
    // Initial update
    this.updateDashboard();

    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.updateDashboard();
    }, 2000); // Update every 2 seconds
  }

  async updateDashboard() {
    try {
      // Get queue stats from main process
      const stats = await window.electronAPI.getQueueStats();
      const failoverStatus = await window.electronAPI.getFailoverStatus();

      this.updateSummaryStats(stats);
      this.updateAccountCards(stats);
      this.updateFailoverStatus(failoverStatus);
      this.updateCharts(stats);
    } catch (error) {
      console.error('Failed to update dashboard:', error);
    }
  }

  updateSummaryStats(stats) {
    let totalQueues = 0;
    let activeTasks = 0;
    let pendingTasks = 0;
    let failedTasks = 0;

    stats.forEach(stat => {
      totalQueues++;
      activeTasks += stat.processed || 0;
      pendingTasks += stat.queuePending || 0;
      failedTasks += stat.failed || 0;
    });

    document.getElementById('total-queues').textContent = totalQueues;
    document.getElementById('active-tasks').textContent = activeTasks;
    document.getElementById('pending-tasks').textContent = pendingTasks;
    document.getElementById('failed-tasks').textContent = failedTasks;
  }

  updateAccountCards(stats) {
    const platforms = ['twitter', 'linkedin', 'mastodon', 'github', 'facebook'];
    
    platforms.forEach(platform => {
      const container = document.getElementById(`${platform}-accounts`);
      const platformStats = stats.filter(s => s.platform === platform);
      
      if (platformStats.length === 0) {
        container.innerHTML = '<div class="no-accounts">No accounts connected</div>';
        return;
      }

      container.innerHTML = platformStats.map(stat => this.createAccountCard(stat)).join('');
    });
  }

  createAccountCard(stat) {
    const healthScore = this.calculateHealthScore(stat);
    const statusColor = this.colors[stat.health] || '#6b7280';
    
    return `
      <div class="account-card ${stat.health}" data-key="${stat.key}">
        <div class="account-header">
          <div class="account-id">${stat.accountId || 'Unknown'}</div>
          <div class="account-status" style="background: ${statusColor}">
            ${stat.health}
          </div>
        </div>
        <div class="account-metrics">
          <div class="metric">
            <span class="metric-label">Pending:</span>
            <span class="metric-value">${stat.queuePending || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Processed:</span>
            <span class="metric-value">${stat.processed || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Failed:</span>
            <span class="metric-value">${stat.failed || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Error Rate:</span>
            <span class="metric-value">${(stat.errorRate * 100).toFixed(1)}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Avg Response:</span>
            <span class="metric-value">${Math.round(stat.averageResponseTime)}ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">Health Score:</span>
            <span class="metric-value">${healthScore.toFixed(0)}/100</span>
          </div>
        </div>
        <div class="health-bar">
          <div class="health-fill" style="width: ${healthScore}%"></div>
        </div>
        <div class="account-actions">
          <button onclick="queueMonitor.pauseAccount('${stat.platform}', '${stat.accountId}')">
            ${stat.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onclick="queueMonitor.clearAccount('${stat.platform}', '${stat.accountId}')">
            Clear
          </button>
          <button onclick="queueMonitor.failoverAccount('${stat.platform}', '${stat.accountId}')">
            Failover
          </button>
        </div>
      </div>
    `;
  }

  updateFailoverStatus(failoverStatus) {
    const container = document.getElementById('failover-content');
    
    if (!failoverStatus || failoverStatus.blacklisted.length === 0) {
      container.innerHTML = '<p>No accounts currently blacklisted</p>';
      document.getElementById('blacklisted-accounts').textContent = '0';
      return;
    }

    document.getElementById('blacklisted-accounts').textContent = failoverStatus.blacklisted.length;

    container.innerHTML = failoverStatus.blacklisted.map(item => `
      <div class="blacklist-item">
        <div class="blacklist-info">
          <strong>${item.key}</strong>
          <br>
          <small>Reason: ${item.reason}</small>
        </div>
        <div class="blacklist-timer">
          ${Math.ceil(item.remainingMinutes)} min remaining
        </div>
        <button onclick="queueMonitor.recoverAccount('${item.platform}', '${item.accountId}')">
          Recover Now
        </button>
      </div>
    `).join('');
  }

  updateCharts(stats) {
    // Update activity chart
    if (this.charts.activity) {
      this.updateActivityChart(stats);
    } else {
      this.initActivityChart(stats);
    }

    // Update error chart
    if (this.charts.error) {
      this.updateErrorChart(stats);
    } else {
      this.initErrorChart(stats);
    }

    // Update response time chart
    if (this.charts.response) {
      this.updateResponseChart(stats);
    } else {
      this.initResponseChart(stats);
    }
  }

  initActivityChart(stats) {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    this.charts.activity = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stats.map(s => s.accountId || s.key),
        datasets: [{
          label: 'Pending',
          data: stats.map(s => s.queuePending || 0),
          backgroundColor: '#f59e0b'
        }, {
          label: 'Processed',
          data: stats.map(s => s.processed || 0),
          backgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  updateActivityChart(stats) {
    this.charts.activity.data.labels = stats.map(s => s.accountId || s.key);
    this.charts.activity.data.datasets[0].data = stats.map(s => s.queuePending || 0);
    this.charts.activity.data.datasets[1].data = stats.map(s => s.processed || 0);
    this.charts.activity.update();
  }

  initErrorChart(stats) {
    const ctx = document.getElementById('error-chart').getContext('2d');
    this.charts.error = new Chart(ctx, {
      type: 'line',
      data: {
        labels: stats.map(s => s.accountId || s.key),
        datasets: [{
          label: 'Error Rate (%)',
          data: stats.map(s => (s.errorRate * 100).toFixed(1)),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  updateErrorChart(stats) {
    this.charts.error.data.labels = stats.map(s => s.accountId || s.key);
    this.charts.error.data.datasets[0].data = stats.map(s => (s.errorRate * 100).toFixed(1));
    this.charts.error.update();
  }

  initResponseChart(stats) {
    const ctx = document.getElementById('response-chart').getContext('2d');
    this.charts.response = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stats.map(s => s.accountId || s.key),
        datasets: [{
          label: 'Avg Response Time (ms)',
          data: stats.map(s => Math.round(s.averageResponseTime || 0)),
          backgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  updateResponseChart(stats) {
    this.charts.response.data.labels = stats.map(s => s.accountId || s.key);
    this.charts.response.data.datasets[0].data = stats.map(s => Math.round(s.averageResponseTime || 0));
    this.charts.response.update();
  }

  calculateHealthScore(stats) {
    const errorPenalty = (stats.errorRate || 0) * 100;
    const pendingPenalty = Math.min((stats.queuePending || 0) * 5, 50);
    const responsePenalty = Math.min((stats.averageResponseTime || 0) / 100, 30);
    
    return Math.max(0, Math.min(100, 100 - errorPenalty - pendingPenalty - responsePenalty));
  }

  attachEventListeners() {
    // Strategy selector
    document.getElementById('strategy-selector').addEventListener('change', async (e) => {
      await window.electronAPI.setLoadBalancerStrategy(e.target.value);
    });

    // Refresh button
    document.getElementById('refresh-monitor').addEventListener('click', () => {
      this.updateDashboard();
    });

    // Pause all button
    document.getElementById('pause-all').addEventListener('click', async () => {
      await window.electronAPI.pauseAllQueues();
      this.updateDashboard();
    });

    // Resume all button
    document.getElementById('resume-all').addEventListener('click', async () => {
      await window.electronAPI.resumeAllQueues();
      this.updateDashboard();
    });
  }

  // Account actions
  async pauseAccount(platform, accountId) {
    await window.electronAPI.toggleQueuePause(platform, accountId);
    this.updateDashboard();
  }

  async clearAccount(platform, accountId) {
    if (confirm(`Clear all pending tasks for ${accountId}?`)) {
      await window.electronAPI.clearQueue(platform, accountId);
      this.updateDashboard();
    }
  }

  async failoverAccount(platform, accountId) {
    if (confirm(`Trigger manual failover for ${accountId}?`)) {
      await window.electronAPI.triggerManualFailover(platform, accountId);
      this.updateDashboard();
    }
  }

  async recoverAccount(platform, accountId) {
    await window.electronAPI.recoverAccount(platform, accountId);
    this.updateDashboard();
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Destroy charts
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QueueMonitorDashboard;
}

// Create global instance
const queueMonitor = new QueueMonitorDashboard();
