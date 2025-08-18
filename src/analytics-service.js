// Analytics Service for Buffer Killer App
// Handles analytics data collection, processing, and reporting

const Database = require('./database/database');
const path = require('path');

class AnalyticsService {
  constructor() {
    this.db = new Database();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.db.initialize();
      this.initialized = true;
    }
  }

  // Record analytics for a post
  async recordAnalytics(postId, platform, metrics = {}) {
    await this.initialize();
    
    const analytics = {
      post_id: postId,
      platform: platform,
      impressions: metrics.impressions || 0,
      engagements: metrics.engagements || 0,
      clicks: metrics.clicks || 0,
      recorded_at: new Date().toISOString()
    };
    
    return await this.db.insert('analytics', analytics);
  }

  // Get analytics for a specific period
  async getAnalytics(options = {}) {
    await this.initialize();
    
    const {
      period = '7days',
      platform = 'all',
      startDate = null,
      endDate = null
    } = options;

    // Calculate date range
    const now = new Date();
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = now;
      switch(period) {
        case 'today':
          start = new Date(now.setHours(0, 0, 0, 0));
          break;
        case '7days':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    }

    // Query analytics data
    let query = this.db.query('analytics')
      .where('recorded_at', 'gte', start.toISOString())
      .where('recorded_at', 'lte', end.toISOString());
    
    if (platform !== 'all') {
      query = query.where('platform', platform);
    }
    
    const analyticsData = await query.execute();

    // Get posts data
    const postIds = [...new Set(analyticsData.map(a => a.post_id))];
    const posts = await Promise.all(
      postIds.map(id => this.db.findOne('posts', { id }))
    );

    // Process and aggregate data
    const processedData = await this.processAnalyticsData(analyticsData, posts, { start, end, platform });
    
    return processedData;
  }

  async processAnalyticsData(analyticsData, posts, options) {
    const { start, end, platform } = options;
    
    // Calculate summary metrics
    const summary = this.calculateSummary(analyticsData);
    
    // Calculate previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = start;
    
    const previousQuery = this.db.query('analytics')
      .where('recorded_at', 'gte', previousStart.toISOString())
      .where('recorded_at', 'lt', previousEnd.toISOString());
    
    if (platform !== 'all') {
      previousQuery.where('platform', platform);
    }
    
    const previousData = await previousQuery.execute();
    const previousSummary = this.calculateSummary(previousData);
    
    // Calculate percentage changes
    summary.postsChange = this.calculatePercentageChange(posts.length, previousData.length);
    summary.impressionsChange = this.calculatePercentageChange(summary.totalImpressions, previousSummary.totalImpressions);
    summary.engagementsChange = this.calculatePercentageChange(summary.totalEngagements, previousSummary.totalEngagements);
    summary.rateChange = this.calculatePercentageChange(summary.engagementRate, previousSummary.engagementRate);
    
    // Prepare engagement timeline data
    const engagementData = this.prepareEngagementTimeline(analyticsData, start, end);
    
    // Calculate platform distribution
    const platformData = this.calculatePlatformDistribution(analyticsData);
    
    // Get timeline data
    const timelineData = this.prepareTimelineData(posts, start, end);
    
    // Get top performing posts
    const topPosts = await this.getTopPerformingPosts(analyticsData, posts);
    
    // Calculate best times to post
    const bestTimes = this.calculateBestTimes(analyticsData, posts);
    
    return {
      summary,
      engagement: engagementData,
      platforms: platformData,
      timeline: timelineData,
      topPosts,
      bestTimes
    };
  }

  calculateSummary(analyticsData) {
    const totalImpressions = analyticsData.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalEngagements = analyticsData.reduce((sum, a) => sum + (a.engagements || 0), 0);
    const totalClicks = analyticsData.reduce((sum, a) => sum + (a.clicks || 0), 0);
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
    
    return {
      totalPosts: analyticsData.length,
      totalImpressions,
      totalEngagements,
      totalClicks,
      engagementRate: engagementRate.toFixed(2)
    };
  }

  calculatePercentageChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  prepareEngagementTimeline(analyticsData, start, end) {
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const labels = [];
    const impressions = [];
    const engagements = [];
    const clicks = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      labels.push(dateStr);
      
      // Filter data for this day
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      const dayData = analyticsData.filter(a => {
        const recordDate = new Date(a.recorded_at);
        return recordDate >= dayStart && recordDate <= dayEnd;
      });
      
      impressions.push(dayData.reduce((sum, a) => sum + (a.impressions || 0), 0));
      engagements.push(dayData.reduce((sum, a) => sum + (a.engagements || 0), 0));
      clicks.push(dayData.reduce((sum, a) => sum + (a.clicks || 0), 0));
    }
    
    return { labels, impressions, engagements, clicks };
  }

  calculatePlatformDistribution(analyticsData) {
    const platforms = {};
    
    analyticsData.forEach(a => {
      if (!platforms[a.platform]) {
        platforms[a.platform] = 0;
      }
      platforms[a.platform]++;
    });
    
    return platforms;
  }

  prepareTimelineData(posts, start, end) {
    const timelineData = [];
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayPosts = posts.filter(p => {
        const postDate = new Date(p.scheduled_time || p.created_at);
        return postDate >= dayStart && postDate <= dayEnd;
      });
      
      // Group by platform
      const platformCounts = {};
      dayPosts.forEach(p => {
        const platforms = JSON.parse(p.platforms || '[]');
        platforms.forEach(platform => {
          if (!platformCounts[platform]) {
            platformCounts[platform] = 0;
          }
          platformCounts[platform]++;
        });
      });
      
      Object.entries(platformCounts).forEach(([platform, count]) => {
        timelineData.push({
          date: date.toISOString(),
          platform,
          posts: count
        });
      });
    }
    
    return timelineData;
  }

  async getTopPerformingPosts(analyticsData, posts) {
    // Aggregate analytics by post
    const postMetrics = {};
    
    analyticsData.forEach(a => {
      if (!postMetrics[a.post_id]) {
        postMetrics[a.post_id] = {
          impressions: 0,
          engagements: 0,
          clicks: 0,
          platform: a.platform
        };
      }
      postMetrics[a.post_id].impressions += a.impressions || 0;
      postMetrics[a.post_id].engagements += a.engagements || 0;
      postMetrics[a.post_id].clicks += a.clicks || 0;
    });
    
    // Combine with post content
    const topPosts = [];
    
    for (const [postId, metrics] of Object.entries(postMetrics)) {
      const post = posts.find(p => p.id === parseInt(postId));
      if (post) {
        topPosts.push({
          id: postId,
          content: post.content,
          platform: metrics.platform,
          impressions: metrics.impressions,
          engagements: metrics.engagements,
          clicks: metrics.clicks,
          date: post.scheduled_time || post.created_at,
          engagementRate: metrics.impressions > 0 ? 
            ((metrics.engagements / metrics.impressions) * 100).toFixed(2) : 0
        });
      }
    }
    
    // Sort by engagement rate
    topPosts.sort((a, b) => b.engagementRate - a.engagementRate);
    
    return topPosts.slice(0, 10);
  }

  calculateBestTimes(analyticsData, posts) {
    // Initialize 7x24 grid (days x hours)
    const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
    const counts = Array(7).fill(null).map(() => Array(24).fill(0));
    
    // Aggregate engagement by day and hour
    analyticsData.forEach(a => {
      const post = posts.find(p => p.id === a.post_id);
      if (post) {
        const date = new Date(post.scheduled_time || post.created_at);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        
        const engagementScore = (a.engagements || 0) + (a.clicks || 0) * 2; // Weight clicks higher
        heatmap[dayOfWeek][hour] += engagementScore;
        counts[dayOfWeek][hour]++;
      }
    });
    
    // Calculate averages
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (counts[day][hour] > 0) {
          heatmap[day][hour] = Math.round(heatmap[day][hour] / counts[day][hour]);
        }
      }
    }
    
    return heatmap;
  }

  // Generate sample analytics data for testing
  async generateSampleAnalytics() {
    await this.initialize();
    
    // Get existing posts
    const posts = await this.db.find('posts');
    
    if (posts.length === 0) {
      console.log('No posts found. Creating sample posts first...');
      // Create sample posts
      const platforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'mastodon', 'github'];
      const sampleContents = [
        "Excited to announce our new feature! 🚀",
        "Tips for better social media engagement: Thread 🧵",
        "How to schedule posts like a pro #SocialMedia #Marketing",
        "Big update coming soon! Stay tuned for more details.",
        "Thank you for 10K followers! 🎉 #Milestone",
        "Check out our latest blog post on automation",
        "Weekend vibes! What are you working on? 💻",
        "New tutorial: Building your first Electron app",
        "5 productivity tips that actually work",
        "Join us for our upcoming webinar!"
      ];
      
      for (let i = 0; i < 20; i++) {
        const scheduledTime = new Date();
        scheduledTime.setDate(scheduledTime.getDate() - Math.floor(Math.random() * 30));
        scheduledTime.setHours(Math.floor(Math.random() * 24));
        
        const post = await this.db.insert('posts', {
          content: sampleContents[Math.floor(Math.random() * sampleContents.length)],
          platforms: JSON.stringify([platforms[Math.floor(Math.random() * platforms.length)]]),
          scheduled_time: scheduledTime.toISOString(),
          status: 'published'
        });
        
        posts.push(post);
      }
    }
    
    // Generate analytics for each post
    for (const post of posts) {
      const platforms = JSON.parse(post.platforms || '[]');
      
      for (const platform of platforms) {
        // Generate 1-5 analytics records per post (simulating multiple time periods)
        const recordCount = Math.floor(Math.random() * 5) + 1;
        
        for (let i = 0; i < recordCount; i++) {
          const recordedAt = new Date(post.scheduled_time || post.created_at);
          recordedAt.setHours(recordedAt.getHours() + i * 24); // Space out records
          
          await this.db.insert('analytics', {
            post_id: post.id,
            platform: platform,
            impressions: Math.floor(Math.random() * 5000) + 1000,
            engagements: Math.floor(Math.random() * 500) + 50,
            clicks: Math.floor(Math.random() * 200) + 10,
            recorded_at: recordedAt.toISOString()
          });
        }
      }
    }
    
    console.log('Sample analytics data generated successfully');
    return true;
  }

  // Export analytics to CSV
  async exportToCSV(data) {
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
      ['Content', 'Platform', 'Impressions', 'Engagements', 'Clicks', 'Engagement Rate', 'Date']
    ];

    // Add top posts data
    if (data.topPosts) {
      data.topPosts.forEach(post => {
        csvRows.push([
          post.content.substring(0, 100),
          post.platform,
          post.impressions,
          post.engagements,
          post.clicks,
          post.engagementRate + '%',
          new Date(post.date).toLocaleDateString()
        ]);
      });
    }

    // Convert to CSV string
    return csvRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }
}

module.exports = AnalyticsService;
