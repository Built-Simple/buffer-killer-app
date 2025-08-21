// LinkedIn OAuth with User-Provided Credentials
// Supports both client-side initiation and server-side token exchange

const crypto = require('crypto');
const axios = require('axios');
const { shell } = require('electron');

class LinkedInAuth {
  constructor(clientId = null, clientSecret = null) {
    // Allow user-provided credentials or fallback to environment
    this.clientId = clientId || process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.LINKEDIN_CLIENT_SECRET;
    this.redirectUri = 'http://127.0.0.1:3000/auth/linkedin/callback';
    
    // OAuth 2.0 endpoints
    this.authorizationUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    this.tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    this.introspectUrl = 'https://www.linkedin.com/oauth/v2/introspectToken';
    
    // State for CSRF protection
    this.state = null;
    
    // LinkedIn scopes - ONLY w_member_social is available without review!
    this.scopes = [
      'w_member_social'   // Post content - This is all we need and all we get!
    ];
  }

  // Check if credentials are configured
  hasCredentials() {
    return !!(this.clientId && this.clientSecret);
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

  // Start OAuth flow
  async authenticate() {
    try {
      if (!this.clientId) {
        throw new Error('LinkedIn Client ID not configured. Please add your credentials in Settings.');
      }
      
      const authUrl = this.getAuthorizationUrl();
      
      // Open authorization URL in system browser
      shell.openExternal(authUrl);
      
      console.log('Opening LinkedIn authorization in browser...');
      console.log('✅ w_member_social scope is now available without app review!');
      
      return {
        success: true,
        message: 'Please complete authentication in your browser',
        requiresApiKeys: true,
        hasCredentials: this.hasCredentials(),
        platform: 'linkedin',
        state: this.state
      };
    } catch (error) {
      console.error('Error starting LinkedIn OAuth:', error);
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state) {
    // Verify state to prevent CSRF
    if (state !== this.state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    if (!this.clientSecret) {
      throw new Error('LinkedIn Client Secret not configured. Please add your credentials in Settings.');
    }
    
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
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
      
      console.log('✅ LinkedIn token exchange successful!');
      console.log('Scopes granted:', scope);
      console.log('Token expires in:', expires_in / 86400, 'days');
      
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
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error === 'invalid_client') {
          throw new Error('Invalid LinkedIn Client ID or Secret. Please check your credentials in Settings.');
        } else if (errorData.error === 'invalid_grant') {
          throw new Error('Authorization code expired or invalid. Please try connecting again.');
        }
      }
      
      throw new Error(`Failed to get access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Refresh access token (LinkedIn tokens last 60 days, refresh tokens last 365 days)
  async refreshAccessToken(refreshToken) {
    if (!this.clientSecret) {
      throw new Error('LinkedIn Client Secret required for token refresh');
    }
    
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
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

  // Get user info (limited with w_member_social scope)
  async getUserInfo(accessToken) {
    try {
      // With only w_member_social scope, we have limited access to profile data
      // Try to get basic profile info, but it might not work
      try {
        const meResponse = await axios.get('https://api.linkedin.com/v2/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });
        
        const userData = meResponse.data;
        
        // Format the name from localized names if available
        const firstName = userData.localizedFirstName || userData.firstName?.localized?.en_US || '';
        const lastName = userData.localizedLastName || userData.lastName?.localized?.en_US || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'LinkedIn User';
        
        return {
          id: userData.id,
          email: null, // Can't get email with w_member_social
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          profilePicture: userData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier
        };
      } catch (profileError) {
        console.log('Could not retrieve profile (this is normal with w_member_social scope)');
        
        // Return a basic user object since we can still post
        // Generate a unique ID based on the access token
        const userId = 'linkedin_' + Date.now();
        
        return {
          id: userId,
          email: null,
          name: 'LinkedIn User',
          firstName: 'LinkedIn',
          lastName: 'User',
          profilePicture: null
        };
      }
    } catch (error) {
      console.error('Error in getUserInfo:', error.message);
      // Even if we can't get user info, we can still post
      // Return a basic user object
      return {
        id: 'linkedin_' + Date.now(),
        email: null,
        name: 'LinkedIn User',
        firstName: 'LinkedIn',
        lastName: 'User',
        profilePicture: null
      };
    }
  }

  // Test posting capability
  async testPost(accessToken, message = 'Test post from Buffer Killer') {
    try {
      // Get person URN
      const meResponse = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      const personUrn = `urn:li:person:${meResponse.data.id}`;
      
      // Create post
      const postData = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: message
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
      
      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      const postId = response.headers['x-restli-id'] || response.data.id;
      
      return {
        success: true,
        postId: postId,
        url: `https://www.linkedin.com/feed/update/${postId}/`
      };
    } catch (error) {
      console.error('Error testing post:', error.response?.data || error.message);
      
      if (error.response?.status === 403) {
        throw new Error('Permission denied. Make sure w_member_social scope is granted.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. LinkedIn limits: 25 posts per 24 hours.');
      }
      
      throw error;
    }
  }

  // Check if token is valid
  async validateToken(accessToken) {
    try {
      const params = new URLSearchParams({
        token: accessToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
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

  // Get setup instructions
  getSetupInstructions() {
    return {
      title: '✅ LinkedIn API Access - NOW AVAILABLE!',
      message: 'Great news! LinkedIn\'s w_member_social scope is now available without app review!',
      steps: [
        '1. Go to https://developer.linkedin.com/',
        '2. Create a new app (takes 2 minutes)',
        '3. "Share on LinkedIn" product is AUTO-ENABLED',
        '4. Add redirect URL: http://127.0.0.1:3000/auth/linkedin/callback',
        '5. Copy Client ID and Client Secret',
        '6. Add them in Buffer Killer Settings',
        '7. Connect your LinkedIn account',
        '8. Start posting!'
      ],
      limits: [
        'Rate limit: 25 posts per 24 hours',
        'Token lifetime: 60 days',
        'Refresh token: 365 days',
        'No app review required!'
      ]
    };
  }
}

module.exports = LinkedInAuth;
