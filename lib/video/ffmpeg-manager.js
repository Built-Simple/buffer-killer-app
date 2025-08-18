// FFmpeg.wasm Loader and Manager
// Handles loading and operations with FFmpeg in the browser

class FFmpegManager {
  constructor() {
    this.ffmpeg = null;
    this.loaded = false;
    this.loading = false;
    this.progress = 0;
    this.progressCallback = null;
  }

  // Load FFmpeg.wasm (only once)
  async load() {
    if (this.loaded) return true;
    if (this.loading) {
      // Wait for ongoing load
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.loaded) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }

    this.loading = true;
    
    try {
      // Dynamic import of FFmpeg
      if (typeof FFmpeg === 'undefined') {
        // Load from CDN
        await this.loadFromCDN();
      }
      
      const { createFFmpeg, fetchFile } = FFmpeg;
      this.fetchFile = fetchFile;
      
      this.ffmpeg = createFFmpeg({
        log: false, // Set to true for debugging
        progress: ({ ratio }) => {
          this.progress = ratio * 100;
          if (this.progressCallback) {
            this.progressCallback(this.progress);
          }
        },
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
      });
      
      console.log('Loading FFmpeg.wasm...');
      await this.ffmpeg.load();
      console.log('FFmpeg.wasm loaded successfully!');
      
      this.loaded = true;
      this.loading = false;
      return true;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      this.loading = false;
      throw error;
    }
  }

  // Load FFmpeg from CDN
  async loadFromCDN() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.0/dist/ffmpeg.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Set progress callback
  onProgress(callback) {
    this.progressCallback = callback;
  }

  // Get video metadata
  async getMetadata(file) {
    await this.load();
    
    // Write file to FFmpeg filesystem
    this.ffmpeg.FS('writeFile', 'input', await this.fetchFile(file));
    
    // Get video info using ffprobe-like command
    await this.ffmpeg.run(
      '-i', 'input',
      '-f', 'null',
      '-'
    );
    
    // Parse logs for metadata (FFmpeg logs contain video info)
    // For now, return basic info
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size
        };
        URL.revokeObjectURL(url);
        resolve(metadata);
      };
    });
  }

  // Trim video
  async trimVideo(file, startTime, endTime) {
    await this.load();
    
    console.log(`Trimming video from ${startTime} to ${endTime}`);
    
    // Write input file
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));
    
    // Build FFmpeg command
    const args = [
      '-i', inputName,
      '-ss', this.formatTime(startTime),
      '-to', this.formatTime(endTime),
      '-c', 'copy', // Copy codec (no re-encoding for speed)
      '-avoid_negative_ts', 'make_zero',
      outputName
    ];
    
    // Run FFmpeg
    await this.ffmpeg.run(...args);
    
    // Read output
    const data = this.ffmpeg.FS('readFile', outputName);
    
    // Clean up
    this.ffmpeg.FS('unlink', inputName);
    this.ffmpeg.FS('unlink', outputName);
    
    // Return as Blob
    return new Blob([data.buffer], { type: 'video/mp4' });
  }

  // Compress video
  async compressVideo(file, quality = 'medium') {
    await this.load();
    
    const presets = {
      high: {
        crf: 20,
        preset: 'medium',
        videoBitrate: '2M',
        audioBitrate: '128k'
      },
      medium: {
        crf: 25,
        preset: 'medium',
        videoBitrate: '1M',
        audioBitrate: '96k'
      },
      low: {
        crf: 30,
        preset: 'fast',
        videoBitrate: '500k',
        audioBitrate: '64k'
      }
    };
    
    const settings = presets[quality] || presets.medium;
    
    console.log(`Compressing video with quality: ${quality}`);
    
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));
    
    const args = [
      '-i', inputName,
      '-c:v', 'libx264',
      '-crf', settings.crf.toString(),
      '-preset', settings.preset,
      '-b:v', settings.videoBitrate,
      '-maxrate', settings.videoBitrate,
      '-bufsize', '2M',
      '-c:a', 'aac',
      '-b:a', settings.audioBitrate,
      '-movflags', '+faststart', // Optimize for streaming
      outputName
    ];
    
    await this.ffmpeg.run(...args);
    
    const data = this.ffmpeg.FS('readFile', outputName);
    
    // Clean up
    this.ffmpeg.FS('unlink', inputName);
    this.ffmpeg.FS('unlink', outputName);
    
    return new Blob([data.buffer], { type: 'video/mp4' });
  }

  // Resize video
  async resizeVideo(file, width, height) {
    await this.load();
    
    console.log(`Resizing video to ${width}x${height}`);
    
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));
    
    const args = [
      '-i', inputName,
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      '-c:a', 'copy',
      outputName
    ];
    
    await this.ffmpeg.run(...args);
    
    const data = this.ffmpeg.FS('readFile', outputName);
    
    // Clean up
    this.ffmpeg.FS('unlink', inputName);
    this.ffmpeg.FS('unlink', outputName);
    
    return new Blob([data.buffer], { type: 'video/mp4' });
  }

  // Platform-specific optimization
  async optimizeForPlatform(file, platform) {
    await this.load();
    
    const presets = {
      twitter: {
        maxDuration: 140,
        maxWidth: 1920,
        maxHeight: 1200,
        maxSize: 512 * 1024 * 1024,
        crf: 23
      },
      'instagram-feed': {
        maxDuration: 60,
        width: 1080,
        height: 1080,
        maxSize: 650 * 1024 * 1024,
        crf: 23
      },
      'instagram-reel': {
        maxDuration: 90,
        width: 1080,
        height: 1920,
        maxSize: 650 * 1024 * 1024,
        crf: 23
      },
      'instagram-story': {
        maxDuration: 60,
        width: 1080,
        height: 1920,
        maxSize: 650 * 1024 * 1024,
        crf: 23
      },
      linkedin: {
        maxDuration: 600,
        maxWidth: 4096,
        maxHeight: 2304,
        maxSize: 5 * 1024 * 1024 * 1024,
        crf: 20
      },
      mastodon: {
        maxDuration: 300,
        maxWidth: 1920,
        maxHeight: 1080,
        maxSize: 200 * 1024 * 1024,
        crf: 24
      }
    };
    
    const preset = presets[platform];
    if (!preset) {
      throw new Error(`Unknown platform preset: ${platform}`);
    }
    
    console.log(`Optimizing for ${platform}...`);
    
    // Get current metadata
    const metadata = await this.getMetadata(file);
    
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));
    
    // Build FFmpeg command based on platform requirements
    const args = ['-i', inputName];
    
    // Trim if too long
    if (metadata.duration > preset.maxDuration) {
      args.push('-t', preset.maxDuration.toString());
    }
    
    // Resize if needed
    if (preset.width && preset.height) {
      // Force specific size with padding
      args.push('-vf', `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2`);
    } else if (preset.maxWidth || preset.maxHeight) {
      // Scale down if larger than max
      const w = preset.maxWidth || -1;
      const h = preset.maxHeight || -1;
      args.push('-vf', `scale='min(${w},iw)':'min(${h},ih)'`);
    }
    
    // Video encoding
    args.push(
      '-c:v', 'libx264',
      '-crf', preset.crf.toString(),
      '-preset', 'medium',
      '-movflags', '+faststart'
    );
    
    // Audio encoding
    args.push(
      '-c:a', 'aac',
      '-b:a', '128k'
    );
    
    // Output file
    args.push(outputName);
    
    await this.ffmpeg.run(...args);
    
    const data = this.ffmpeg.FS('readFile', outputName);
    const resultBlob = new Blob([data.buffer], { type: 'video/mp4' });
    
    // Check if size is still too large
    if (resultBlob.size > preset.maxSize) {
      console.log('File still too large, applying more compression...');
      // Re-encode with lower quality
      const lowerCrf = preset.crf + 5;
      
      this.ffmpeg.FS('writeFile', 'temp.mp4', data);
      
      await this.ffmpeg.run(
        '-i', 'temp.mp4',
        '-c:v', 'libx264',
        '-crf', lowerCrf.toString(),
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '96k',
        'final.mp4'
      );
      
      const finalData = this.ffmpeg.FS('readFile', 'final.mp4');
      
      // Clean up
      this.ffmpeg.FS('unlink', 'temp.mp4');
      this.ffmpeg.FS('unlink', 'final.mp4');
      this.ffmpeg.FS('unlink', inputName);
      this.ffmpeg.FS('unlink', outputName);
      
      return new Blob([finalData.buffer], { type: 'video/mp4' });
    }
    
    // Clean up
    this.ffmpeg.FS('unlink', inputName);
    this.ffmpeg.FS('unlink', outputName);
    
    return resultBlob;
  }

  // Convert video format
  async convertFormat(file, outputFormat = 'mp4') {
    await this.load();
    
    const formats = {
      mp4: { ext: 'mp4', codec: 'libx264', audio: 'aac' },
      webm: { ext: 'webm', codec: 'libvpx-vp9', audio: 'libopus' },
      mov: { ext: 'mov', codec: 'libx264', audio: 'aac' }
    };
    
    const format = formats[outputFormat];
    if (!format) {
      throw new Error(`Unsupported format: ${outputFormat}`);
    }
    
    const inputName = `input.${file.name.split('.').pop()}`;
    const outputName = `output.${format.ext}`;
    
    this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));
    
    await this.ffmpeg.run(
      '-i', inputName,
      '-c:v', format.codec,
      '-c:a', format.audio,
      outputName
    );
    
    const data = this.ffmpeg.FS('readFile', outputName);
    
    // Clean up
    this.ffmpeg.FS('unlink', inputName);
    this.ffmpeg.FS('unlink', outputName);
    
    return new Blob([data.buffer], { type: `video/${format.ext}` });
  }

  // Extract thumbnail
  async extractThumbnail(file, time = 0) {
    await this.load();
    
    const inputName = 'input.mp4';
    const outputName = 'thumbnail.jpg';
    
    this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));
    
    await this.ffmpeg.run(
      '-i', inputName,
      '-ss', this.formatTime(time),
      '-frames:v', '1',
      '-q:v', '2',
      outputName
    );
    
    const data = this.ffmpeg.FS('readFile', outputName);
    
    // Clean up
    this.ffmpeg.FS('unlink', inputName);
    this.ffmpeg.FS('unlink', outputName);
    
    return new Blob([data.buffer], { type: 'image/jpeg' });
  }

  // Helper: Format time for FFmpeg (seconds to HH:MM:SS)
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Cancel current operation
  cancel() {
    if (this.ffmpeg && this.ffmpeg.exit) {
      this.ffmpeg.exit();
      this.progress = 0;
    }
  }

  // Check if loaded
  isLoaded() {
    return this.loaded;
  }

  // Get current progress
  getProgress() {
    return this.progress;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FFmpegManager;
}