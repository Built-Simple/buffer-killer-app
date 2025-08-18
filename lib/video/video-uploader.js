// Video Upload Orchestrator - Handles uploads to different platforms
class VideoUploader {
  constructor() {
    this.uploadHandlers = {
      twitter: this.uploadToTwitter.bind(this),
      mastodon: this.uploadToMastodon.bind(this),
      github: this.uploadToGitHub.bind(this),
      linkedin: this.uploadToLinkedIn.bind(this),
      instagram: this.uploadToInstagram.bind(this)
    };
    
    this.uploadProgress = {};
  }

  async uploadVideo(file, platform, config = {}) {
    console.log(`Starting video upload to ${platform}...`);
    
    const handler = this.uploadHandlers[platform];
    if (!handler) {
      throw new Error(`No upload handler for platform: ${platform}`);
    }

    try {
      // Initialize progress tracking
      this.uploadProgress[platform] = {
        status: 'uploading',
        progress: 0,
        message: 'Starting upload...'
      };
      
      // Call platform-specific handler
      const result = await handler(file, config);
      
      // Update progress
      this.uploadProgress[platform] = {
        status: 'complete',
        progress: 100,
        message: 'Upload complete!',
        mediaId: result.mediaId || result.url
      };
      
      return result;
    } catch (error) {
      console.error(`Error uploading to ${platform}:`, error);
      
      this.uploadProgress[platform] = {
        status: 'error',
        progress: 0,
        message: error.message
      };
      
      throw error;
    }
  }

  async uploadToTwitter(file, config) {
    const { accessToken } = config;
    if (!accessToken) {
      throw new Error('Twitter access token required');
    }

    // Twitter uses chunked upload for videos
    // Step 1: INIT
    const mediaId = await this.twitterInitUpload(file, accessToken);
    
    // Step 2: APPEND (chunked)
    await this.twitterAppendChunks(file, mediaId, accessToken);
    
    // Step 3: FINALIZE
    await this.twitterFinalizeUpload(mediaId, accessToken);
    
    // Step 4: Check processing status
    await this.twitterCheckStatus(mediaId, accessToken);
    
    return { mediaId, platform: 'twitter' };
  }

  async twitterInitUpload(file, accessToken) {
    const initData = {
      command: 'INIT',
      total_bytes: file.size,
      media_type: file.type || 'video/mp4',
      media_category: 'tweet_video'
    };

    const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(initData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter INIT failed: ${error}`);
    }

    const result = await response.json();
    console.log('Twitter media ID:', result.media_id_string);
    return result.media_id_string;
  }

  async twitterAppendChunks(file, mediaId, accessToken) {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const chunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      // Convert chunk to base64
      const base64Chunk = await this.fileToBase64(chunk);
      
      const appendData = new FormData();
      appendData.append('command', 'APPEND');
      appendData.append('media_id', mediaId);
      appendData.append('segment_index', i.toString());
      appendData.append('media_data', base64Chunk);
      
      const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: appendData
      });

      if (!response.ok) {
        throw new Error(`Twitter APPEND failed for chunk ${i}`);
      }
      
      // Update progress
      const progress = Math.round(((i + 1) / chunks) * 90); // 90% for upload
      this.updateProgress('twitter', progress, `Uploading chunk ${i + 1}/${chunks}`);
    }
  }

  async twitterFinalizeUpload(mediaId, accessToken) {
    const finalizeData = {
      command: 'FINALIZE',
      media_id: mediaId
    };

    const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(finalizeData)
    });

    if (!response.ok) {
      throw new Error('Twitter FINALIZE failed');
    }

    const result = await response.json();
    
    // Check if processing is required
    if (result.processing_info) {
      console.log('Twitter video processing required...');
      return result;
    }
    
    return result;
  }

  async twitterCheckStatus(mediaId, accessToken, maxRetries = 30) {
    this.updateProgress('twitter', 95, 'Processing video...');
    
    for (let i = 0; i < maxRetries; i++) {
      const response = await fetch(`https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Twitter STATUS check failed');
      }

      const result = await response.json();
      const state = result.processing_info?.state;
      
      if (state === 'succeeded' || !result.processing_info) {
        console.log('Twitter video ready!');
        return result;
      } else if (state === 'failed') {
        throw new Error(`Twitter video processing failed: ${result.processing_info.error?.message}`);
      }
      
      // Wait before checking again
      const checkAfterSecs = result.processing_info.check_after_secs || 2;
      await new Promise(resolve => setTimeout(resolve, checkAfterSecs * 1000));
    }
    
    throw new Error('Twitter video processing timeout');
  }

  async uploadToMastodon(file, config) {
    const { instanceUrl, accessToken } = config;
    if (!instanceUrl || !accessToken) {
      throw new Error('Mastodon instance URL and access token required');
    }

    // Mastodon uses simple multipart upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', config.description || 'Video upload');

    const response = await fetch(`${instanceUrl}/api/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mastodon upload failed: ${error}`);
    }

    const result = await response.json();
    
    // Wait for processing if needed
    if (result.type === 'video' && !result.url) {
      return await this.waitForMastodonProcessing(result.id, instanceUrl, accessToken);
    }
    
    return { 
      mediaId: result.id,
      url: result.url,
      platform: 'mastodon'
    };
  }

  async waitForMastodonProcessing(mediaId, instanceUrl, accessToken, maxRetries = 30) {
    this.updateProgress('mastodon', 95, 'Processing video...');
    
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const response = await fetch(`${instanceUrl}/api/v1/media/${mediaId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Mastodon media check failed');
      }

      const result = await response.json();
      
      if (result.url) {
        console.log('Mastodon video ready!');
        return {
          mediaId: result.id,
          url: result.url,
          platform: 'mastodon'
        };
      }
    }
    
    throw new Error('Mastodon video processing timeout');
  }

  async uploadToGitHub(file, config) {
    const { accessToken, owner, repo, path } = config;
    if (!accessToken || !owner || !repo) {
      throw new Error('GitHub access token, owner, and repo required');
    }

    // For GitHub, we'll upload to a repository
    const fileName = `videos/${Date.now()}-${file.name}`;
    const content = await this.fileToBase64(file);

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Upload video: ${file.name}`,
        content: content,
        branch: config.branch || 'main'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub upload failed: ${error}`);
    }

    const result = await response.json();
    
    return {
      url: result.content.download_url,
      path: result.content.path,
      platform: 'github'
    };
  }

  async uploadToLinkedIn(file, config) {
    // LinkedIn video upload is complex and requires:
    // 1. Register upload
    // 2. Upload video in parts
    // 3. Finalize upload
    // Note: LinkedIn API access is restricted and requires approval
    
    throw new Error('LinkedIn video upload requires API approval. Please upload videos directly on LinkedIn.');
  }

  async uploadToInstagram(file, config) {
    // Instagram API doesn't support direct video upload from third-party apps
    // Would need Facebook Business API with specific permissions
    
    throw new Error('Instagram video upload requires Facebook Business API approval. Please upload videos directly on Instagram.');
  }

  // Helper functions
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:video/mp4;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  async fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  updateProgress(platform, percentage, message) {
    this.uploadProgress[platform] = {
      status: 'uploading',
      progress: percentage,
      message: message
    };
    
    // Dispatch event for UI updates
    const event = new CustomEvent('videoUploadProgress', {
      detail: {
        platform,
        progress: percentage,
        message
      }
    });
    document.dispatchEvent(event);
  }

  getProgress(platform) {
    return this.uploadProgress[platform] || {
      status: 'idle',
      progress: 0,
      message: ''
    };
  }

  // Batch upload for multiple platforms
  async uploadToMultiplePlatforms(file, platforms, configs) {
    const results = {};
    const errors = {};
    
    for (const platform of platforms) {
      try {
        console.log(`Uploading to ${platform}...`);
        results[platform] = await this.uploadVideo(file, platform, configs[platform]);
      } catch (error) {
        console.error(`Failed to upload to ${platform}:`, error);
        errors[platform] = error.message;
      }
    }
    
    return { results, errors };
  }
}

// Create global instance
const videoUploader = new VideoUploader();

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoUploader;
}