// Content Enhancement UI - Integrates link shortening, hashtags, and more
class ContentEnhancementUI {
  constructor() {
    this.linkShortener = null;
    this.hashtagResearcher = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Load dependencies
    if (typeof LinkShortener !== 'undefined') {
      this.linkShortener = new LinkShortener();
    }
    
    if (typeof HashtagResearcher !== 'undefined') {
      this.hashtagResearcher = new HashtagResearcher();
    }
    
    this.initialized = true;
  }

  // Create the enhancement panel UI
  createEnhancementPanel() {
    const panel = document.createElement('div');
    panel.id = 'content-enhancement-panel';
    panel.className = 'enhancement-panel';
    panel.innerHTML = `
      <div style="
        background: #2a2a2a;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        border: 1px solid #444;
      ">
        <h3 style="margin: 0 0 20px 0; color: #fff; font-size: 18px;">
          ✨ Content Enhancement Tools
        </h3>
        
        <!-- Link Shortening Section -->
        <div class="enhancement-section" style="margin-bottom: 20px;">
          <h4 style="color: #667eea; margin-bottom: 10px;">🔗 Link Shortening</h4>
          
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <select id="link-provider" style="
              padding: 8px;
              background: #1a1a1a;
              color: white;
              border: 1px solid #444;
              border-radius: 6px;
              flex: 1;
            ">
              <option value="isgd">is.gd (Free, No API)</option>
              <option value="vgd">v.gd (Free, No API)</option>
              <option value="bitly">Bitly (API Key Required)</option>
              <option value="tinyurl">TinyURL (API Key Required)</option>
            </select>
            
            <button onclick="contentEnhancer.shortenLinks()" style="
              padding: 8px 16px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            ">
              Shorten Links
            </button>
          </div>
          
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="checkbox" id="add-utm" checked>
            <label for="add-utm" style="color: #999; font-size: 14px;">
              Add UTM tracking parameters
            </label>
          </div>
          
          <div id="link-results" style="
            margin-top: 10px;
            padding: 10px;
            background: #1a1a1a;
            border-radius: 6px;
            display: none;
            font-size: 14px;
            color: #999;
          "></div>
        </div>
        
        <!-- Hashtag Suggestions Section -->
        <div class="enhancement-section" style="margin-bottom: 20px;">
          <h4 style="color: #667eea; margin-bottom: 10px;"># Hashtag Suggestions</h4>
          
          <button onclick="contentEnhancer.suggestHashtags()" style="
            padding: 8px 16px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            margin-bottom: 10px;
          ">
            Get Hashtag Suggestions
          </button>
          
          <div id="hashtag-suggestions" style="display: none;">
            <div style="
              background: #1a1a1a;
              padding: 10px;
              border-radius: 6px;
              margin-bottom: 10px;
            ">
              <div id="suggested-tags" style="
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 10px;
              "></div>
              
              <div id="hashtag-stats" style="
                font-size: 12px;
                color: #999;
                padding-top: 10px;
                border-top: 1px solid #444;
              "></div>
            </div>
            
            <button onclick="contentEnhancer.applyHashtags()" style="
              padding: 8px 16px;
              background: #28a745;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              margin-right: 10px;
            ">
              Apply Selected
            </button>
            
            <button onclick="contentEnhancer.researchMore()" style="
              padding: 8px 16px;
              background: #444;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            ">
              Research More
            </button>
          </div>
        </div>
        
        <!-- Content Analysis Section -->
        <div class="enhancement-section" style="margin-bottom: 20px;">
          <h4 style="color: #667eea; margin-bottom: 10px;">📊 Content Analysis</h4>
          
          <div id="content-analysis" style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 6px;
            font-size: 14px;
          ">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <span style="color: #999;">Readability:</span>
                <span id="readability-score" style="color: #fff; margin-left: 10px;">-</span>
              </div>
              <div>
                <span style="color: #999;">Sentiment:</span>
                <span id="sentiment-score" style="color: #fff; margin-left: 10px;">-</span>
              </div>
              <div>
                <span style="color: #999;">Keywords:</span>
                <span id="keyword-count" style="color: #fff; margin-left: 10px;">-</span>
              </div>
              <div>
                <span style="color: #999;">Emojis:</span>
                <span id="emoji-count" style="color: #fff; margin-left: 10px;">-</span>
              </div>
            </div>
            
            <button onclick="contentEnhancer.analyzeContent()" style="
              margin-top: 15px;
              padding: 8px 16px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              width: 100%;
            ">
              Analyze Content
            </button>
          </div>
        </div>
        
        <!-- Quick Enhancements -->
        <div class="enhancement-section">
          <h4 style="color: #667eea; margin-bottom: 10px;">⚡ Quick Enhancements</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button onclick="contentEnhancer.addEmojis()" style="
              padding: 8px;
              background: #444;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">
              😊 Add Emojis
            </button>
            
            <button onclick="contentEnhancer.fixCapitalization()" style="
              padding: 8px;
              background: #444;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">
              Aa Fix Caps
            </button>
            
            <button onclick="contentEnhancer.addCallToAction()" style="
              padding: 8px;
              background: #444;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">
              👉 Add CTA
            </button>
            
            <button onclick="contentEnhancer.optimizeLength()" style="
              padding: 8px;
              background: #444;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">
              ✂️ Optimize
            </button>
          </div>
        </div>
      </div>
    `;
    
    return panel;
  }

  // Shorten links in content
  async shortenLinks() {
    await this.init();
    
    const content = document.getElementById('post-content');
    if (!content || !this.linkShortener) return;
    
    const provider = document.getElementById('link-provider').value;
    const addUtm = document.getElementById('add-utm').checked;
    const text = content.value;
    
    // Find URLs in text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    
    if (!urls || urls.length === 0) {
      this.showLinkResults('No URLs found in content', 'info');
      return;
    }
    
    this.showLinkResults('Shortening links...', 'info');
    
    try {
      // Add UTM if requested
      let processedText = text;
      for (const url of urls) {
        let finalUrl = url;
        
        if (addUtm) {
          finalUrl = this.linkShortener.addUtmParameters(url, {
            source: 'buffer_killer',
            medium: 'social',
            campaign: 'social_post'
          });
        }
        
        // For free providers, shorten directly
        if (provider === 'isgd' || provider === 'vgd') {
          const shortUrl = await this.linkShortener.shortenUrl(finalUrl, provider);
          processedText = processedText.replace(url, shortUrl);
        } else {
          this.showLinkResults(`${provider} requires API key configuration`, 'warning');
          return;
        }
      }
      
      content.value = processedText;
      const saved = text.length - processedText.length;
      this.showLinkResults(`✅ Shortened ${urls.length} link(s), saved ${saved} characters`, 'success');
      
      // Update character count
      if (window.updateCharCount) {
        window.updateCharCount();
      }
    } catch (error) {
      this.showLinkResults(`Error: ${error.message}`, 'error');
    }
  }

  // Show link shortening results
  showLinkResults(message, type) {
    const results = document.getElementById('link-results');
    if (!results) return;
    
    results.style.display = 'block';
    results.style.color = type === 'error' ? '#f56565' : 
                         type === 'success' ? '#48bb78' : 
                         type === 'warning' ? '#f6ad55' : '#999';
    results.textContent = message;
    
    if (type === 'success') {
      setTimeout(() => {
        results.style.display = 'none';
      }, 5000);
    }
  }

  // Suggest hashtags
  async suggestHashtags() {
    await this.init();
    
    const content = document.getElementById('post-content');
    if (!content || !this.hashtagResearcher) return;
    
    const text = content.value;
    if (!text) {
      alert('Please enter some content first');
      return;
    }
    
    // Get selected platforms
    const selectedPlatforms = document.querySelectorAll('.platform.selected');
    const platform = selectedPlatforms.length > 0 ? 
                    selectedPlatforms[0].dataset.platform : 'twitter';
    
    // Analyze and get suggestions
    const analysis = await this.hashtagResearcher.analyzeAndSuggest(text, platform);
    
    // Display suggestions
    this.displayHashtagSuggestions(analysis);
  }

  // Display hashtag suggestions
  displayHashtagSuggestions(analysis) {
    const container = document.getElementById('hashtag-suggestions');
    const tagsDiv = document.getElementById('suggested-tags');
    const statsDiv = document.getElementById('hashtag-stats');
    
    if (!container || !tagsDiv || !statsDiv) return;
    
    container.style.display = 'block';
    
    // Clear previous
    tagsDiv.innerHTML = '';
    
    // Add suggested hashtags
    analysis.suggestions.forEach((tag, index) => {
      const perf = this.hashtagResearcher.getHashtagPerformance(tag);
      const tagEl = document.createElement('div');
      tagEl.style.cssText = `
        padding: 6px 12px;
        background: #667eea;
        color: white;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        position: relative;
        user-select: none;
      `;
      tagEl.textContent = tag;
      tagEl.dataset.tag = tag;
      tagEl.dataset.selected = 'true';
      
      // Add performance indicator
      if (perf.engagement !== 'unknown') {
        tagEl.title = `Engagement: ${perf.engagement}/10 | Reach: ${perf.reach}`;
      }
      
      tagEl.onclick = () => {
        const selected = tagEl.dataset.selected === 'true';
        tagEl.dataset.selected = !selected;
        tagEl.style.background = !selected ? '#667eea' : '#444';
      };
      
      tagsDiv.appendChild(tagEl);
    });
    
    // Show stats
    statsDiv.innerHTML = `
      <div>📊 Platform: ${analysis.platform}</div>
      <div>🎯 Suggested: ${analysis.suggestions.length} hashtags</div>
      <div>✅ Optimal for ${analysis.platform}: ${analysis.stats.optimal}</div>
      ${analysis.stats.performance.engagement !== 'unknown' ? 
        `<div>⚡ Avg Engagement: ${analysis.stats.performance.engagement}/10</div>` : ''}
    `;
  }

  // Apply selected hashtags
  applyHashtags() {
    const content = document.getElementById('post-content');
    if (!content) return;
    
    const selectedTags = document.querySelectorAll('#suggested-tags > div[data-selected="true"]');
    const tags = Array.from(selectedTags).map(el => el.dataset.tag);
    
    if (tags.length === 0) {
      alert('Please select at least one hashtag');
      return;
    }
    
    // Add hashtags to content
    const currentText = content.value;
    const hasNewline = currentText.endsWith('\n');
    const separator = hasNewline ? '\n' : '\n\n';
    
    content.value = currentText + separator + tags.join(' ');
    
    // Update character count
    if (window.updateCharCount) {
      window.updateCharCount();
    }
    
    // Hide suggestions
    document.getElementById('hashtag-suggestions').style.display = 'none';
  }

  // Analyze content
  analyzeContent() {
    const content = document.getElementById('post-content');
    if (!content) return;
    
    const text = content.value;
    
    // Calculate readability (simple algorithm)
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length - 1 || 1;
    const avgWordsPerSentence = words / sentences;
    const readability = avgWordsPerSentence < 15 ? 'Easy' : 
                       avgWordsPerSentence < 25 ? 'Medium' : 'Complex';
    
    // Detect sentiment (basic)
    const positiveWords = ['great', 'awesome', 'amazing', 'love', 'excellent', 'happy', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'sad', 'angry'];
    
    const positiveCount = positiveWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    const negativeCount = negativeWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    const sentiment = positiveCount > negativeCount ? 'Positive 😊' :
                     negativeCount > positiveCount ? 'Negative 😔' : 'Neutral 😐';
    
    // Count keywords
    const keywords = text.match(/\b\w{4,}\b/g) || [];
    const uniqueKeywords = new Set(keywords.map(k => k.toLowerCase()));
    
    // Count emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex) || [];
    
    // Update UI
    document.getElementById('readability-score').textContent = readability;
    document.getElementById('sentiment-score').textContent = sentiment;
    document.getElementById('keyword-count').textContent = uniqueKeywords.size;
    document.getElementById('emoji-count').textContent = emojis.length;
  }

  // Add emojis to content
  addEmojis() {
    const content = document.getElementById('post-content');
    if (!content) return;
    
    const text = content.value;
    
    // Emoji suggestions based on content
    const emojiMap = {
      'happy': '😊',
      'love': '❤️',
      'great': '👍',
      'awesome': '🎉',
      'new': '✨',
      'important': '⚡',
      'check': '✅',
      'idea': '💡',
      'work': '💼',
      'team': '👥',
      'success': '🎯',
      'launch': '🚀'
    };
    
    let enhanced = text;
    
    // Add emoji at the beginning if none exists
    if (!text.match(/^[\u{1F300}-\u{1F9FF}]/u)) {
      enhanced = '🚀 ' + enhanced;
    }
    
    // Add contextual emojis
    Object.entries(emojiMap).forEach(([word, emoji]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (text.match(regex) && !text.includes(emoji)) {
        enhanced = enhanced.replace(regex, `$& ${emoji}`);
      }
    });
    
    content.value = enhanced;
    
    if (window.updateCharCount) {
      window.updateCharCount();
    }
  }

  // Fix capitalization
  fixCapitalization() {
    const content = document.getElementById('post-content');
    if (!content) return;
    
    const text = content.value;
    
    // Capitalize first letter of sentences
    const fixed = text.replace(/(^|\. )([a-z])/g, (match, p1, p2) => {
      return p1 + p2.toUpperCase();
    });
    
    content.value = fixed;
    
    if (window.updateCharCount) {
      window.updateCharCount();
    }
  }

  // Add call to action
  addCallToAction() {
    const content = document.getElementById('post-content');
    if (!content) return;
    
    const ctas = [
      '\n\n👉 Learn more at [link]',
      '\n\n🔗 Check it out: [link]',
      '\n\n💬 What do you think? Let me know below!',
      '\n\n♻️ Share if you found this helpful!',
      '\n\n📧 Subscribe for more updates',
      '\n\n🤝 Follow for daily insights'
    ];
    
    const randomCTA = ctas[Math.floor(Math.random() * ctas.length)];
    content.value += randomCTA;
    
    if (window.updateCharCount) {
      window.updateCharCount();
    }
  }

  // Optimize content length
  optimizeLength() {
    const content = document.getElementById('post-content');
    if (!content) return;
    
    const text = content.value;
    const platforms = document.querySelectorAll('.platform.selected');
    
    if (platforms.length === 0) {
      alert('Please select a platform first');
      return;
    }
    
    const platform = platforms[0].dataset.platform;
    const limits = {
      twitter: 280,
      linkedin: 3000,
      facebook: 63206,
      instagram: 2200,
      mastodon: 500
    };
    
    const limit = limits[platform] || 280;
    
    if (text.length <= limit) {
      alert(`Content is already within ${platform} limit (${text.length}/${limit} chars)`);
      return;
    }
    
    // Truncate and add ellipsis
    const optimized = text.substring(0, limit - 3) + '...';
    content.value = optimized;
    
    if (window.updateCharCount) {
      window.updateCharCount();
    }
    
    alert(`Content optimized for ${platform} (${limit} char limit)`);
  }
}

// Create global instance
const contentEnhancer = new ContentEnhancementUI();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentEnhancementUI;
}