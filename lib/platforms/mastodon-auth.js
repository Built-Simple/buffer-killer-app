// Mastodon OAuth Authentication
// Implements dynamic app registration and OAuth for any Mastodon instance

const crypto = require('crypto');
const axios = require('axios');
const { shell } = require('electron');

class MastodonAuth {
  constructor(instance = 'mastodon.social') {
    this.instance = instance.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = `https://${this.instance}`;
    this.redirectUri = 'http://127.0.0.1:3000/auth/mastodon/callback';
    
    // App registration details (will be filled after registration)
    this.clientId = null;
    this.clientSecret = null;
    
    // OAuth parameters
    this.state = null;
    
    // Scopes for Mastodon
    this.scopes = 'read write follow';
  }

  // Register app with Mastodon instance
  async registerApp() {
    try {
      console.log(`Registering app with ${this.instance}...`);
      
      const response = await axios.post(`${this.baseUrl}/api/v1/apps`, {
        client_name: 'Buffer Killer',
        redirect_uris: this.redirectUri,
        scopes: this.scopes,
        website: 'https://github.com/buffer-killer'
      });
      
      const { client_id, client_secret } = response.data;
      
      this.clientId = client_id;
      this.clientSecret = client_secret;
      
      console.log(`App registered successfully with ${this.instance}`);
      
      // Store these credentials for this instance
      // In production, these should be stored securely per instance
      return {
        instance: this.instance,
        clientId: client_id,
        clientSecret: client_secret
      };
    } catch (error) {
      console.error(`Error registering app with ${this.instance}:`, error.response?.data || error.message);
      throw new Error(`Failed to register app with ${this.instance}: ${error.response?.data?.error || error.message}`);
    }
  }

  // Get authorization URL
  getAuthorizationUrl() {
    if (!this.clientId) {
      throw new Error('App not registered. Call registerApp() first.');
    }
    
    // Generate state for CSRF protection
    this.state = crypto.randomBytes(16).toString('base64url');
    
    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state: this.state
    });
    
    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  // Start OAuth flow
  async authenticate() {
    try {
      // First, register the app if not already registered
      if (!this.clientId) {
        await this.registerApp();
      }
      
      const authUrl = this.getAuthorizationUrl();
      
      // Open authorization URL in system browser
      shell.openExternal(authUrl);
      
      console.log(`Opening ${this.instance} authorization in browser...`);
      
      return {
        success: true,
        message: `Please complete authentication with ${this.instance} in your browser`,
        instance: this.instance,
        clientId: this.clientId,
        clientSecret: this.clientSecret
      };
    } catch (error) {
      console.error('Error starting Mastodon OAuth:', error);
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state) {
    // Verify state to prevent CSRF
    if (state !== this.state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('App not registered');
    }
    
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        scope: this.scopes
      });
      
      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const { access_token, token_type, scope, created_at } = response.data;
      
      return {
        accessToken: access_token,
        tokenType: token_type,
        scope: scope,
        createdAt: created_at,
        instance: this.instance
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error(`Failed to get access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Get user info
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/accounts/verify_credentials`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return {
        id: response.data.id,
        username: response.data.username,
        displayName: response.data.display_name,
        avatar: response.data.avatar,
        url: response.data.url,
        followersCount: response.data.followers_count,
        instance: this.instance
      };
    } catch (error) {
      console.error('Error getting user info:', error.response?.data || error.message);
      throw new Error(`Failed to get user info: ${error.response?.data?.error || error.message}`);
    }
  }

  // Revoke token (for disconnecting account)
  async revokeToken(accessToken) {
    try {
      await axios.post(
        `${this.baseUrl}/oauth/revoke`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          token: accessToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error revoking token:', error);
      // Some instances might not support revocation
      return { success: false, error: error.message };
    }
  }
}

module.exports = MastodonAuth;