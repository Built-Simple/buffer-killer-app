// LinkedIn API Implementation
// Handles posting to LinkedIn personal profiles and company pages

const axios = require('axios');

class LinkedInAPI {
  constructor(accessToken, userId) {
    this.accessToken = accessToken;
    this.userId = userId;
    this.apiUrl = 'https://api.linkedin.com/v2';
    this.restUrl = 'https://api.linkedin.com/rest';
  }
  
  // Post to LinkedIn (using the new versioned API)
  async post(content, options = {}) {
    try {
      // First, get the user's URN if not provided
      if (!this.userId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      // Prepare the post data for LinkedIn's sharing API
      const postData = {
        author: `urn:li:person:${this.userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC'
        }
      };
      
      // Add media if provided
      if (options.mediaUrl) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          originalUrl: options.mediaUrl
        }];
      }
      
      // Post to LinkedIn
      const response = await axios.post(
        `${this.apiUrl}/ugcPosts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Extract the post ID from the response header
      const postId = response.headers['x-restli-id'] || response.data.id;
      
      return {
        success: true,
        id: postId,
        url: `https://www.linkedin.com/feed/update/${postId}/`,
        response: response.data
      };
    } catch (error) {
      console.error('LinkedIn posting error:', error.response?.data || error.message);
      
      // Handle specific LinkedIn errors
      if (error.response?.status === 401) {
        throw new Error('LinkedIn access token expired. Please reconnect your account.');
      } else if (error.response?.status === 403) {
        throw new Error('Permission denied. Check your LinkedIn app permissions.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before posting again.');
      }
      
      throw new Error(`Failed to post to LinkedIn: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Alternative: Post using the newer Rest.li API (for future compatibility)
  async postV2(content, options = {}) {
    try {
      // Get the person URN
      if (!this.userId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      const postData = {
        author: `urn:li:person:${this.userId}`,
        commentary: content,
        visibility: options.visibility || 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false
      };
      
      const response = await axios.post(
        `${this.restUrl}/posts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202401',
            'X-RestLi-Protocol-Version': '2.0.0'
          }
        }
      );
      
      return {
        success: true,
        id: response.headers['x-restli-id'],
        url: `https://www.linkedin.com/feed/update/${response.headers['x-restli-id']}/`,
        response: response.data
      };
    } catch (error) {
      console.error('LinkedIn V2 posting error:', error.response?.data || error.message);
      throw new Error(`Failed to post to LinkedIn: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Get user profile
  async getProfile() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/me`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      return {
        id: response.data.id,
        firstName: response.data.localizedFirstName,
        lastName: response.data.localizedLastName,
        headline: response.data.headline
      };
    } catch (error) {
      console.error('Error getting LinkedIn profile:', error.response?.data || error.message);
      throw new Error(`Failed to get LinkedIn profile: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Test connection
  async testConnection() {
    try {
      const profile = await this.getProfile();
      return {
        success: true,
        message: `Connected as ${profile.firstName} ${profile.lastName}`,
        profile
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  // Upload image (for posts with images)
  async uploadImage(imageBuffer, contentType = 'image/jpeg') {
    try {
      // Step 1: Register upload
      const registerData = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${this.userId}`,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      };
      
      const registerResponse = await axios.post(
        `${this.apiUrl}/assets?action=registerUpload`,
        registerData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;
      
      // Step 2: Upload the image
      await axios.put(uploadUrl, imageBuffer, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': contentType
        }
      });
      
      return {
        success: true,
        asset: asset,
        mediaUrn: asset
      };
    } catch (error) {
      console.error('Error uploading image to LinkedIn:', error.response?.data || error.message);
      throw new Error(`Failed to upload image: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Get post analytics
  async getPostAnalytics(postId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/socialActions/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      return {
        likes: response.data.likesSummary?.totalLikes || 0,
        comments: response.data.commentsSummary?.totalComments || 0,
        shares: response.data.sharesSummary?.totalShares || 0
      };
    } catch (error) {
      console.error('Error getting post analytics:', error.response?.data || error.message);
      throw new Error(`Failed to get analytics: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Delete a post
  async deletePost(postId) {
    try {
      await axios.delete(
        `${this.apiUrl}/ugcPosts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting LinkedIn post:', error.response?.data || error.message);
      throw new Error(`Failed to delete post: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = LinkedInAPI;
