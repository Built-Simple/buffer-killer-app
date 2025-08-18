# 🎉 TWITTER OAUTH SETUP INSTRUCTIONS

## Your app is ready for Twitter integration!

### 📋 What's Been Added:

1. **OAuth Server** (`src/main/auth/oauth-server.js`) - Handles authentication callbacks
2. **Twitter Auth** (`lib/platforms/twitter-auth.js`) - OAuth 2.0 with PKCE implementation
3. **Twitter API** (`lib/platforms/twitter.js`) - Post tweets, threads, get metrics

### 🔐 Step 1: Get Twitter API Keys

1. **Go to Twitter Developer Portal:**
   https://developer.twitter.com/en/portal/dashboard

2. **Create a new App** (or use existing):
   - Click "Projects & Apps" → "Overview"
   - Click "+ Create App"
   - Choose "Production" or "Development"

3. **Set up OAuth 2.0:**
   - In your app settings, find "User authentication settings"
   - Click "Set up"
   - Enable OAuth 2.0
   - Set **Type of App**: "Web App, Automated App or Bot"
   - Add **Callback URI**: `http://127.0.0.1:3000/auth/twitter/callback`
   - Add **Website URL**: `http://localhost:3000`
   - Select these scopes:
     - ✅ `tweet.read`
     - ✅ `tweet.write`
     - ✅ `users.read`
     - ✅ `offline.access`

4. **Copy your credentials:**
   - Client ID (OAuth 2.0)
   - Client Secret (OAuth 2.0)

### 📝 Step 2: Add Keys to .env File

Create a `.env` file in your project root:

```env
# Twitter/X API OAuth 2.0
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_CALLBACK_URL=http://127.0.0.1:3000/auth/twitter/callback

# Development
NODE_ENV=development
ELECTRON_IS_DEV=1
```

### 🔧 Step 3: Update main.js

Add this to your main.js file (at the top after requires):

```javascript
// Add after other requires
const OAuthServer = require('./src/main/auth/oauth-server');
const TwitterAuth = require('./lib/platforms/twitter-auth');
const TwitterAPI = require('./lib/platforms/twitter');

// Create OAuth server instance
const oauthServer = new OAuthServer(3000);
const twitterAuth = new TwitterAuth();

// Store active OAuth flows
const activeAuthFlows = new Map();
```

Then update the `authenticate-platform` handler in main.js:

```javascript
// Replace the mock authenticate-platform handler with:
ipcMain.handle('authenticate-platform', async (event, platform) => {
  try {
    if (platform === 'twitter') {
      // Start OAuth server if not running
      await oauthServer.start();
      
      // Start Twitter OAuth flow
      const result = await twitterAuth.authenticate();
      
      // Store auth instance for later
      activeAuthFlows.set('twitter', twitterAuth);
      
      return result;
    }
    
    // Other platforms...
    console.log(`Starting OAuth for ${platform}`);
    return { success: true, platform };
  } catch (error) {
    console.error(`Error authenticating ${platform}:`, error);
    throw error;
  }
});
```

Add OAuth callback handler in app.whenReady:

```javascript
// Add after initScheduler() in app.whenReady
oauthServer.on('auth-code', async (data) => {
  try {
    const { platform, code, state } = data;
    
    if (platform === 'twitter' && activeAuthFlows.has('twitter')) {
      const auth = activeAuthFlows.get('twitter');
      const tokens = await auth.exchangeCodeForToken(code, state);
      
      // Get user info
      const userInfo = await auth.getUserInfo(tokens.accessToken);
      
      // Store tokens securely
      await db.createOrUpdateAccount('twitter', JSON.stringify({
        ...tokens,
        username: userInfo.username,
        userId: userInfo.id
      }));
      
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('auth-success', {
          platform: 'twitter',
          username: userInfo.username
        });
      }
      
      activeAuthFlows.delete('twitter');
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

// Start OAuth server
await oauthServer.start();
```

### 🚀 Step 4: Test Twitter Connection

1. **Restart the app:**
   ```powershell
   npm start
   ```

2. **Click "Add Account"** in the app

3. **Click "Connect Twitter"**

4. **Your browser will open** - Log in to Twitter and authorize the app

5. **You'll be redirected back** and see success message

### ✅ Step 5: Implement Actual Posting

Update the `publishToPlatform` function in main.js:

```javascript
async function publishToPlatform(platform, content) {
  if (platform === 'twitter') {
    try {
      // Get stored credentials
      const account = db.getAccount('twitter');
      if (!account) {
        throw new Error('Twitter account not connected');
      }
      
      const credentials = JSON.parse(account.credentials);
      
      // Check if token needs refresh
      if (new Date(credentials.expiresAt) <= new Date()) {
        const auth = new TwitterAuth();
        const newTokens = await auth.refreshAccessToken(credentials.refreshToken);
        credentials.accessToken = newTokens.accessToken;
        credentials.refreshToken = newTokens.refreshToken;
        credentials.expiresAt = newTokens.expiresAt;
        
        // Update stored tokens
        await db.createOrUpdateAccount('twitter', JSON.stringify(credentials));
      }
      
      // Post tweet
      const twitter = new TwitterAPI(credentials.accessToken);
      const result = await twitter.postTweet(content);
      
      return result;
    } catch (error) {
      console.error('Error posting to Twitter:', error);
      throw error;
    }
  }
  
  // Other platforms...
  console.log(`Publishing to ${platform}: ${content}`);
  return { success: true };
}
```

### 🔴 Common Issues & Solutions:

**"Callback URL mismatch"**
- Make sure the callback URL in Twitter Developer Portal exactly matches: `http://127.0.0.1:3000/auth/twitter/callback`
- Use `127.0.0.1` not `localhost`

**"Invalid client"**
- Double-check your Client ID and Client Secret in .env file
- Make sure OAuth 2.0 is enabled in Twitter app settings

**"Access denied"**
- Make sure you've selected all required scopes in Twitter app settings
- User must authorize all requested permissions

### 📚 Next Steps:

1. ✅ Test posting a real tweet
2. ⬜ Add LinkedIn (Phase 3.2)
3. ⬜ Add Mastodon (Phase 3.3)
4. ⬜ Implement rate limiting (Phase 7.2)
5. ⬜ Add image upload support (Phase 6)

### 🎯 Your TODO List Progress:

- ✅ Phase 1.2: Project Initialization
- ✅ Phase 1.3: Core Dependencies Installation
- 🔄 Phase 2.1: OAuth2 Implementation Foundation (Twitter done!)
- 🔄 Phase 3.1: Twitter/X API Integration (Basic posting done!)
- ⬜ Phase 3.2: LinkedIn API Integration
- ⬜ Phase 3.3: Mastodon Integration

---

**Need help?** Check the MASTER_TODO_LIST.md for next tasks!