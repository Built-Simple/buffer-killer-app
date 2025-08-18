// LinkedIn Browser-Based OAuth Authentication
// Simplified OAuth flow - minimal API key requirements

const crypto = require('crypto');
const axios = require('axios');
const { shell } = require('electron');

class LinkedInBrowserAuth {
  constructor() {
    // LinkedIn requires registered apps, but we can use a shared app
    this.clientId = '86wrd6ye8ozzwy'; // Buffer Killer LinkedIn app
    this.redirectUri = 'http://127.0.0.1:3000/auth/linkedin/callback';
    
    // OAuth 2.0 endpoints
    this.authorizationUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    this.tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    this.introspectUrl = 'https://www.linkedin.com/oauth/v2/introspectToken';
    
    // State for CSRF protection
    this.state = null;
    
    // LinkedIn scopes (r_liteprofile and r_emailaddress are deprecated, using new OpenID scopes)
    this.scopes = [
      'openid',           // OpenID Connect
      'profile',          // Basic profile info
      'email',            // Email address
      'w_member_social'   // Post content
    ];
  }

  // Get authorization URL
  getAuthorizationUrl() {
    // Generate state for CSRF protection
    this.state = crypto.randomBytes(32).toString('base64url');
    
    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: this.state
    });
    
    return `${this.authorizationUrl}?${params.toString()}`;
  }

  // Start browser-based OAuth flow
  async authenticate() {
    try {
      const authUrl = this.getAuthorizationUrl();
      
      // Open authorization URL in system browser
      shell.openExternal(authUrl);
      
      console.log('Opening LinkedIn authorization in browser...');
      console.log('Using simplified LinkedIn OAuth - minimal configuration required');
      
      return {
        success: true,
        message: 'Please complete authentication in your browser',
        requiresApiKeys: false,
        platform: 'linkedin'
      };
    } catch (error) {
      console.error('Error starting LinkedIn Browser OAuth:', error);
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state) {
    // Verify state to prevent CSRF
    if (state !== this.state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    try {
      // Note: LinkedIn still requires client_secret for token exchange
      // This would need to be handled server-side in production
      // For now, using a simplified flow
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId
      });
      
      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      const { access_token, expires_in, refresh_token, refresh_token_expires_in, scope } = response.data;
      
      // Calculate expiration times
      const accessTokenExpiresAt = new Date();
      accessTokenExpiresAt.setSeconds(accessTokenExpiresAt.getSeconds() + expires_in);
      
      let refreshTokenExpiresAt = null;
      if (refresh_token_expires_in) {
        refreshTokenExpiresAt = new Date();
        refreshTokenExpiresAt.setSeconds(refreshTokenExpiresAt.getSeconds() + refresh_token_expires_in);
      }
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: accessTokenExpiresAt.toISOString(),
        refreshTokenExpiresAt: refreshTokenExpiresAt?.toISOString(),
        scope: scope
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      
      // LinkedIn requires server-side token exchange, provide helpful message
      if (error.response?.status === 400) {
        throw new Error('LinkedIn authentication requires server-side configuration. Please use manual API key setup in Settings.');
      }
      
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
      
      const { access_token, expires_in, refresh_token, refresh_token_expires_in } = response.data;
      
      // Calculate expiration times
      const accessTokenExpiresAt = new Date();
      accessTokenExpiresAt.setSeconds(accessTokenExpiresAt.getSeconds() + expires_in);
      
      let refreshTokenExpiresAt = null;
      if (refresh_token_expires_in) {
        refreshTokenExpiresAt = new Date();
        refreshTokenExpiresAt.setSeconds(refreshTokenExpiresAt.getSeconds() + refresh_token_expires_in);
      }
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken, // Use new refresh token if provided
        expiresIn: expires_in,
        expiresAt: accessTokenExpiresAt.toISOString(),
        refreshTokenExpiresAt: refreshTokenExpiresAt?.toISOString()
      };
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Get user info using OpenID Connect
  async getUserInfo(accessToken) {
    try {
      // Get basic profile using OpenID userinfo endpoint
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      const userData = response.data;
      
      return {
        id: userData.sub, // OpenID subject identifier
        email: userData.email,
        emailVerified: userData.email_verified,
        name: userData.name,
        givenName: userData.given_name,
        familyName: userData.family_name,
        picture: userData.picture,
        locale: userData.locale
      };
    } catch (error) {
      console.error('Error getting user info:', error.response?.data || error.message);
      
      // Try legacy endpoint as fallback
      if (error.response?.status === 401 || error.response?.status === 403) {
        return this.getLegacyUserInfo(accessToken);
      }
      
      throw new Error(`Failed to get user info: ${error.response?.data?.message || error.message}`);
    }
  }

  // Fallback to legacy LinkedIn API
  async getLegacyUserInfo(accessToken) {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      const userData = response.data;
      
      return {
        id: userData.id,
        firstName: userData.localizedFirstName || userData.firstName?.localized?.en_US,
        lastName: userData.localizedLastName || userData.lastName?.localized?.en_US,
        name: `${userData.localizedFirstName || ''} ${userData.localizedLastName || ''}`.trim()
      };
    } catch (error) {
      console.error('Error getting legacy user info:', error.response?.data || error.message);
      throw new Error(`Failed to get user info: ${error.response?.data?.message || error.message}`);
    }
  }

  // Check if token is valid
  async validateToken(accessToken) {
    try {
      const params = new URLSearchParams({
        token: accessToken,
        client_id: this.clientId
      });
      
      const response = await axios.post(this.introspectUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      return {
        valid: response.data.active,
        scope: response.data.scope,
        expiresIn: response.data.exp
      };
    } catch (error) {
      console.error('Error validating token:', error.response?.data || error.message);
      return { valid: false };
    }
  }

  // Note about LinkedIn limitations
  getRequirementsNote() {
    return {
      title: 'LinkedIn API Requirements',
      message: 'LinkedIn requires app verification for posting permissions. While basic authentication works, posting capabilities require:',
      requirements: [
        'LinkedIn Developer account',
        'App verification process',
        'Company page association',
        'Compliance review'
      ],
      alternative: 'For full functionality, you may need to register your own LinkedIn app and add the credentials in Settings.'
    };
  }
}

module.exports = LinkedInBrowserAuth;