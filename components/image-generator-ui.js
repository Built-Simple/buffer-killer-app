// Image Generation UI Component
// Provides UI for creating images from text

const imageGeneratorUI = {
  currentTemplate: 'default',
  previewImage: null,
  isGenerating: false,

  init() {
    this.createUI();
    this.attachEventListeners();
    this.loadTemplates();
  },

  createUI() {
    // Add image generation section to the composer
    const composer = document.querySelector('.post-composer');
    if (!composer) return;

    // Add after the platform selector
    const imageSection = document.createElement('div');
    imageSection.className = 'image-generation-section';
    imageSection.innerHTML = `
      <div class="image-gen-header">
        <label class="image-gen-toggle">
          <input type="checkbox" id="generate-image-toggle">
          <span>🎨 Generate Image from Text</span>
        </label>
      </div>
      
      <div id="image-gen-options" class="image-gen-options" style="display: none;">
        <div class="template-selector">
          <label>Template:</label>
          <select id="image-template-select">
            <option value="default">Default</option>
            <option value="instagram-square">Instagram Square</option>
            <option value="instagram-story">Instagram Story</option>
            <option value="twitter-card">Twitter Card</option>
            <option value="linkedin-post">LinkedIn Post</option>
            <option value="facebook-post">Facebook Post</option>
            <option value="quote">Quote</option>
            <option value="announcement">Announcement</option>
            <option value="minimalist">Minimalist</option>
            <option value="dark">Dark Mode</option>
          </select>
        </div>
        
        <div class="customization-options">
          <div class="option-group">
            <label>Background:</label>
            <div class="gradient-presets">
              <button class="gradient-btn" data-gradient="purple">🟣</button>
              <button class="gradient-btn" data-gradient="blue">🔵</button>
              <button class="gradient-btn" data-gradient="green">🟢</button>
              <button class="gradient-btn" data-gradient="orange">🟠</button>
              <button class="gradient-btn" data-gradient="pink">🩷</button>
              <button class="gradient-btn" data-gradient="random">🎲</button>
              <input type="color" id="custom-bg-color" title="Custom color">
            </div>
          </div>
          
          <div class="option-group">
            <label>Text Color:</label>
            <input type="color" id="text-color" value="#ffffff">
          </div>
          
          <div class="option-group">
            <label>Font Size:</label>
            <input type="range" id="font-size" min="24" max="120" value="48">
            <span id="font-size-value">48px</span>
          </div>
          
          <div class="option-group">
            <label>
              <input type="checkbox" id="add-watermark" checked>
              Add watermark
            </label>
          </div>
        </div>
        
        <div class="image-actions">
          <button id="preview-image-btn" class="btn btn-secondary">
            <span class="icon">👁️</span> Preview Image
          </button>
          <button id="generate-image-btn" class="btn btn-primary">
            <span class="icon">🎨</span> Generate Image
          </button>
        </div>
        
        <div id="image-preview-container" class="image-preview-container" style="display: none;">
          <h4>Image Preview</h4>
          <div id="image-preview" class="image-preview"></div>
          <div class="preview-actions">
            <button id="download-image-btn" class="btn btn-sm">
              <span class="icon">💾</span> Download
            </button>
            <button id="regenerate-image-btn" class="btn btn-sm">
              <span class="icon">🔄</span> Regenerate
            </button>
            <button id="attach-to-post-btn" class="btn btn-sm btn-primary">
              <span class="icon">📎</span> Attach to Post
            </button>
          </div>
        </div>
      </div>
    `;

    // Insert after platform selector
    const platformSelector = composer.querySelector('.platform-selector');
    if (platformSelector) {
      platformSelector.insertAdjacentElement('afterend', imageSection);
    }

    // Add styles
    this.addStyles();
  },

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .image-generation-section {
        margin: 20px 0;
        padding: 20px;
        background: #2a2a2a;
        border-radius: 8px;
      }
      
      .image-gen-header {
        margin-bottom: 15px;
      }
      
      .image-gen-toggle {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 16px;
      }
      
      .image-gen-toggle input {
        margin-right: 10px;
        width: 18px;
        height: 18px;
      }
      
      .image-gen-options {
        animation: slideDown 0.3s ease-out;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .template-selector {
        margin-bottom: 20px;
      }
      
      .template-selector label {
        display: inline-block;
        margin-right: 10px;
        width: 80px;
      }
      
      .template-selector select {
        padding: 8px 12px;
        background: #1a1a1a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        font-size: 14px;
        min-width: 200px;
      }
      
      .customization-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .option-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .option-group label {
        min-width: 100px;
        font-size: 14px;
      }
      
      .gradient-presets {
        display: flex;
        gap: 5px;
        align-items: center;
      }
      
      .gradient-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        transition: transform 0.2s;
        background: transparent;
      }
      
      .gradient-btn:hover {
        transform: scale(1.2);
      }
      
      .gradient-btn.selected {
        box-shadow: 0 0 0 3px #007bff;
      }
      
      #custom-bg-color, #text-color {
        width: 40px;
        height: 32px;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
      }
      
      #font-size {
        flex: 1;
        max-width: 150px;
      }
      
      #font-size-value {
        min-width: 50px;
        text-align: right;
        font-size: 14px;
        color: #888;
      }
      
      .image-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }
      
      .image-actions .btn {
        flex: 1;
        padding: 10px 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .btn-secondary {
        background: #444;
        color: white;
      }
      
      .btn-secondary:hover {
        background: #555;
      }
      
      .image-preview-container {
        margin-top: 20px;
        padding: 20px;
        background: #1a1a1a;
        border-radius: 8px;
        animation: slideDown 0.3s ease-out;
      }
      
      .image-preview-container h4 {
        margin: 0 0 15px 0;
        color: #fff;
      }
      
      .image-preview {
        background: #000;
        border-radius: 8px;
        padding: 20px;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      
      .image-preview img {
        max-width: 100%;
        max-height: 400px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      
      .image-preview .loading {
        color: #888;
        font-size: 18px;
      }
      
      .preview-actions {
        display: flex;
        gap: 10px;
        margin-top: 15px;
      }
      
      .preview-actions .btn-sm {
        padding: 6px 12px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      
      .generating-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 10px;
      }
      
      .generating-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #444;
        border-top-color: #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .generating-text {
        color: white;
        font-size: 16px;
      }
    `;
    document.head.appendChild(style);
  },

  attachEventListeners() {
    // Toggle image generation options
    const toggle = document.getElementById('generate-image-toggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        const options = document.getElementById('image-gen-options');
        options.style.display = e.target.checked ? 'block' : 'none';
      });
    }

    // Template change
    const templateSelect = document.getElementById('image-template-select');
    if (templateSelect) {
      templateSelect.addEventListener('change', (e) => {
        this.currentTemplate = e.target.value;
        this.updateTemplateOptions();
      });
    }

    // Gradient buttons
    document.querySelectorAll('.gradient-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.gradient-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
      });
    });

    // Font size slider
    const fontSizeSlider = document.getElementById('font-size');
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        document.getElementById('font-size-value').textContent = `${e.target.value}px`;
      });
    }

    // Preview button
    const previewBtn = document.getElementById('preview-image-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewImage());
    }

    // Generate button
    const generateBtn = document.getElementById('generate-image-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateImage());
    }

    // Download button
    const downloadBtn = document.getElementById('download-image-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadImage());
    }

    // Regenerate button
    const regenerateBtn = document.getElementById('regenerate-image-btn');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', () => this.generateImage());
    }

    // Attach to post button
    const attachBtn = document.getElementById('attach-to-post-btn');
    if (attachBtn) {
      attachBtn.addEventListener('click', () => this.attachToPost());
    }
  },

  async loadTemplates() {
    try {
      // For now, use the static template list since electronAPI might not be available
      const templates = [
        { id: 'default', name: 'Default' },
        { id: 'instagram-square', name: 'Instagram Square' },
        { id: 'instagram-story', name: 'Instagram Story' },
        { id: 'twitter-card', name: 'Twitter Card' },
        { id: 'linkedin-post', name: 'LinkedIn Post' },
        { id: 'facebook-post', name: 'Facebook Post' },
        { id: 'quote', name: 'Quote' },
        { id: 'announcement', name: 'Announcement' },
        { id: 'minimalist', name: 'Minimalist' },
        { id: 'dark', name: 'Dark Mode' }
      ];
      
      const select = document.getElementById('image-template-select');
      
      if (select) {
        select.innerHTML = '';
        templates.forEach(template => {
          const option = document.createElement('option');
          option.value = template.id;
          option.textContent = template.name;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  },

  updateTemplateOptions() {
    // Update UI based on selected template
    // Could show/hide certain options based on template capabilities
  },

  getImageOptions() {
    const text = document.getElementById('post-content').value;
    const template = document.getElementById('image-template-select').value;
    
    // Get selected gradient
    const selectedGradient = document.querySelector('.gradient-btn.selected');
    const gradient = selectedGradient ? selectedGradient.dataset.gradient : null;
    
    const customBg = document.getElementById('custom-bg-color').value;
    const textColor = document.getElementById('text-color').value;
    const fontSize = parseInt(document.getElementById('font-size').value);
    const watermark = document.getElementById('add-watermark').checked;
    
    return {
      text,
      template,
      backgroundColor: gradient || customBg,
      textColor,
      fontSize,
      watermark
    };
  },

  async previewImage() {
    const options = this.getImageOptions();
    
    if (!options.text) {
      alert('Please enter some text first!');
      return;
    }

    this.showGenerating(true);
    
    try {
      const result = await window.electronAPI.generateImagePreview(options);
      this.displayPreview(result);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate preview: ' + error.message);
    } finally {
      this.showGenerating(false);
    }
  },

  async generateImage() {
    const options = this.getImageOptions();
    
    if (!options.text) {
      alert('Please enter some text first!');
      return;
    }

    this.showGenerating(true);
    
    try {
      const result = await window.electronAPI.generateImage(options);
      this.previewImage = result;
      this.displayPreview(result);
      
      // Show success message
      this.showNotification('Image generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image: ' + error.message);
    } finally {
      this.showGenerating(false);
    }
  },

  displayPreview(imageData) {
    const container = document.getElementById('image-preview-container');
    const preview = document.getElementById('image-preview');
    
    if (container && preview) {
      container.style.display = 'block';
      
      if (imageData.dataUrl) {
        preview.innerHTML = `<img src="${imageData.dataUrl}" alt="Generated image">`;
      } else if (imageData.buffer) {
        // Convert buffer to data URL
        const blob = new Blob([imageData.buffer], { type: `image/${imageData.format}` });
        const url = URL.createObjectURL(blob);
        preview.innerHTML = `<img src="${url}" alt="Generated image">`;
      }
    }
  },

  async downloadImage() {
    if (!this.previewImage) {
      alert('No image to download!');
      return;
    }

    try {
      await window.electronAPI.saveImage(this.previewImage);
      this.showNotification('Image saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image: ' + error.message);
    }
  },

  async attachToPost() {
    if (!this.previewImage) {
      alert('No image to attach!');
      return;
    }

    // Add to media uploads
    const mediaContainer = document.querySelector('.media-preview');
    if (mediaContainer) {
      const mediaItem = document.createElement('div');
      mediaItem.className = 'media-item';
      mediaItem.innerHTML = `
        <img src="${this.previewImage.dataUrl}" alt="Generated image">
        <button class="remove-media" onclick="this.parentElement.remove()">×</button>
      `;
      mediaContainer.appendChild(mediaItem);
      
      // Store image data for posting
      window.generatedImages = window.generatedImages || [];
      window.generatedImages.push(this.previewImage);
      
      this.showNotification('Image attached to post!', 'success');
    }
  },

  showGenerating(show) {
    this.isGenerating = show;
    const preview = document.getElementById('image-preview');
    
    if (show) {
      preview.innerHTML = `
        <div class="generating-overlay">
          <div class="generating-spinner"></div>
          <div class="generating-text">Generating image...</div>
        </div>
      `;
    }
    
    // Disable/enable buttons
    document.getElementById('preview-image-btn').disabled = show;
    document.getElementById('generate-image-btn').disabled = show;
  },

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#4caf50' : '#2196f3'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => imageGeneratorUI.init());
} else {
  imageGeneratorUI.init();
}

// Export for global access in renderer
window.imageGeneratorUI = imageGeneratorUI;
