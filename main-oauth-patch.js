// Quick patch to add Twitter OAuth to your existing main.js
// Add this code to your main.js file to enable Twitter authentication

// ============================================
// ADD THESE REQUIRES AT THE TOP OF main.js (after existing requires)
// ============================================
const OAuthServer = require('./src/main/auth/oauth-server');
const TwitterAuth = require('./lib/platforms/twitter-auth');
const TwitterAPI = require('./lib/platforms/twitter');

// Create OAuth server instance
const oauthServer = new OAuthServer(3000);
const activeAuthFlows = new Map();

// ============================================
// ADD THIS IN setupIpcHandlers() function
// REPLACE the existing mock authenticate-platform handler
// ============================================

// Find this code:
/*
  ipcMain.handle('authenticate-platform', async (event, platform) => {
    // This will be implemented per platform
    console.log(`Starting OAuth for ${platform}`);
    // For now, return mock success
    return { success: true, platform };
  });
*/

// Replace with:
  ipcMain.handle('authenticate-platform', async (event, platform) => {
    try {
      if (platform === 'twitter') {
        // Start OAuth server if not running
        await oauthServer.start();
        
        // Create new Twitter auth instance
        const twitterAuth = new TwitterAuth();
        
        // Start Twitter OAuth flow
        const result = await twitterAuth.authenticate();
        
        // Store auth instance for later
        activeAuthFlows.set('twitter', twitterAuth);
        
        return result;
      }
      
      // Other platforms not implemented yet
      console.log(`OAuth not yet implemented for ${platform}`);
      return { 
        success: false, 
        message: `${platform} integration coming soon!` 
      };
    } catch (error) {
      console.error(`Error authenticating ${platform}:`, error);
      throw error;
    }
  });

// ============================================
// ADD THIS IN app.whenReady() (after initScheduler())
// ============================================

  // Start OAuth server
  await oauthServer.start();
  
  // Handle OAuth callbacks
  oauthServer.on('auth-code', async (data) => {
    try {
      const { platform, code, state } = data;
      
      if (platform === 'twitter' && activeAuthFlows.has('twitter')) {
        const auth = activeAuthFlows.get('twitter');
        const tokens = await auth.exchangeCodeForToken(code, state);
        
        // Get user info
        const userInfo = await auth.getUserInfo(tokens.accessToken);
        
        // Store tokens securely (using simple JSON for now)
        const credentials = {
          ...tokens,
          username: userInfo.username,
          userId: userInfo.id,
          name: userInfo.name
        };
        
        await db.createOrUpdateAccount('twitter', JSON.stringify(credentials));
        
        // Notify renderer
        if (mainWindow) {
          mainWindow.webContents.send('auth-success', {
            platform: 'twitter',
            username: userInfo.username
          });
        }
        
        activeAuthFlows.delete('twitter');
        console.log(`Successfully connected Twitter account: @${userInfo.username}`);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      if (mainWindow) {
        mainWindow.webContents.send('auth-error', {
          platform: data.platform,
          error: error.message
        });
      }
    }
  });
  
  oauthServer.on('auth-error', (data) => {
    console.error('OAuth error:', data);
    if (mainWindow) {
      mainWindow.webContents.send('auth-error', data);
    }
    activeAuthFlows.delete(data.platform);
  });

// ============================================
// REPLACE publishToPlatform function
// ============================================

// Find this function:
/*
async function publishToPlatform(platform, content) {
  // This will be replaced with actual platform implementations
  console.log(`Publishing to ${platform}: ${content}`);
  
  // For now, simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 1000);
  });
}
*/

// Replace with:
async function publishToPlatform(platform, content) {
  if (platform === 'twitter') {
    try {
      // Get stored credentials
      const account = db.getAccount('twitter');
      if (!account) {
        throw new Error('Twitter account not connected. Please connect your account first.');
      }
      
      const credentials = JSON.parse(account.credentials);
      
      // Check if token needs refresh (tokens expire after 2 hours)
      if (credentials.expiresAt && new Date(credentials.expiresAt) <= new Date()) {
        console.log('Twitter token expired, refreshing...');
        const auth = new TwitterAuth();
        const newTokens = await auth.refreshAccessToken(credentials.refreshToken);
        
        // Update credentials
        credentials.accessToken = newTokens.accessToken;
        credentials.refreshToken = newTokens.refreshToken || credentials.refreshToken;
        credentials.expiresAt = newTokens.expiresAt;
        
        // Update stored tokens
        await db.createOrUpdateAccount('twitter', JSON.stringify(credentials));
      }
      
      // Post tweet
      console.log(`Posting to Twitter: "${content}"`);
      const twitter = new TwitterAPI(credentials.accessToken);
      const result = await twitter.postTweet(content);
      
      console.log('Tweet posted successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error posting to Twitter:', error);
      throw error;
    }
  }
  
  // Other platforms...
  console.log(`Platform ${platform} not yet implemented`);
  return { success: false, message: 'Platform not yet implemented' };
}

// ============================================
// ADD THIS to app.on('window-all-closed')
// ============================================

// Find:
/*
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    scheduledJobs.forEach(job => job.cancel());
    app.quit();
  }
});
*/

// Replace with:
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Clean up
    scheduledJobs.forEach(job => job.cancel());
    oauthServer.stop(); // Stop OAuth server
    app.quit();
  }
});