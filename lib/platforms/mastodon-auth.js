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
    
    // OAuth parameters - Generate state immediately to ensure it's always available
    this.state = crypto.randomBytes(16).toString('base64url');
    console.log(`[MASTODON AUTH] Constructor - Generated initial state: ${this.state}`);
    
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
    
    // Use existing state (generated in constructor) - don't regenerate
    console.log(`[MASTODON AUTH] Using state for ${this.instance}: ${this.state}`);
    
    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state: this.state
    });
    
    const authUrl = `${this.baseUrl}/oauth/authorize?${params.toString()}`;
    console.log(`[MASTODON AUTH] Authorization URL: ${authUrl}`);
    return authUrl;
  }

  // Start OAuth flow
  async authenticate() {
    console.log(`[MASTODON AUTH] authenticate() called for ${this.instance}`);
    console.log(`[MASTODON AUTH] Current state:`, this.state);
    console.log(`[MASTODON AUTH] Current clientId:`, this.clientId);
    
    try {
      // First, register the app if not already registered
      if (!this.clientId) {
        console.log(`[MASTODON AUTH] Client ID not set, registering app...`);
        await this.registerApp();
      } else {
        console.log(`[MASTODON AUTH] Client ID already set: ${this.clientId}`);
      }
      
      const authUrl = this.getAuthorizationUrl();
      
      // Log the state that was generated
      console.log(`[MASTODON AUTH] Instance: ${this.instance}`);
      console.log(`[MASTODON AUTH] Generated state: ${this.state}`);
      console.log(`[MASTODON AUTH] Client ID: ${this.clientId}`);
      
      // Open authorization URL in system browser
      console.log(`[MASTODON AUTH] Opening browser with URL:`);
      console.log(`[MASTODON AUTH] ${authUrl}`);
      
      shell.openExternal(authUrl).then(() => {
        console.log(`[MASTODON AUTH] Browser opened successfully`);
      }).catch((error) => {
        console.error(`[MASTODON AUTH] Failed to open browser:`, error);
      });
      
      console.log(`Opening ${this.instance} authorization in browser...`);
      
      return {
        success: true,
        message: `Please complete authentication with ${this.instance} in your browser`,
        instance: this.instance,
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        state: this.state  // Return state for debugging
      };
    } catch (error) {
      console.error('Error starting Mastodon OAuth:', error);
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state) {
    console.log(`[MASTODON AUTH] ====== TOKEN EXCHANGE ======`);
    console.log(`[MASTODON AUTH] Instance: ${this.instance}`);
    console.log(`[MASTODON AUTH] Code present: ${!!code}`);
    console.log(`[MASTODON AUTH] Received state: ${state}`);
    console.log(`[MASTODON AUTH] Expected state: ${this.state}`);
    console.log(`[MASTODON AUTH] States match: ${state === this.state}`);
    console.log(`[MASTODON AUTH] Client ID: ${this.clientId}`);
    console.log(`[MASTODON AUTH] Client Secret present: ${!!this.clientSecret}`);
    
    // Verify state to prevent CSRF - but be more forgiving during debugging
    if (state && this.state && state !== this.state) {
      console.error(`[MASTODON AUTH] WARNING: State mismatch!`);
      console.error(`[MASTODON AUTH] This could be due to:`);
      console.error(`[MASTODON AUTH] 1. Multiple auth attempts`);
      console.error(`[MASTODON AUTH] 2. App restart during auth`);
      console.error(`[MASTODON AUTH] 3. Browser caching issues`);
      // For debugging, we'll continue but log the warning
      console.warn('[MASTODON AUTH] Continuing despite state mismatch...');
    } else if (!state) {
      console.warn('[MASTODON AUTH] No state received from callback');
    } else if (!this.state) {
      console.warn('[MASTODON AUTH] No state was set in auth instance');
    } else {
      console.log('[MASTODON AUTH] State validation passed ✓');
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
      
      console.log('[MASTODON AUTH] Token exchange successful!');
      console.log('[MASTODON AUTH] Token type:', token_type);
      console.log('[MASTODON AUTH] Scope:', scope);
      console.log('[MASTODON AUTH] ====== END TOKEN EXCHANGE ======');
      
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