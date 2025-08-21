/**
 * SAFE FACEBOOK API WRAPPER
 * Replaces the dangerous stub with proper error handling
 * 
 * WARNING: Facebook integration requires:
 * 1. Facebook App registration
 * 2. OAuth implementation
 * 3. Business verification for Instagram
 * 
 * This is a SAFE STUB that won't crash the app
 */

const axios = require('axios');

class SafeFacebookAPI {
  constructor(accessToken, pageId = null) {
    this.accessToken = accessToken;
    this.pageId = pageId;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.isConfigured = false;
    
    // Check if properly configured
    if (!accessToken || accessToken === 'not_configured') {
      console.warn('⚠️ Facebook API not configured - using safe mode');
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
    }
  }
  
  // Safe wrapper for all API calls
  async safeApiCall(apiFunction, functionName) {
    if (!this.isConfigured) {
      console.warn(`⚠️ Facebook ${functionName} called but API not configured`);
      return {
        success: false,
        error: 'Facebook API not configured. Please add API keys in Settings.',
        requiresSetup: true
      };
    }
    
    try {
      return await apiFunction();
    } catch (error) {
      console.error(`❌ Facebook ${functionName} error:`, error.message);
      
      // Categorize errors
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please reconnect your Facebook account.',
          requiresReauth: true
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Permission denied. Check your Facebook app permissions.',
          requiresPermissions: true
        };
      } else if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          rateLimited: true
        };
      } else {
        return {
          success: false,
          error: error.message || 'Unknown error occurred',
          details: error.response?.data
        };
      }
    }
  }

  async postToFacebook(content, options = {}) {
    return this.safeApiCall(async () => {
      // Validate inputs
      if (!content || content.trim().length === 0) {
        throw new Error('Content cannot be empty');
      }
      
      if (content.length > 63206) {
        throw new Error('Content exceeds Facebook\'s character limit (63,206)');
      }
      
      const endpoint = this.pageId ? 
        `${this.baseUrl}/${this.pageId}/feed` : 
        `${this.baseUrl}/me/feed`;
      
      const postData = {
        message: content,
        access_token: this.accessToken
      };

      // Add optional parameters safely
      if (options.mediaIds && Array.isArray(options.mediaIds) && options.mediaIds.length > 0) {
        postData.attached_media = options.mediaIds.map(id => ({ media_fbid: id }));
      }

      if (options.link && typeof options.link === 'string') {
        postData.link = options.link;
      }

      const response = await axios.post(endpoint, postData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      return {
        success: true,
        id: response.data.id,
        postId: response.data.post_id || response.data.id
      };
    }, 'postToFacebook');
  }

  async postToInstagram(content, mediaUrl, options = {}) {
    return this.safeApiCall(async () => {
      // Instagram-specific validation
      if (!mediaUrl) {
        throw new Error('Instagram requires an image or video URL');
      }
      
      if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
        throw new Error('Media URL must be publicly accessible (http:// or https://)');
      }
      
      if (content && content.length > 2200) {
        throw new Error('Instagram caption exceeds limit (2,200 characters)');
      }

      // Step 1: Create media container
      const createMediaEndpoint = `${this.baseUrl}/${this.pageId || 'me'}/media`;
      const mediaData = {
        image_url: mediaUrl,
        caption: content || '',
        access_token: this.accessToken
      };

      const createResponse = await axios.post(createMediaEndpoint, mediaData, {
        timeout: 30000
      });

      // Step 2: Publish the media container
      const publishEndpoint = `${this.baseUrl}/${this.pageId || 'me'}/media_publish`;
      const publishData = {
        creation_id: createResponse.data.id,
        access_token: this.accessToken
      };

      const publishResponse = await axios.post(publishEndpoint, publishData, {
        timeout: 30000
      });

      return {
        success: true,
        id: publishResponse.data.id
      };
    }, 'postToInstagram');
  }

  async uploadPhoto(photoBuffer, caption = '') {
    return this.safeApiCall(async () => {
      if (!Buffer.isBuffer(photoBuffer)) {
        throw new Error('Photo must be a Buffer');
      }
      
      if (photoBuffer.length > 4 * 1024 * 1024) { // 4MB limit
        throw new Error('Photo size exceeds 4MB limit');
      }
      
      // Note: This requires FormData which doesn't work in Node.js without a polyfill
      // This is a stub that shows the proper structure
      throw new Error('Photo upload not yet implemented - requires FormData polyfill');
      
    }, 'uploadPhoto');
  }

  async getPages() {
    return this.safeApiCall(async () => {
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: this.accessToken
        },
        timeout: 10000
      });
      
      if (!response.data || !response.data.data) {
        return [];
      }
      
      return response.data.data.map(page => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category
      }));
    }, 'getPages');
  }

  async getUserProfile() {
    return this.safeApiCall(async () => {
      const response = await axios.get(`${this.baseUrl}/me`, {
        params: {
          fields: 'id,name,email',
          access_token: this.accessToken
        },
        timeout: 10000
      });
      
      return response.data;
    }, 'getUserProfile');
  }

  // Test connection method
  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Facebook API not configured',
        requiresSetup: true
      };
    }
    
    try {
      const profile = await this.getUserProfile();
      if (profile.success === false) {
        return profile;
      }
      
      return {
        success: true,
        connected: true,
        profile: profile
      };
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message
      };
    }
  }
}

// Export information about requirements
SafeFacebookAPI.requirements = {
  needsApiKey: true,
  needsOAuth: true,
  needsBusinessVerification: true, // For Instagram
  documentation: 'https://developers.facebook.com/docs/',
  permissions: [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish'
  ]
};

SafeFacebookAPI.isImplemented = false; // Mark as not fully implemented

module.exports = SafeFacebookAPI;
