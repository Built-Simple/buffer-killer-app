// Word Counter Plugin - Example plugin for Buffer Killer
class WordCounterPlugin {
  constructor(api) {
    this.api = api;
    this.name = 'Word Counter';
    this.statsElement = null;
    this.enabled = true;
  }

  async onLoad() {
    console.log('Word Counter Plugin loaded!');
    
    // Add statistics panel to composer
    this.addStatsPanel();
    
    // Listen for text changes
    this.attachListeners();
    
    // Load saved preferences
    const prefs = await this.api.storage.get('word-counter-prefs');
    if (prefs) {
      this.preferences = JSON.parse(prefs);
    } else {
      this.preferences = {
        showReadingTime: true,
        showSentences: true,
        showParagraphs: true,
        position: 'bottom'
      };
    }
  }

  addStatsPanel() {
    // Find the composer
    const composer = document.querySelector('.post-composer, .composer');
    if (!composer) {
      console.warn('Composer not found');
      return;
    }

    // Create stats panel
    const statsPanel = document.createElement('div');
    statsPanel.id = 'word-counter-stats';
    statsPanel.style.cssText = `
      background: var(--dark-surface);
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      color: var(--muted-text);
      border: 1px solid var(--dark-border);
    `;
    
    statsPanel.innerHTML = `
      <div style="display: flex; gap: 20px;">
        <span id="word-count-stat">
          <strong>Words:</strong> <span class="count">0</span>
        </span>
        <span id="char-count-stat">
          <strong>Characters:</strong> <span class="count">0</span>
        </span>
        <span id="reading-time-stat">
          <strong>Reading time:</strong> <span class="count">0s</span>
        </span>
        <span id="sentence-count-stat">
          <strong>Sentences:</strong> <span class="count">0</span>
        </span>
      </div>
      <button id="word-counter-settings" style="
        background: none;
        border: none;
        color: var(--muted-text);
        cursor: pointer;
        padding: 4px;
      " title="Word Counter Settings">
        ⚙️
      </button>
    `;

    // Insert after textarea
    const textarea = composer.querySelector('textarea');
    if (textarea && textarea.parentNode) {
      textarea.parentNode.insertBefore(statsPanel, textarea.nextSibling);
    } else {
      composer.appendChild(statsPanel);
    }

    this.statsElement = statsPanel;

    // Add settings button handler
    document.getElementById('word-counter-settings').addEventListener('click', () => {
      this.showSettings();
    });
  }

  attachListeners() {
    const textarea = document.querySelector('#post-content');
    if (!textarea) {
      console.warn('Post content textarea not found');
      return;
    }

    // Listen for input changes
    textarea.addEventListener('input', () => {
      this.updateStats(textarea.value);
    });

    // Initial update
    this.updateStats(textarea.value);
  }

  updateStats(text) {
    if (!this.statsElement) return;

    // Calculate statistics
    const stats = this.calculateStats(text);

    // Update UI
    const wordCount = this.statsElement.querySelector('#word-count-stat .count');
    const charCount = this.statsElement.querySelector('#char-count-stat .count');
    const readingTime = this.statsElement.querySelector('#reading-time-stat .count');
    const sentenceCount = this.statsElement.querySelector('#sentence-count-stat .count');

    if (wordCount) wordCount.textContent = stats.words;
    if (charCount) charCount.textContent = stats.characters;
    if (readingTime) readingTime.textContent = this.formatReadingTime(stats.readingTime);
    if (sentenceCount) sentenceCount.textContent = stats.sentences;

    // Color coding based on length
    this.applyColorCoding(stats);
  }

  calculateStats(text) {
    // Remove extra whitespace
    const cleanText = text.trim();
    
    // Word count
    const words = cleanText.length > 0 ? 
      cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;
    
    // Character count (with and without spaces)
    const characters = cleanText.length;
    const charactersNoSpaces = cleanText.replace(/\s/g, '').length;
    
    // Sentence count
    const sentences = cleanText.length > 0 ?
      cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
    
    // Paragraph count
    const paragraphs = cleanText.length > 0 ?
      cleanText.split(/\n\n+/).filter(p => p.trim().length > 0).length : 0;
    
    // Reading time (average 200 words per minute)
    const readingTime = Math.ceil(words / 200 * 60); // in seconds
    
    return {
      words,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs,
      readingTime
    };
  }

  formatReadingTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? 
        `${minutes}m ${remainingSeconds}s` : 
        `${minutes}m`;
    }
  }

  applyColorCoding(stats) {
    if (!this.statsElement) return;

    const wordCountElement = this.statsElement.querySelector('#word-count-stat .count');
    if (!wordCountElement) return;

    // Color based on optimal social media post length
    if (stats.words < 10) {
      wordCountElement.style.color = 'var(--warning-color)'; // Too short
    } else if (stats.words >= 10 && stats.words <= 50) {
      wordCountElement.style.color = 'var(--success-color)'; // Optimal for most platforms
    } else if (stats.words > 50 && stats.words <= 100) {
      wordCountElement.style.color = 'var(--warning-color)'; // Getting long
    } else {
      wordCountElement.style.color = 'var(--danger-color)'; // Too long for most platforms
    }
  }

  showSettings() {
    this.api.ui.showModal({
      title: 'Word Counter Settings',
      body: `
        <div style="padding: 1rem;">
          <h4 style="margin-bottom: 1rem;">Display Options</h4>
          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; margin-bottom: 0.5rem;">
              <input type="checkbox" id="show-reading-time" ${this.preferences.showReadingTime ? 'checked' : ''}>
              <span style="margin-left: 0.5rem;">Show reading time</span>
            </label>
            <label style="display: flex; align-items: center; margin-bottom: 0.5rem;">
              <input type="checkbox" id="show-sentences" ${this.preferences.showSentences ? 'checked' : ''}>
              <span style="margin-left: 0.5rem;">Show sentence count</span>
            </label>
            <label style="display: flex; align-items: center; margin-bottom: 0.5rem;">
              <input type="checkbox" id="show-paragraphs" ${this.preferences.showParagraphs ? 'checked' : ''}>
              <span style="margin-left: 0.5rem;">Show paragraph count</span>
            </label>
          </div>
          
          <h4 style="margin-bottom: 1rem;">Word Count Guidelines</h4>
          <div style="font-size: 0.9rem; color: var(--muted-text);">
            <p>🟢 <strong>10-50 words:</strong> Optimal for most social media</p>
            <p>🟡 <strong>50-100 words:</strong> Good for LinkedIn, longer posts</p>
            <p>🔴 <strong>100+ words:</strong> Consider breaking into multiple posts</p>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="wordCounterPlugin.saveSettings()">Save</button>
      `
    });
  }

  async saveSettings() {
    // Get settings from modal
    const showReadingTime = document.getElementById('show-reading-time').checked;
    const showSentences = document.getElementById('show-sentences').checked;
    const showParagraphs = document.getElementById('show-paragraphs').checked;

    this.preferences = {
      showReadingTime,
      showSentences,
      showParagraphs,
      position: this.preferences.position
    };

    // Save to storage
    await this.api.storage.set('word-counter-prefs', JSON.stringify(this.preferences));

    // Update display
    this.updateDisplay();

    // Close modal
    document.querySelector('.modal').remove();

    this.api.notifications.show('Settings saved!', 'success');
  }

  updateDisplay() {
    if (!this.statsElement) return;

    // Show/hide elements based on preferences
    const readingTime = this.statsElement.querySelector('#reading-time-stat');
    const sentences = this.statsElement.querySelector('#sentence-count-stat');

    if (readingTime) {
      readingTime.style.display = this.preferences.showReadingTime ? 'inline' : 'none';
    }
    if (sentences) {
      sentences.style.display = this.preferences.showSentences ? 'inline' : 'none';
    }
  }

  async onEnable() {
    console.log('Word Counter enabled');
    this.enabled = true;
    if (this.statsElement) {
      this.statsElement.style.display = 'flex';
    }
  }

  async onDisable() {
    console.log('Word Counter disabled');
    this.enabled = false;
    if (this.statsElement) {
      this.statsElement.style.display = 'none';
    }
  }

  async onUnload() {
    console.log('Word Counter unloaded');
    // Clean up
    if (this.statsElement) {
      this.statsElement.remove();
    }
  }
}

// Make plugin instance globally accessible for settings
window.wordCounterPlugin = null;

// Export for plugin system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = function(api) {
    const plugin = new WordCounterPlugin(api);
    window.wordCounterPlugin = plugin;
    return plugin;
  };
}