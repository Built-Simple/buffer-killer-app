// YouTube Community API Implementation
// Posts to YouTube Community tab (requires 500+ subscribers)

const axios = require('axios');

// Try to load googleapis, but don't fail if it's not installed
let google;
try {
  google = require('googleapis').google;
} catch (error) {
  console.warn('⚠️ googleapis package not installed. YouTube integration limited.');
  console.warn('   To enable full YouTube support, run: npm install googleapis');
}

class YouTubeAPI {
  constructor(accessToken, refreshToken = null) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    // Only set up YouTube client if googleapis is available
    if (google) {
      this.youtube = google.youtube('v3');
      
      // Set up OAuth2 client
      this.oauth2Client = new google.auth.OAuth2();
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    } else {
      this.youtube = null;
      this.oauth2Client = null;
    }
  }
  
  // Post to YouTube Community tab
  async post(content, options = {}) {
    try {
      // Check if googleapis is available
      if (!google) {
        throw new Error('YouTube integration requires googleapis package. Run: npm install googleapis');
      }
      
      // Note: YouTube Community posts API is limited
      // Currently, the API doesn't support creating community posts directly
      // This is a placeholder for when the API becomes available
      
      // For now, we'll create a comment on a video or use a workaround
      if (options.videoId) {
        // Post as a comment on a video
        return await this.postComment(content, options.videoId);
      } else {
        // Use webhook or alternative method
        return await this.postViaCommunityWebhook(content, options);
      }
      
    } catch (error) {
      console.error('YouTube posting error:', error.message);
      throw new Error(`Failed to post to YouTube: ${error.message}`);
    }
  }
  
  // Post a comment on a video (alternative to community posts)
  async postComment(content, videoId) {
    try {
      if (!this.youtube) {
        throw new Error('YouTube API not initialized. Install googleapis package.');
      }
      
      const response = await this.youtube.commentThreads.insert({
        auth: this.oauth2Client,
        part: ['snippet'],
        requestBody: {
          snippet: {
            videoId: videoId,
            topLevelComment: {
              snippet: {
                textOriginal: content
              }
            }
          }
        }
      });
      
      return {
        success: true,
        id: response.data.id,
        url: `https://www.youtube.com/watch?v=${videoId}&lc=${response.data.id}`,
        type: 'comment'
      };
    } catch (error) {
      throw new Error(`Failed to post comment: ${error.message}`);
    }
  }
  
  // Workaround: Post via webhook (for automation tools)
  async postViaCommunityWebhook(content, options) {
    if (!options.webhookUrl) {
      throw new Error(
        'YouTube Community API is not yet available for third-party apps.\n' +
        'Please either:\n' +
        '1. Provide a video ID to post as a comment\n' +
        '2. Set up a webhook for manual posting\n' +
        '3. Install googleapis package: npm install googleapis\n' +
        '4. Wait for YouTube to release Community Posts API'
      );
    }
    
    try {
      const payload = {
        content: content,
        channel: options.channelId,
        timestamp: new Date().toISOString(),
        source: 'buffer-killer'
      };
      
      const response = await axios.post(options.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: true,
        id: Date.now(),
        url: options.channelUrl || 'https://youtube.com',
        type: 'webhook',
        message: 'Post sent to webhook for manual publishing'
      };
    } catch (error) {
      throw new Error(`Webhook failed: ${error.message}`);
    }
  }
  
  // Get channel info
  async getChannelInfo() {
    try {
      if (!this.youtube) {
        throw new Error('YouTube API not initialized. Install googleapis package.');
      }
      
      const response = await this.youtube.channels.list({
        auth: this.oauth2Client,
        part: ['snippet', 'statistics'],
        mine: true
      });
      
      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0];
        return {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          subscriberCount: parseInt(channel.statistics.subscriberCount),
          videoCount: parseInt(channel.statistics.videoCount),
          customUrl: channel.snippet.customUrl,
          thumbnailUrl: channel.snippet.thumbnails.default.url,
          canPostCommunity: parseInt(channel.statistics.subscriberCount) >= 500
        };
      }
      
      throw new Error('No channel found');
    } catch (error) {
      console.error('Error getting channel info:', error.message);
      throw new Error(`Failed to get channel info: ${error.message}`);
    }
  }
  
  // Get user's videos (to post comments on)
  async getVideos(maxResults = 10) {
    try {
      if (!this.youtube) {
        throw new Error('YouTube API not initialized. Install googleapis package.');
      }
      
      const response = await this.youtube.search.list({
        auth: this.oauth2Client,
        part: ['snippet'],
        forMine: true,
        type: 'video',
        maxResults: maxResults,
        order: 'date'
      });
      
      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.default.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch (error) {
      console.error('Error getting videos:', error.message);
      throw new Error(`Failed to get videos: ${error.message}`);
    }
  }
  
  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized. Install googleapis package.');
    }
    
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.accessToken = credentials.access_token;
      this.oauth2Client.setCredentials(credentials);
      
      return {
        accessToken: credentials.access_token,
        expiresIn: credentials.expiry_date ? 
          Math.floor((credentials.expiry_date - Date.now()) / 1000) : 
          3600
      };
    } catch (error) {
      console.error('Error refreshing token:', error.message);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }
  
  // Test connection
  async testConnection() {
    try {
      if (!google) {
        return {
          success: false,
          message: 'YouTube integration requires googleapis package. Run: npm install googleapis'
        };
      }
      
      const channel = await this.getChannelInfo();
      
      const message = channel.canPostCommunity ? 
        `Connected to ${channel.title} (${channel.subscriberCount} subscribers) - Community posts available!` :
        `Connected to ${channel.title} (${channel.subscriberCount} subscribers) - Need 500+ subscribers for Community posts`;
      
      return {
        success: true,
        message: message,
        channel: channel
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  // Upload image for community post (future API support)
  async uploadImage(imageBuffer, mimeType = 'image/jpeg') {
    // This will be implemented when YouTube releases Community Posts API
    throw new Error('Image upload for Community posts not yet available');
  }
  
  // Create a poll (future API support)
  async createPoll(question, options) {
    // This will be implemented when YouTube releases Community Posts API
    throw new Error('Poll creation not yet available through API');
  }
}

module.exports = YouTubeAPI;

/*
YOUTUBE COMMUNITY POSTS - CURRENT LIMITATIONS:

As of 2024/2025, YouTube's API v3 does NOT support creating Community posts.
This is a known limitation that YouTube has not yet addressed.

CURRENT WORKAROUNDS:

1. POST AS VIDEO COMMENTS
   - You can post comments on your own videos
   - This provides some engagement but isn't the same as Community posts

2. WEBHOOK + AUTOMATION
   - Send posts to a webhook
   - Use browser automation tools to post manually
   - Or get email reminders to post yourself

3. YOUTUBE STUDIO MOBILE APP
   - The official mobile app supports Community posts
   - You could potentially automate via mobile automation tools

REQUIREMENTS FOR COMMUNITY TAB:
- Your channel needs 500+ subscribers
- Community tab must be enabled in YouTube Studio

TO ENABLE FULL YOUTUBE SUPPORT:
Run: npm install googleapis

WHEN API BECOMES AVAILABLE:
This implementation will be updated to use the official API
when YouTube releases it. The structure is already in place
to support it seamlessly.

GOOGLE OAUTH SETUP:
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add redirect URI: http://127.0.0.1:3000/auth/youtube/callback
6. Copy Client ID and Secret to your .env file

*/