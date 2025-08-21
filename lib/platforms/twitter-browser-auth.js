// Twitter Browser-Based OAuth Authentication
// Uses Twitter OAuth 2.0 with PKCE - No API keys stored in code

const crypto = require('crypto');
const axios = require('axios');
const { shell } = require('electron');

class TwitterBrowserAuth {
  constructor() {
    // Twitter OAuth 2.0 endpoints
    this.authorizationUrl = 'https://twitter.com/i/oauth2/authorize';
    this.tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    this.revokeUrl = 'https://api.twitter.com/2/oauth2/revoke';
    
    // Use environment variables or prompt user for client ID
    this.clientId = process.env.TWITTER_CLIENT_ID || null;
    this.redirectUri = 'http://127.0.0.1:3000/auth/twitter/callback';
    
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
  getAuthorizationUrl(clientId = null) {
    // Use provided client ID or environment variable
    const activeClientId = clientId || this.clientId;
    
    if (!activeClientId) {
      throw new Error(
        'Twitter Client ID not configured.\n\n' +
        'To connect Twitter, you need to:\n' +
        '1. Go to https://developer.twitter.com/en/portal/dashboard\n' +
        '2. Create a new app (or use existing)\n' +
        '3. Set OAuth 2.0 settings:\n' +
        '   - Type: Public client\n' +
        '   - Callback URL: http://127.0.0.1:3000/auth/twitter/callback\n' +
        '4. Copy the Client ID\n' +
        '5. Add to .env file: TWITTER_CLIENT_ID=your_client_id_here\n' +
        '6. Restart the app and try again'
      );
    }
    
    // Generate PKCE parameters
    this.generatePKCE();
    
    // Generate state for CSRF protection
    this.state = crypto.randomBytes(32).toString('base64url');
    
    // Build authorization URL with PKCE
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: activeClientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: this.state,
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256'
    });
    
    return `${this.authorizationUrl}?${params.toString()}`;
  }

  // Start browser-based OAuth flow
  async authenticate(clientId = null) {
    try {
      // Check if client ID is available
      const activeClientId = clientId || this.clientId;
      
      if (!activeClientId) {
        return {
          success: false,
          requiresSetup: true,
          message: 'Twitter OAuth requires setup',
          instructions: [
            '1. Go to https://developer.twitter.com/en/portal/dashboard',
            '2. Create a new app with OAuth 2.0 enabled',
            '3. Set callback URL: http://127.0.0.1:3000/auth/twitter/callback',
            '4. Add Client ID to .env file',
            '5. Restart the app'
          ]
        };
      }
      
      const authUrl = this.getAuthorizationUrl(activeClientId);
      
      // Store client ID for token exchange
      this.clientId = activeClientId;
      
      // Open authorization URL in system browser
      shell.openExternal(authUrl);
      
      console.log('Opening Twitter authorization in browser...');
      console.log('Using OAuth 2.0 with PKCE (Public Client)');
      
      return {
        success: true,
        message: 'Please complete authentication in your browser',
        state: this.state,
        clientId: activeClientId
      };
    } catch (error) {
      console.error('Error starting Twitter Browser OAuth:', error);
      
      if (error.message.includes('Client ID not configured')) {
        return {
          success: false,
          requiresSetup: true,
          error: error.message
        };
      }
      
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state) {
    // Verify state to prevent CSRF
    if (state !== this.state) {
      console.error('State mismatch - Expected:', this.state, 'Received:', state);
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    if (!this.codeVerifier) {
      throw new Error('Code verifier not found - PKCE flow not initialized');
    }
    
    if (!this.clientId) {
      throw new Error('Client ID not found - OAuth flow not properly initialized');
    }
    
    try {
      // Exchange code for token using PKCE (no client secret needed for public clients)
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        code_verifier: this.codeVerifier,
        client_id: this.clientId
      });
      
      console.log('Exchanging code for token...');
      console.log('Client ID:', this.clientId);
      console.log('Redirect URI:', this.redirectUri);
      
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
      
      console.log('Successfully obtained access token');
      
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
      
      if (error.response?.data?.error === 'invalid_client') {
        throw new Error(
          'Invalid Client ID. Please check your Twitter app configuration:\n' +
          '1. Ensure OAuth 2.0 is enabled\n' +
          '2. App type is set to "Public client"\n' +
          '3. Callback URL is exactly: http://127.0.0.1:3000/auth/twitter/callback'
        );
      }
      
      throw new Error(`Failed to get access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    if (!this.clientId) {
      throw new Error('Client ID not configured for token refresh');
    }
    
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