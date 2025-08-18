// Twitter/X OAuth 2.0 Authentication
// Implements OAuth 2.0 with PKCE for Twitter API v2

const crypto = require('crypto');
const axios = require('axios');
const { shell } = require('electron');

class TwitterAuth {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId || process.env.TWITTER_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.TWITTER_CLIENT_SECRET;
    this.redirectUri = redirectUri || 'http://127.0.0.1:3000/auth/twitter/callback';
    
    // OAuth 2.0 endpoints
    this.authorizationUrl = 'https://twitter.com/i/oauth2/authorize';
    this.tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    
    // PKCE parameters
    this.codeVerifier = null;
    this.codeChallenge = null;
    this.state = null;
    
    // Scopes for Twitter OAuth 2.0
    this.scopes = [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access' // For refresh token
    ];
  }

  // Generate PKCE parameters
  generatePKCE() {
    // Generate code verifier (43-128 characters)
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // Generate code challenge
    const hash = crypto.createHash('sha256');
    hash.update(this.codeVerifier);
    this.codeChallenge = hash.digest('base64url');
    
    // Generate state for CSRF protection
    this.state = crypto.randomBytes(16).toString('base64url');
    
    return {
      codeVerifier: this.codeVerifier,
      codeChallenge: this.codeChallenge,
      state: this.state
    };
  }

  // Get authorization URL
  getAuthorizationUrl() {
    if (!this.clientId) {
      throw new Error('Twitter Client ID not configured. Please add TWITTER_CLIENT_ID to your .env file');
    }

    // Generate PKCE parameters
    this.generatePKCE();
    
    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: this.state,
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256'
    });
    
    return `${this.authorizationUrl}?${params.toString()}`;
  }

  // Start OAuth flow
  async authenticate() {
    try {
      const authUrl = this.getAuthorizationUrl();
      
      // Open authorization URL in system browser
      shell.openExternal(authUrl);
      
      console.log('Opening Twitter authorization in browser...');
      
      return {
        success: true,
        message: 'Please complete authentication in your browser'
      };
    } catch (error) {
      console.error('Error starting Twitter OAuth:', error);
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state) {
    // Verify state to prevent CSRF
    if (state !== this.state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    if (!this.clientId) {
      throw new Error('Twitter Client ID not configured');
    }
    
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        code_verifier: this.codeVerifier,
        client_id: this.clientId
      });
      
      // Add client authentication if we have a client secret
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      
      if (this.clientSecret) {
        // Use Basic authentication for confidential clients
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      
      const response = await axios.post(this.tokenUrl, params.toString(), { headers });
      
      const { access_token, refresh_token, expires_in, scope } = response.data;
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        scope: scope,
        expiresAt: new Date(Date.now() + expires_in * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error(`Failed to get access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    if (!this.clientId) {
      throw new Error('Twitter Client ID not configured');
    }
    
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId
      });
      
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      
      if (this.clientSecret) {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      
      const response = await axios.post(this.tokenUrl, params.toString(), { headers });
      
      const { access_token, refresh_token, expires_in, scope } = response.data;
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken, // Some providers don't return new refresh token
        expiresIn: expires_in,
        scope: scope,
        expiresAt: new Date(Date.now() + expires_in * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Get user info
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          'user.fields': 'id,name,username,profile_image_url'
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Error getting user info:', error.response?.data || error.message);
      throw new Error(`Failed to get user info: ${error.response?.data?.detail || error.message}`);
    }
  }
}

module.exports = TwitterAuth;