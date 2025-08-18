// Content Enhancement UI - Integrates all content tools into the composer
class ContentEnhancementUI {
  constructor() {
    this.linkShortener = null;
    this.hashtagEngine = null;
    this.trendingTopics = null;
    this.contentAI = null;
    this.abTesting = null;
    this.initialized = false;
  }

  async init() {
    try {
      // Load all content enhancement modules
      if (typeof LinkShortener !== 'undefined') {
        this.linkShortener = new LinkShortener();
      }
      
      if (typeof HashtagSuggestionEngine !== 'undefined') {
        this.hashtagEngine = new HashtagSuggestionEngine();
      }
      
      if (typeof TrendingTopicsFetcher !== 'undefined') {
        this.trendingTopics = new TrendingTopicsFetcher();
      }
      
      if (typeof ContentAIAssistant !== 'undefined') {
        this.contentAI = new ContentAIAssistant();
      }
      
      if (typeof ABTestingFramework !== 'undefined') {
        this.abTesting = new ABTestingFramework(window.bufferKillerDB);
      }
      
      this.initialized = true;
      this.attachEventListeners();
      this.createUI();
      
      console.log('Content Enhancement UI initialized');
    } catch (error) {
      console.error('Failed to initialize Content Enhancement UI:', error);
    }
  }

  createUI() {
    // Add content tools panel to composer
    const composer = document.querySelector('.post-composer') || document.querySelector('.composer');
    if (!composer) return;

    // Create enhancement tools container
    const toolsContainer = document.createElement('div');
    toolsContainer.id = 'content-enhancement-tools';
    toolsContainer.className = 'content-tools-panel';
    toolsContainer.innerHTML = `
      <div class="tools-header" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: var(--dark-surface);
        border-radius: 8px;
        margin: 15px 0;
      ">
        <h3 style="margin: 0; font-size: 1rem; color: var(--light-text);">
          ✨ Content Enhancement Tools
        </h3>
        <button id="toggle-tools" class="btn btn-small" style="
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        ">
          Show Tools
        </button>
      </div>
      
      <div id="tools-content" class="tools-content" style="
        display: none;
        background: var(--dark-surface);
        border-radius: 8px;
        padding: 20px;
        margin-top: 10px;
      ">
        <!-- Link Shortener -->
        <div class="tool-section" style="margin-bottom: 20px;">
          <h4 style="color: var(--light-text); margin-bottom: 10px;">
            🔗 Link Shortener
          </h4>
          <div style="display: flex; gap: 10px;">
            <input type="url" id="url-to-shorten" placeholder="Enter URL to shorten" style="
              flex: 1;
              padding: 8px;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
            ">
            <select id="shortener-service" style="
              padding: 8px;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
            ">
              <option value="isgd">is.gd (Free)</option>
              <option value="vgd">v.gd (Free)</option>
              <option value="bitly">Bitly (API Key)</option>
              <option value="tinyurl">TinyURL (API Key)</option>
            </select>
            <button id="shorten-url-btn" class="btn btn-primary">Shorten</button>
          </div>
          <div id="shortened-url-result" style="
            margin-top: 10px;
            padding: 10px;
            background: var(--dark-bg);
            border-radius: 4px;
            display: none;
          "></div>
        </div>

        <!-- Hashtag Suggestions -->
        <div class="tool-section" style="margin-bottom: 20px;">
          <h4 style="color: var(--light-text); margin-bottom: 10px;">
            #️⃣ Hashtag Suggestions
          </h4>
          <button id="suggest-hashtags-btn" class="btn btn-secondary" style="margin-bottom: 10px;">
            Generate Hashtags from Content
          </button>
          <div id="hashtag-suggestions" style="
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          "></div>
        </div>

        <!-- Trending Topics -->
        <div class="tool-section" style="margin-bottom: 20px;">
          <h4 style="color: var(--light-text); margin-bottom: 10px;">
            📈 Trending Topics
          </h4>
          <select id="trending-platform" style="
            padding: 8px;
            background: var(--dark-bg);
            color: var(--light-text);
            border: 1px solid var(--dark-border);
            border-radius: 4px;
            margin-right: 10px;
          ">
            <option value="all">All Platforms</option>
            <option value="twitter">Twitter</option>
            <option value="linkedin">LinkedIn</option>
            <option value="general">General Web</option>
          </select>
          <button id="fetch-trending-btn" class="btn btn-secondary">Fetch Trending</button>
          <div id="trending-topics-list" style="
            margin-top: 10px;
            max-height: 200px;
            overflow-y: auto;
          "></div>
        </div>

        <!-- AI Content Assistant -->
        <div class="tool-section" style="margin-bottom: 20px;">
          <h4 style="color: var(--light-text); margin-bottom: 10px;">
            🤖 AI Assistant
          </h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <button class="ai-action-btn btn btn-secondary" data-action="improve">
              ✨ Improve Writing
            </button>
            <button class="ai-action-btn btn btn-secondary" data-action="shorten">
              ✂️ Make Shorter
            </button>
            <button class="ai-action-btn btn btn-secondary" data-action="expand">
              📝 Make Longer
            </button>
            <button class="ai-action-btn btn btn-secondary" data-action="emoji">
              😊 Add Emojis
            </button>
            <button class="ai-action-btn btn btn-secondary" data-action="professional">
              👔 Professional Tone
            </button>
            <button class="ai-action-btn btn btn-secondary" data-action="casual">
              😎 Casual Tone
            </button>
          </div>
        </div>

        <!-- A/B Testing -->
        <div class="tool-section">
          <h4 style="color: var(--light-text); margin-bottom: 10px;">
            🧪 A/B Testing
          </h4>
          <button id="create-ab-test-btn" class="btn btn-primary" style="margin-bottom: 10px;">
            Create A/B Test Variants
          </button>
          <div id="ab-test-variants" style="display: none;">
            <div id="variants-list"></div>
            <button id="start-ab-test-btn" class="btn btn-success" style="
              background: var(--success-color);
              color: white;
              margin-top: 10px;
            ">
              Start A/B Test
            </button>
          </div>
        </div>
      </div>
    `;

    // Insert after the media controls
    const mediaControls = composer.querySelector('[style*="border-top"]');
    if (mediaControls) {
      mediaControls.parentNode.insertBefore(toolsContainer, mediaControls.nextSibling);
    } else {
      composer.appendChild(toolsContainer);
    }
  }

  attachEventListeners() {
    // Toggle tools panel
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'toggle-tools') {
        const content = document.getElementById('tools-content');
        const btn = e.target;
        if (content.style.display === 'none') {
          content.style.display = 'block';
          btn.textContent = 'Hide Tools';
        } else {
          content.style.display = 'none';
          btn.textContent = 'Show Tools';
        }
      }

      // Link shortener
      if (e.target.id === 'shorten-url-btn') {
        await this.shortenURL();
      }

      // Hashtag suggestions
      if (e.target.id === 'suggest-hashtags-btn') {
        await this.suggestHashtags();
      }

      // Trending topics
      if (e.target.id === 'fetch-trending-btn') {
        await this.fetchTrending();
      }

      // AI actions
      if (e.target.classList.contains('ai-action-btn')) {
        const action = e.target.dataset.action;
        await this.applyAIAction(action);
      }

      // A/B testing
      if (e.target.id === 'create-ab-test-btn') {
        await this.createABTestVariants();
      }

      if (e.target.id === 'start-ab-test-btn') {
        await this.startABTest();
      }

      // Hashtag click to add
      if (e.target.classList.contains('hashtag-suggestion')) {
        this.addHashtagToContent(e.target.textContent);
      }

      // Trending topic click to add
      if (e.target.classList.contains('trending-topic-item')) {
        this.addTopicToContent(e.target.dataset.topic);
      }
    });
  }

  async shortenURL() {
    const urlInput = document.getElementById('url-to-shorten');
    const service = document.getElementById('shortener-service').value;
    const resultDiv = document.getElementById('shortened-url-result');
    
    if (!urlInput.value) {
      this.showNotification('Please enter a URL to shorten', 'warning');
      return;
    }

    try {
      this.showNotification('Shortening URL...', 'info');
      
      // Check if API key is needed
      let options = {};
      if (service === 'bitly' || service === 'tinyurl') {
        const apiKey = await this.promptForAPIKey(service);
        if (!apiKey) return;
        options.apiKey = apiKey;
      }

      const shortUrl = await this.linkShortener.shortenUrl(urlInput.value, service, options);
      
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--success-color);">✅ Shortened URL:</span>
          <code style="background: var(--dark-surface); padding: 5px; border-radius: 4px;">
            ${shortUrl}
          </code>
          <button onclick="navigator.clipboard.writeText('${shortUrl}')" class="btn btn-small">
            📋 Copy
          </button>
        </div>
      `;
      
      this.showNotification('URL shortened successfully!', 'success');
      
      // Auto-insert into content
      const postContent = document.getElementById('post-content');
      if (postContent && postContent.value.includes(urlInput.value)) {
        postContent.value = postContent.value.replace(urlInput.value, shortUrl);
        this.showNotification('URL replaced in post content', 'success');
      }
      
    } catch (error) {
      this.showNotification(`Failed to shorten URL: ${error.message}`, 'error');
    }
  }

  async suggestHashtags() {
    const postContent = document.getElementById('post-content');
    if (!postContent || !postContent.value) {
      this.showNotification('Please enter some content first', 'warning');
      return;
    }

    try {
      this.showNotification('Generating hashtag suggestions...', 'info');
      
      const suggestions = await this.hashtagEngine.suggestHashtags(postContent.value);
      const container = document.getElementById('hashtag-suggestions');
      
      container.innerHTML = suggestions.map(tag => `
        <span class="hashtag-suggestion" style="
          background: var(--primary-color);
          color: white;
          padding: 5px 10px;
          border-radius: 15px;
          cursor: pointer;
          font-size: 0.9rem;
        ">${tag}</span>
      `).join('');
      
      this.showNotification(`Generated ${suggestions.length} hashtag suggestions`, 'success');
    } catch (error) {
      this.showNotification('Failed to generate hashtags', 'error');
    }
  }

  async fetchTrending() {
    const platform = document.getElementById('trending-platform').value;
    const container = document.getElementById('trending-topics-list');
    
    try {
      this.showNotification('Fetching trending topics...', 'info');
      
      const topics = await this.trendingTopics.fetchTrending(platform);
      
      container.innerHTML = topics.map(topic => `
        <div class="trending-topic-item" data-topic="${topic.name}" style="
          padding: 8px;
          margin: 5px 0;
          background: var(--dark-bg);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
        ">
          <span>${topic.name}</span>
          <span style="color: var(--muted-text); font-size: 0.85rem;">
            ${topic.volume ? `${topic.volume} posts` : ''}
          </span>
        </div>
      `).join('');
      
      this.showNotification(`Found ${topics.length} trending topics`, 'success');
    } catch (error) {
      this.showNotification('Failed to fetch trending topics', 'error');
    }
  }

  async applyAIAction(action) {
    const postContent = document.getElementById('post-content');
    if (!postContent || !postContent.value) {
      this.showNotification('Please enter some content first', 'warning');
      return;
    }

    try {
      this.showNotification(`Applying ${action} transformation...`, 'info');
      
      let result;
      switch (action) {
        case 'improve':
          result = await this.contentAI.improveWriting(postContent.value);
          break;
        case 'shorten':
          result = await this.contentAI.makeShort(postContent.value);
          break;
        case 'expand':
          result = await this.contentAI.makeLonger(postContent.value);
          break;
        case 'emoji':
          result = await this.contentAI.addEmojis(postContent.value);
          break;
        case 'professional':
          result = await this.contentAI.makeProfessional(postContent.value);
          break;
        case 'casual':
          result = await this.contentAI.makeCasual(postContent.value);
          break;
      }
      
      if (result) {
        postContent.value = result;
        this.showNotification('Content enhanced successfully!', 'success');
        
        // Update character count
        const event = new Event('input', { bubbles: true });
        postContent.dispatchEvent(event);
      }
    } catch (error) {
      this.showNotification(`Failed to apply ${action}`, 'error');
    }
  }

  async createABTestVariants() {
    const postContent = document.getElementById('post-content');
    if (!postContent || !postContent.value) {
      this.showNotification('Please enter some content first', 'warning');
      return;
    }

    try {
      this.showNotification('Creating A/B test variants...', 'info');
      
      // Create test
      const test = await this.abTesting.createTest({
        name: `Test ${new Date().toLocaleDateString()}`,
        platform: Array.from(selectedPlatforms)[0] || 'twitter'
      });
      
      // Generate variants
      const variants = await this.abTesting.generateVariants({
        content: postContent.value
      }, 4);
      
      // Add original as control
      await this.abTesting.addVariant(test.id, {
        name: 'Original (Control)',
        content: postContent.value,
        weight: 20
      });
      
      // Add generated variants
      for (const variant of variants) {
        await this.abTesting.addVariant(test.id, variant);
      }
      
      // Display variants
      const variantsDiv = document.getElementById('ab-test-variants');
      const listDiv = document.getElementById('variants-list');
      
      variantsDiv.style.display = 'block';
      listDiv.innerHTML = test.variants.map((v, i) => `
        <div style="
          padding: 10px;
          margin: 10px 0;
          background: var(--dark-bg);
          border-radius: 6px;
          border-left: 4px solid ${i === 0 ? 'var(--warning-color)' : 'var(--primary-color)'};
        ">
          <h5 style="margin: 0 0 5px 0; color: var(--light-text);">
            ${v.name} ${i === 0 ? '(Control)' : ''}
          </h5>
          <p style="margin: 5px 0; color: var(--muted-text); font-size: 0.9rem;">
            ${v.content}
          </p>
          ${v.hypothesis ? `
            <p style="margin: 5px 0; color: var(--muted-text); font-size: 0.85rem; font-style: italic;">
              💡 ${v.hypothesis}
            </p>
          ` : ''}
        </div>
      `).join('');
      
      // Store test ID for starting
      variantsDiv.dataset.testId = test.id;
      
      this.showNotification('A/B test variants created!', 'success');
    } catch (error) {
      this.showNotification('Failed to create variants', 'error');
    }
  }

  async startABTest() {
    const variantsDiv = document.getElementById('ab-test-variants');
    const testId = variantsDiv.dataset.testId;
    
    if (!testId) {
      this.showNotification('No test to start', 'warning');
      return;
    }

    try {
      const test = await this.abTesting.startTest(testId);
      const posts = await this.abTesting.scheduleVariants(test);
      
      // Schedule all variant posts
      for (const post of posts) {
        // Use existing scheduling system
        await window.bufferKillerAPI.schedulePost({
          content: post.content,
          platforms: [post.platform],
          scheduledTime: post.scheduled_time,
          metadata: {
            ab_test_id: post.test_id,
            variant_id: post.variant_id
          }
        });
      }
      
      this.showNotification(`A/B test started with ${posts.length} variants!`, 'success');
      
      // Clear UI
      variantsDiv.style.display = 'none';
      document.getElementById('post-content').value = '';
      
    } catch (error) {
      this.showNotification('Failed to start A/B test', 'error');
    }
  }

  addHashtagToContent(hashtag) {
    const postContent = document.getElementById('post-content');
    if (postContent) {
      // Add hashtag at the end if not already present
      if (!postContent.value.includes(hashtag)) {
        postContent.value = postContent.value.trim() + ' ' + hashtag;
        
        // Update character count
        const event = new Event('input', { bubbles: true });
        postContent.dispatchEvent(event);
        
        this.showNotification(`Added ${hashtag}`, 'success');
      }
    }
  }

  addTopicToContent(topic) {
    const postContent = document.getElementById('post-content');
    if (postContent) {
      // Add topic as hashtag or mention
      const hashtag = topic.startsWith('#') ? topic : `#${topic.replace(/\s+/g, '')}`;
      this.addHashtagToContent(hashtag);
    }
  }

  async promptForAPIKey(service) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal active';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h2>Enter ${service} API Key</h2>
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <p>This service requires an API key. Enter it below or switch to a free service.</p>
            <input type="password" id="api-key-input" placeholder="API Key" style="
              width: 100%;
              padding: 10px;
              margin: 10px 0;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
            ">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                Cancel
              </button>
              <button class="btn btn-primary" id="confirm-api-key">
                Continue
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      document.getElementById('confirm-api-key').addEventListener('click', () => {
        const apiKey = document.getElementById('api-key-input').value;
        modal.remove();
        resolve(apiKey);
      });
    });
  }

  showNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
}

// Initialize when ready
const contentEnhancementUI = new ContentEnhancementUI();

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentEnhancementUI.init();
  });
} else {
  contentEnhancementUI.init();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentEnhancementUI;
}