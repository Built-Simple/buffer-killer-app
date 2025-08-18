// Video Preview UI Component - Clean, informative video preview
class VideoPreviewUI {
  constructor() {
    this.validator = new VideoValidator();
    this.selectedVideo = null;
    this.currentPlatforms = [];
  }

  async createPreview(file, platforms = ['twitter']) {
    this.selectedVideo = file;
    this.currentPlatforms = platforms;
    
    // Validate for all selected platforms
    const validationResults = await this.validator.validate(file, platforms);
    
    // Get the first platform's metadata (they're all the same)
    const metadata = validationResults[platforms[0]].metadata;
    
    // Build the preview HTML
    const previewHTML = this.buildPreviewHTML(file, metadata, validationResults);
    
    return previewHTML;
  }

  buildPreviewHTML(file, metadata, validationResults) {
    const url = URL.createObjectURL(file);
    
    // Check if valid for any platform
    const anyValid = Object.values(validationResults).some(r => r.valid);
    const allValid = Object.values(validationResults).every(r => r.valid);
    
    return `
      <div class="video-preview-container" style="
        background: #2a2a2a;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
      ">
        <!-- Video Player -->
        <div class="video-wrapper" style="
          position: relative;
          margin-bottom: 20px;
          border-radius: 8px;
          overflow: hidden;
          background: #1a1a1a;
        ">
          <video 
            controls 
            src="${url}" 
            style="
              width: 100%;
              max-height: 400px;
              display: block;
            "
            id="preview-video"
          ></video>
          
          <!-- Duration overlay -->
          <div style="
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          ">
            ${this.validator.formatDuration(metadata.duration)}
          </div>
        </div>

        <!-- Video Info -->
        <div class="video-info" style="
          background: #1a1a1a;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        ">
          <h4 style="margin: 0 0 10px 0; color: #fff;">
            📹 ${this.truncateFilename(file.name, 50)}
          </h4>
          
          <div class="video-stats" style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            font-size: 14px;
            color: #999;
          ">
            <div>📦 Size: <strong style="color: #fff;">${this.validator.formatSize(file.size)}</strong></div>
            <div>⏱️ Duration: <strong style="color: #fff;">${this.validator.formatDuration(metadata.duration)}</strong></div>
            <div>📐 Resolution: <strong style="color: #fff;">${metadata.width}x${metadata.height}</strong></div>
            <div>🎬 Aspect: <strong style="color: #fff;">${metadata.aspectRatioString}</strong></div>
          </div>
        </div>

        <!-- Platform Validation Results -->
        <div class="platform-results" style="margin-bottom: 15px;">
          ${this.buildPlatformResults(validationResults)}
        </div>

        <!-- Actions -->
        <div class="video-actions" style="
          display: flex;
          gap: 10px;
          margin-top: 20px;
        ">
          ${anyValid ? `
            <button 
              class="btn btn-secondary" 
              onclick="videoPreviewUI.editVideo()"
              style="
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                margin-right: 10px;
              "
            >
              ✂️ Edit Video
            </button>
            <button 
              class="btn btn-primary" 
              onclick="videoPreviewUI.acceptVideo()"
              style="
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              "
            >
              ✅ Use This Video
            </button>
          ` : ''}
          
          ${!allValid ? `
            <button 
              class="btn btn-secondary" 
              onclick="videoPreviewUI.showCompressionGuide()"
              style="
                background: #444;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              "
            >
              💡 How to Fix
            </button>
          ` : ''}
          
          <button 
            class="btn btn-danger" 
            onclick="videoPreviewUI.removeVideo()"
            style="
              background: #dc3545;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            "
          >
            🗑️ Remove Video
          </button>
        </div>
      </div>
    `;
  }

  buildPlatformResults(validationResults) {
    let html = '<div class="platform-validations">';
    
    for (const [platform, result] of Object.entries(validationResults)) {
      const icon = this.getPlatformIcon(platform);
      const color = result.valid ? '#28a745' : '#dc3545';
      const status = result.valid ? 'Ready' : 'Issues';
      
      html += `
        <div class="platform-validation" style="
          background: #1a1a1a;
          border-left: 4px solid ${color};
          padding: 12px;
          margin-bottom: 10px;
          border-radius: 4px;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: ${result.errors.length || result.warnings.length ? '10px' : '0'};
          ">
            <h5 style="margin: 0; color: #fff;">
              ${icon} ${platform.charAt(0).toUpperCase() + platform.slice(1)}
            </h5>
            <span style="
              background: ${color};
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 12px;
            ">
              ${status}
            </span>
          </div>
          
          ${result.errors.length > 0 ? `
            <div class="errors" style="margin-top: 8px;">
              ${result.errors.map(err => `
                <div style="
                  color: #dc3545;
                  font-size: 13px;
                  margin-bottom: 5px;
                ">
                  ❌ ${err.message}
                  <div style="
                    color: #999;
                    font-size: 12px;
                    margin-left: 20px;
                  ">
                    💡 ${err.suggestion}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${result.warnings.length > 0 ? `
            <div class="warnings" style="margin-top: 8px;">
              ${result.warnings.map(warn => `
                <div style="
                  color: #ffc107;
                  font-size: 13px;
                  margin-bottom: 5px;
                ">
                  ⚠️ ${warn.message || warn}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${result.suggestions && result.suggestions.length > 0 ? `
            <div class="suggestions" style="margin-top: 8px;">
              ${result.suggestions.map(sug => `
                <div style="
                  color: #28a745;
                  font-size: 13px;
                  margin-bottom: 5px;
                ">
                  ✨ ${sug}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  getPlatformIcon(platform) {
    const icons = {
      twitter: '🐦',
      instagram: '📷',
      mastodon: '🐘',
      linkedin: '💼',
      github: '🐙',
      facebook: '👤'
    };
    return icons[platform] || '📱';
  }

  truncateFilename(filename, maxLength) {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.slice(0, -(extension.length + 1));
    const truncated = nameWithoutExt.slice(0, maxLength - extension.length - 4);
    return `${truncated}...${extension}`;
  }

  acceptVideo() {
    if (!this.selectedVideo) return;
    
    // Dispatch event with video file
    const event = new CustomEvent('videoAccepted', {
      detail: {
        file: this.selectedVideo,
        platforms: this.currentPlatforms
      }
    });
    document.dispatchEvent(event);
    
    // Show success notification
    this.showNotification('Video added to post!', 'success');
  }
  
  editVideo() {
    if (!this.selectedVideo) return;
    
    // Load video editor if not already loaded
    if (!window.videoEditor) {
      const script = document.createElement('script');
      script.src = 'lib/video/video-editor.js';
      script.onload = () => {
        this.openVideoEditor();
      };
      document.head.appendChild(script);
    } else {
      this.openVideoEditor();
    }
  }
  
  openVideoEditor() {
    // Create editor container
    const editorContainer = document.createElement('div');
    editorContainer.id = 'video-editor-container';
    editorContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      z-index: 10000;
      overflow-y: auto;
      padding: 20px;
    `;
    
    document.body.appendChild(editorContainer);
    
    // Open editor with current video
    if (window.videoEditor) {
      window.videoEditor.createEditorUI(editorContainer, this.selectedVideo);
      
      // Listen for edited video
      document.addEventListener('videoEdited', (event) => {
        this.selectedVideo = event.detail.file;
        this.showNotification('Video edited successfully!', 'success');
        editorContainer.remove();
        
        // Update preview with edited video
        this.createPreview(this.selectedVideo, this.currentPlatforms);
      });
      
      // Listen for trimmed video (basic mode)
      document.addEventListener('videoTrimmed', (event) => {
        this.showNotification('Trim points saved. Use external tool to apply.', 'info');
      });
    }
  }

  removeVideo() {
    // Clear the preview
    const container = document.getElementById('video-preview-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Revoke object URL
    const video = document.getElementById('preview-video');
    if (video && video.src) {
      URL.revokeObjectURL(video.src);
    }
    
    this.selectedVideo = null;
    
    // Dispatch event
    const event = new CustomEvent('videoRemoved');
    document.dispatchEvent(event);
    
    this.showNotification('Video removed', 'info');
  }

  showCompressionGuide() {
    const modal = `
      <div class="modal" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      " onclick="if(event.target === this) this.remove()">
        <div style="
          background: #2a2a2a;
          padding: 30px;
          border-radius: 12px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          color: white;
        ">
          <h2 style="margin-top: 0;">🎬 How to Compress Your Video</h2>
          
          <h3>Free Tools:</h3>
          
          <div style="margin-bottom: 20px;">
            <h4>🖥️ Desktop Software:</h4>
            <ul>
              <li><strong>HandBrake</strong> (Windows/Mac/Linux) - <a href="https://handbrake.fr" target="_blank" style="color: #007bff;">handbrake.fr</a>
                <ul>
                  <li>Open source and completely free</li>
                  <li>Preset: "Social Media" or "Web"</li>
                  <li>Quality: RF 23-28</li>
                </ul>
              </li>
              <li><strong>VLC Media Player</strong> - <a href="https://www.videolan.org" target="_blank" style="color: #007bff;">videolan.org</a>
                <ul>
                  <li>Media → Convert/Save</li>
                  <li>Choose MP4 profile</li>
                </ul>
              </li>
            </ul>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4>🌐 Online Tools (No Install):</h4>
            <ul>
              <li><strong>CloudConvert</strong> - <a href="https://cloudconvert.com" target="_blank" style="color: #007bff;">cloudconvert.com</a>
                <ul>
                  <li>25 free conversions per day</li>
                  <li>No watermarks</li>
                </ul>
              </li>
              <li><strong>FreeConvert</strong> - <a href="https://www.freeconvert.com" target="_blank" style="color: #007bff;">freeconvert.com</a>
                <ul>
                  <li>1GB file size limit (free)</li>
                  <li>Multiple compression options</li>
                </ul>
              </li>
              <li><strong>Clideo</strong> - <a href="https://clideo.com/compress-video" target="_blank" style="color: #007bff;">clideo.com</a>
                <ul>
                  <li>500MB free limit</li>
                  <li>Simple interface</li>
                </ul>
              </li>
            </ul>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4>🎯 Platform-Specific Tips:</h4>
            ${this.currentPlatforms.map(platform => {
              const tips = this.validator.getCompressionTips(platform);
              return `
                <div style="margin-bottom: 10px;">
                  <strong>${this.getPlatformIcon(platform)} ${platform.charAt(0).toUpperCase() + platform.slice(1)}:</strong>
                  <ul style="margin: 5px 0;">
                    ${tips.map(tip => `<li>${tip}</li>`).join('')}
                  </ul>
                </div>
              `;
            }).join('')}
          </div>
          
          <button onclick="this.closest('.modal').remove()" style="
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
          ">
            Got it! Close
          </button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
  }

  showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
}

// Create global instance for easy access
const videoPreviewUI = new VideoPreviewUI();

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoPreviewUI;
}