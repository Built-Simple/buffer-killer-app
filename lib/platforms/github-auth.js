// GitHub OAuth Authentication
// Simple OAuth2 flow for GitHub - no PKCE needed

const crypto = require('crypto');
const axios = require('axios');
const { shell } = require('electron');

class GitHubAuth {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId || process.env.GITHUB_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.GITHUB_CLIENT_SECRET;
    this.redirectUri = redirectUri || 'http://127.0.0.1:3000/auth/github/callback';
    
    // OAuth endpoints
    this.authorizationUrl = 'https://github.com/login/oauth/authorize';
    this.tokenUrl = 'https://github.com/login/oauth/access_token';
    
    // State for CSRF protection
    this.state = null;
    
    // Scopes for GitHub
    this.scopes = [
      'public_repo',  // Access public repositories
      'repo',         // Access private repositories (optional)
      'gist',         // Create gists
      'user'          // Read user profile data
    ];
  }

  // Get authorization URL
  getAuthorizationUrl() {
    if (!this.clientId) {
      throw new Error('GitHub Client ID not configured. Please add GITHUB_CLIENT_ID to your .env file');
    }
    
    // Generate state for CSRF protection
    this.state = crypto.randomBytes(16).toString('base64url');
    
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: this.state
    });
    
    return `${this.authorizationUrl}?${params.toString()}`;
  }

  // Start OAuth flow
  async authenticate() {
    try {
      const authUrl = this.getAuthorizationUrl();
      
      // Open authorization URL in system browser
      shell.openExternal(authUrl);
      
      console.log('Opening GitHub authorization in browser...');
      
      return {
        success: true,
        message: 'Please complete authentication in your browser'
      };
    } catch (error) {
      console.error('Error starting GitHub OAuth:', error);
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
      throw new Error('GitHub Client ID or Secret not configured');
    }
    
    try {
      const params = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
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

  // Revoke token (GitHub doesn't have a revoke endpoint, but we can delete the authorization)
  async revokeToken(accessToken) {
    try {
      // GitHub requires the client ID and secret to delete an authorization
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      await axios.delete(
        `https://api.github.com/applications/${this.clientId}/token`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          data: {
            access_token: accessToken
          }
        }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error revoking token:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GitHubAuth;