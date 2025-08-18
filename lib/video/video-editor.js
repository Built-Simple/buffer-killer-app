// Video Editor - Progressive enhancement with optional FFmpeg
class VideoEditor {
  constructor() {
    this.ffmpegAvailable = false;
    this.ffmpeg = null;
    this.currentVideo = null;
    this.editTimeline = null;
    this.trimStart = 0;
    this.trimEnd = null;
    
    // Check for FFmpeg availability
    this.checkFFmpeg();
  }
  
  async checkFFmpeg() {
    try {
      // Check if FFmpeg.wasm is available
      if (typeof FFmpeg !== 'undefined') {
        this.ffmpegAvailable = true;
        await this.initializeFFmpeg();
      } else {
        console.log('FFmpeg not available - running in basic mode');
      }
    } catch (error) {
      console.log('FFmpeg initialization failed:', error);
      this.ffmpegAvailable = false;
    }
  }
  
  async initializeFFmpeg() {
    if (!this.ffmpegAvailable) return;
    
    try {
      const { createFFmpeg, fetchFile } = FFmpeg;
      this.ffmpeg = createFFmpeg({
        log: false,
        progress: ({ ratio }) => {
          this.onProgress?.(ratio * 100);
        }
      });
      
      if (!this.ffmpeg.isLoaded()) {
        await this.ffmpeg.load();
      }
      
      this.fetchFile = fetchFile;
      console.log('FFmpeg initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error);
      this.ffmpegAvailable = false;
    }
  }
  
  // Create the editor UI
  createEditorUI(container, videoFile) {
    this.currentVideo = videoFile;
    
    const editorHTML = `
      <div class="video-editor-container" style="
        background: #1a1a1a;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
      ">
        <h3 style="color: white; margin-bottom: 20px;">
          🎬 Video Editor ${this.ffmpegAvailable ? '(Pro Mode)' : '(Basic Mode)'}
        </h3>
        
        <!-- Video Preview -->
        <div class="editor-preview" style="
          position: relative;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 20px;
        ">
          <video 
            id="editor-video" 
            controls 
            style="width: 100%; max-height: 400px; display: block;"
          ></video>
          
          <!-- Playback controls overlay -->
          <div class="playback-controls" style="
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 8px;
            display: flex;
            gap: 10px;
          ">
            <button onclick="videoEditor.playPause()" style="
              background: #667eea;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
            ">⏯️ Play/Pause</button>
            
            <button onclick="videoEditor.restart()" style="
              background: #444;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
            ">⏮️ Restart</button>
          </div>
        </div>
        
        <!-- Timeline -->
        <div class="editor-timeline" style="
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        ">
          <h4 style="color: white; margin-bottom: 15px;">📍 Timeline</h4>
          
          <!-- Trim Controls -->
          <div class="trim-controls" style="margin-bottom: 15px;">
            <div style="color: #999; font-size: 14px; margin-bottom: 10px;">
              Trim Video (Set start and end points)
            </div>
            
            <div style="display: flex; gap: 20px; align-items: center;">
              <div>
                <label style="color: #999; font-size: 12px;">Start Time</label>
                <input 
                  type="number" 
                  id="trim-start" 
                  min="0" 
                  step="0.1" 
                  value="0"
                  style="
                    width: 80px;
                    padding: 5px;
                    background: #1a1a1a;
                    color: white;
                    border: 1px solid #444;
                    border-radius: 4px;
                  "
                  onchange="videoEditor.setTrimStart(this.value)"
                > seconds
              </div>
              
              <div>
                <label style="color: #999; font-size: 12px;">End Time</label>
                <input 
                  type="number" 
                  id="trim-end" 
                  min="0" 
                  step="0.1"
                  style="
                    width: 80px;
                    padding: 5px;
                    background: #1a1a1a;
                    color: white;
                    border: 1px solid #444;
                    border-radius: 4px;
                  "
                  onchange="videoEditor.setTrimEnd(this.value)"
                > seconds
              </div>
              
              <button 
                onclick="videoEditor.previewTrim()"
                style="
                  background: #667eea;
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                "
              >👁️ Preview Trim</button>
            </div>
          </div>
          
          <!-- Visual Timeline -->
          <div class="timeline-visual" style="
            position: relative;
            height: 60px;
            background: #1a1a1a;
            border-radius: 4px;
            margin-top: 15px;
            overflow: hidden;
          ">
            <div id="timeline-bar" style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
              opacity: 0.3;
            "></div>
            
            <div id="trim-region" style="
              position: absolute;
              top: 0;
              bottom: 0;
              left: 0%;
              right: 0%;
              background: rgba(102, 126, 234, 0.5);
              border-left: 2px solid #667eea;
              border-right: 2px solid #764ba2;
            "></div>
            
            <div id="playhead" style="
              position: absolute;
              top: 0;
              bottom: 0;
              left: 0;
              width: 2px;
              background: white;
              box-shadow: 0 0 10px rgba(255,255,255,0.5);
            "></div>
          </div>
        </div>
        
        ${this.ffmpegAvailable ? this.getProEditingTools() : this.getBasicEditingTools()}
        
        <!-- Export Options -->
        <div class="export-options" style="
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        ">
          <h4 style="color: white; margin-bottom: 15px;">💾 Export Settings</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <label style="color: #999; font-size: 12px; display: block; margin-bottom: 5px;">
                Platform Preset
              </label>
              <select 
                id="platform-preset"
                style="
                  width: 100%;
                  padding: 8px;
                  background: #1a1a1a;
                  color: white;
                  border: 1px solid #444;
                  border-radius: 4px;
                "
                onchange="videoEditor.applyPreset(this.value)"
              >
                <option value="twitter">Twitter (512MB, 2:20, H.264)</option>
                <option value="instagram">Instagram (650MB, 60s, H.264)</option>
                <option value="mastodon">Mastodon (200MB, 5min)</option>
                <option value="linkedin">LinkedIn (5GB, 10min)</option>
                <option value="custom">Custom Settings</option>
              </select>
            </div>
            
            <div>
              <label style="color: #999; font-size: 12px; display: block; margin-bottom: 5px;">
                Quality
              </label>
              <select 
                id="export-quality"
                style="
                  width: 100%;
                  padding: 8px;
                  background: #1a1a1a;
                  color: white;
                  border: 1px solid #444;
                  border-radius: 4px;
                "
              >
                <option value="high">High (Original)</option>
                <option value="medium" selected>Medium (Compressed)</option>
                <option value="low">Low (Small file)</option>
              </select>
            </div>
          </div>
          
          <div id="export-info" style="
            padding: 10px;
            background: #1a1a1a;
            border-radius: 4px;
            color: #999;
            font-size: 14px;
            margin-bottom: 15px;
          ">
            Estimated output size: Calculating...
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="editor-actions" style="
          display: flex;
          gap: 10px;
          justify-content: space-between;
        ">
          <div style="display: flex; gap: 10px;">
            <button 
              onclick="videoEditor.resetEdits()"
              style="
                background: #444;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
              "
            >↩️ Reset All Edits</button>
          </div>
          
          <div style="display: flex; gap: 10px;">
            <button 
              onclick="videoEditor.cancel()"
              style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
              "
            >❌ Cancel</button>
            
            <button 
              onclick="videoEditor.useOriginal()"
              style="
                background: #444;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
              "
            >📤 Use Original</button>
            
            <button 
              onclick="videoEditor.exportVideo()"
              style="
                background: #28a745;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
              "
            >🎬 ${this.ffmpegAvailable ? 'Export Edited Video' : 'Use with Trim Points'}</button>
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div id="export-progress" style="display: none; margin-top: 20px;">
          <div style="color: white; margin-bottom: 10px;">Processing video...</div>
          <div style="
            background: #2a2a2a;
            height: 30px;
            border-radius: 15px;
            overflow: hidden;
          ">
            <div id="progress-bar" style="
              height: 100%;
              background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
              width: 0%;
              transition: width 0.3s ease;
            "></div>
          </div>
          <div id="progress-text" style="
            color: #999;
            font-size: 14px;
            margin-top: 5px;
            text-align: center;
          ">0%</div>
        </div>
      </div>
    `;
    
    container.innerHTML = editorHTML;
    
    // Load video
    this.loadVideoForEditing(videoFile);
  }
  
  getProEditingTools() {
    return `
      <div class="pro-editing-tools" style="
        background: #2a2a2a;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
      ">
        <h4 style="color: white; margin-bottom: 15px;">🎨 Pro Editing Tools</h4>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <!-- Compression -->
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 6px;
          ">
            <h5 style="color: #667eea; margin-bottom: 10px;">📦 Compression</h5>
            <label style="color: #999; font-size: 12px;">Target Size (MB)</label>
            <input 
              type="number" 
              id="target-size" 
              placeholder="50"
              style="
                width: 100%;
                padding: 5px;
                background: #2a2a2a;
                color: white;
                border: 1px solid #444;
                border-radius: 4px;
                margin-top: 5px;
              "
            >
            <button 
              onclick="videoEditor.autoCompress()"
              style="
                width: 100%;
                margin-top: 10px;
                background: #667eea;
                color: white;
                border: none;
                padding: 8px;
                border-radius: 4px;
                cursor: pointer;
              "
            >Auto Compress</button>
          </div>
          
          <!-- Speed -->
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 6px;
          ">
            <h5 style="color: #667eea; margin-bottom: 10px;">⚡ Speed</h5>
            <label style="color: #999; font-size: 12px;">Playback Speed</label>
            <select 
              id="speed-control"
              style="
                width: 100%;
                padding: 5px;
                background: #2a2a2a;
                color: white;
                border: 1px solid #444;
                border-radius: 4px;
                margin-top: 5px;
              "
            >
              <option value="0.5">0.5x (Slow)</option>
              <option value="1" selected>1x (Normal)</option>
              <option value="1.5">1.5x (Fast)</option>
              <option value="2">2x (Double)</option>
            </select>
          </div>
          
          <!-- Audio -->
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 6px;
          ">
            <h5 style="color: #667eea; margin-bottom: 10px;">🔊 Audio</h5>
            <label style="
              display: flex;
              align-items: center;
              color: #999;
              font-size: 14px;
              cursor: pointer;
            ">
              <input type="checkbox" id="remove-audio" style="margin-right: 8px;">
              Remove Audio
            </label>
            <label style="
              display: flex;
              align-items: center;
              color: #999;
              font-size: 14px;
              cursor: pointer;
              margin-top: 10px;
            ">
              <input type="checkbox" id="fade-audio" style="margin-right: 8px;">
              Fade In/Out
            </label>
          </div>
          
          <!-- Resolution -->
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 6px;
          ">
            <h5 style="color: #667eea; margin-bottom: 10px;">📐 Resolution</h5>
            <label style="color: #999; font-size: 12px;">Output Resolution</label>
            <select 
              id="resolution-control"
              style="
                width: 100%;
                padding: 5px;
                background: #2a2a2a;
                color: white;
                border: 1px solid #444;
                border-radius: 4px;
                margin-top: 5px;
              "
            >
              <option value="original">Original</option>
              <option value="1080p">1080p (1920x1080)</option>
              <option value="720p">720p (1280x720)</option>
              <option value="480p">480p (854x480)</option>
              <option value="square">Square (1080x1080)</option>
            </select>
          </div>
          
          <!-- Filters -->
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 6px;
          ">
            <h5 style="color: #667eea; margin-bottom: 10px;">✨ Filters</h5>
            <select 
              id="filter-control"
              style="
                width: 100%;
                padding: 5px;
                background: #2a2a2a;
                color: white;
                border: 1px solid #444;
                border-radius: 4px;
              "
            >
              <option value="none">None</option>
              <option value="brightness">Brighten</option>
              <option value="contrast">High Contrast</option>
              <option value="saturation">Vibrant</option>
              <option value="grayscale">Black & White</option>
              <option value="blur">Blur</option>
            </select>
          </div>
          
          <!-- Watermark -->
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 6px;
          ">
            <h5 style="color: #667eea; margin-bottom: 10px;">💧 Watermark</h5>
            <label style="
              display: flex;
              align-items: center;
              color: #999;
              font-size: 14px;
              cursor: pointer;
            ">
              <input type="checkbox" id="add-watermark" style="margin-right: 8px;">
              Add Watermark
            </label>
            <input 
              type="text" 
              id="watermark-text" 
              placeholder="@username"
              style="
                width: 100%;
                padding: 5px;
                background: #2a2a2a;
                color: white;
                border: 1px solid #444;
                border-radius: 4px;
                margin-top: 10px;
              "
            >
          </div>
        </div>
      </div>
    `;
  }
  
  getBasicEditingTools() {
    return `
      <div class="basic-editing-info" style="
        background: rgba(246, 173, 85, 0.1);
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #f6ad55;
      ">
        <h4 style="color: #f6ad55; margin-bottom: 10px;">💡 Basic Mode</h4>
        <p style="color: #f6ad55; font-size: 14px; line-height: 1.6;">
          You're in Basic Mode. You can set trim points and preview them, but the actual video editing 
          will need to be done with external tools.
        </p>
        <p style="color: #f6ad55; font-size: 14px; line-height: 1.6; margin-top: 10px;">
          To enable Pro Mode with full editing capabilities, install FFmpeg.wasm:
        </p>
        <button 
          onclick="videoEditor.showFFmpegGuide()"
          style="
            background: #f6ad55;
            color: #1a1a1a;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            font-weight: bold;
          "
        >📖 How to Enable Pro Mode</button>
      </div>
    `;
  }
  
  async loadVideoForEditing(file) {
    const video = document.getElementById('editor-video');
    const url = URL.createObjectURL(file);
    video.src = url;
    
    video.onloadedmetadata = () => {
      // Set trim end to video duration
      this.trimEnd = video.duration;
      document.getElementById('trim-end').value = video.duration.toFixed(1);
      
      // Update timeline
      this.updateTimeline();
      
      // Estimate output size
      this.estimateOutputSize();
    };
    
    // Update playhead position during playback
    video.ontimeupdate = () => {
      this.updatePlayhead();
    };
  }
  
  // Playback controls
  playPause() {
    const video = document.getElementById('editor-video');
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }
  
  restart() {
    const video = document.getElementById('editor-video');
    video.currentTime = this.trimStart;
    video.play();
  }
  
  // Trim controls
  setTrimStart(value) {
    this.trimStart = parseFloat(value);
    this.updateTimeline();
    this.estimateOutputSize();
  }
  
  setTrimEnd(value) {
    this.trimEnd = parseFloat(value);
    this.updateTimeline();
    this.estimateOutputSize();
  }
  
  previewTrim() {
    const video = document.getElementById('editor-video');
    video.currentTime = this.trimStart;
    video.play();
    
    // Stop at trim end
    const checkTime = setInterval(() => {
      if (video.currentTime >= this.trimEnd) {
        video.pause();
        clearInterval(checkTime);
      }
    }, 100);
  }
  
  updateTimeline() {
    const video = document.getElementById('editor-video');
    if (!video.duration) return;
    
    const trimRegion = document.getElementById('trim-region');
    const startPercent = (this.trimStart / video.duration) * 100;
    const endPercent = (this.trimEnd / video.duration) * 100;
    
    trimRegion.style.left = `${startPercent}%`;
    trimRegion.style.right = `${100 - endPercent}%`;
  }
  
  updatePlayhead() {
    const video = document.getElementById('editor-video');
    const playhead = document.getElementById('playhead');
    
    if (video.duration) {
      const percent = (video.currentTime / video.duration) * 100;
      playhead.style.left = `${percent}%`;
    }
  }
  
  estimateOutputSize() {
    const video = document.getElementById('editor-video');
    const quality = document.getElementById('export-quality').value;
    const duration = this.trimEnd - this.trimStart;
    
    // Rough estimates based on quality
    const bitrates = {
      high: 5000, // 5 Mbps
      medium: 2500, // 2.5 Mbps
      low: 1000 // 1 Mbps
    };
    
    const bitrate = bitrates[quality] || bitrates.medium;
    const sizeInMB = (bitrate * duration / 8 / 1000).toFixed(1);
    
    document.getElementById('export-info').innerHTML = `
      Estimated output: ~${sizeInMB} MB
      <br>Duration: ${duration.toFixed(1)} seconds
      ${this.ffmpegAvailable ? '' : '<br><em>Note: Actual export requires external tools in Basic Mode</em>'}
    `;
  }
  
  applyPreset(platform) {
    // Apply platform-specific settings
    const presets = {
      twitter: {
        maxDuration: 140,
        quality: 'medium',
        resolution: '720p'
      },
      instagram: {
        maxDuration: 60,
        quality: 'medium',
        resolution: 'square'
      },
      mastodon: {
        maxDuration: 300,
        quality: 'medium',
        resolution: '720p'
      },
      linkedin: {
        maxDuration: 600,
        quality: 'high',
        resolution: '1080p'
      }
    };
    
    const preset = presets[platform];
    if (preset) {
      // Apply quality
      document.getElementById('export-quality').value = preset.quality;
      
      // Set resolution if in pro mode
      const resolutionControl = document.getElementById('resolution-control');
      if (resolutionControl) {
        resolutionControl.value = preset.resolution;
      }
      
      // Warn if video is too long
      const duration = this.trimEnd - this.trimStart;
      if (duration > preset.maxDuration) {
        this.showNotification(
          `⚠️ Video is longer than ${platform}'s limit (${preset.maxDuration}s). Consider trimming.`,
          'warning'
        );
      }
      
      this.estimateOutputSize();
    }
  }
  
  async exportVideo() {
    if (this.ffmpegAvailable) {
      await this.exportWithFFmpeg();
    } else {
      this.exportBasicMode();
    }
  }
  
  async exportWithFFmpeg() {
    // Show progress
    document.getElementById('export-progress').style.display = 'block';
    
    try {
      // Write input file
      this.ffmpeg.FS('writeFile', 'input.mp4', await this.fetchFile(this.currentVideo));
      
      // Build FFmpeg command
      const commands = this.buildFFmpegCommand();
      
      // Run FFmpeg
      await this.ffmpeg.run(...commands);
      
      // Read output file
      const data = this.ffmpeg.FS('readFile', 'output.mp4');
      
      // Create blob and trigger download
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      // Return edited video
      const editedFile = new File([blob], `edited_${this.currentVideo.name}`, {
        type: 'video/mp4'
      });
      
      // Dispatch event with edited video
      const event = new CustomEvent('videoEdited', {
        detail: { file: editedFile, url: url }
      });
      document.dispatchEvent(event);
      
      this.showNotification('✅ Video exported successfully!', 'success');
      
    } catch (error) {
      console.error('FFmpeg export error:', error);
      this.showNotification('❌ Export failed: ' + error.message, 'error');
    } finally {
      document.getElementById('export-progress').style.display = 'none';
    }
  }
  
  buildFFmpegCommand() {
    const commands = ['-i', 'input.mp4'];
    
    // Trim
    if (this.trimStart > 0) {
      commands.push('-ss', this.trimStart.toString());
    }
    if (this.trimEnd < this.currentVideo.duration) {
      commands.push('-t', (this.trimEnd - this.trimStart).toString());
    }
    
    // Quality
    const quality = document.getElementById('export-quality').value;
    const crf = { high: 18, medium: 23, low: 28 };
    commands.push('-crf', crf[quality].toString());
    
    // Speed
    const speed = document.getElementById('speed-control')?.value;
    if (speed && speed !== '1') {
      commands.push('-filter:v', `setpts=${1/parseFloat(speed)}*PTS`);
      commands.push('-filter:a', `atempo=${speed}`);
    }
    
    // Audio
    if (document.getElementById('remove-audio')?.checked) {
      commands.push('-an');
    }
    
    // Resolution
    const resolution = document.getElementById('resolution-control')?.value;
    if (resolution && resolution !== 'original') {
      const resolutions = {
        '1080p': 'scale=1920:1080',
        '720p': 'scale=1280:720',
        '480p': 'scale=854:480',
        'square': 'scale=1080:1080'
      };
      commands.push('-vf', resolutions[resolution]);
    }
    
    // Output
    commands.push('output.mp4');
    
    return commands;
  }
  
  exportBasicMode() {
    // In basic mode, just save the trim points
    const trimData = {
      start: this.trimStart,
      end: this.trimEnd,
      duration: this.trimEnd - this.trimStart,
      originalFile: this.currentVideo
    };
    
    // Show instructions
    const modal = this.createBasicExportModal(trimData);
    document.body.appendChild(modal);
    
    // Dispatch event with trim data
    const event = new CustomEvent('videoTrimmed', {
      detail: trimData
    });
    document.dispatchEvent(event);
  }
  
  createBasicExportModal(trimData) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>📹 Video Trim Points Saved</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 20px;">
            Your trim points have been saved. To actually trim the video, use one of these free tools:
          </p>
          
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          ">
            <h4 style="color: #667eea; margin-bottom: 10px;">Your Trim Settings:</h4>
            <p>Start: ${trimData.start.toFixed(1)} seconds</p>
            <p>End: ${trimData.end.toFixed(1)} seconds</p>
            <p>New Duration: ${trimData.duration.toFixed(1)} seconds</p>
          </div>
          
          <h4 style="margin-bottom: 10px;">Quick Trim Tools:</h4>
          
          <div style="margin-bottom: 15px;">
            <h5>🌐 Online (No Install):</h5>
            <ul>
              <li><a href="https://online-video-cutter.com" target="_blank">Online Video Cutter</a> - Simple, free</li>
              <li><a href="https://clideo.com/cut-video" target="_blank">Clideo</a> - 500MB free limit</li>
              <li><a href="https://www.kapwing.com/tools/trim-video" target="_blank">Kapwing</a> - Free with watermark</li>
            </ul>
          </div>
          
          <div style="margin-bottom: 15px;">
            <h5>💻 Desktop Software:</h5>
            <ul>
              <li><strong>VLC</strong> - View → Advanced Controls → Record button</li>
              <li><strong>Windows Photos</strong> - Built-in trimming</li>
              <li><strong>QuickTime (Mac)</strong> - Edit → Trim</li>
            </ul>
          </div>
          
          <div style="margin-bottom: 15px;">
            <h5>⚡ FFmpeg Command (if installed):</h5>
            <code style="
              display: block;
              background: #1a1a1a;
              padding: 10px;
              border-radius: 4px;
              font-size: 12px;
              word-break: break-all;
            ">
              ffmpeg -i "${this.currentVideo.name}" -ss ${trimData.start} -t ${trimData.duration} -c copy output.mp4
            </code>
          </div>
          
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button 
              class="btn btn-secondary" 
              onclick="this.closest('.modal').remove()"
            >Close</button>
            <button 
              class="btn btn-primary" 
              onclick="videoEditor.useOriginal(); this.closest('.modal').remove();"
            >Use Original Video</button>
          </div>
        </div>
      </div>
    `;
    
    return modal;
  }
  
  resetEdits() {
    // Reset all controls
    this.trimStart = 0;
    this.trimEnd = document.getElementById('editor-video').duration || 0;
    
    document.getElementById('trim-start').value = 0;
    document.getElementById('trim-end').value = this.trimEnd.toFixed(1);
    
    // Reset other controls if they exist
    const controls = [
      'export-quality',
      'speed-control',
      'remove-audio',
      'fade-audio',
      'resolution-control',
      'filter-control',
      'add-watermark',
      'watermark-text'
    ];
    
    controls.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = false;
        } else if (element.tagName === 'SELECT') {
          element.selectedIndex = 0;
        } else {
          element.value = '';
        }
      }
    });
    
    this.updateTimeline();
    this.estimateOutputSize();
    
    this.showNotification('↩️ All edits reset', 'info');
  }
  
  useOriginal() {
    // Use original video without edits
    const event = new CustomEvent('videoAccepted', {
      detail: { file: this.currentVideo }
    });
    document.dispatchEvent(event);
    
    this.closeEditor();
  }
  
  cancel() {
    this.closeEditor();
  }
  
  closeEditor() {
    const container = document.querySelector('.video-editor-container');
    if (container) {
      container.remove();
    }
  }
  
  showFFmpegGuide() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h2>🚀 Enable Pro Video Editing</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 20px;">
            Pro Mode unlocks powerful video editing features directly in Buffer Killer using FFmpeg.wasm.
          </p>
          
          <h3>Features in Pro Mode:</h3>
          <ul>
            <li>✂️ Trim videos without external tools</li>
            <li>📦 Automatic compression to target size</li>
            <li>⚡ Speed up or slow down videos</li>
            <li>🔇 Remove or fade audio</li>
            <li>📐 Change resolution and aspect ratio</li>
            <li>✨ Apply filters and effects</li>
            <li>💧 Add watermarks</li>
          </ul>
          
          <h3 style="margin-top: 20px;">How to Enable:</h3>
          
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          ">
            <h4>Option 1: Automatic (Recommended)</h4>
            <p>Add this to your main.js:</p>
            <code style="
              display: block;
              background: #2a2a2a;
              padding: 10px;
              border-radius: 4px;
              margin-top: 10px;
            ">
              npm install @ffmpeg/ffmpeg @ffmpeg/core
            </code>
          </div>
          
          <div style="
            background: #1a1a1a;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          ">
            <h4>Option 2: CDN (Quick Test)</h4>
            <p>Add to index.html:</p>
            <code style="
              display: block;
              background: #2a2a2a;
              padding: 10px;
              border-radius: 4px;
              margin-top: 10px;
              font-size: 12px;
            ">
&lt;script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.0/dist/ffmpeg.min.js"&gt;&lt;/script&gt;
&lt;script src="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.0/dist/ffmpeg-core.js"&gt;&lt;/script&gt;
            </code>
          </div>
          
          <p style="
            background: rgba(246, 173, 85, 0.1);
            padding: 15px;
            border-radius: 8px;
            color: #f6ad55;
          ">
            <strong>Note:</strong> FFmpeg.wasm is about 25MB. It loads only when needed and enables 
            powerful video editing without requiring users to install anything!
          </p>
          
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button 
              class="btn btn-secondary" 
              onclick="this.closest('.modal').remove()"
            >Maybe Later</button>
            <button 
              class="btn btn-primary" 
              onclick="window.open('https://github.com/ffmpegwasm/ffmpeg.wasm', '_blank')"
            >Learn More</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
  
  onProgress(percent) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }
    if (progressText) {
      progressText.textContent = `${Math.round(percent)}%`;
    }
  }
}

// Create global instance
const videoEditor = new VideoEditor();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoEditor;
}