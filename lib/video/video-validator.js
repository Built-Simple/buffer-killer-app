// Video Validator - No dependencies, just browser APIs!
class VideoValidator {
  constructor() {
    // Platform limits (2025 current)
    this.limits = {
      twitter: {
        maxSize: 512 * 1024 * 1024, // 512MB
        maxDuration: 140, // 2:20
        formats: ['video/mp4', 'video/quicktime'],
        extensions: ['.mp4', '.mov'],
        aspectRatios: ['16:9', '1:1', '4:5'], // Common ratios
        minResolution: { width: 32, height: 32 },
        maxResolution: { width: 1920, height: 1200 }
      },
      instagram: {
        maxSize: 650 * 1024 * 1024, // 650MB
        maxDuration: 60, // 60s for feed, 90s for reels
        formats: ['video/mp4', 'video/quicktime'],
        extensions: ['.mp4', '.mov'],
        aspectRatios: ['1:1', '4:5', '9:16'], // Square, Portrait, Reels
        minResolution: { width: 600, height: 600 },
        maxResolution: { width: 1920, height: 1920 }
      },
      mastodon: {
        maxSize: 200 * 1024 * 1024, // 200MB typical
        maxDuration: 300, // 5 min typical
        formats: ['video/mp4', 'video/webm', 'video/quicktime'],
        extensions: ['.mp4', '.webm', '.mov'],
        aspectRatios: [], // No restrictions
        minResolution: { width: 0, height: 0 },
        maxResolution: { width: 4096, height: 4096 }
      },
      linkedin: {
        maxSize: 5 * 1024 * 1024 * 1024, // 5GB
        maxDuration: 600, // 10 min
        formats: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
        extensions: ['.mp4', '.mov', '.avi'],
        aspectRatios: ['16:9', '1:1', '4:5'],
        minResolution: { width: 256, height: 144 },
        maxResolution: { width: 4096, height: 2304 }
      },
      github: {
        maxSize: 100 * 1024 * 1024, // 100MB for files in issues
        maxDuration: 0, // No duration limit
        formats: ['video/mp4', 'video/quicktime', 'video/webm'],
        extensions: ['.mp4', '.mov', '.webm'],
        aspectRatios: [],
        minResolution: { width: 0, height: 0 },
        maxResolution: { width: 4096, height: 4096 }
      }
    };
  }

  async validate(file, platforms = ['twitter']) {
    const results = {};
    
    // Get video metadata once
    let metadata;
    try {
      metadata = await this.getMetadata(file);
    } catch (error) {
      // If we can't read the video, it's invalid for all platforms
      for (const platform of platforms) {
        results[platform] = {
          valid: false,
          errors: [{
            type: 'read_error',
            message: 'Cannot read video file',
            suggestion: 'Ensure the file is a valid video format'
          }],
          warnings: [],
          metadata: {}
        };
      }
      return results;
    }

    // Validate for each platform
    for (const platform of platforms) {
      results[platform] = await this.validateForPlatform(file, metadata, platform);
    }

    return results;
  }

  async validateForPlatform(file, metadata, platform) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      metadata: metadata,
      suggestions: []
    };

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
        suggestion: 'Compress the video or reduce quality',
        severity: 'error'
      });
    } else if (file.size > limits.maxSize * 0.8) {
      // Warning if close to limit
      result.warnings.push({
        type: 'size_warning',
        message: `File is ${Math.round(file.size / limits.maxSize * 100)}% of max size`,
        suggestion: 'Consider compressing to ensure successful upload'
      });
    }

    // Check duration
    if (limits.maxDuration > 0 && metadata.duration > limits.maxDuration) {
      result.valid = false;
      result.errors.push({
        type: 'duration',
        message: `Video too long: ${this.formatDuration(metadata.duration)} (max: ${this.formatDuration(limits.maxDuration)})`,
        suggestion: `Trim video to under ${this.formatDuration(limits.maxDuration)}`,
        severity: 'error'
      });
    }

    // Check format
    if (!limits.formats.includes(file.type) && file.type !== '') {
      // Sometimes file.type is empty, check extension
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      if (!limits.extensions.includes(extension)) {
        result.valid = false;
        result.errors.push({
          type: 'format',
          message: `Format not supported: ${file.type || extension}`,
          suggestion: `Convert to: ${limits.extensions.join(', ')}`,
          severity: 'error'
        });
      }
    }

    // Check resolution
    if (metadata.width < limits.minResolution.width || metadata.height < limits.minResolution.height) {
      result.valid = false;
      result.errors.push({
        type: 'resolution_too_small',
        message: `Resolution too small: ${metadata.width}x${metadata.height}`,
        suggestion: `Minimum resolution: ${limits.minResolution.width}x${limits.minResolution.height}`,
        severity: 'error'
      });
    }

    if (metadata.width > limits.maxResolution.width || metadata.height > limits.maxResolution.height) {
      result.warnings.push({
        type: 'resolution_too_large',
        message: `Resolution very high: ${metadata.width}x${metadata.height}`,
        suggestion: 'Consider reducing resolution for faster upload'
      });
    }

    // Check aspect ratio (if platform has restrictions)
    if (limits.aspectRatios.length > 0) {
      const aspectRatio = this.getAspectRatioString(metadata.width, metadata.height);
      if (!limits.aspectRatios.includes(aspectRatio)) {
        result.warnings.push({
          type: 'aspect_ratio',
          message: `Aspect ratio ${aspectRatio} not optimal for ${platform}`,
          suggestion: `Recommended ratios: ${limits.aspectRatios.join(', ')}`
        });
      }
    }

    // Platform-specific suggestions
    if (platform === 'instagram' && metadata.duration > 15 && metadata.duration <= 60) {
      result.suggestions.push('Perfect length for Instagram feed posts!');
    }
    if (platform === 'twitter' && file.size < 50 * 1024 * 1024) {
      result.suggestions.push('Great file size for quick Twitter uploads!');
    }

    return result;
  }

  async getMetadata(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true; // Prevent audio playback
      video.preload = 'metadata';

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.remove();
      };

      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: (video.videoWidth / video.videoHeight).toFixed(2),
          aspectRatioString: this.getAspectRatioString(video.videoWidth, video.videoHeight)
        };
        cleanup();
        resolve(metadata);
      };

      video.onerror = (error) => {
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        cleanup();
        reject(new Error('Video metadata loading timeout'));
      }, 10000);
    });
  }

  getAspectRatioString(width, height) {
    const ratio = width / height;
    
    // Common aspect ratios
    const ratios = [
      { value: 16/9, string: '16:9' },
      { value: 9/16, string: '9:16' },
      { value: 4/5, string: '4:5' },
      { value: 5/4, string: '5:4' },
      { value: 1, string: '1:1' },
      { value: 4/3, string: '4:3' },
      { value: 3/4, string: '3:4' }
    ];

    // Find closest match
    let closest = ratios[0];
    let minDiff = Math.abs(ratio - ratios[0].value);

    for (const r of ratios) {
      const diff = Math.abs(ratio - r.value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = r;
      }
    }

    // If very close to a standard ratio, use it
    if (minDiff < 0.05) {
      return closest.string;
    }

    // Otherwise return the calculated ratio
    return `${width}:${height}`;
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Get compression suggestions based on platform
  getCompressionTips(platform) {
    const tips = {
      twitter: [
        'Use H.264 codec for best compatibility',
        'Target bitrate: 2-5 Mbps for 1080p',
        'Frame rate: 30 or 60 fps',
        'Audio: AAC, 128 kbps'
      ],
      instagram: [
        'Use H.264 codec',
        'Square (1:1) or vertical (4:5) for feed',
        'Vertical (9:16) for Reels',
        'Frame rate: 30 fps',
        'Target 3-5 Mbps bitrate'
      ],
      linkedin: [
        'Use H.264 codec for best compatibility',
        'Aspect ratio: 16:9 recommended',
        'Resolution: 1920x1080 ideal',
        'Frame rate: 30 fps'
      ],
      mastodon: [
        'Most instances support MP4 and WebM',
        'Keep under 100MB for better compatibility',
        'H.264 or VP9 codec',
        'Any aspect ratio works'
      ]
    };

    return tips[platform] || ['Use H.264 codec', 'Keep file size reasonable'];
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoValidator;
}