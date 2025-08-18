# Analytics Dashboard Documentation

## Overview
The Analytics Dashboard provides comprehensive insights into social media post performance across all connected platforms. Built with Chart.js for visualization and a modular architecture for easy extension.

## Features Implemented

### 1. Summary Cards
- **Total Posts**: Count of all posts in selected period
- **Total Impressions**: Combined reach across platforms
- **Total Engagements**: Likes, comments, shares combined
- **Engagement Rate**: Percentage calculation with trend indicators

### 2. Interactive Charts

#### Engagement Timeline
- Multi-line chart showing impressions, engagements, and clicks over time
- Configurable period selector (Today, 7 Days, 30 Days, 90 Days)
- Responsive design with hover tooltips

#### Platform Distribution
- Doughnut chart showing post distribution across platforms
- Color-coded by platform brand colors
- Percentage calculations on hover

#### Posts Timeline
- Stacked bar chart showing posting frequency
- Grouped by platform and date
- Time-based aggregation

### 3. Top Performing Posts
- List of highest engagement posts
- Sortable by different metrics (impressions, engagements, clicks)
- Shows content preview, platform, and engagement stats
- Direct links to original posts (when available)

### 4. Best Times Heatmap
- 7x24 grid showing optimal posting times
- Day-of-week vs hour-of-day analysis
- Color intensity based on engagement scores
- Hover tooltips with exact values

### 5. Export Functionality
- **CSV Export**: Full data export with all metrics
- **PDF Export**: Print-friendly report generation
- **Custom date ranges**: Flexible period selection

## Technical Architecture

### Components

#### `analytics-dashboard.js`
Main component handling:
- Chart.js initialization
- Data processing and aggregation
- Event handling for filters
- Export functionality

#### `analytics-dashboard.html`
UI structure including:
- Control panels for filtering
- Chart containers
- Export buttons
- Responsive grid layout

#### `analytics-service.js`
Backend service providing:
- Database queries for analytics data
- Data aggregation logic
- Time-based calculations
- Export data preparation

## Usage

### Loading Analytics
```javascript
// Initialize when page loads
await window.analyticsDashboard.initialize();

// Load analytics for specific period
await window.analyticsDashboard.loadAnalytics({
  period: '7days',
  platform: 'all'
});
```

### Custom Queries
```javascript
// Get analytics for custom date range
const data = await window.electronAPI.getAnalytics({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  platform: 'twitter'
});
```

### Recording Analytics
```javascript
// Record analytics for a post
await analyticsService.recordAnalytics(postId, 'twitter', {
  impressions: 1500,
  engagements: 45,
  clicks: 23
});
```

## Data Structure

### Analytics Table Schema
```sql
CREATE TABLE analytics (
  id INTEGER PRIMARY KEY,
  post_id INTEGER,
  platform TEXT,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  recorded_at DATETIME
);
```

### Response Format
```javascript
{
  summary: {
    totalPosts: 147,
    totalImpressions: 45230,
    totalEngagements: 3421,
    engagementRate: 7.56,
    postsChange: 12.5,      // % change from previous period
    impressionsChange: 23.4,
    engagementsChange: 18.2,
    rateChange: 2.1
  },
  engagement: {
    labels: ['Jan 1', 'Jan 2', ...],
    impressions: [1200, 1500, ...],
    engagements: [45, 67, ...],
    clicks: [12, 23, ...]
  },
  platforms: {
    twitter: 45,
    linkedin: 32,
    facebook: 28
  },
  timeline: [...],
  topPosts: [...],
  bestTimes: [[...]]  // 7x24 matrix
}
```

## Styling

### Color Scheme
- Primary: `#667eea` (Purple)
- Secondary: `#764ba2` (Dark Purple)
- Success: `#48bb78` (Green)
- Warning: `#f6ad55` (Orange)
- Danger: `#f56565` (Red)

### Platform Colors
- Twitter: `#1DA1F2`
- LinkedIn: `#0077B5`
- Facebook: `#1877F2`
- Instagram: `#E1306C`
- Mastodon: `#6364FF`
- GitHub: `#181717`

## Future Enhancements

### Phase 1: Real Platform Integration
- [ ] Connect to actual platform APIs for real metrics
- [ ] Twitter Analytics API integration
- [ ] LinkedIn Analytics API integration
- [ ] Facebook Insights integration

### Phase 2: Advanced Analytics
- [ ] Sentiment analysis on comments
- [ ] Competitor comparison
- [ ] Hashtag performance tracking
- [ ] Follower growth charts
- [ ] Content type analysis (text vs image vs video)

### Phase 3: AI-Powered Insights
- [ ] Predictive analytics for best posting times
- [ ] Content optimization suggestions
- [ ] Engagement prediction models
- [ ] Automated reporting

### Phase 4: Team Features
- [ ] Multi-user analytics
- [ ] Department/team comparisons
- [ ] Custom KPI tracking
- [ ] Goal setting and monitoring

## API Integration Notes

### Twitter Analytics
```javascript
// Requires Twitter API v2 with analytics scope
const metrics = await twitterClient.tweets.findTweetById(tweetId, {
  'tweet.fields': 'public_metrics'
});
// Returns: retweet_count, reply_count, like_count, quote_count
```

### LinkedIn Analytics
```javascript
// Requires LinkedIn Marketing Developer Platform access
// Limited to company pages, not personal profiles
const insights = await linkedinClient.organizationalEntityShareStatistics();
```

### Facebook/Instagram Insights
```javascript
// Requires Facebook Graph API with insights permission
const insights = await fb.api(`/${postId}/insights`, {
  metric: 'post_impressions,post_engaged_users,post_clicks'
});
```

## Testing

### Generate Sample Data
```javascript
// For testing without real platform data
await analyticsService.generateSampleAnalytics();
```

### Sample Data Structure
The system includes a sample data generator that creates:
- 20 sample posts across 30 days
- Random engagement metrics
- Platform distribution
- Time-based patterns

## Troubleshooting

### Common Issues

1. **Charts not displaying**
   - Check if Chart.js loaded from CDN
   - Verify canvas elements exist in DOM
   - Check browser console for errors

2. **No data showing**
   - Verify database has analytics records
   - Check date range filters
   - Run sample data generator

3. **Export not working**
   - Check file system permissions
   - Verify CSV generation logic
   - Test with smaller date ranges

## Performance Considerations

- **Data aggregation**: Performed in backend to reduce frontend load
- **Chart rendering**: Limited to 90 days max to prevent browser lag
- **Caching**: Consider implementing for frequently accessed metrics
- **Pagination**: Top posts limited to 10 items by default

## Security Notes

- Analytics data stored locally in SQLite database
- No sensitive user data exposed in exports
- Platform tokens never included in analytics
- Rate limiting implemented to prevent API abuse

---

*Last Updated: January 18, 2025*
