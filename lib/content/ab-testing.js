// A/B Testing Framework for Social Media Posts
class ABTestingFramework {
  constructor(db) {
    this.db = db;
    this.activeTests = new Map();
    this.testResults = new Map();
  }

  // Create a new A/B test
  async createTest(config) {
    const test = {
      id: `test-${Date.now()}`,
      name: config.name,
      platform: config.platform,
      status: 'draft',
      created_at: new Date().toISOString(),
      variants: [],
      metrics: config.metrics || ['engagement', 'clicks', 'impressions'],
      duration: config.duration || 24 * 60 * 60 * 1000, // 24 hours default
      sample_size: config.sample_size || 100,
      confidence_level: config.confidence_level || 0.95
    };

    // Store in database
    await this.db.saveABTest(test);
    this.activeTests.set(test.id, test);
    
    return test;
  }

  // Add variant to test
  async addVariant(testId, variant) {
    const test = this.activeTests.get(testId);
    if (!test) throw new Error('Test not found');

    const variantData = {
      id: `variant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: variant.name || `Variant ${test.variants.length + 1}`,
      content: variant.content,
      media: variant.media || null,
      hashtags: variant.hashtags || [],
      posting_time: variant.posting_time || null,
      weight: variant.weight || 50, // Default 50% split
      metrics: {
        impressions: 0,
        engagements: 0,
        clicks: 0,
        shares: 0,
        comments: 0,
        conversion_rate: 0
      }
    };

    test.variants.push(variantData);
    await this.db.updateABTest(test);
    
    return variantData;
  }

  // Generate variant suggestions using AI
  async generateVariants(originalPost, count = 3) {
    const variants = [];
    
    // Variant 1: Different hashtags
    variants.push({
      name: 'Hashtag Variation',
      content: originalPost.content,
      changes: ['hashtags'],
      hashtags: await this.generateAlternativeHashtags(originalPost.content),
      hypothesis: 'Different hashtags may reach different audiences'
    });

    // Variant 2: Different tone
    variants.push({
      name: 'Tone Variation',
      content: await this.rewriteWithDifferentTone(originalPost.content),
      changes: ['tone', 'wording'],
      hypothesis: 'A more casual/formal tone may perform better'
    });

    // Variant 3: Different CTA
    variants.push({
      name: 'CTA Variation',
      content: await this.rewriteWithStrongerCTA(originalPost.content),
      changes: ['call-to-action'],
      hypothesis: 'A stronger call-to-action may drive more engagement'
    });

    // Variant 4: Emoji variation
    if (count > 3) {
      variants.push({
        name: 'Emoji Variation',
        content: await this.addEmojis(originalPost.content),
        changes: ['emojis'],
        hypothesis: 'Emojis may increase engagement and visibility'
      });
    }

    // Variant 5: Question format
    if (count > 4) {
      variants.push({
        name: 'Question Format',
        content: await this.convertToQuestion(originalPost.content),
        changes: ['format'],
        hypothesis: 'Questions may drive more comments and engagement'
      });
    }

    return variants.slice(0, count);
  }

  // Helper functions for variant generation
  async generateAlternativeHashtags(content) {
    // Extract topics from content
    const topics = this.extractTopics(content);
    const hashtags = [];
    
    // Common variations
    const variations = {
      'marketing': ['digitalmarketing', 'marketingtips', 'marketingstrategy'],
      'business': ['smallbusiness', 'entrepreneur', 'startup'],
      'tech': ['technology', 'innovation', 'techtrends'],
      'social': ['socialmedia', 'socialmarketing', 'socialmediatips'],
      'content': ['contentcreation', 'contentmarketing', 'contentstrategy']
    };

    topics.forEach(topic => {
      const topicLower = topic.toLowerCase();
      if (variations[topicLower]) {
        hashtags.push(...variations[topicLower].slice(0, 2));
      } else {
        hashtags.push(topicLower);
      }
    });

    return hashtags.map(h => `#${h}`);
  }

  async rewriteWithDifferentTone(content) {
    // Simple tone variations
    const casual = content
      .replace(/We are pleased to announce/gi, "Hey! Guess what?")
      .replace(/It is important to note/gi, "Just so you know")
      .replace(/Furthermore/gi, "Plus")
      .replace(/However/gi, "But")
      .replace(/Therefore/gi, "So");
    
    return casual;
  }

  async rewriteWithStrongerCTA(content) {
    const ctas = [
      "👉 Click the link in bio!",
      "🔗 Learn more at the link!",
      "💬 Drop a comment below!",
      "❤️ Double tap if you agree!",
      "🔄 Share this with someone who needs it!",
      "📧 Sign up for updates!",
      "🎯 Take action today!"
    ];
    
    // Add CTA if not present
    if (!content.match(/click|link|comment|share|sign up|learn more/i)) {
      const randomCTA = ctas[Math.floor(Math.random() * ctas.length)];
      return `${content}\n\n${randomCTA}`;
    }
    
    return content;
  }

  async addEmojis(content) {
    const emojiMap = {
      'happy': '😊',
      'excited': '🎉',
      'love': '❤️',
      'new': '✨',
      'important': '⚠️',
      'tip': '💡',
      'money': '💰',
      'growth': '📈',
      'success': '🏆',
      'team': '👥',
      'work': '💼',
      'idea': '💡'
    };

    let result = content;
    Object.keys(emojiMap).forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, `${word} ${emojiMap[word]}`);
    });

    return result;
  }

  async convertToQuestion(content) {
    // Convert statements to questions
    if (content.startsWith("We")) {
      return content.replace(/^We /, "Have you ") + "?";
    }
    if (content.includes(" is ")) {
      return "Did you know " + content.toLowerCase() + "?";
    }
    return "What do you think? " + content;
  }

  extractTopics(content) {
    // Simple topic extraction
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    return words
      .filter(word => word.length > 4 && !commonWords.has(word))
      .slice(0, 5);
  }

  // Start an A/B test
  async startTest(testId) {
    const test = this.activeTests.get(testId);
    if (!test) throw new Error('Test not found');
    
    test.status = 'running';
    test.started_at = new Date().toISOString();
    test.end_at = new Date(Date.now() + test.duration).toISOString();
    
    await this.db.updateABTest(test);
    
    // Schedule variant posts
    await this.scheduleVariants(test);
    
    return test;
  }

  // Schedule variant posts
  async scheduleVariants(test) {
    const posts = [];
    
    for (const variant of test.variants) {
      const post = {
        content: variant.content,
        variant_id: variant.id,
        test_id: test.id,
        platform: test.platform,
        scheduled_time: variant.posting_time || new Date().toISOString(),
        hashtags: variant.hashtags,
        media: variant.media
      };
      
      posts.push(post);
    }
    
    // Return posts to be scheduled
    return posts;
  }

  // Track metrics for a variant
  async trackMetric(testId, variantId, metric, value = 1) {
    const test = this.activeTests.get(testId);
    if (!test) return;
    
    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) return;
    
    // Update metric
    if (variant.metrics[metric] !== undefined) {
      variant.metrics[metric] += value;
    }
    
    // Calculate conversion rate
    if (variant.metrics.impressions > 0) {
      variant.metrics.conversion_rate = 
        (variant.metrics.engagements / variant.metrics.impressions) * 100;
    }
    
    await this.db.updateABTest(test);
  }

  // Analyze test results
  async analyzeResults(testId) {
    const test = this.activeTests.get(testId);
    if (!test) throw new Error('Test not found');
    
    const analysis = {
      test_id: testId,
      test_name: test.name,
      duration: test.duration,
      total_impressions: 0,
      total_engagements: 0,
      variants: [],
      winner: null,
      confidence: 0,
      insights: []
    };
    
    // Calculate totals and analyze each variant
    test.variants.forEach(variant => {
      analysis.total_impressions += variant.metrics.impressions;
      analysis.total_engagements += variant.metrics.engagements;
      
      analysis.variants.push({
        id: variant.id,
        name: variant.name,
        metrics: variant.metrics,
        performance_score: this.calculatePerformanceScore(variant.metrics)
      });
    });
    
    // Determine winner
    if (analysis.variants.length > 1) {
      analysis.variants.sort((a, b) => b.performance_score - a.performance_score);
      analysis.winner = analysis.variants[0];
      
      // Calculate statistical significance
      analysis.confidence = this.calculateStatisticalSignificance(
        analysis.variants[0],
        analysis.variants[1]
      );
    }
    
    // Generate insights
    analysis.insights = this.generateInsights(test, analysis);
    
    return analysis;
  }

  calculatePerformanceScore(metrics) {
    // Weighted score based on different metrics
    const weights = {
      engagement_rate: 0.4,
      click_rate: 0.3,
      share_rate: 0.2,
      comment_rate: 0.1
    };
    
    const rates = {
      engagement_rate: metrics.impressions > 0 ? metrics.engagements / metrics.impressions : 0,
      click_rate: metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0,
      share_rate: metrics.engagements > 0 ? metrics.shares / metrics.engagements : 0,
      comment_rate: metrics.engagements > 0 ? metrics.comments / metrics.engagements : 0
    };
    
    let score = 0;
    Object.keys(weights).forEach(key => {
      score += rates[key] * weights[key] * 100;
    });
    
    return score;
  }

  calculateStatisticalSignificance(variant1, variant2) {
    // Simplified confidence calculation
    const n1 = variant1.metrics.impressions;
    const n2 = variant2.metrics.impressions;
    const p1 = variant1.metrics.conversion_rate / 100;
    const p2 = variant2.metrics.conversion_rate / 100;
    
    if (n1 < 30 || n2 < 30) {
      return 0; // Not enough data
    }
    
    // Z-score calculation
    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    const z = Math.abs(p1 - p2) / se;
    
    // Convert to confidence percentage
    if (z > 2.58) return 99; // 99% confidence
    if (z > 1.96) return 95; // 95% confidence
    if (z > 1.64) return 90; // 90% confidence
    return Math.round(z * 40); // Below 90%
  }

  generateInsights(test, analysis) {
    const insights = [];
    
    if (analysis.winner) {
      insights.push({
        type: 'winner',
        message: `${analysis.winner.name} performed ${Math.round(
          (analysis.winner.performance_score / analysis.variants[1].performance_score - 1) * 100
        )}% better than the next best variant`
      });
    }
    
    // Time-based insights
    if (test.variants.some(v => v.posting_time)) {
      insights.push({
        type: 'timing',
        message: 'Testing different posting times showed variations in engagement'
      });
    }
    
    // Hashtag insights
    const hashtagVariants = test.variants.filter(v => v.hashtags && v.hashtags.length > 0);
    if (hashtagVariants.length > 0) {
      insights.push({
        type: 'hashtags',
        message: `Posts with hashtags had ${
          Math.round(hashtagVariants[0].metrics.conversion_rate)
        }% engagement rate`
      });
    }
    
    return insights;
  }

  // Get all active tests
  getActiveTests() {
    return Array.from(this.activeTests.values())
      .filter(test => test.status === 'running');
  }

  // Get test by ID
  getTest(testId) {
    return this.activeTests.get(testId);
  }

  // End a test
  async endTest(testId) {
    const test = this.activeTests.get(testId);
    if (!test) throw new Error('Test not found');
    
    test.status = 'completed';
    test.ended_at = new Date().toISOString();
    
    // Generate final analysis
    const results = await this.analyzeResults(testId);
    test.results = results;
    
    await this.db.updateABTest(test);
    this.testResults.set(testId, results);
    
    return results;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ABTestingFramework;
}