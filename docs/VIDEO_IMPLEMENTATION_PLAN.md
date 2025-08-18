# 🎥 VIDEO SUPPORT - QUICK IMPLEMENTATION PLAN

## 🎯 MVP Approach: Start Simple, No Dependencies

### Phase 1: Video Preview & Validation (Can Build Today!)
No FFmpeg, no cloud services, just browser APIs.

```javascript
// lib/video/video-validator.js
class VideoValidator {
  constructor() {
    // Platform limits (2025 current)
    this.limits = {
      twitter: {
        maxSize: 512 * 1024 * 1024, // 512MB
        maxDuration: 140, // 2:20
        formats: ['video/mp4', 'video/quicktime'],
        extensions: ['.mp4', '.mov']
      },
      instagram: {
        maxSize: 650 * 1024 * 1024, // 650MB
        maxDuration: 60, // 60s for feed, 90s for reels
        formats: ['video/mp4', 'video/quicktime'],
        extensions: ['.mp4', '.mov']
      },
      mastodon: {
        maxSize: 200 * 1024 * 1024, // 200MB typical
        maxDuration: 300, // 5 min typical
        formats: ['video/mp4', 'video/webm', 'video/quicktime'],
        extensions: ['.mp4', '.webm', '.mov']
      },
      linkedin: {
        maxSize: 5 * 1024 * 1024 * 1024, // 5GB
        maxDuration: 600, // 10 min
        formats: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
        extensions: ['.mp4', '.mov', '.avi']
      }
    };
  }

  async validate(file, platform) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };

    // Get video metadata
    const metadata = await this.getMetadata(file);
    result.metadata = metadata;

    const limits = this.limits[platform];
    if (!limits) {
      result.warnings.push(`Unknown platform: ${platform}`);
      return result;
    }

    // Check file size
    if (file.size > limits.maxSize) {
      result.valid = false;
      result.errors.push({
        type: 'size',
        message: `File too large: ${this.formatSize(file.size)} (max: ${this.formatSize(limits.maxSize)})`,
        suggestion: 'Compress the video or reduce quality'
      });
    }

    // Check duration
    if (metadata.duration > limits.maxDuration) {
      result.valid = false;
      result.errors.push({
        type: 'duration',
        message: `Video too long: ${Math.round(metadata.duration)}s (max: ${limits.maxDuration}s)`,
        suggestion: `Trim video to under ${limits.maxDuration} seconds`
      });
    }

    // Check format
    if (!limits.formats.includes(file.type)) {
      result.valid = false;
      result.errors.push({
        type: 'format',
        message: `Format not supported: ${file.type}`,
        suggestion: `Convert to: ${limits.extensions.join(', ')}`
      });
    }

    // Warnings (non-blocking)
    if (metadata.width > 1920 || metadata.height > 1920) {
      result.warnings.push('Video resolution very high, consider reducing for faster upload');
    }

    return result;
  }

  async getMetadata(file) {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true; // Prevent audio playback

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: (video.videoWidth / video.videoHeight).toFixed(2)
        };
        URL.revokeObjectURL(url);
        resolve(metadata);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };
    });
  }

  formatSize(bytes) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
}
```

### Phase 2: Video Preview UI Component

```javascript
// lib/video/video-preview-ui.js
class VideoPreviewUI {
  constructor(container) {
    this.container = container;
    this.validator = new VideoValidator();
  }

  async showPreview(file, platform) {
    // Validate first
    const validation = await this.validator.validate(file, platform);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    
    this.container.innerHTML = `
      <div class="video-preview-container">
        <div class="video-wrapper">
          <video controls src="${url}" style="max-width: 100%; max-height: 400px;"></video>
        </div>
        
        <div class="video-info">
          <h4>${file.name}</h4>
          <div class="video-stats">
            <span>📦 Size: ${this.validator.formatSize(file.size)}</span>
            <span>⏱️ Duration: ${Math.round(validation.metadata.duration)}s</span>
            <span>📐 ${validation.metadata.width}x${validation.metadata.height}</span>
            <span>📱 Platform: ${platform}</span>
          </div>
        </div>
        
        ${validation.valid ? `
          <div class="video-valid">
            ✅ Ready to upload to ${platform}
          </div>
        ` : `
          <div class="video-errors">
            <h4>⚠️ Cannot upload to ${platform}:</h4>
            <ul>
              ${validation.errors.map(err => `
                <li>
                  <strong>${err.message}</strong>
                  <br>
                  <small>💡 ${err.suggestion}</small>
                </li>
              `).join('')}
            </ul>
          </div>
        `}
        
        ${validation.warnings.length > 0 ? `
          <div class="video-warnings">
            <h4>⚠️ Warnings:</h4>
            <ul>
              ${validation.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="video-actions">
          ${validation.valid ? 
            `<button class="btn btn-primary" onclick="acceptVideo()">Use This Video</button>` :
            `<button class="btn btn-secondary" onclick="showCompressionGuide()">How to Fix</button>`
          }
          <button class="btn btn-secondary" onclick="removeVideo()">Remove</button>
        </div>
      </div>
    `;
  }
}
```

### Phase 3: Platform Upload Integration

```javascript
// lib/platforms/twitter-video.js
class TwitterVideoUpload {
  async uploadVideo(file, accessToken) {
    // Twitter's chunked upload process
    // 1. INIT
    const initResponse = await this.initUpload(file.size, file.type, accessToken);
    const mediaId = initResponse.media_id_string;
    
    // 2. APPEND (chunked)
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    let segment = 0;
    
    for (let start = 0; start < file.size; start += chunkSize) {
      const chunk = file.slice(start, Math.min(start + chunkSize, file.size));
      await this.appendChunk(mediaId, chunk, segment, accessToken);
      segment++;
      
      // Emit progress
      this.onProgress?.(start / file.size);
    }
    
    // 3. FINALIZE
    await this.finalizeUpload(mediaId, accessToken);
    
    // 4. Check status
    return await this.checkStatus(mediaId, accessToken);
  }
}
```

---

## 🚀 Implementation Timeline

### Week 1: Basic Video Support
**Day 1-2: Video Validation**
- [ ] Create `VideoValidator` class
- [ ] Add platform limits configuration
- [ ] Implement metadata extraction
- [ ] Build validation logic

**Day 3-4: UI Integration**
- [ ] Add video button to composer
- [ ] Create preview component
- [ ] Show validation errors
- [ ] Add progress indicator

**Day 5: Platform Testing**
- [ ] Test with Twitter API
- [ ] Test with Mastodon
- [ ] Document limitations

### Week 2: Enhancements
**Day 1-2: Compression Guide**
- [ ] Create "How to Compress" modal
- [ ] Add links to free tools
- [ ] Platform-specific guides

**Day 3-4: Multi-Video Support**
- [ ] Handle multiple videos
- [ ] Video + image combinations
- [ ] Order management

**Day 5: Polish**
- [ ] Improve error messages
- [ ] Add tooltips
- [ ] Performance optimization

---

## 📁 File Structure

```
buffer-killer-app/
├── lib/
│   ├── video/
│   │   ├── video-validator.js      # Core validation logic
│   │   ├── video-preview-ui.js     # Preview component
│   │   ├── video-uploader.js       # Upload orchestration
│   │   └── compression-guide.js    # Help content
│   └── platforms/
│       ├── twitter-video.js        # Twitter video upload
│       ├── mastodon-video.js       # Mastodon video upload
│       └── linkedin-video.js       # LinkedIn video upload
└── components/
    └── video-composer.html         # UI component
```

---

## 🎮 User Flow

1. **Select Video**
   - Click "Add Video" button
   - Choose file from computer
   - Automatic validation starts

2. **Preview & Validate**
   - See video preview
   - Get instant feedback
   - Platform compatibility check

3. **Fix Issues (if needed)**
   - Clear error messages
   - Helpful suggestions
   - Link to guides

4. **Upload**
   - Progress indicator
   - Background upload
   - Success notification

---

## 💡 Smart Features to Add Later

### 1. Auto-Optimization Suggestions
```javascript
if (file.size > limits.maxSize * 0.8) {
  suggest("Your video is close to the limit. Consider compressing.");
}

if (metadata.aspectRatio == "1.78" && platform === "instagram") {
  suggest("Consider 1:1 or 4:5 for better Instagram engagement");
}
```

### 2. Platform Presets
```javascript
const presets = {
  'twitter-quality': {
    message: "Optimized for Twitter (under 512MB, max 2:20)",
    check: (file) => file.size < 512*1024*1024 && duration <= 140
  },
  'instagram-reel': {
    message: "Perfect for Reels (9:16, under 90s)",
    check: (file) => aspectRatio === "0.56" && duration <= 90
  }
};
```

### 3. Batch Processing
- Queue multiple videos
- Process in background
- Show combined progress

---

## ⚡ Quick Wins

1. **Start with validation only** - No processing, just check and warn
2. **Use browser video element** - Built-in, no dependencies
3. **Progressive enhancement** - Add features as needed
4. **Clear messaging** - Tell users exactly what's wrong
5. **Helpful guides** - Link to free compression tools

---

## 🔧 Code to Start With

```javascript
// Add to renderer.js
async function handleVideoSelect() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'video/mp4,video/quicktime,video/*';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Quick size check
    const maxSize = 512 * 1024 * 1024; // 512MB for Twitter
    if (file.size > maxSize) {
      showNotification(
        `Video too large (${Math.round(file.size/1024/1024)}MB). ` +
        `Max size: ${maxSize/1024/1024}MB`,
        'error'
      );
      return;
    }
    
    // Create preview
    const url = URL.createObjectURL(file);
    const preview = document.getElementById('video-preview');
    preview.innerHTML = `
      <video controls src="${url}" style="max-width: 100%;"></video>
      <p>✅ Video ready to upload</p>
    `;
    
    // Store for upload
    selectedVideo = file;
  };
  
  input.click();
}
```

---

## 🎯 Decision: Let's Start Simple!

**Phase 1 Priority:**
1. ✅ Video file selection
2. ✅ Format validation  
3. ✅ Size checking
4. ✅ Duration validation
5. ✅ Preview display
6. ✅ Clear error messages

**No complex processing** - just validation and upload!

**Users can compress videos themselves** using:
- HandBrake (free, desktop)
- CloudConvert (online)
- VLC (free, desktop)
- Online-convert.com

**This gets video support working TODAY without any complex dependencies!**
