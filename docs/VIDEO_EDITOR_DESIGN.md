# 🎬 Video Editor Integration Design

## Overview: FFmpeg.wasm Integration

We'll add video editing capabilities using FFmpeg.wasm - runs entirely in the browser, no server needed!

## 🏗️ Architecture

### 1. **Inline Quick Editor** (In Composer)
When user adds a video that needs fixes:
```
[Video Preview]
├── ✅ Use This Video
├── ✂️ Quick Edit    <-- NEW!
└── 🗑️ Remove
```

### 2. **Full Video Editor Tab** (Dedicated Workspace)
New sidebar item:
```
Navigation:
├── ✏️ Compose
├── 🎬 Video Editor  <-- NEW!
├── 📅 Scheduled
└── ...
```

## 📁 File Structure

```
buffer-killer-app/
├── lib/
│   ├── video/
│   │   ├── video-validator.js      [existing]
│   │   ├── video-preview-ui.js     [existing]
│   │   ├── video-uploader.js       [existing]
│   │   ├── video-editor.js         [NEW]
│   │   ├── ffmpeg-loader.js        [NEW]
│   │   └── editor-presets.js       [NEW]
│   └── ...
├── components/
│   ├── video-editor-ui.js          [NEW]
│   ├── video-timeline.js           [NEW]
│   └── video-editor.html           [NEW]
└── workers/
    └── ffmpeg.worker.js            [NEW]
```

## 🎨 Video Editor UI Design

### Quick Editor (Inline Mode)
```html
<div class="quick-video-editor">
  <!-- Preview -->
  <div class="editor-preview">
    <video controls></video>
    <div class="timeline-simple">
      [====|------------|====]
       start    keep     end
    </div>
  </div>
  
  <!-- Quick Controls -->
  <div class="quick-controls">
    <!-- Trim -->
    <div class="trim-controls">
      <label>Start: <input type="range" id="trim-start"></label>
      <label>End: <input type="range" id="trim-end"></label>
    </div>
    
    <!-- Compress -->
    <div class="compress-controls">
      <label>Quality:</label>
      <button data-quality="high">High</button>
      <button data-quality="medium">Medium</button>
      <button data-quality="low">Small File</button>
    </div>
    
    <!-- Platform Presets -->
    <div class="platform-presets">
      <button data-preset="twitter">🐦 Optimize for Twitter</button>
      <button data-preset="instagram">📷 Optimize for Instagram</button>
    </div>
  </div>
  
  <!-- Actions -->
  <div class="editor-actions">
    <button class="btn-primary">✅ Apply & Use</button>
    <button class="btn-secondary">Cancel</button>
  </div>
</div>
```

### Full Editor (Dedicated Tab)
```html
<div class="video-editor-full">
  <!-- Toolbar -->
  <div class="editor-toolbar">
    <button>📁 Import</button>
    <button>✂️ Trim</button>
    <button>🎨 Filters</button>
    <button>📐 Resize</button>
    <button>🗜️ Compress</button>
    <button>🔊 Audio</button>
    <button>📝 Text</button>
    <button>💾 Export</button>
  </div>
  
  <!-- Main Editor -->
  <div class="editor-workspace">
    <!-- Preview -->
    <div class="preview-panel">
      <video id="editor-preview"></video>
      <div class="playback-controls">
        <button>⏮️</button>
        <button>▶️</button>
        <button>⏭️</button>
        <span class="timecode">00:00 / 02:30</span>
      </div>
    </div>
    
    <!-- Timeline -->
    <div class="timeline-panel">
      <div class="timeline-ruler">
        <!-- Time markers -->
      </div>
      <div class="timeline-track">
        <div class="video-clip" draggable="true">
          <div class="trim-handle-left"></div>
          <div class="clip-content">
            <canvas class="waveform"></canvas>
          </div>
          <div class="trim-handle-right"></div>
        </div>
      </div>
    </div>
    
    <!-- Properties Panel -->
    <div class="properties-panel">
      <h3>Quick Actions</h3>
      
      <!-- Platform Optimization -->
      <div class="optimization-presets">
        <h4>One-Click Optimize</h4>
        <button class="preset-btn" data-preset="twitter">
          🐦 Twitter (512MB, 2:20, MP4)
        </button>
        <button class="preset-btn" data-preset="instagram-feed">
          📷 Instagram Feed (650MB, 60s, 1:1)
        </button>
        <button class="preset-btn" data-preset="instagram-reel">
          📱 Instagram Reel (650MB, 90s, 9:16)
        </button>
        <button class="preset-btn" data-preset="linkedin">
          💼 LinkedIn (5GB, 10min, 16:9)
        </button>
      </div>
      
      <!-- Manual Controls -->
      <div class="manual-controls">
        <h4>Manual Adjustments</h4>
        
        <!-- Trim -->
        <div class="control-group">
          <label>Trim</label>
          <input type="time" id="start-time" value="00:00">
          <span>to</span>
          <input type="time" id="end-time" value="00:00">
        </div>
        
        <!-- Resolution -->
        <div class="control-group">
          <label>Resolution</label>
          <select id="resolution">
            <option>Keep Original</option>
            <option>1920x1080 (Full HD)</option>
            <option>1280x720 (HD)</option>
            <option>1080x1080 (Square)</option>
            <option>1080x1920 (Portrait)</option>
            <option>Custom...</option>
          </select>
        </div>
        
        <!-- Compression -->
        <div class="control-group">
          <label>Quality</label>
          <input type="range" min="1" max="100" value="80">
          <span>80% - Est. 45MB</span>
        </div>
        
        <!-- Format -->
        <div class="control-group">
          <label>Format</label>
          <select id="format">
            <option>MP4 (H.264)</option>
            <option>WebM (VP9)</option>
            <option>MOV</option>
          </select>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Status Bar -->
  <div class="editor-status">
    <span>Original: 1920x1080, 2:45, 185MB</span>
    <span>→</span>
    <span>Output: 1280x720, 2:20, ~45MB (Twitter Ready ✅)</span>
  </div>
</div>
```

## 🔧 Implementation Plan

### Phase 1: FFmpeg.wasm Setup
```javascript
// lib/video/ffmpeg-loader.js
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

class FFmpegManager {
  constructor() {
    this.ffmpeg = null;
    this.loaded = false;
    this.progress = 0;
  }
  
  async load() {
    if (this.loaded) return;
    
    this.ffmpeg = createFFmpeg({
      log: true,
      corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });
    
    await this.ffmpeg.load();
    this.loaded = true;
  }
  
  async trimVideo(inputFile, startTime, endTime) {
    await this.load();
    
    // Write input file to FFmpeg filesystem
    this.ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(inputFile));
    
    // Run trim command
    await this.ffmpeg.run(
      '-i', 'input.mp4',
      '-ss', startTime,
      '-to', endTime,
      '-c', 'copy',  // No re-encoding for speed
      'output.mp4'
    );
    
    // Read the result
    const data = this.ffmpeg.FS('readFile', 'output.mp4');
    
    // Clean up
    this.ffmpeg.FS('unlink', 'input.mp4');
    this.ffmpeg.FS('unlink', 'output.mp4');
    
    // Return as blob
    return new Blob([data.buffer], { type: 'video/mp4' });
  }
  
  async compressVideo(inputFile, quality = 'medium') {
    await this.load();
    
    const presets = {
      high: { crf: 18, preset: 'slow' },
      medium: { crf: 23, preset: 'medium' },
      low: { crf: 28, preset: 'fast' }
    };
    
    const settings = presets[quality];
    
    this.ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(inputFile));
    
    await this.ffmpeg.run(
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-crf', settings.crf.toString(),
      '-preset', settings.preset,
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    );
    
    const data = this.ffmpeg.FS('readFile', 'output.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  }
  
  async optimizeForPlatform(inputFile, platform) {
    const presets = {
      twitter: {
        maxDuration: 140,
        maxSize: 512 * 1024 * 1024,
        resolution: '1280x720',
        format: 'mp4'
      },
      instagram: {
        maxDuration: 60,
        maxSize: 650 * 1024 * 1024,
        resolution: '1080x1080',
        format: 'mp4'
      },
      'instagram-reel': {
        maxDuration: 90,
        maxSize: 650 * 1024 * 1024,
        resolution: '1080x1920',
        format: 'mp4'
      }
    };
    
    const preset = presets[platform];
    if (!preset) throw new Error(`Unknown platform: ${platform}`);
    
    // Implementation...
  }
}
```

### Phase 2: Editor UI Component
```javascript
// components/video-editor-ui.js
class VideoEditorUI {
  constructor(mode = 'quick') {
    this.mode = mode; // 'quick' or 'full'
    this.ffmpeg = new FFmpegManager();
    this.currentFile = null;
    this.editedFile = null;
  }
  
  async init(containerId, file = null) {
    this.container = document.getElementById(containerId);
    this.currentFile = file;
    
    if (this.mode === 'quick') {
      this.renderQuickEditor();
    } else {
      this.renderFullEditor();
    }
    
    this.attachEventListeners();
  }
  
  renderQuickEditor() {
    this.container.innerHTML = `
      <div class="quick-editor">
        <h3>Quick Edit Video</h3>
        
        <!-- Platform Presets -->
        <div class="preset-buttons">
          <button onclick="editorUI.applyPreset('twitter')">
            🐦 Fix for Twitter
          </button>
          <button onclick="editorUI.applyPreset('instagram')">
            📷 Fix for Instagram
          </button>
        </div>
        
        <!-- Simple Trim -->
        <div class="trim-section">
          <label>Trim to fit platform limit:</label>
          <input type="range" id="trim-slider" min="0" max="100" value="100">
          <span id="duration-display">2:30 → 2:20</span>
        </div>
        
        <!-- Compress -->
        <div class="compress-section">
          <label>Reduce file size:</label>
          <button onclick="editorUI.compress('high')">-25%</button>
          <button onclick="editorUI.compress('medium')">-50%</button>
          <button onclick="editorUI.compress('low')">-75%</button>
        </div>
        
        <!-- Progress -->
        <div id="progress" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <span>Processing...</span>
        </div>
        
        <!-- Actions -->
        <div class="actions">
          <button class="btn-primary" onclick="editorUI.applyEdits()">
            Apply Changes
          </button>
          <button class="btn-secondary" onclick="editorUI.cancel()">
            Cancel
          </button>
        </div>
      </div>
    `;
  }
  
  async applyPreset(platform) {
    // Show progress
    this.showProgress();
    
    try {
      // Apply platform-specific optimizations
      this.editedFile = await this.ffmpeg.optimizeForPlatform(
        this.currentFile, 
        platform
      );
      
      // Update preview
      this.updatePreview();
      
      // Show success
      this.showSuccess(`Video optimized for ${platform}!`);
    } catch (error) {
      this.showError(`Failed to optimize: ${error.message}`);
    }
  }
}
```

## 🚀 User Experience Flow

### Scenario 1: Quick Fix in Composer
1. User adds video that's too large for Twitter
2. Validator shows: "Video too large: 600MB (max: 512MB)"
3. User clicks "✂️ Quick Edit"
4. Quick editor opens inline:
   - "🐦 Fix for Twitter" button
   - Shows: "This will trim to 2:20 and compress to ~450MB"
5. User clicks button
6. Progress bar shows processing
7. Success! Video ready for Twitter
8. Returns to composer with fixed video

### Scenario 2: Full Editor Workflow
1. User clicks "🎬 Video Editor" in sidebar
2. Imports video from computer
3. Sees timeline with video
4. Clicks "Twitter Optimize" preset
5. Adjusts trim points if needed
6. Clicks "Export to Composer"
7. Video added to post, ready to schedule

## 🎯 Smart Features

### 1. Platform Presets (One-Click Fix)
```javascript
const platformPresets = {
  twitter: {
    action: 'Trim to 2:20, compress to <512MB, convert to MP4',
    icon: '🐦',
    color: '#1DA1F2'
  },
  instagramFeed: {
    action: 'Trim to 60s, square crop, compress to <650MB',
    icon: '📷',
    color: '#E4405F'
  },
  instagramReel: {
    action: 'Trim to 90s, 9:16 crop, compress to <650MB',
    icon: '📱',
    color: '#E4405F'
  }
};
```

### 2. Smart Compression
- Analyzes current size vs platform limit
- Suggests optimal compression level
- Shows estimated output size
- Preserves quality as much as possible

### 3. Visual Timeline
- Waveform display
- Drag handles for trimming
- Preview scrubbing
- Frame-accurate cutting

## 💾 Caching & Performance

### Web Worker for FFmpeg
```javascript
// workers/ffmpeg.worker.js
self.addEventListener('message', async (e) => {
  const { action, data } = e.data;
  
  switch (action) {
    case 'trim':
      const result = await trimVideo(data);
      self.postMessage({ action: 'trimComplete', result });
      break;
    case 'compress':
      // Process in background
      break;
  }
});
```

### Smart Caching
- Cache FFmpeg.wasm after first load
- Store edited videos temporarily
- Reuse processed videos when possible

## 📦 Installation

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/core
```

Or use CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.0/dist/ffmpeg.min.js"></script>
```

## 🎨 UI Integration Points

### 1. In Video Preview (video-preview-ui.js)
Add "Quick Edit" button when video needs fixes:
```javascript
if (!result.valid) {
  // Show existing errors
  // ADD: Quick Edit button
  buttons.push(`
    <button onclick="openQuickEditor()">✂️ Quick Edit</button>
  `);
}
```

### 2. New Sidebar Item
Add to navigation:
```html
<div class="nav-item" data-page="video-editor">
  <span class="nav-icon">🎬</span>
  <span>Video Editor</span>
</div>
```

### 3. Context Menu
Right-click on video in composer:
- Edit Video
- Optimize for Platform
- Trim Duration
- Compress Size

## 🔥 Benefits

### For Users
- **Fix videos without leaving app**
- **One-click platform optimization**
- **No external tools needed**
- **See changes instantly**
- **Undo/redo support**

### For Development
- **Reuses existing video system**
- **Progressive enhancement**
- **Works offline**
- **No server costs**
- **Easy to extend**

## 📈 Future Enhancements

### Phase 1 (Basic Editing)
- ✅ Trim videos
- ✅ Compress/resize
- ✅ Platform presets
- ✅ Format conversion

### Phase 2 (Enhanced)
- [ ] Add text overlays
- [ ] Basic filters
- [ ] Fade in/out
- [ ] Audio adjustments

### Phase 3 (Advanced)
- [ ] Multi-clip timeline
- [ ] Transitions
- [ ] Picture-in-picture
- [ ] Green screen

## 🎯 Success Metrics

- User can fix "too large" video in <30 seconds
- User can fix "too long" video in <30 seconds  
- 90% of platform errors fixable with one click
- Processing time <1 minute for most videos
- No quality loss for simple trims

---

This turns Buffer Killer into a **complete video content platform** - not just scheduling, but editing too! 🚀