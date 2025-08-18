// Hashtag Research & Suggestion Tool
class HashtagResearcher {
  constructor() {
    // Popular hashtags by category (2025 trending)
    this.trendingHashtags = {
      general: [
        '#MondayMotivation', '#TuesdayThoughts', '#WednesdayWisdom',
        '#ThursdayThoughts', '#FridayFeeling', '#WeekendVibes',
        '#DailyInspiration', '#MotivationalQuotes', '#Success',
        '#Entrepreneur', '#Business', '#Marketing', '#Innovation'
      ],
      tech: [
        '#AI', '#ArtificialIntelligence', '#MachineLearning',
        '#Tech', '#Technology', '#Coding', '#Programming',
        '#WebDevelopment', '#JavaScript', '#Python', '#DataScience',
        '#CloudComputing', '#Cybersecurity', '#Blockchain', '#Web3'
      ],
      social: [
        '#Community', '#SocialMedia', '#ContentCreator',
        '#DigitalMarketing', '#SocialMediaMarketing', '#Influencer',
        '#Brand', '#Branding', '#Creative', '#Content',
        '#Engagement', '#Growth', '#Strategy'
      ],
      business: [
        '#SmallBusiness', '#Startup', '#Entrepreneurship',
        '#Leadership', '#Management', '#Productivity',
        '#Sales', '#CustomerService', '#B2B', '#B2C',
        '#ROI', '#KPI', '#Analytics', '#Growth'
      ],
      lifestyle: [
        '#Lifestyle', '#Health', '#Wellness', '#Fitness',
        '#Travel', '#Food', '#Fashion', '#Beauty',
        '#Photography', '#Art', '#Design', '#Creative',
        '#Mindfulness', '#SelfCare', '#PersonalGrowth'
      ]
    };

    // Platform-specific hashtag limits
    this.platformLimits = {
      twitter: { max: 10, optimal: 2-3, chars: true },
      instagram: { max: 30, optimal: 10-15, chars: true },
      linkedin: { max: 5, optimal: 3-5, chars: true },
      facebook: { max: 10, optimal: 3-5, chars: true },
      mastodon: { max: null, optimal: 3-5, chars: true }
    };

    // Hashtag performance database (simulated)
    this.hashtagPerformance = new Map();
    this.initializePerformanceData();
  }

  // Initialize with sample performance data
  initializePerformanceData() {
    // Simulated engagement rates for popular hashtags
    const performanceData = {
      '#AI': { engagement: 8.5, reach: 'high', competition: 'high' },
      '#Tech': { engagement: 7.2, reach: 'high', competition: 'high' },
      '#Startup': { engagement: 6.8, reach: 'medium', competition: 'medium' },
      '#MondayMotivation': { engagement: 9.1, reach: 'very high', competition: 'very high' },
      '#SmallBusiness': { engagement: 7.5, reach: 'medium', competition: 'low' },
      '#Innovation': { engagement: 6.5, reach: 'medium', competition: 'medium' },
      '#Marketing': { engagement: 7.8, reach: 'high', competition: 'high' },
      '#Coding': { engagement: 5.9, reach: 'medium', competition: 'low' },
      '#Design': { engagement: 8.2, reach: 'high', competition: 'medium' },
      '#Wellness': { engagement: 7.9, reach: 'high', competition: 'medium' }
    };

    Object.entries(performanceData).forEach(([tag, data]) => {
      this.hashtagPerformance.set(tag.toLowerCase(), data);
    });
  }

  // Analyze text and suggest hashtags
  async analyzeAndSuggest(text, platform = 'twitter', options = {}) {
    const analysis = {
      content: text,
      platform: platform,
      categories: this.detectCategories(text),
      keywords: this.extractKeywords(text),
      suggestions: [],
      existing: this.extractExistingHashtags(text),
      stats: {}
    };

    // Get suggestions based on content
    analysis.suggestions = this.generateSuggestions(
      analysis.keywords,
      analysis.categories,
      platform,
      options
    );

    // Calculate stats
    analysis.stats = this.calculateStats(
      analysis.suggestions,
      analysis.existing,
      platform
    );

    return analysis;
  }

  // Detect content categories
  detectCategories(text) {
    const categories = [];
    const lowerText = text.toLowerCase();

    // Category keywords
    const categoryKeywords = {
      tech: ['tech', 'ai', 'code', 'software', 'app', 'digital', 'data', 'computer'],
      business: ['business', 'startup', 'entrepreneur', 'company', 'market', 'sales', 'customer'],
      social: ['social', 'media', 'content', 'post', 'share', 'engage', 'follow'],
      lifestyle: ['life', 'health', 'wellness', 'travel', 'food', 'fitness', 'style']
    };

    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        categories.push(category);
      }
    });

    return categories.length > 0 ? categories : ['general'];
  }

  // Extract keywords from text
  extractKeywords(text) {
    // Remove URLs and existing hashtags
    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/#\w+/g, '')
      .toLowerCase();

    // Common words to ignore
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might'
    ]);

    // Extract words
    const words = cleanText
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Count word frequency
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Sort by frequency and return top keywords
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  // Extract existing hashtags from text
  extractExistingHashtags(text) {
    const hashtagRegex = /#\w+/g;
    const hashtags = text.match(hashtagRegex) || [];
    return hashtags.map(tag => tag.toLowerCase());
  }

  // Generate hashtag suggestions
  generateSuggestions(keywords, categories, platform, options) {
    const suggestions = [];
    const limit = this.platformLimits[platform];
    const targetCount = options.count || limit.optimal || 5;

    // Add category-based hashtags
    categories.forEach(category => {
      const categoryTags = this.trendingHashtags[category] || [];
      suggestions.push(...categoryTags.slice(0, 3));
    });

    // Add keyword-based hashtags
    keywords.forEach(keyword => {
      // Check if keyword makes a good hashtag
      if (this.isGoodHashtag(keyword)) {
        suggestions.push(`#${this.capitalizeFirst(keyword)}`);
      }
    });

    // Add trending hashtags
    const trending = this.getTrendingForPlatform(platform);
    suggestions.push(...trending.slice(0, 3));

    // Remove duplicates and limit
    const unique = [...new Set(suggestions)];
    
    // Sort by performance if available
    const sorted = this.sortByPerformance(unique);
    
    return sorted.slice(0, targetCount);
  }

  // Check if keyword makes a good hashtag
  isGoodHashtag(keyword) {
    // Check length (3-20 chars is ideal)
    if (keyword.length < 3 || keyword.length > 20) return false;
    
    // Check if it's not just numbers
    if (/^\d+$/.test(keyword)) return false;
    
    // Check if it's meaningful
    const meaningfulWords = new Set([
      'tech', 'business', 'startup', 'design', 'code', 'marketing',
      'social', 'digital', 'creative', 'innovation', 'success'
    ]);
    
    return meaningfulWords.has(keyword) || keyword.length >= 5;
  }

  // Get trending hashtags for platform
  getTrendingForPlatform(platform) {
    // Platform-specific trending (simulated)
    const platformTrending = {
      twitter: ['#TwitterX', '#Trending', '#Viral', '#Thread'],
      instagram: ['#InstaGood', '#PhotoOfTheDay', '#Reels', '#IGTV'],
      linkedin: ['#LinkedInLearning', '#OpenToWork', '#Hiring', '#CareerGrowth'],
      facebook: ['#FacebookLive', '#Meta', '#Community', '#Groups'],
      mastodon: ['#Fediverse', '#OpenSource', '#Decentralized', '#Privacy']
    };

    return platformTrending[platform] || this.trendingHashtags.general;
  }

  // Sort hashtags by performance
  sortByPerformance(hashtags) {
    return hashtags.sort((a, b) => {
      const perfA = this.hashtagPerformance.get(a.toLowerCase());
      const perfB = this.hashtagPerformance.get(b.toLowerCase());
      
      if (!perfA && !perfB) return 0;
      if (!perfA) return 1;
      if (!perfB) return -1;
      
      return perfB.engagement - perfA.engagement;
    });
  }

  // Calculate hashtag stats
  calculateStats(suggestions, existing, platform) {
    const limit = this.platformLimits[platform];
    const total = suggestions.length + existing.length;
    
    return {
      suggested: suggestions.length,
      existing: existing.length,
      total: total,
      platformLimit: limit.max,
      optimal: limit.optimal,
      withinLimit: !limit.max || total <= limit.max,
      performance: this.calculateAveragePerformance(suggestions)
    };
  }

  // Calculate average performance
  calculateAveragePerformance(hashtags) {
    const performances = hashtags
      .map(tag => this.hashtagPerformance.get(tag.toLowerCase()))
      .filter(perf => perf);
    
    if (performances.length === 0) {
      return { engagement: 'unknown', reach: 'unknown' };
    }
    
    const avgEngagement = performances.reduce((sum, p) => sum + p.engagement, 0) / performances.length;
    
    return {
      engagement: avgEngagement.toFixed(1),
      reach: performances[0].reach // Use first as representative
    };
  }

  // Get hashtag performance data
  getHashtagPerformance(hashtag) {
    return this.hashtagPerformance.get(hashtag.toLowerCase()) || {
      engagement: 'unknown',
      reach: 'unknown',
      competition: 'unknown'
    };
  }

  // Research related hashtags
  getRelatedHashtags(hashtag) {
    // Simulated related hashtags
    const related = {
      '#tech': ['#technology', '#innovation', '#digital', '#software'],
      '#ai': ['#artificialintelligence', '#machinelearning', '#deeplearning', '#ml'],
      '#startup': ['#entrepreneur', '#business', '#founder', '#startuplife'],
      '#marketing': ['#digitalmarketing', '#socialmedia', '#content', '#branding']
    };
    
    const lower = hashtag.toLowerCase();
    return related[lower] || this.findSimilarHashtags(hashtag);
  }

  // Find similar hashtags
  findSimilarHashtags(hashtag) {
    const cleanTag = hashtag.replace('#', '').toLowerCase();
    const similar = [];
    
    // Search through all trending hashtags
    Object.values(this.trendingHashtags).flat().forEach(tag => {
      const clean = tag.replace('#', '').toLowerCase();
      if (clean.includes(cleanTag) || cleanTag.includes(clean)) {
        similar.push(tag);
      }
    });
    
    return similar.slice(0, 5);
  }

  // Format hashtags for platform
  formatForPlatform(hashtags, platform) {
    const limit = this.platformLimits[platform];
    const formatted = hashtags.slice(0, limit.max || hashtags.length);
    
    // Platform-specific formatting
    switch (platform) {
      case 'instagram':
        // Instagram: Can be in first comment
        return {
          inline: formatted.slice(0, 5).join(' '),
          comment: formatted.join(' ')
        };
      case 'linkedin':
        // LinkedIn: Best at the end
        return {
          inline: '\n\n' + formatted.join(' ')
        };
      default:
        // Twitter, Facebook, Mastodon: Inline
        return {
          inline: formatted.join(' ')
        };
    }
  }

  // Capitalize first letter
  capitalizeFirst(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  // Generate hashtag groups for A/B testing
  generateABTestGroups(text, platform, groupCount = 3) {
    const groups = [];
    
    for (let i = 0; i < groupCount; i++) {
      const analysis = this.analyzeAndSuggest(text, platform, {
        count: this.platformLimits[platform].optimal,
        variation: i // Use variation to get different suggestions
      });
      
      groups.push({
        id: `group_${i + 1}`,
        hashtags: analysis.suggestions,
        performance: analysis.stats.performance
      });
    }
    
    return groups;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HashtagResearcher;
}