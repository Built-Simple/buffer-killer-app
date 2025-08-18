// Analytics Dashboard Component for Buffer Killer App
// Provides comprehensive analytics and reporting features

class AnalyticsDashboard {
  constructor() {
    this.charts = {};
    this.currentPeriod = '7days';
    this.currentPlatform = 'all';
    this.chartColors = {
      twitter: '#1DA1F2',
      linkedin: '#0077B5',
      facebook: '#1877F2',
      instagram: '#E1306C',
      mastodon: '#6364FF',
      github: '#181717',
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#48bb78',
      warning: '#f6ad55',
      danger: '#f56565'
    };
  }

  async initialize() {
    await this.loadChartJS();
    this.setupEventListeners();
    await this.loadAnalytics();
  }

  async loadChartJS() {
    // Dynamically load Chart.js from CDN
    return new Promise((resolve) => {
      if (window.Chart) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  setupEventListeners() {
    // Period selector
    document.querySelectorAll('.period-selector button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.period-selector button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentPeriod = e.target.dataset.period;
        this.loadAnalytics();
      });
    });

    // Platform filter
    document.querySelectorAll('.platform-filter button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.platform-filter button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentPlatform = e.target.dataset.platform;
        this.loadAnalytics();
      });
    });

    // Export button
    document.getElementById('export-analytics')?.addEventListener('click', () => {
      this.exportAnalytics();
    });
  }

  async loadAnalytics() {
    try {
      // Get analytics data from main process
      const data = await window.electronAPI.getAnalytics({
        period: this.currentPeriod,
        platform: this.currentPlatform
      });

      // Update summary cards
      this.updateSummaryCards(data.summary);

      // Update charts
      this.updateEngagementChart(data.engagement);
      this.updatePlatformChart(data.platforms);
      this.updateTimelineChart(data.timeline);
      this.updateTopPostsList(data.topPosts);

      // Update best times heatmap
      this.updateBestTimesHeatmap(data.bestTimes);

    } catch (error) {
      console.error('Failed to load analytics:', error);
      this.showError('Failed to load analytics data');
    }
  }

  updateSummaryCards(summary) {
    const cards = [
      {
        id: 'total-posts',
        value: summary.totalPosts || 0,
        label: 'Total Posts',
        icon: '📝',
        change: summary.postsChange || 0
      },
      {
        id: 'total-impressions',
        value: this.formatNumber(summary.totalImpressions || 0),
        label: 'Total Impressions',
        icon: '👁️',
        change: summary.impressionsChange || 0
      },
      {
        id: 'total-engagements',
        value: this.formatNumber(summary.totalEngagements || 0),
        label: 'Total Engagements',
        icon: '💬',
        change: summary.engagementsChange || 0
      },
      {
        id: 'engagement-rate',
        value: `${(summary.engagementRate || 0).toFixed(2)}%`,
        label: 'Engagement Rate',
        icon: '📊',
        change: summary.rateChange || 0
      }
    ];

    const container = document.getElementById('analytics-summary-cards');
    if (container) {
      container.innerHTML = cards.map(card => `
        <div class="analytics-card">
          <div class="card-icon">${card.icon}</div>
          <div class="card-content">
            <div class="card-value">${card.value}</div>
            <div class="card-label">${card.label}</div>
            ${this.getChangeIndicator(card.change)}
          </div>
        </div>
      `).join('');
    }
  }

  getChangeIndicator(change) {
    if (change === 0) return '';
    const isPositive = change > 0;
    const color = isPositive ? 'var(--success-color)' : 'var(--danger-color)';
    const arrow = isPositive ? '↑' : '↓';
    return `
      <div class="change-indicator" style="color: ${color};">
        ${arrow} ${Math.abs(change).toFixed(1)}%
      </div>
    `;
  }

  updateEngagementChart(data) {
    const ctx = document.getElementById('engagement-chart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (this.charts.engagement) {
      this.charts.engagement.destroy();
    }

    this.charts.engagement = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: 'Impressions',
            data: data.impressions || [],
            borderColor: this.chartColors.primary,
            backgroundColor: `${this.chartColors.primary}20`,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Engagements',
            data: data.engagements || [],
            borderColor: this.chartColors.success,
            backgroundColor: `${this.chartColors.success}20`,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Clicks',
            data: data.clicks || [],
            borderColor: this.chartColors.warning,
            backgroundColor: `${this.chartColors.warning}20`,
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          }
        }
      }
    });
  }

  updatePlatformChart(data) {
    const ctx = document.getElementById('platform-chart');
    if (!ctx) return;

    if (this.charts.platform) {
      this.charts.platform.destroy();
    }

    const platforms = Object.keys(data || {});
    const colors = platforms.map(p => this.chartColors[p] || this.chartColors.primary);

    this.charts.platform = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
        datasets: [{
          data: platforms.map(p => data[p] || 0),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#1a1a1a'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ffffff',
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.raw / total) * 100).toFixed(1);
                return `${context.label}: ${context.raw} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  updateTimelineChart(data) {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;

    if (this.charts.timeline) {
      this.charts.timeline.destroy();
    }

    // Group data by platform
    const datasets = [];
    const platforms = [...new Set(data.map(d => d.platform))];
    
    platforms.forEach(platform => {
      const platformData = data.filter(d => d.platform === platform);
      datasets.push({
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
        data: platformData.map(d => ({
          x: d.date,
          y: d.posts
        })),
        backgroundColor: this.chartColors[platform] || this.chartColors.primary,
        borderColor: this.chartColors[platform] || this.chartColors.primary,
        borderWidth: 2
      });
    });

    this.charts.timeline = new Chart(ctx, {
      type: 'bar',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#ffffff'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: {
                day: 'MMM DD'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          },
          y: {
            stacked: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          }
        }
      }
    });
  }

  updateTopPostsList(posts) {
    const container = document.getElementById('top-posts-list');
    if (!container) return;

    if (!posts || posts.length === 0) {
      container.innerHTML = '<p style="color: var(--muted-text);">No posts data available</p>';
      return;
    }

    container.innerHTML = posts.slice(0, 5).map((post, index) => `
      <div class="top-post-item">
        <div class="post-rank">#${index + 1}</div>
        <div class="post-info">
          <div class="post-content">${this.truncateText(post.content, 100)}</div>
          <div class="post-meta">
            <span class="platform-badge" style="background: ${this.chartColors[post.platform]}20; color: ${this.chartColors[post.platform]};">
              ${post.platform}
            </span>
            <span class="post-stats">
              👁️ ${this.formatNumber(post.impressions)} 
              💬 ${this.formatNumber(post.engagements)}
              🔗 ${this.formatNumber(post.clicks)}
            </span>
            <span class="post-date">${this.formatDate(post.date)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  updateBestTimesHeatmap(data) {
    const container = document.getElementById('best-times-heatmap');
    if (!container) return;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({length: 24}, (_, i) => i);

    // Create heatmap grid
    let html = '<div class="heatmap-container">';
    
    // Header row with hours
    html += '<div class="heatmap-row header">';
    html += '<div class="heatmap-cell day-label"></div>';
    hours.forEach(hour => {
      html += `<div class="heatmap-cell hour-label">${hour}</div>`;
    });
    html += '</div>';

    // Data rows
    days.forEach((day, dayIndex) => {
      html += '<div class="heatmap-row">';
      html += `<div class="heatmap-cell day-label">${day}</div>`;
      
      hours.forEach(hour => {
        const value = data?.[dayIndex]?.[hour] || 0;
        const intensity = this.getHeatmapIntensity(value);
        html += `
          <div class="heatmap-cell" 
               style="background: ${intensity};" 
               title="${day} ${hour}:00 - Engagement: ${value}">
          </div>
        `;
      });
      
      html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
  }

  getHeatmapIntensity(value) {
    if (value === 0) return 'rgba(255, 255, 255, 0.05)';
    const maxValue = 100; // Normalize to 100
    const intensity = Math.min(value / maxValue, 1);
    const r = 102;
    const g = 126;
    const b = 234;
    return `rgba(${r}, ${g}, ${b}, ${intensity * 0.8})`;
  }

  async exportAnalytics() {
    try {
      const data = await window.electronAPI.getAnalytics({
        period: this.currentPeriod,
        platform: this.currentPlatform
      });

      // Prepare CSV data
      const csvRows = [
        ['Analytics Report - ' + new Date().toLocaleDateString()],
        [],
        ['Summary'],
        ['Metric', 'Value', 'Change %'],
        ['Total Posts', data.summary.totalPosts, data.summary.postsChange],
        ['Total Impressions', data.summary.totalImpressions, data.summary.impressionsChange],
        ['Total Engagements', data.summary.totalEngagements, data.summary.engagementsChange],
        ['Engagement Rate', data.summary.engagementRate + '%', data.summary.rateChange],
        [],
        ['Top Posts'],
        ['Content', 'Platform', 'Impressions', 'Engagements', 'Clicks', 'Date']
      ];

      // Add top posts data
      if (data.topPosts) {
        data.topPosts.forEach(post => {
          csvRows.push([
            post.content.substring(0, 50),
            post.platform,
            post.impressions,
            post.engagements,
            post.clicks,
            this.formatDate(post.date)
          ]);
        });
      }

      // Convert to CSV string
      const csvContent = csvRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${this.currentPeriod}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccess('Analytics exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      this.showError('Failed to export analytics');
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  showSuccess(message) {
    // Implement success notification
    console.log('Success:', message);
  }

  showError(message) {
    // Implement error notification
    console.error('Error:', message);
  }

  // Generate sample data for testing
  generateSampleData() {
    const now = new Date();
    const data = {
      summary: {
        totalPosts: 147,
        totalImpressions: 45230,
        totalEngagements: 3421,
        engagementRate: 7.56,
        postsChange: 12.5,
        impressionsChange: 23.4,
        engagementsChange: 18.2,
        rateChange: 2.1
      },
      engagement: {
        labels: [],
        impressions: [],
        engagements: [],
        clicks: []
      },
      platforms: {
        twitter: 45,
        linkedin: 32,
        facebook: 28,
        instagram: 22,
        mastodon: 15,
        github: 5
      },
      timeline: [],
      topPosts: [],
      bestTimes: []
    };

    // Generate daily data for the past 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      data.engagement.labels.push(dateStr);
      data.engagement.impressions.push(Math.floor(Math.random() * 10000) + 5000);
      data.engagement.engagements.push(Math.floor(Math.random() * 1000) + 200);
      data.engagement.clicks.push(Math.floor(Math.random() * 500) + 100);
      
      // Timeline data
      ['twitter', 'linkedin', 'facebook'].forEach(platform => {
        data.timeline.push({
          date: date.toISOString(),
          platform: platform,
          posts: Math.floor(Math.random() * 5) + 1
        });
      });
    }

    // Generate top posts
    const samplePosts = [
      "Excited to announce our new feature! 🚀",
      "Tips for better social media engagement...",
      "How to schedule posts like a pro",
      "Big update coming soon! Stay tuned.",
      "Thank you for 10K followers! 🎉"
    ];

    samplePosts.forEach((content, i) => {
      data.topPosts.push({
        content: content,
        platform: ['twitter', 'linkedin', 'facebook'][i % 3],
        impressions: Math.floor(Math.random() * 5000) + 2000,
        engagements: Math.floor(Math.random() * 500) + 100,
        clicks: Math.floor(Math.random() * 200) + 50,
        date: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    });

    // Generate best times heatmap data
    data.bestTimes = Array(7).fill(null).map(() => 
      Array(24).fill(null).map(() => Math.floor(Math.random() * 100))
    );

    return data;
  }
}

// Initialize when the analytics page is shown
window.analyticsDashboard = new AnalyticsDashboard();
