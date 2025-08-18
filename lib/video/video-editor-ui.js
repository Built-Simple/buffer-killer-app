// Video Editor UI Component
// Provides both quick and full editing interfaces

class VideoEditorUI {
  constructor(mode = 'quick') {
    this.mode = mode; // 'quick' or 'full'
    this.ffmpeg = new FFmpegManager();
    this.currentFile = null;
    this.editedFile = null;
    this.container = null;
    this.metadata = null;
    this.isProcessing = false;
  }

  // Initialize the editor
  async init(containerId, file = null) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    this.currentFile = file;
    
    // Get metadata if file provided
    if (file) {
      this.metadata = await this.getVideoMetadata(file);
    }

    // Render appropriate UI
    if (this.mode === 'quick') {
      this.renderQuickEditor();
    } else {
      this.renderFullEditor();
    }

    this.attachEventListeners();
  }

  // Get video metadata
  async getVideoMetadata(file) {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;

    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size,
          name: file.name,
          type: file.type
        };
        URL.revokeObjectURL(url);
        resolve(metadata);
      };
    });
  }

  // Render quick editor (inline mode)
  renderQuickEditor() {
    const validator = new VideoValidator();
    const sizeInMB = (this.metadata.size / 1024 / 1024).toFixed(1);
    const duration = validator.formatDuration(this.metadata.duration);

    this.container.innerHTML = `
      <div class="video-quick-editor" style="
        background: #2a2a2a;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #fff;">✂️ Quick Video Editor</h3>
          <button onclick="videoEditor.close()" style="
            background: none;
            border: none;
            color: #999;
            font-size: 24px;
            cursor: pointer;
          ">×</button>
        </div>

        <!-- Current Status -->
        <div style="
          background: #1a1a1a;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        ">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
            <div>
              <span style="color: #999; font-size: 12px;">Current Size</span>
              <div style="color: #fff; font-size: 18px; font-weight: bold;">${sizeInMB} MB</div>
            </div>
            <div>
              <span style="color: #999; font-size: 12px;">Duration</span>
              <div style="color: #fff; font-size: 18px; font-weight: bold;">${duration}</div>
            </div>
            <div>
              <span style="color: #999; font-size: 12px;">Resolution</span>
              <div style="color: #fff; font-size: 18px; font-weight: bold;">${this.metadata.width}x${this.metadata.height}</div>
            </div>
          </div>
        </div>

        <!-- Platform Presets -->
        <div style="margin-bottom: 20px;">
          <h4 style="color: #fff; margin-bottom: 10px;">🎯 One-Click Platform Optimization</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            <button class="platform-preset-btn" data-preset="twitter" style="
              background: #1DA1F2;
              color: white;
              border: none;
              padding: 12px;
              border-radius: 8px;
              cursor: pointer;
              text-align: left;
            " onclick="videoEditor.applyPreset('twitter')">
              <div style="font-weight: bold;">🐦 Twitter</div>
              <div style="font-size: 12px; opacity: 0.9;">Max 512MB, 2:20, MP4</div>
            </button>
            
            <button class="platform-preset-btn" data-preset="instagram-feed" style="
              background: linear-gradient(45deg, #405DE6, #C13584, #F77737);
              color: white;
              border: none;
              padding: 12px;
              border-radius: 8px;
              cursor: pointer;
              text-align: left;
            " onclick="videoEditor.applyPreset('instagram-feed')">
              <div style="font-weight: bold;">📷 Instagram Feed</div>
              <div style="font-size: 12px; opacity: 0.9;">Max 650MB, 60s, Square</div>
            </button>
            
            <button class="platform-preset-btn" data-preset="instagram-reel" style="
              background: linear-gradient(45deg, #833AB4, #FD1D1D, #FCAF45);
              color: white;
              border: none;
              padding: 12px;
              border-radius: 8px;
              cursor: pointer;
              text-align: left;
            " onclick="videoEditor.applyPreset('instagram-reel')">
              <div style="font-weight: bold;">📱 Instagram Reel</div>
              <div style="font-size: 12px; opacity: 0.9;">Max 650MB, 90s, 9:16</div>
            </button>
            
            <button class="platform-preset-btn" data-preset="mastodon" style="
              background: #6364FF;
              color: white;
              border: none;
              padding: 12px;
              border-radius: 8px;
              cursor: pointer;
              text-align: left;
            " onclick="videoEditor.applyPreset('mastodon')">
              <div style="font-weight: bold;">🐘 Mastodon</div>
              <div style="font-size: 12px; opacity: 0.9;">Max 200MB, 5:00</div>
            </button>
          </div>
        </div>

        <!-- Manual Controls -->
        <div style="margin-bottom: 20px;">
          <h4 style="color: #fff; margin-bottom: 10px;">🔧 Manual Adjustments</h4>
          
          <!-- Trim Controls -->
          <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <label style="color: #999; font-size: 14px; display: block; margin-bottom: 10px;">Trim Video</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="number" id="trim-start" min="0" max="${Math.floor(this.metadata.duration)}" value="0" 
                     style="width: 80px; padding: 5px; background: #2a2a2a; color: white; border: 1px solid #444; border-radius: 4px;">
              <span style="color: #999;">to</span>
              <input type="number" id="trim-end" min="0" max="${Math.floor(this.metadata.duration)}" value="${Math.floor(this.metadata.duration)}" 
                     style="width: 80px; padding: 5px; background: #2a2a2a; color: white; border: 1px solid #444; border-radius: 4px;">
              <span style="color: #999;">seconds</span>
              <button onclick="videoEditor.trimVideo()" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 5px 15px;
                border-radius: 4px;
                cursor: pointer;
              ">Apply Trim</button>
            </div>
          </div>

          <!-- Compression Controls -->
          <div style="background: #1a1a1a; padding: 15px; border-radius: 8px;">
            <label style="color: #999; font-size: 14px; display: block; margin-bottom: 10px;">Compression Level</label>
            <div style="display: flex; gap: 10px;">
              <button onclick="videoEditor.compress('high')" style="
                flex: 1;
                background: #444;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 4px;
                cursor: pointer;
              ">
                <div>High Quality</div>
                <div style="font-size: 11px; opacity: 0.7;">~75% size</div>
              </button>
              <button onclick="videoEditor.compress('medium')" style="
                flex: 1;
                background: #444;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 4px;
                cursor: pointer;
              ">
                <div>Medium</div>
                <div style="font-size: 11px; opacity: 0.7;">~50% size</div>
              </button>
              <button onclick="videoEditor.compress('low')" style="
                flex: 1;
                background: #444;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 4px;
                cursor: pointer;
              ">
                <div>Small File</div>
                <div style="font-size: 11px; opacity: 0.7;">~25% size</div>
              </button>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div id="editor-progress" style="display: none; margin-bottom: 20px;">
          <div style="color: #fff; margin-bottom: 5px;">
            <span id="progress-text">Processing...</span>
            <span id="progress-percent" style="float: right;">0%</span>
          </div>
          <div style="background: #1a1a1a; height: 4px; border-radius: 2px; overflow: hidden;">
            <div id="progress-bar" style="
              height: 100%;
              background: linear-gradient(90deg, #667eea, #764ba2);
              width: 0%;
              transition: width 0.3s;
            "></div>
          </div>
        </div>

        <!-- Result Preview (hidden initially) -->
        <div id="result-preview" style="display: none; background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #48bb78; margin-bottom: 10px;">✅ Video Processed Successfully!</h4>
          <div id="result-stats" style="color: #999; font-size: 14px;"></div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="videoEditor.cancel()" style="
            background: #444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
          ">Cancel</button>
          <button id="use-edited-btn" onclick="videoEditor.useEditedVideo()" style="
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            display: none;
          ">✅ Use Edited Video</button>
        </div>
      </div>
    `;
  }

  // Apply platform preset
  async applyPreset(platform) {
    if (this.isProcessing) {
      this.showNotification('Already processing, please wait...', 'warning');
      return;
    }

    this.isProcessing = true;
    this.showProgress('Optimizing for ' + platform + '...');

    try {
      // Load FFmpeg if not loaded
      await this.ffmpeg.load();
      
      // Set progress callback
      this.ffmpeg.onProgress((progress) => {
        this.updateProgress(progress);
      });

      // Optimize for platform
      this.editedFile = await this.ffmpeg.optimizeForPlatform(this.currentFile, platform);
      
      // Get new metadata
      const newMetadata = await this.getVideoMetadata(this.editedFile);
      
      // Show result
      this.showResult(newMetadata);
      
      this.isProcessing = false;
      this.showNotification(`Video optimized for ${platform}!`, 'success');
    } catch (error) {
      console.error('Error applying preset:', error);
      this.hideProgress();
      this.isProcessing = false;
      this.showNotification(`Failed to optimize: ${error.message}`, 'error');
    }
  }

  // Trim video
  async trimVideo() {
    const startTime = parseInt(document.getElementById('trim-start').value);
    const endTime = parseInt(document.getElementById('trim-end').value);

    if (startTime >= endTime) {
      this.showNotification('End time must be after start time', 'warning');
      return;
    }

    if (this.isProcessing) {
      this.showNotification('Already processing, please wait...', 'warning');
      return;
    }

    this.isProcessing = true;
    this.showProgress('Trimming video...');

    try {
      await this.ffmpeg.load();
      
      this.ffmpeg.onProgress((progress) => {
        this.updateProgress(progress);
      });

      this.editedFile = await this.ffmpeg.trimVideo(this.currentFile, startTime, endTime);
      
      const newMetadata = await this.getVideoMetadata(this.editedFile);
      this.showResult(newMetadata);
      
      this.isProcessing = false;
      this.showNotification('Video trimmed successfully!', 'success');
    } catch (error) {
      console.error('Error trimming video:', error);
      this.hideProgress();
      this.isProcessing = false;
      this.showNotification(`Failed to trim: ${error.message}`, 'error');
    }
  }

  // Compress video
  async compress(quality) {
    if (this.isProcessing) {
      this.showNotification('Already processing, please wait...', 'warning');
      return;
    }

    this.isProcessing = true;
    this.showProgress(`Compressing (${quality} quality)...`);

    try {
      await this.ffmpeg.load();
      
      this.ffmpeg.onProgress((progress) => {
        this.updateProgress(progress);
      });

      this.editedFile = await this.ffmpeg.compressVideo(this.currentFile, quality);
      
      const newMetadata = await this.getVideoMetadata(this.editedFile);
      this.showResult(newMetadata);
      
      this.isProcessing = false;
      this.showNotification('Video compressed successfully!', 'success');
    } catch (error) {
      console.error('Error compressing video:', error);
      this.hideProgress();
      this.isProcessing = false;
      this.showNotification(`Failed to compress: ${error.message}`, 'error');
    }
  }

  // Show progress
  showProgress(text = 'Processing...') {
    const progressDiv = document.getElementById('editor-progress');
    const progressText = document.getElementById('progress-text');
    
    if (progressDiv) {
      progressDiv.style.display = 'block';
      progressText.textContent = text;
    }
  }

  // Update progress
  updateProgress(percent) {
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    
    if (progressBar) {
      progressBar.style.width = percent + '%';
      progressPercent.textContent = Math.round(percent) + '%';
    }
  }

  // Hide progress
  hideProgress() {
    const progressDiv = document.getElementById('editor-progress');
    if (progressDiv) {
      progressDiv.style.display = 'none';
    }
  }

  // Show result
  showResult(newMetadata) {
    this.hideProgress();
    
    const resultDiv = document.getElementById('result-preview');
    const resultStats = document.getElementById('result-stats');
    const useBtn = document.getElementById('use-edited-btn');
    
    if (resultDiv && resultStats) {
      const validator = new VideoValidator();
      const oldSize = (this.metadata.size / 1024 / 1024).toFixed(1);
      const newSize = (newMetadata.size / 1024 / 1024).toFixed(1);
      const reduction = ((1 - newMetadata.size / this.metadata.size) * 100).toFixed(0);
      
      resultStats.innerHTML = `
        <div>Original: ${oldSize} MB → New: ${newSize} MB (${reduction}% smaller)</div>
        <div>Duration: ${validator.formatDuration(newMetadata.duration)}</div>
        <div>Resolution: ${newMetadata.width}x${newMetadata.height}</div>
      `;
      
      resultDiv.style.display = 'block';
      useBtn.style.display = 'inline-block';
    }
  }

  // Use edited video
  useEditedVideo() {
    if (!this.editedFile) {
      this.showNotification('No edited video available', 'warning');
      return;
    }

    // Dispatch event with edited video
    const event = new CustomEvent('videoEdited', {
      detail: {
        file: this.editedFile,
        originalFile: this.currentFile
      }
    });
    document.dispatchEvent(event);

    this.showNotification('Using edited video!', 'success');
    this.close();
  }

  // Cancel editing
  cancel() {
    if (this.isProcessing) {
      this.ffmpeg.cancel();
      this.isProcessing = false;
    }
    this.close();
  }

  // Close editor
  close() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    // Dispatch close event
    const event = new CustomEvent('videoEditorClosed');
    document.dispatchEvent(event);
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  // Attach event listeners
  attachEventListeners() {
    // Global reference for inline onclick handlers
    window.videoEditor = this;
  }
}

// Create global instance
let videoEditor = null;

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoEditorUI;
}