// Facebook/Instagram API Integration
class FacebookAPI {
  constructor(accessToken, pageId = null) {
    this.accessToken = accessToken;
    this.pageId = pageId;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  async postToFacebook(content, options = {}) {
    try {
      // Post to Facebook Page (requires page access token)
      const endpoint = this.pageId ? 
        `${this.baseUrl}/${this.pageId}/feed` : 
        `${this.baseUrl}/me/feed`;
      
      const postData = {
        message: content,
        access_token: this.accessToken
      };

      // Add media if provided
      if (options.mediaIds && options.mediaIds.length > 0) {
        postData.attached_media = options.mediaIds.map(id => ({ media_fbid: id }));
      }

      // Add link if provided
      if (options.link) {
        postData.link = options.link;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Facebook API error');
      }

      const result = await response.json();
      return {
        success: true,
        id: result.id,
        postId: result.post_id || result.id
      };
    } catch (error) {
      console.error('Facebook posting error:', error);
      throw error;
    }
  }

  async postToInstagram(content, mediaUrl, options = {}) {
    try {
      // Instagram requires a business account and media
      if (!mediaUrl) {
        throw new Error('Instagram requires an image or video');
      }

      // Step 1: Create media container
      const createMediaEndpoint = `${this.baseUrl}/${this.pageId || 'me'}/media`;
      const mediaData = {
        image_url: mediaUrl,
        caption: content,
        access_token: this.accessToken
      };

      const createResponse = await fetch(createMediaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mediaData)
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error?.message || 'Instagram media creation failed');
      }

      const mediaContainer = await createResponse.json();

      // Step 2: Publish the media container
      const publishEndpoint = `${this.baseUrl}/${this.pageId || 'me'}/media_publish`;
      const publishData = {
        creation_id: mediaContainer.id,
        access_token: this.accessToken
      };

      const publishResponse = await fetch(publishEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(publishData)
      });

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(error.error?.message || 'Instagram publish failed');
      }

      const result = await publishResponse.json();
      return {
        success: true,
        id: result.id
      };
    } catch (error) {
      console.error('Instagram posting error:', error);
      throw error;
    }
  }

  async uploadPhoto(photoBuffer, caption = '') {
    try {
      // Facebook photo upload
      const formData = new FormData();
      formData.append('source', new Blob([photoBuffer]));
      formData.append('caption', caption);
      formData.append('access_token', this.accessToken);

      const endpoint = this.pageId ? 
        `${this.baseUrl}/${this.pageId}/photos` : 
        `${this.baseUrl}/me/photos`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Photo upload failed');
      }

      const result = await response.json();
      return {
        success: true,
        id: result.id,
        postId: result.post_id
      };
    } catch (error) {
      console.error('Facebook photo upload error:', error);
      throw error;
    }
  }

  async uploadVideo(videoBuffer, title = '', description = '') {
    try {
      // Facebook video upload (chunked upload for large files)
      const formData = new FormData();
      formData.append('source', new Blob([videoBuffer]));
      formData.append('title', title);
      formData.append('description', description);
      formData.append('access_token', this.accessToken);

      const endpoint = this.pageId ? 
        `${this.baseUrl}/${this.pageId}/videos` : 
        `${this.baseUrl}/me/videos`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Video upload failed');
      }

      const result = await response.json();
      return {
        success: true,
        id: result.id
      };
    } catch (error) {
      console.error('Facebook video upload error:', error);
      throw error;
    }
  }

  async getPages() {
    try {
      // Get list of pages the user manages
      const response = await fetch(`${this.baseUrl}/me/accounts?access_token=${this.accessToken}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch pages');
      }

      const result = await response.json();
      return result.data.map(page => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category
      }));
    } catch (error) {
      console.error('Facebook pages fetch error:', error);
      throw error;
    }
  }

  async getInstagramAccount(pageId) {
    try {
      // Get Instagram business account connected to Facebook page
      const response = await fetch(
        `${this.baseUrl}/${pageId}?fields=instagram_business_account&access_token=${this.accessToken}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch Instagram account');
      }

      const result = await response.json();
      if (result.instagram_business_account) {
        // Get Instagram account details
        const igResponse = await fetch(
          `${this.baseUrl}/${result.instagram_business_account.id}?fields=username,profile_picture_url&access_token=${this.accessToken}`
        );
        
        if (igResponse.ok) {
          const igAccount = await igResponse.json();
          return {
            id: igAccount.id,
            username: igAccount.username,
            profilePicture: igAccount.profile_picture_url
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Instagram account fetch error:', error);
      throw error;
    }
  }

  async getUserProfile() {
    try {
      const response = await fetch(
        `${this.baseUrl}/me?fields=id,name,email&access_token=${this.accessToken}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Facebook profile fetch error:', error);
      throw error;
    }
  }

  async getInsights(postId) {
    try {
      // Get post insights/analytics
      const response = await fetch(
        `${this.baseUrl}/${postId}/insights?access_token=${this.accessToken}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch insights');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Facebook insights fetch error:', error);
      throw error;
    }
  }

  // Helper method to schedule posts (uses Facebook's scheduled posts API)
  async schedulePost(content, scheduledTime, options = {}) {
    try {
      const endpoint = this.pageId ? 
        `${this.baseUrl}/${this.pageId}/feed` : 
        `${this.baseUrl}/me/feed`;
      
      const postData = {
        message: content,
        published: false,
        scheduled_publish_time: Math.floor(new Date(scheduledTime).getTime() / 1000),
        access_token: this.accessToken
      };

      if (options.mediaIds && options.mediaIds.length > 0) {
        postData.attached_media = options.mediaIds.map(id => ({ media_fbid: id }));
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to schedule post');
      }

      const result = await response.json();
      return {
        success: true,
        id: result.id
      };
    } catch (error) {
      console.error('Facebook scheduling error:', error);
      throw error;
    }
  }
}

// Note about Facebook/Instagram API:
// - Requires Facebook App with proper permissions
// - Needs Facebook Login implementation
// - Instagram requires Business or Creator account
// - Media uploads need to be hosted on publicly accessible URLs for Instagram
// - Page access tokens are long-lived (60 days)
// - User access tokens expire quickly (1-2 hours) unless extended

module.exports = FacebookAPI;
