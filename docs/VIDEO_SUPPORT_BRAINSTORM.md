# 🎥 VIDEO SUPPORT BRAINSTORMING

## 📊 Platform Video Requirements (2025)

### Twitter/X
- **Max Duration**: 2 min 20 sec (140 seconds) for most users
- **Max File Size**: 512MB
- **Formats**: MP4, MOV
- **Resolution**: Up to 1920x1200 (1200x1900 for vertical)
- **Aspect Ratios**: 1:1, 16:9, 9:16
- **Frame Rate**: 30fps or 60fps
- **Bitrate**: Max 25 Mbps

### LinkedIn
- **Max Duration**: 10 minutes
- **Max File Size**: 5GB
- **Formats**: MP4, ASF, AVI, FLV, MPEG-1, MPEG-4, MKV, WebM
- **Resolution**: 256x144 to 4096x2304
- **Aspect Ratios**: 1:2.4 to 2.4:1
- **Frame Rate**: 10fps to 60fps

### Facebook
- **Max Duration**: 240 minutes (4 hours!)
- **Max File Size**: 10GB
- **Formats**: MP4, MOV (recommended)
- **Resolution**: Up to 4K
- **Aspect Ratios**: 9:16 to 16:9
- **Frame Rate**: Up to 60fps

### Instagram (Feed)
- **Max Duration**: 60 seconds
- **Max File Size**: 650MB
- **Formats**: MP4, MOV
- **Resolution**: Up to 1920x1080
- **Aspect Ratios**: 1.91:1 to 4:5
- **Frame Rate**: 30fps

### Instagram (Reels)
- **Max Duration**: 90 seconds
- **Max File Size**: 500MB
- **Formats**: MP4, MOV
- **Resolution**: 1080x1920 (9:16)
- **Aspect Ratio**: 9:16 vertical
- **Frame Rate**: 30fps

### Mastodon
- **Max Duration**: Server-dependent (usually 2-5 minutes)
- **Max File Size**: Server-dependent (usually 40-200MB)
- **Formats**: MP4, WebM, MOV
- **Resolution**: No strict limit
- **Aspect Ratios**: Any

---

## 🛠️ Technical Implementation Options

### Option 1: FFmpeg Integration (Most Powerful)
```javascript
const ffmpeg = require('fluent-ffmpeg');

// Compress video for Twitter
async function compressForTwitter(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .size('1280x720')
      .videoBitrate('2000k')
      .fps(30)
      .duration(140) // Max 140 seconds
      .format('mp4')
      .on('end', resolve)
      .on('error', reject)
      .save('output.mp4');
  });
}
```

**Pros:**
- Complete control over compression
- Can handle any format conversion
- Platform-specific optimization
- Add watermarks, text overlays
- Extract thumbnails
- Trim/cut videos

**Cons:**
- Large binary size (~90MB)
- Complex to bundle with Electron
- Platform-specific builds needed

### Option 2: Browser-Based Processing (WebCodecs API)
```javascript
// Use WebCodecs API for video processing
async function processVideoInBrowser(file) {
  const videoDecoder = new VideoDecoder({
    output: (frame) => {
      // Process frame
    },
    error: console.error
  });
  
  // Compress using browser APIs
}
```

**Pros:**
- No external dependencies
- Smaller app size
- Works cross-platform
- Modern browser support

**Cons:**
- Limited codec support
- Less control over output
- Newer API (less stable)
- Can't handle all formats

### Option 3: Cloud Processing (API Service)
```javascript
// Use service like Cloudinary, Mux, or AWS MediaConvert
async function uploadToCloudProcessor(file) {
  const formData = new FormData();
  formData.append('video', file);
  
  const response = await fetch('https://api.cloudinary.com/v1_1/demo/video/upload', {
    method: 'POST',
    body: formData
  });
  
  return response.json(); // Returns optimized versions
}
```

**Pros:**
- No local processing needed
- Professional encoding
- Multiple output formats
- CDN delivery
- Thumbnail generation

**Cons:**
- Requires internet
- Monthly costs
- Privacy concerns
- API limits

### Option 4: Hybrid Approach (Recommended!)
```javascript
class VideoProcessor {
  constructor() {
    this.useFFmpeg = this.checkFFmpegAvailable();
    this.useWebCodecs = 'VideoDecoder' in window;
  }
  
  async processVideo(file, platform) {
    // 1. Quick validation
    if (!this.validateFormat(file, platform)) {
      throw new Error('Invalid format');
    }
    
    // 2. Check if compression needed
    if (this.needsCompression(file, platform)) {
      if (this.useFFmpeg) {
        return this.compressWithFFmpeg(file, platform);
      } else if (this.useWebCodecs) {
        return this.compressWithWebCodecs(file, platform);
      } else {
        return this.showManualCompressionGuide();
      }
    }
    
    // 3. Direct upload if already optimized
    return file;
  }
}
```

---

## 💡 Feature Ideas

### 1. Smart Video Optimizer
- Detect platform automatically
- Show optimization suggestions
- One-click optimize for all platforms
- Preview compressed version
- Show before/after file sizes

### 2. Video Templates (Like Image Templates!)
```javascript
const videoTemplates = {
  'instagram-reel': {
    width: 1080,
    height: 1920,
    duration: 30,
    fps: 30,
    bitrate: '4000k'
  },
  'twitter-landscape': {
    width: 1280,
    height: 720,
    duration: 140,
    fps: 30,
    bitrate: '2000k'
  }
};
```

### 3. Multi-Platform Video Generator
- Upload once, optimize for all
- Generate platform-specific versions
- Queue uploads to each platform
- Track which versions uploaded

### 4. Video Preview Component
```html
<div class="video-preview">
  <video controls>
    <source src="blob:..." type="video/mp4">
  </video>
  <div class="video-stats">
    <span>Duration: 45s</span>
    <span>Size: 25MB</span>
    <span>Resolution: 1080x1920</span>
    <span class="warning">⚠️ Too large for Twitter</span>
  </div>
  <div class="optimization-suggestions">
    <button>Optimize for Twitter (reduce to 140s)</button>
    <button>Optimize for Instagram Reel</button>
    <button>Compress (reduce quality)</button>
  </div>
</div>
```

### 5. Thumbnail Selection
- Auto-generate 3-5 thumbnails
- Let user choose cover image
- Or upload custom thumbnail
- Platform-specific thumbnail requirements

### 6. Video Scheduling Rules
```javascript
const videoSchedulingRules = {
  twitter: {
    checkDuration: (video) => video.duration <= 140,
    checkSize: (video) => video.size <= 512 * 1024 * 1024,
    suggestFix: (video) => {
      if (video.duration > 140) return "Trim to 2:20";
      if (video.size > 512 * 1024 * 1024) return "Compress to under 512MB";
    }
  }
};
```

### 7. Subtitle/Caption Support
- Auto-generate captions (using Web Speech API?)
- Upload SRT files
- Burn-in captions for platforms without native support
- Multi-language support

---

## 🏗️ Implementation Phases

### Phase 1: Basic Video Upload (MVP)
```javascript
// Just validate and show preview
class BasicVideoSupport {
  async handleVideoSelect(file) {
    // 1. Validate format
    const validFormats = ['video/mp4', 'video/quicktime'];
    if (!validFormats.includes(file.type)) {
      throw new Error('Please use MP4 or MOV format');
    }
    
    // 2. Check size
    const maxSize = this.getMaxSize(currentPlatform);
    if (file.size > maxSize) {
      throw new Error(`Video too large. Max: ${maxSize / 1024 / 1024}MB`);
    }
    
    // 3. Create preview
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    
    // 4. Get metadata
    await new Promise(resolve => {
      video.onloadedmetadata = resolve;
    });
    
    return {
      file,
      preview: url,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight
    };
  }
}
```

### Phase 2: Platform Validation
- Check requirements before upload
- Show clear error messages
- Suggest fixes
- Platform compatibility matrix

### Phase 3: Basic Compression (Optional FFmpeg)
- Make FFmpeg optional download
- Fallback to web-based compression
- Or show manual compression guide

### Phase 4: Advanced Features
- Multi-video posts
- Video carousels
- Stories support
- IGTV/YouTube integration

---

## 📦 Package Options

### Minimal (Web-Based Only)
- File size validation
- Format checking  
- Preview generation
- Duration checking
- **App Size: +0MB**

### Standard (With Optional FFmpeg)
- Everything in Minimal
- Optional FFmpeg download
- Basic compression
- Format conversion
- **App Size: +0MB (90MB optional)**

### Professional (Built-in FFmpeg)
- Everything in Standard
- FFmpeg bundled
- Advanced editing
- All formats supported
- **App Size: +90MB**

### Cloud-Powered
- Everything in Minimal
- Cloud processing API
- No local processing
- **App Size: +0MB**
- **Cost: $X/month**

---

## 🎯 Recommended Approach

### Start Simple (Phase 1)
1. **Video Preview** - Show video in composer
2. **Platform Validation** - Check if video meets requirements
3. **Upload Support** - Send to platform APIs
4. **Progress Tracking** - Show upload progress

### Then Add (Phase 2)
1. **Compression Warnings** - "This video is too large"
2. **Format Validation** - "Twitter doesn't support .avi"
3. **Duration Limits** - "Instagram Reels max 90 seconds"
4. **Optimization Suggestions** - "Compress to 720p for faster upload"

### Advanced (Phase 3)
1. **Optional FFmpeg** - Download on demand
2. **Browser Compression** - For simple cases
3. **Cloud Processing** - For pro users
4. **Batch Processing** - Multiple videos at once

---

## 🤔 Key Decisions Needed

1. **Compression Strategy**
   - Client-side (FFmpeg) - More control, larger app
   - Browser-based - Smaller app, limited features
   - Cloud-based - No processing, requires internet
   - Hybrid - Best of all, more complex

2. **Storage Approach**
   - Store videos locally - More disk space
   - Upload immediately - Requires good internet
   - Progressive upload - Upload in background

3. **Format Support**
   - MP4 only - Simplest, works everywhere
   - All formats - Requires FFmpeg
   - Platform-specific - Convert as needed

4. **User Experience**
   - Automatic optimization - Less control
   - Manual settings - More complex
   - Wizard/guided - Balance of both

---

## 🚀 Quick Win Implementation

```javascript
// Start with this - works today!
class VideoSupportMVP {
  constructor() {
    this.platformLimits = {
      twitter: { maxSize: 512 * 1024 * 1024, maxDuration: 140, formats: ['.mp4', '.mov'] },
      instagram: { maxSize: 650 * 1024 * 1024, maxDuration: 60, formats: ['.mp4', '.mov'] },
      mastodon: { maxSize: 200 * 1024 * 1024, maxDuration: 300, formats: ['.mp4', '.webm'] }
    };
  }
  
  async validateVideo(file, platform) {
    const limits = this.platformLimits[platform];
    const errors = [];
    
    // Check format
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!limits.formats.includes(ext)) {
      errors.push(`Format not supported. Use: ${limits.formats.join(', ')}`);
    }
    
    // Check size
    if (file.size > limits.maxSize) {
      const sizeMB = Math.round(file.size / 1024 / 1024);
      const maxMB = Math.round(limits.maxSize / 1024 / 1024);
      errors.push(`File too large: ${sizeMB}MB (max: ${maxMB}MB)`);
    }
    
    // Check duration
    const duration = await this.getVideoDuration(file);
    if (duration > limits.maxDuration) {
      errors.push(`Video too long: ${Math.round(duration)}s (max: ${limits.maxDuration}s)`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      suggestions: this.getSuggestions(errors, platform)
    };
  }
  
  async getVideoDuration(file) {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    
    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
    });
  }
  
  getSuggestions(errors, platform) {
    const suggestions = [];
    
    errors.forEach(error => {
      if (error.includes('too large')) {
        suggestions.push('Try compressing with HandBrake or online tool');
      }
      if (error.includes('too long')) {
        suggestions.push('Trim video to fit platform limits');
      }
      if (error.includes('Format not')) {
        suggestions.push('Convert to MP4 using any video converter');
      }
    });
    
    return suggestions;
  }
}
```

---

## 📝 User Stories

1. **"I want to post a video to all my accounts"**
   - Upload once
   - Auto-optimize for each platform
   - Schedule to all compatible accounts

2. **"My video is too big for Twitter"**
   - Get clear error message
   - One-click compress option
   - Or manual compress guide

3. **"I want to schedule Instagram Reels"**
   - Vertical video template
   - 9:16 aspect ratio check
   - Duration limit enforcement

4. **"I need captions on my videos"**
   - Upload SRT file
   - Or auto-generate (future)
   - Burn-in for platforms without native support

---

## 🎬 Next Steps

1. **Research**: Which platforms do users want most?
2. **Prototype**: Build basic video preview/validation
3. **Test**: Try uploading to each platform
4. **Iterate**: Add compression based on user needs
5. **Scale**: Add advanced features as needed

**The key is to start simple and add complexity only when users need it!**
