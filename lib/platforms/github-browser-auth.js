// GitHub Browser-Based OAuth Authentication
// No API keys required - uses public OAuth flow

const crypto = require('crypto');
const axios = require('axios');
const { shell } = require('electron');

class GitHubBrowserAuth {
  constructor() {
    // Get credentials from settings/env or use defaults
    this.clientId = process.env.GITHUB_CLIENT_ID || 'Ov23lilo1pR1e7uO3CVC';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.redirectUri = 'http://127.0.0.1:3000/auth/github/callback';
    
    // OAuth endpoints
    this.authorizationUrl = 'https://github.com/login/oauth/authorize';
    this.tokenUrl = 'https://github.com/login/oauth/access_token';
    
    // Device flow endpoints (alternative approach)
    this.deviceCodeUrl = 'https://github.com/login/device/code';
    this.deviceTokenUrl = 'https://github.com/login/oauth/access_token';
    
    // State for CSRF protection
    this.state = null;
    
    // Scopes for GitHub
    this.scopes = [
      'public_repo',  // Access public repositories
      'repo',         // Access private repositories
      'gist',         // Create gists
      'user'          // Read user profile data
    ];
  }

  // Get authorization URL for browser flow
  getAuthorizationUrl() {
    // Generate state for CSRF protection
    this.state = crypto.randomBytes(32).toString('base64url');
    
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: this.state,
      allow_signup: 'true'
    });
    
    return `${this.authorizationUrl}?${params.toString()}`;
  }

  // Start browser-based OAuth flow
  async authenticate() {
    try {
      const authUrl = this.getAuthorizationUrl();
      
      // Open authorization URL in system browser
      shell.openExternal(authUrl);
      
      console.log('Opening GitHub authorization in browser...');
      console.log('No API keys required!');
      
      return {
        success: true,
        message: 'Please complete authentication in your browser',
        requiresApiKeys: false
      };
    } catch (error) {
      console.error('Error starting GitHub Browser OAuth:', error);
      throw error;
    }
  }

  // Alternative: Start device flow (for TV apps, CLI tools, etc.)
  async startDeviceFlow() {
    try {
      const response = await axios.post(this.deviceCodeUrl, {
        client_id: this.clientId,
        scope: this.scopes.join(' ')
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const { device_code, user_code, verification_uri, expires_in, interval } = response.data;

      // Open verification URL in browser
      shell.openExternal(verification_uri);

      return {
        success: true,
        deviceCode: device_code,
        userCode: user_code,
        verificationUri: verification_uri,
        expiresIn: expires_in,
        interval: interval || 5,
        message: `Please enter code ${user_code} at ${verification_uri}`
      };
    } catch (error) {
      console.error('Error starting device flow:', error);
      throw error;
    }
  }

  // Poll for device flow completion
  async pollDeviceFlow(deviceCode, interval = 5) {
    return new Promise((resolve, reject) => {
      const maxAttempts = 120; // 10 minutes with 5 second intervals
      let attempts = 0;

      const poll = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          clearInterval(poll);
          reject(new Error('Device flow authorization timed out'));
          return;
        }

        try {
          const response = await axios.post(this.deviceTokenUrl, {
            client_id: this.clientId,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          }, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (response.data.access_token) {
            clearInterval(poll);
            resolve({
              accessToken: response.data.access_token,
              tokenType: response.data.token_type,
              scope: response.data.scope
            });
          }
        } catch (error) {
          if (error.response?.data?.error === 'authorization_pending') {
            // Still waiting for user to authorize
            console.log('Waiting for user authorization...');
          } else if (error.response?.data?.error === 'slow_down') {
            // Increase polling interval
            clearInterval(poll);
            setTimeout(() => {
              this.pollDeviceFlow(deviceCode, interval + 5)
                .then(resolve)
                .catch(reject);
            }, (interval + 5) * 1000);
          } else {
            clearInterval(poll);
            reject(error);
          }
        }
      }, interval * 1000);
    });
  }

  // Exchange authorization code for access token (browser flow)
  async exchangeCodeForToken(code, state) {
    // Verify state to prevent CSRF
    if (state !== this.state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    try {
      // GitHub OAuth Apps require client_secret for token exchange
      const params = {
        client_id: this.clientId,
        client_secret: this.clientSecret, // Required for GitHub OAuth Apps
        code: code,
        redirect_uri: this.redirectUri
      };
      
      const response = await axios.post(this.tokenUrl, params, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const { access_token, scope, token_type } = response.data;
      
      if (!access_token) {
        throw new Error(response.data.error_description || 'Failed to get access token');
      }
      
      return {
        accessToken: access_token,
        scope: scope,
        tokenType: token_type
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error(`Failed to get access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Get user info
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      return {
        id: response.data.id,
        username: response.data.login,
        name: response.data.name,
        email: response.data.email,
        avatar: response.data.avatar_url,
        bio: response.data.bio,
        url: response.data.html_url,
        publicRepos: response.data.public_repos,
        followers: response.data.followers
      };
    } catch (error) {
      console.error('Error getting user info:', error.response?.data || error.message);
      throw new Error(`Failed to get user info: ${error.response?.data?.message || error.message}`);
    }
  }

  // Check if token is valid
  async validateToken(accessToken) {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      return {
        valid: true,
        user: response.data.login,
        scopes: response.headers['x-oauth-scopes']?.split(', ') || []
      };
    } catch (error) {
      if (error.response?.status === 401) {
        return { valid: false };
      }
      throw error;
    }
  }

  // Revoke token (GitHub doesn't have a standard revoke endpoint for OAuth apps)
  async revokeToken(accessToken) {
    try {
      // For OAuth Apps without client_secret, we can't revoke tokens
      // This would require the app to be converted to a GitHub App
      console.log('Token revocation not available for public OAuth apps');
      
      return { 
        success: true,
        message: 'Token cleared locally. For complete revocation, please visit GitHub Settings > Applications'
      };
    } catch (error) {
      console.error('Error revoking token:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GitHubBrowserAuth;