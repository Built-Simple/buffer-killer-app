// Mastodon API Client
// Handles posting toots, media uploads, and other Mastodon operations

const axios = require('axios');
const FormData = require('form-data');

class MastodonAPI {
  constructor(accessToken, instance = 'mastodon.social') {
    this.accessToken = accessToken;
    this.instance = instance.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = `https://${this.instance}/api/v1`;
    
    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
  }

  // Post a toot (status)
  async postToot(content, options = {}) {
    try {
      const data = {
        status: content,
        visibility: options.visibility || 'public', // public, unlisted, private, direct
        sensitive: options.sensitive || false,
        spoiler_text: options.spoilerText || '',
        language: options.language || 'en'
      };
      
      // Add reply if it's part of a thread
      if (options.inReplyToId) {
        data.in_reply_to_id = options.inReplyToId;
      }
      
      // Add media if provided
      if (options.mediaIds && options.mediaIds.length > 0) {
        data.media_ids = options.mediaIds;
      }
      
      // Add poll if provided
      if (options.poll) {
        data.poll = {
          options: options.poll.options,
          expires_in: options.poll.expiresIn || 86400, // 24 hours default
          multiple: options.poll.multiple || false
        };
      }
      
      const response = await this.client.post('/statuses', data);
      
      return {
        id: response.data.id,
        url: response.data.url,
        content: response.data.content,
        createdAt: response.data.created_at
      };
    } catch (error) {
      console.error('Error posting toot:', error.response?.data || error.message);
      throw new Error(`Failed to post toot: ${error.response?.data?.error || error.message}`);
    }
  }

  // Post a thread of toots
  async postThread(toots) {
    const postedToots = [];
    let previousTootId = null;
    
    try {
      for (const toot of toots) {
        const result = await this.postToot(toot, {
          inReplyToId: previousTootId
        });
        
        postedToots.push(result);
        previousTootId = result.id;
        
        // Small delay between posts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return postedToots;
    } catch (error) {
      console.error('Error posting thread:', error);
      throw error;
    }
  }

  // Upload media (images, videos) - supports both file paths and buffers
  async uploadMedia(fileOrBuffer, description = '', options = {}) {
    try {
      const formData = new FormData();
      
      // Handle both file paths and buffers
      if (typeof fileOrBuffer === 'string') {
        // It's a file path
        formData.append('file', require('fs').createReadStream(fileOrBuffer));
      } else if (Buffer.isBuffer(fileOrBuffer)) {
        // It's a buffer
        formData.append('file', fileOrBuffer, {
          filename: options.filename || 'media.jpg',
          contentType: options.contentType || 'image/jpeg'
        });
      } else {
        throw new Error('Media must be either a file path string or a Buffer');
      }
      
      if (description) {
        formData.append('description', description);
      }
      
      // Optional: Add focus point for images (x,y coordinates from -1.0 to 1.0)
      if (options.focus) {
        formData.append('focus', `${options.focus.x},${options.focus.y}`);
      }
      
      const response = await this.client.post('/media', formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      // Wait for processing if needed
      if (response.data.url === null) {
        // Media is still processing
        return await this.waitForMedia(response.data.id);
      }
      
      return {
        id: response.data.id,
        type: response.data.type,
        url: response.data.url,
        previewUrl: response.data.preview_url,
        description: response.data.description
      };
    } catch (error) {
      console.error('Error uploading media:', error.response?.data || error.message);
      throw new Error(`Failed to upload media: ${error.response?.data?.error || error.message}`);
    }
  }
  
  // Wait for media processing to complete
  async waitForMedia(mediaId, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.client.get(`/media/${mediaId}`);
        
        if (response.data.url) {
          return {
            id: response.data.id,
            type: response.data.type,
            url: response.data.url,
            previewUrl: response.data.preview_url,
            description: response.data.description
          };
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (error.response?.status === 404) {
          // Media not found, processing might have failed
          throw new Error('Media processing failed');
        }
        throw error;
      }
    }
    
    throw new Error('Media processing timed out');
  }
  
  // Update media description
  async updateMedia(mediaId, description) {
    try {
      const response = await this.client.put(`/media/${mediaId}`, {
        description: description
      });
      
      return {
        id: response.data.id,
        description: response.data.description
      };
    } catch (error) {
      console.error('Error updating media:', error.response?.data || error.message);
      throw new Error(`Failed to update media: ${error.response?.data?.error || error.message}`);
    }
  }

  // Delete a toot
  async deleteToot(tootId) {
    try {
      await this.client.delete(`/statuses/${tootId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting toot:', error.response?.data || error.message);
      throw new Error(`Failed to delete toot: ${error.response?.data?.error || error.message}`);
    }
  }

  // Get account information
  async getAccount() {
    try {
      const response = await this.client.get('/accounts/verify_credentials');
      return response.data;
    } catch (error) {
      console.error('Error getting account:', error.response?.data || error.message);
      throw new Error(`Failed to get account: ${error.response?.data?.error || error.message}`);
    }
  }

  // Get home timeline
  async getHomeTimeline(limit = 20) {
    try {
      const response = await this.client.get('/timelines/home', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting timeline:', error.response?.data || error.message);
      throw new Error(`Failed to get timeline: ${error.response?.data?.error || error.message}`);
    }
  }

  // Search for content
  async search(query, type = 'statuses') {
    try {
      const response = await this.client.get('/search', {
        params: {
          q: query,
          type: type, // accounts, hashtags, statuses
          limit: 20
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching:', error.response?.data || error.message);
      throw new Error(`Failed to search: ${error.response?.data?.error || error.message}`);
    }
  }

  // Get instance information
  async getInstanceInfo() {
    try {
      // This endpoint doesn't require authentication
      const response = await axios.get(`https://${this.instance}/api/v1/instance`);
      return {
        title: response.data.title,
        description: response.data.short_description,
        version: response.data.version,
        rules: response.data.rules,
        maxTootChars: response.data.configuration?.statuses?.max_characters || 500
      };
    } catch (error) {
      console.error('Error getting instance info:', error.response?.data || error.message);
      // Default to standard Mastodon limits if we can't get instance info
      return {
        maxTootChars: 500
      };
    }
  }
}

module.exports = MastodonAPI;