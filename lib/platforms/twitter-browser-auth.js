// Twitter Browser-Based OAuth Authentication
// No API keys required - uses OAuth 2.0 with PKCE

const crypto = require('crypto');
const axios = require('axios');
const { shell } = require('electron');

class TwitterBrowserAuth {
  constructor() {
    // Public client configuration - no secrets needed
    this.clientId = 'WjRKSEpXVXlMRHBOTWtGNGRuZDZXVEU6MTpjaQ'; // Buffer Killer public client ID
    this.redirectUri = 'http://127.0.0.1:3000/auth/twitter/callback';
    
    // OAuth 2.0 endpoints
    this.authorizationUrl = 'https://twitter.com/i/oauth2/authorize';
    this.tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    this.revokeUrl = 'https://api.twitter.com/2/oauth2/revoke';
    
    // PKCE parameters
    this.codeVerifier = null;
    this.codeChallenge = null;
    this.state = null;
    
    // Scopes for Twitter API v2
    this.scopes = [
      'tweet.read',
      'tweet.write',
      'tweet.moderate.write',
      'users.read',
      'follows.read',
      'follows.write',
      'offline.access', // For refresh token
      'space.read',
      'list.read',
      'list.write'
    ];
  }

  // Generate PKCE parameters
  generatePKCE() {
    // Generate code verifier (43-128 characters)
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // Generate code challenge from verifier
    const hash = crypto.createHash('sha256');
    hash.update(this.codeVerifier);
    this.codeChallenge = hash.digest('base64url');
    
    return {
      codeVerifier: this.codeVerifier,
      codeChallenge: this.codeChallenge
    };
  }

  // Get authorization URL
  getAuthorizationUrl() {
    // Generate PKCE parameters
    this.generatePKCE();
    
    // Generate state for CSRF protection
    this.state = crypto.randomBytes(32).toString('base64url');
    
    // Build authorization URL with PKCE
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

  // Start browser-based OAuth flow
  async authenticate() {
    try {
      const authUrl = this.getAuthorizationUrl();
      
      // Open authorization URL in system browser
      shell.openExternal(authUrl);
      
      console.log('Opening Twitter authorization in browser...');
      console.log('No API keys required! Using OAuth 2.0 with PKCE');
      
      return {
        success: true,
        message: 'Please complete authentication in your browser',
        requiresApiKeys: false,
        usePKCE: true
      };
    } catch (error) {
      console.error('Error starting Twitter Browser OAuth:', error);
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state) {
    // Verify state to prevent CSRF
    if (state !== this.state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    if (!this.codeVerifier) {
      throw new Error('Code verifier not found - PKCE flow not initialized');
    }
    
    try {
      // Exchange code for token using PKCE
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        code_verifier: this.codeVerifier,
        client_id: this.clientId
      });
      
      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      const { access_token, refresh_token, expires_in, scope, token_type } = response.data;
      
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: expiresAt.toISOString(),
        scope: scope,
        tokenType: token_type
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error(`Failed to get access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId
      });
      
      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      const { access_token, refresh_token, expires_in, scope, token_type } = response.data;
      
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken, // Use new refresh token if provided
        expiresIn: expires_in,
        expiresAt: expiresAt.toISOString(),
        scope: scope,
        tokenType: token_type
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
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        params: {
          'user.fields': 'id,name,username,profile_image_url,description,public_metrics,verified,created_at'
        }
      });
      
      const userData = response.data.data;
      
      return {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        profileImage: userData.profile_image_url,
        description: userData.description,
        followersCount: userData.public_metrics?.followers_count,
        followingCount: userData.public_metrics?.following_count,
        tweetCount: userData.public_metrics?.tweet_count,
        verified: userData.verified,
        createdAt: userData.created_at
      };
    } catch (error) {
      console.error('Error getting user info:', error.response?.data || error.message);
      throw new Error(`Failed to get user info: ${error.response?.data?.detail || error.message}`);
    }
  }

  // Revoke token
  async revokeToken(accessToken) {
    try {
      const params = new URLSearchParams({
        token: accessToken,
        token_type_hint: 'access_token',
        client_id: this.clientId
      });
      
      await axios.post(this.revokeUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      return { success: true, message: 'Token revoked successfully' };
    } catch (error) {
      console.error('Error revoking token:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error_description || error.message 
      };
    }
  }

  // Check if token is expired
  isTokenExpired(expiresAt) {
    if (!expiresAt) return true;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    // Consider token expired 5 minutes before actual expiry for safety
    return now >= new Date(expiryDate.getTime() - 5 * 60 * 1000);
  }

  // Auto-refresh token if needed
  async ensureValidToken(credentials) {
    if (this.isTokenExpired(credentials.expiresAt)) {
      console.log('Twitter token expired, refreshing...');
      const newTokens = await this.refreshAccessToken(credentials.refreshToken);
      return {
        ...credentials,
        ...newTokens
      };
    }
    return credentials;
  }
}

module.exports = TwitterBrowserAuth;