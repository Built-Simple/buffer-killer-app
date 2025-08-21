// Buffer Killer App - Main Process
// This is the entry point for the Electron application

const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const schedule = require('node-schedule');
require('dotenv').config();

// OAuth and Platform imports
const OAuthServer = require('./src/main/auth/oauth-server');
const TwitterAuth = require('./lib/platforms/twitter-auth');
const TwitterBrowserAuth = require('./lib/platforms/twitter-browser-auth');
const TwitterAPI = require('./lib/platforms/twitter');
const MastodonAuth = require('./lib/platforms/mastodon-auth');
const MastodonAPI = require('./lib/platforms/mastodon');
const GitHubAuth = require('./lib/platforms/github-auth');
const GitHubBrowserAuth = require('./lib/platforms/github-browser-auth');
const GitHubAPI = require('./lib/platforms/github');
const LinkedInAuth = require('./lib/platforms/linkedin-auth');
const LinkedInAPI = require('./lib/platforms/linkedin');
const WebsiteAPI = require('./lib/platforms/website');
const SkoolAPI = require('./lib/platforms/skool');
const YouTubeAPI = require('./lib/platforms/youtube');
// const { fixOAuthCallbacks } = require('./lib/auth/oauth-fix'); // REMOVED - was causing issues

// Settings Manager
const SettingsManager = require('./src/main/settings/settings-manager');
const settingsManager = new SettingsManager();

// Rate Limiter
const { getRateLimiter } = require('./lib/rate-limiter');

// Image Generator
const { setupImageGeneratorIPC } = require('./lib/image-generator/ipc-handlers');

// Account System Integration (Practical workspace management)
const AccountSystemIntegration = require('./lib/accounts/integration');
let accountSystem = null;

// Create OAuth server instance
const oauthServer = new OAuthServer(3000);
const activeAuthFlows = new Map();

// Store Mastodon app registrations per instance
const mastodonApps = new Map();

// Debug activeAuthFlows
setInterval(() => {
  if (activeAuthFlows.size > 0) {
    console.log('[DEBUG] Active auth flows:', Array.from(activeAuthFlows.keys()));
  }
}, 5000);

// Global reference to prevent garbage collection
let mainWindow = null;
let oauthWindow = null;
let scheduledJobs = new Map();

// Import the SQLite database system
const Database = require('./src/database/sqlite-database');
const CSVImporter = require('./src/csv/csv-importer');
const DraftManager = require('./src/drafts/draft-manager');

// Initialize database
let db = null;
let draftManager = null;

// Security: Prevent new window creation except for OAuth
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    // Only allow OAuth redirects to open
    if (navigationUrl.startsWith('http://127.0.0.1:3000/auth/')) {
      shell.openExternal(navigationUrl);
    }
  });
});

// Database initialization with automatic migration
async function initDatabase() {
  try {
    // Initialize new database
    db = new Database();
    await db.initialize();
    
    // Check if old JSON database exists and migrate if needed
    const oldDbPath = path.join(__dirname, 'db', 'database.json');
    try {
      await fs.access(oldDbPath);
      console.log('Found old JSON database, migrating...');
      const migrated = await db.migrateFromJSON(oldDbPath);
      if (migrated) {
        // Backup old database
        const backupPath = path.join(__dirname, 'db', 'database.json.backup');
        await fs.rename(oldDbPath, backupPath);
        console.log('Migration complete, old database backed up');
      }
    } catch {
      // No old database found, that's fine
      console.log('No existing database found, starting fresh');
    }
    
    // Add helper methods for backward compatibility
    db.createPost = async (post) => db.insert('posts', post);
    db.getPendingPosts = async (beforeTime) => {
      const posts = await db.query('posts')
        .where('status', 'pending')
        .where('scheduled_time', 'lte', beforeTime)
        .orderByField('scheduled_time', 'asc')
        .execute();
      return posts;
    };
    db.getScheduledPosts = async () => {
      const posts = await db.query('posts')
        .where('status', 'pending')
        .orderByField('scheduled_time', 'asc')
        .execute();
      return posts;
    };
    db.updatePost = async (id, updates) => db.update('posts', id, updates);
    db.createOrUpdateAccount = async (platform, credentials) => {
      // Parse credentials to extract username and tokens
      let parsedCreds = {};
      let username = null;
      let accessToken = null;
      let refreshToken = null;
      
      try {
        parsedCreds = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
        username = parsedCreds.username || parsedCreds.displayName || parsedCreds.name || null;
        accessToken = parsedCreds.accessToken || parsedCreds.access_token || null;
        refreshToken = parsedCreds.refreshToken || parsedCreds.refresh_token || null;
      } catch (e) {
        console.error('Error parsing credentials:', e);
      }
      
      const existing = await db.findOne('accounts', { platform });
      if (existing) {
        return await db.update('accounts', existing.id, { 
          credentials: typeof credentials === 'string' ? credentials : JSON.stringify(credentials),
          username: username,
          access_token: accessToken,
          refresh_token: refreshToken,
          updated_at: new Date().toISOString()
        });
      } else {
        return await db.insert('accounts', { 
          platform, 
          credentials: typeof credentials === 'string' ? credentials : JSON.stringify(credentials),
          username: username,
          access_token: accessToken,
          refresh_token: refreshToken,
          active: true,
          workspace_id: 1  // Default workspace
        });
      }
    };
    db.getAccount = async (platform) => db.findOne('accounts', { platform, active: true });
    db.getAccounts = async () => db.find('accounts', {});
    
    // Initialize draft manager
    draftManager = new DraftManager(db);
    
    console.log('Enhanced database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Create the main application window
function createMainWindow() {
  // Security-first configuration
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Buffer Killer - Social Media Scheduler',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false, // Security: Disable Node.js in renderer
      contextIsolation: true, // Security: Enable context isolation
      sandbox: true, // Security: Enable sandbox
      preload: path.join(__dirname, 'preload.js'), // Will create this next
      webSecurity: true
    },
    show: false // Don't show until ready
  });
  
  // Load the main HTML file
  mainWindow.loadFile('index.html');
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1') {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Security: Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });
}

// Initialize the scheduler
function initScheduler() {
  // Check for posts to publish every minute
  const job = schedule.scheduleJob('* * * * *', async () => {
    try {
      const now = new Date().toISOString();
      const posts = await db.getPendingPosts(now);
      
      for (const post of posts) {
        await publishPost(post);
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });
  
  console.log('Scheduler initialized');
}

// Publish a post to all selected platforms
async function publishPost(post) {
  try {
    const platforms = JSON.parse(post.platforms);
    const mediaFiles = post.media ? JSON.parse(post.media) : [];
    let allSuccess = true;
    let errorMessages = [];
    
    for (const platform of platforms) {
      try {
        // Publish with media if available
        await publishToPlatform(platform, post.content, mediaFiles);
        console.log(`Published to ${platform}`);
      } catch (error) {
        allSuccess = false;
        errorMessages.push(`${platform}: ${error.message}`);
        console.error(`Failed to publish to ${platform}:`, error);
      }
    }
    
    // Update post status
    const status = allSuccess ? 'published' : 'partial_failure';
    const errorMessage = errorMessages.length > 0 ? errorMessages.join('; ') : null;
    
    await db.updatePost(post.id, { 
      status, 
      error_message: errorMessage 
    });
    
    // Notify renderer process
    if (mainWindow) {
      mainWindow.webContents.send('post-published', {
        postId: post.id,
        status,
        errorMessage
      });
    }
  } catch (error) {
    console.error('Error publishing post:', error);
  }
}

// Platform-specific publishing with media support
async function publishToPlatform(platform, content, mediaFiles = []) {
  if (platform === 'twitter') {
    try {
      // Get stored credentials
      const account = await db.getAccount('twitter');
      if (!account) {
        throw new Error('Twitter account not connected. Please connect your account first.');
      }
      
      const credentials = JSON.parse(account.credentials);
      
      // Check if token needs refresh (tokens expire after 2 hours)
      if (credentials.expiresAt && new Date(credentials.expiresAt) <= new Date()) {
        console.log('Twitter token expired, refreshing...');
        const auth = new TwitterBrowserAuth();
        const newTokens = await auth.refreshAccessToken(credentials.refreshToken);
        
        // Update credentials
        credentials.accessToken = newTokens.accessToken;
        credentials.refreshToken = newTokens.refreshToken || credentials.refreshToken;
        credentials.expiresAt = newTokens.expiresAt;
        
        // Update stored tokens
        await db.createOrUpdateAccount('twitter', JSON.stringify(credentials));
      }
      
      // Upload media if provided
      const mediaIds = [];
      if (mediaFiles && mediaFiles.length > 0) {
        console.log(`Uploading ${mediaFiles.length} media files to Twitter...`);
        for (const media of mediaFiles) {
          try {
            const uploadResult = await twitter.uploadMedia(media.buffer, media.mimeType);
            mediaIds.push(uploadResult.mediaId);
          } catch (uploadError) {
            console.error('Failed to upload media:', uploadError);
            // Continue with text-only post if media upload fails
          }
        }
      }
      
      // Post tweet with media
      console.log(`Posting to Twitter: "${content}"`);
      const twitter = new TwitterAPI(credentials.accessToken, credentials.userId || 'default');
      const result = await twitter.postTweet(content, { mediaIds });
      
      console.log('Tweet posted successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error posting to Twitter:', error);
      throw error;
    }
  } else if (platform === 'mastodon') {
    try {
      // Get stored credentials
      const account = await db.getAccount('mastodon');
      if (!account) {
        throw new Error('Mastodon account not connected. Please connect your account first.');
      }
      
      const credentials = JSON.parse(account.credentials);
      
      // Upload media if provided
      const mediaIds = [];
      if (mediaFiles && mediaFiles.length > 0) {
        console.log(`Uploading ${mediaFiles.length} media files to Mastodon...`);
        const mastodon = new MastodonAPI(credentials.accessToken, credentials.instance);
        for (const media of mediaFiles) {
          try {
            const uploadResult = await mastodon.uploadMedia(media.buffer, media.description || '', {
              filename: media.filename,
              contentType: media.mimeType
            });
            mediaIds.push(uploadResult.id);
          } catch (uploadError) {
            console.error('Failed to upload media:', uploadError);
            // Continue with text-only post if media upload fails
          }
        }
      }
      
      // Post toot with media
      console.log(`Posting to Mastodon (${credentials.instance}): "${content}"`);
      const mastodon = new MastodonAPI(credentials.accessToken, credentials.instance, credentials.userId || 'default');
      const result = await mastodon.postToot(content, { mediaIds });
      
      console.log('Toot posted successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error posting to Mastodon:', error);
      throw error;
    }
  } else if (platform === 'github') {
    try {
      // Get stored credentials
      const account = await db.getAccount('github');
      if (!account) {
        throw new Error('GitHub account not connected. Please connect your account first.');
      }
      
      const credentials = JSON.parse(account.credentials);
      
      // Post to GitHub (as issue by default, can be configured)
      console.log(`Posting to GitHub: "${content}"`);
      const github = new GitHubAPI(credentials.accessToken, credentials.userId || 'default');
      
      // Use the configured repo or default to 'social-posts'
      const repo = credentials.defaultRepo || 'social-posts';
      const postType = credentials.postType || 'issue';
      
      const result = await github.postStatus(content, {
        repo: repo,
        owner: credentials.username,
        type: postType
      });
      
      console.log('GitHub post created successfully:', result.url);
      return result;
    } catch (error) {
      console.error('Error posting to GitHub:', error);
      throw error;
    }
  } else if (platform === 'linkedin') {
    try {
      // Get stored credentials
      const account = await db.getAccount('linkedin');
      if (!account) {
        throw new Error('LinkedIn account not connected. Please connect your account first.');
      }
      
      const credentials = JSON.parse(account.credentials);
      
      // Post to LinkedIn using REST API (works with w_member_social)
      console.log(`Posting to LinkedIn: "${content}"`);
      const linkedin = new LinkedInAPI(credentials.accessToken, credentials.userId);
      
      // Use the REST API method which works with w_member_social scope
      const result = await linkedin.postV2(content);
      
      console.log('LinkedIn post created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error posting to LinkedIn:', error);
      throw error;
    }
  } else if (platform === 'website') {
    try {
      // Get webhook configuration from settings or database
      const settings = await settingsManager.loadSettings();
      const webhookUrl = settings.WEBSITE_WEBHOOK_URL || process.env.WEBSITE_WEBHOOK_URL;
      const apiKey = settings.WEBSITE_API_KEY || process.env.WEBSITE_API_KEY;
      
      if (!webhookUrl) {
        throw new Error('Website webhook URL not configured. Please add it in Settings.');
      }
      
      // Post to website
      console.log(`Posting to website webhook: "${content}"`);
      const website = new WebsiteAPI(webhookUrl, apiKey);
      const result = await website.post(content);
      
      console.log('Website webhook called successfully');
      return result;
    } catch (error) {
      console.error('Error posting to website:', error);
      throw error;
    }
  } else if (platform === 'skool') {
    try {
      // Get Skool configuration
      const settings = await settingsManager.loadSettings();
      const skoolToken = settings.SKOOL_API_KEY || process.env.SKOOL_API_KEY;
      const skoolCommunity = settings.SKOOL_COMMUNITY_URL || process.env.SKOOL_COMMUNITY_URL;
      const skoolWebhook = settings.SKOOL_WEBHOOK_URL || process.env.SKOOL_WEBHOOK_URL;
      
      if (!skoolToken && !skoolWebhook) {
        throw new Error('Skool not configured. Please add API key or webhook URL in Settings.');
      }
      
      // Post to Skool
      console.log(`Posting to Skool: "${content}"`);
      const skool = new SkoolAPI(skoolToken, skoolCommunity);
      const result = await skool.post(content, { webhookUrl: skoolWebhook });
      
      console.log('Skool post created successfully');
      return result;
    } catch (error) {
      console.error('Error posting to Skool:', error);
      throw error;
    }
  } else if (platform === 'youtube') {
    try {
      // Get stored credentials
      const account = await db.getAccount('youtube');
      if (!account) {
        throw new Error('YouTube account not connected. Please connect your account first.');
      }
      
      const credentials = JSON.parse(account.credentials);
      
      // Check if token needs refresh
      if (credentials.expiresAt && new Date(credentials.expiresAt) <= new Date()) {
        console.log('YouTube token expired, refreshing...');
        const youtube = new YouTubeAPI(credentials.accessToken, credentials.refreshToken);
        const newTokens = await youtube.refreshAccessToken();
        
        // Update credentials
        credentials.accessToken = newTokens.accessToken;
        credentials.expiresAt = new Date(Date.now() + (newTokens.expiresIn * 1000)).toISOString();
        
        // Update stored tokens
        await db.createOrUpdateAccount('youtube', JSON.stringify(credentials));
      }
      
      // Post to YouTube Community
      console.log(`Posting to YouTube Community: "${content}"`);
      const youtube = new YouTubeAPI(credentials.accessToken, credentials.refreshToken);
      const result = await youtube.post(content);
      
      console.log('YouTube Community post created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error posting to YouTube:', error);
      throw error;
    }
  }
  
  // Platform not implemented
  console.log(`Platform ${platform} not yet implemented`);
  return { success: false, message: 'Platform not yet implemented' };
}

// IPC Handlers
function setupIpcHandlers() {
  // Handle scheduling a new post with media support
  ipcMain.handle('schedule-post', async (event, postData) => {
    try {
      const { content, platforms, scheduledTime, media } = postData;
      
      const post = await db.createPost({
        content,
        platforms: JSON.stringify(platforms),
        scheduled_time: scheduledTime,
        status: 'pending',
        media: media ? JSON.stringify(media) : null
      });
      
      return { id: post.id, success: true };
    } catch (error) {
      console.error('Error scheduling post:', error);
      throw error;
    }
  });
  
  // Handle file selection for media upload
  ipcMain.handle('select-media-files', async () => {
    const { dialog } = require('electron');
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
          { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'webm'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled) {
        return { canceled: true };
      }
      
      // Read files and convert to base64
      const fs = require('fs').promises;
      const path = require('path');
      const files = [];
      
      for (const filePath of result.filePaths) {
        const buffer = await fs.readFile(filePath);
        const stats = await fs.stat(filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        // Determine MIME type
        let mimeType = 'application/octet-stream';
        if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.mp4') mimeType = 'video/mp4';
        else if (ext === '.mov') mimeType = 'video/quicktime';
        else if (ext === '.avi') mimeType = 'video/x-msvideo';
        else if (ext === '.webm') mimeType = 'video/webm';
        
        files.push({
          filename: path.basename(filePath),
          mimeType: mimeType,
          size: stats.size,
          buffer: buffer.toString('base64'),
          preview: mimeType.startsWith('image/') ? `data:${mimeType};base64,${buffer.toString('base64')}` : null
        });
      }
      
      return { files };
    } catch (error) {
      console.error('Error selecting media files:', error);
      throw error;
    }
  });
  
  // Handle fetching scheduled posts
  ipcMain.handle('get-scheduled-posts', async () => {
    try {
      return await db.getScheduledPosts();
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  });
  
  // Handle OAuth authentication
  ipcMain.handle('authenticate-platform', async (event, platform, options = {}) => {
    console.log('[IPC] authenticate-platform called');
    console.log('[IPC] Platform:', platform);
    console.log('[IPC] Options:', options);
    
    try {
      // Start OAuth server if not running
      console.log('[IPC] Ensuring OAuth server is running...');
      await oauthServer.start();
      console.log('[IPC] OAuth server confirmed running');
      
      if (platform === 'twitter') {
        // Use browser-based auth (no API keys required!)
        const twitterAuth = new TwitterBrowserAuth();
        
        // Start browser-based Twitter OAuth flow with PKCE
        const result = await twitterAuth.authenticate();
        
        // Store auth instance for later
        activeAuthFlows.set('twitter', twitterAuth);
        
        console.log('Using browser-based Twitter authentication with PKCE - no API keys required!');
        return result;
      } else if (platform === 'mastodon') {
        console.log('[IPC] Starting Mastodon authentication...');
        
        // For Mastodon, we need the instance URL
        const instance = options.instance || 'mastodon.social';
        console.log('[IPC] Mastodon instance:', instance);
        
        // Create new Mastodon auth instance
        console.log('[IPC] Creating MastodonAuth instance...');
        const mastodonAuth = new MastodonAuth(instance);
        console.log('[IPC] MastodonAuth instance created');
        console.log('[IPC] Initial state:', mastodonAuth.state);
        
        // Register app and start OAuth flow
        console.log('[IPC] Calling mastodonAuth.authenticate()...');
        const result = await mastodonAuth.authenticate();
        console.log('[IPC] authenticate() result:', result);
        
        // Store auth instance and app credentials for later
        // Use state as the key to ensure we can find it later
        const authKey = `mastodon-${instance}-${result.state || mastodonAuth.state}`;
        console.log(`[MASTODON AUTH] ====== STORING AUTH INSTANCE ======`);
        console.log(`[MASTODON AUTH] Instance: ${instance}`);
        console.log(`[MASTODON AUTH] Auth Key: ${authKey}`);
        console.log(`[MASTODON AUTH] State from result: ${result.state}`);
        console.log(`[MASTODON AUTH] State from auth instance: ${mastodonAuth.state}`);
        console.log(`[MASTODON AUTH] Client ID: ${result.clientId}`);
        
        // Store with multiple keys for redundancy
        activeAuthFlows.set(authKey, mastodonAuth);
        activeAuthFlows.set(`mastodon-${instance}`, mastodonAuth);
        activeAuthFlows.set(`state-${mastodonAuth.state}`, mastodonAuth);
        
        mastodonApps.set(instance, {
          clientId: result.clientId,
          clientSecret: result.clientSecret,
          state: mastodonAuth.state  // Also store state here for redundancy
        });
        
        console.log(`[MASTODON AUTH] Stored in activeAuthFlows. Current keys:`, Array.from(activeAuthFlows.keys()));
        console.log(`[MASTODON AUTH] ====== END STORING ======`);
        console.log('[IPC] Returning result to renderer...');
        
        return result;
      } else if (platform === 'github') {
        // Use browser-based auth (no API keys required!)
        const githubAuth = new GitHubBrowserAuth();
        
        // Start browser-based GitHub OAuth flow
        const result = await githubAuth.authenticate();
        
        // Store auth instance for later
        activeAuthFlows.set('github', githubAuth);
        
        console.log('Using browser-based GitHub authentication - no API keys required!');
        return result;
      } else if (platform === 'linkedin') {
        // Check if credentials are configured
        const settings = await settingsManager.loadSettings();
        const clientId = settings.LINKEDIN_CLIENT_ID;
        const clientSecret = settings.LINKEDIN_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
          return {
            success: false,
            message: 'Please configure your LinkedIn API credentials in Settings first',
            requiresSetup: true
          };
        }
        
        // Use full OAuth with user-provided credentials
        const linkedinAuth = new LinkedInAuth(clientId, clientSecret);
        
        // Start LinkedIn OAuth flow
        const result = await linkedinAuth.authenticate();
        
        // Store auth instance for later
        activeAuthFlows.set('linkedin', linkedinAuth);
        
        console.log('Using LinkedIn OAuth with user credentials');
        return result;
      }
      
      // Other platforms not implemented yet
      console.log(`[IPC] OAuth not yet implemented for ${platform}`);
      return { 
        success: false, 
        message: `${platform} integration coming soon!` 
      };
    } catch (error) {
      console.error(`[IPC ERROR] ====== AUTHENTICATION ERROR ======`);
      console.error(`[IPC ERROR] Platform: ${platform}`);
      console.error(`[IPC ERROR] Error message:`, error.message);
      console.error(`[IPC ERROR] Error stack:`, error.stack);
      console.error(`[IPC ERROR] ====== END ERROR ======`);
      throw error;
    }
  });
  
  // Handle getting Mastodon instance (new handler)
  ipcMain.handle('get-mastodon-instance', async () => {
    // This will open a dialog to get the instance URL
    // For now, return a default or prompt in the renderer
    return { instance: 'mastodon.social' };
  });
  
  // Handle secure token storage
  ipcMain.handle('store-token', async (event, data) => {
    const { platform, token } = data;
    
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system');
    }
    
    const encryptedToken = safeStorage.encryptString(token);
    
    // Store in database
    try {
      await db.createOrUpdateAccount(platform, encryptedToken.toString('base64'));
      return { success: true };
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  });
  
  // Handle secure token retrieval
  ipcMain.handle('get-token', async (event, platform) => {
    try {
      const account = await db.getAccount(platform);
      
      if (!account) {
        return null;
      }
      
      const encryptedBuffer = Buffer.from(account.credentials, 'base64');
      const decrypted = safeStorage.decryptString(encryptedBuffer);
      return decrypted;
    } catch (error) {
      console.error('Error retrieving token:', error);
      throw error;
    }
  });
  
  // Handle getting connected accounts
  ipcMain.handle('get-accounts', async () => {
    try {
      console.log('[IPC] Getting accounts from database...');
      const accounts = await db.getAccounts();
      console.log('[IPC] Found accounts:', accounts.length);
      
      // Parse credentials to get usernames
      const accountsWithUsernames = accounts.map(account => {
        try {
          const creds = JSON.parse(account.credentials);
          return {
            ...account,
            username: creds.username || creds.displayName || 'Not set',
            displayName: creds.displayName || creds.name || creds.username
          };
        } catch (e) {
          console.error('[IPC] Error parsing credentials for', account.platform, e);
          return {
            ...account,
            username: 'Not set',
            displayName: account.platform
          };
        }
      });
      
      console.log('[IPC] Returning accounts with usernames:', accountsWithUsernames);
      return accountsWithUsernames;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
  });
  
  // FIXED: Add missing account management handlers
  ipcMain.handle('add-account', async (event, platform, username, instance, data) => {
    try {
      console.log('[IPC] Adding account:', { platform, username, instance });
      
      // Create credentials object
      const credentials = {
        ...data,
        platform,
        username,
        instance
      };
      
      // Insert into database
      const result = await db.insert('accounts', {
        platform,
        username,
        credentials: JSON.stringify(credentials),
        active: true,
        workspace_id: 1 // Default to workspace 1 for now
      });
      
      console.log('[IPC] Account added:', result);
      return result;
    } catch (error) {
      console.error('[IPC] Error adding account:', error);
      throw error;
    }
  });
  
  ipcMain.handle('remove-account', async (event, accountId) => {
    try {
      console.log('[IPC] Removing account:', accountId);
      await db.delete('accounts', accountId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error removing account:', error);
      throw error;
    }
  });
  
  ipcMain.handle('post-now', async (event, content, platforms, selectedAccounts) => {
    try {
      console.log('[IPC] Post now:', { content, platforms, selectedAccounts });
      
      // Create a post scheduled for immediate publishing
      const post = await db.createPost({
        content,
        platforms: JSON.stringify(platforms),
        scheduled_time: new Date().toISOString(),
        status: 'pending'
      });
      
      // Immediately publish it
      await publishPost(post);
      
      return { success: true, postId: post.id };
    } catch (error) {
      console.error('[IPC] Error posting now:', error);
      throw error;
    }
  });
  
  ipcMain.handle('get-current-workspace', async () => {
    try {
      // For now, return the default workspace
      const workspaces = await db.find('workspaces', { is_default: 1 });
      if (workspaces.length > 0) {
        const workspace = workspaces[0];
        // Get accounts in this workspace
        const accounts = await db.find('accounts', { workspace_id: workspace.id });
        workspace.accounts = accounts.map(a => a.id);
        return workspace;
      }
      return null;
    } catch (error) {
      console.error('[IPC] Error getting current workspace:', error);
      throw error;
    }
  });
  
  ipcMain.handle('remove-account-from-workspace', async (event, workspaceId, accountId) => {
    try {
      console.log('[IPC] Removing account from workspace:', { workspaceId, accountId });
      
      // Update account to remove workspace association
      await db.update('accounts', accountId, { workspace_id: null });
      
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error removing account from workspace:', error);
      throw error;
    }
  });
  
  // Settings handlers
  ipcMain.handle('get-settings', async () => {
    try {
      await settingsManager.loadSettings();
      return settingsManager.getMaskedCredentials();
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  });
  
  ipcMain.handle('update-settings', async (event, updates) => {
    try {
      await settingsManager.updateMultiple(updates);
      // Reload dotenv to apply changes
      require('dotenv').config();
      return { success: true };
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  });
  
  ipcMain.handle('test-api-credentials', async (event, platform) => {
    try {
      const result = await settingsManager.testCredentials(platform);
      return result;
    } catch (error) {
      console.error('Error testing credentials:', error);
      return { success: false, message: error.message };
    }
  });
  
  ipcMain.handle('get-platform-status', async () => {
    try {
      return settingsManager.getPlatformStatus();
    } catch (error) {
      console.error('Error getting platform status:', error);
      throw error;
    }
  });
  
  // Handle deleting a post
  ipcMain.handle('delete-post', async (event, postId) => {
    try {
      await db.delete('posts', postId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  });
  
  // Handle updating a post
  ipcMain.handle('update-post', async (event, postId, updates) => {
    try {
      const post = await db.updatePost(postId, updates);
      return { success: true, post };
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  });
  
  // CSV Import/Export handlers
  ipcMain.handle('import-csv', async () => {
    const { dialog } = require('electron');
    const csvImporter = new CSVImporter(db);
    
    try {
      // Show file picker
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled) {
        return { canceled: true };
      }
      
      // Import the CSV file
      const importResult = await csvImporter.importFromFile(result.filePaths[0]);
      return importResult;
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  });
  
  ipcMain.handle('export-csv', async () => {
    const { dialog } = require('electron');
    const csvImporter = new CSVImporter(db);
    
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `scheduled-posts-${new Date().toISOString().split('T')[0]}.csv`,
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled) {
        return { canceled: true };
      }
      
      // Export to CSV file
      const exportResult = await csvImporter.exportToCSV(result.filePath);
      return exportResult;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  });
  
  ipcMain.handle('download-csv-template', async () => {
    const { dialog } = require('electron');
    const csvImporter = new CSVImporter(db);
    
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'buffer-killer-template.csv',
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled) {
        return { canceled: true };
      }
      
      // Generate and save template
      const template = csvImporter.generateTemplate();
      await fs.writeFile(result.filePath, template, 'utf8');
      
      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  });
  
  // Rate Limiting handlers
  ipcMain.handle('get-rate-limit-stats', async () => {
    try {
      const limiter = getRateLimiter();
      return limiter.getStats();
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      throw error;
    }
  });
  
  ipcMain.handle('reset-rate-limits', async (event, platform, accountId) => {
    try {
      const limiter = getRateLimiter();
      limiter.resetLimiter(platform, accountId);
      return { success: true };
    } catch (error) {
      console.error('Error resetting rate limits:', error);
      throw error;
    }
  });
  
  ipcMain.handle('check-rate-limits', async (event, platform, accountId) => {
    try {
      const limiter = getRateLimiter();
      return limiter.checkLimits(platform, accountId);
    } catch (error) {
      console.error('Error checking rate limits:', error);
      throw error;
    }
  });
  
  // Draft system handlers
  ipcMain.handle('create-draft', async (event, draftData) => {
    try {
      const draft = await draftManager.createDraft(draftData);
      return draft;
    } catch (error) {
      console.error('Error creating draft:', error);
      throw error;
    }
  });
  
  ipcMain.handle('get-drafts', async (event, options) => {
    try {
      const drafts = await draftManager.getAllDrafts(options);
      return drafts;
    } catch (error) {
      console.error('Error getting drafts:', error);
      throw error;
    }
  });
  
  ipcMain.handle('get-draft', async (event, draftId) => {
    try {
      const draft = await draftManager.getDraft(draftId);
      return draft;
    } catch (error) {
      console.error('Error getting draft:', error);
      throw error;
    }
  });
  
  ipcMain.handle('update-draft', async (event, draftId, updates) => {
    try {
      const draft = await draftManager.updateDraft(draftId, updates);
      return draft;
    } catch (error) {
      console.error('Error updating draft:', error);
      throw error;
    }
  });
  
  ipcMain.handle('delete-draft', async (event, draftId) => {
    try {
      await draftManager.deleteDraft(draftId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting draft:', error);
      throw error;
    }
  });
  
  ipcMain.handle('publish-draft', async (event, draftId, scheduledTime) => {
    try {
      const post = await draftManager.publishDraft(draftId, scheduledTime);
      return post;
    } catch (error) {
      console.error('Error publishing draft:', error);
      throw error;
    }
  });
  
  ipcMain.handle('duplicate-draft', async (event, draftId) => {
    try {
      const duplicate = await draftManager.duplicateDraft(draftId);
      return duplicate;
    } catch (error) {
      console.error('Error duplicating draft:', error);
      throw error;
    }
  });
  
  ipcMain.handle('search-drafts', async (event, searchTerm) => {
    try {
      const drafts = await draftManager.searchDrafts(searchTerm);
      return drafts;
    } catch (error) {
      console.error('Error searching drafts:', error);
      throw error;
    }
  });
  
  ipcMain.handle('auto-save-draft', async (event, draftId, content, platforms) => {
    try {
      const draft = await draftManager.autoSave(draftId, content, platforms);
      return draft;
    } catch (error) {
      console.error('Error auto-saving draft:', error);
      throw error;
    }
  });
  
  ipcMain.handle('get-draft-stats', async () => {
    try {
      const stats = await draftManager.getStats();
      return stats;
    } catch (error) {
      console.error('Error getting draft stats:', error);
      throw error;
    }
  });
  
  // Debug handler to check auth flows
  ipcMain.handle('debug-auth-flows', async () => {
    const flows = Array.from(activeAuthFlows.keys());
    console.log('[DEBUG IPC] Active auth flows:', flows);
    console.log('[DEBUG IPC] Auth flows size:', activeAuthFlows.size);
    return {
      count: activeAuthFlows.size,
      keys: flows
    };
  });
}

// App event handlers
app.whenReady().then(async () => {
  console.log('[MAIN] ====== APP STARTING ======');
  console.log('[MAIN] Electron app ready');
  
  try {
    // Initialize database
    console.log('[MAIN] Initializing database...');
    await initDatabase();
    console.log('[MAIN] Database initialized ✓');
    
    // Create main window
    console.log('[MAIN] Creating main window...');
    createMainWindow();
    console.log('[MAIN] Main window created ✓');
    
    // Set up IPC handlers
    console.log('[MAIN] Setting up IPC handlers...');
    setupIpcHandlers();
    console.log('[MAIN] IPC handlers ready ✓');
    
    // Set up Image Generator IPC handlers
    console.log('[MAIN] Setting up image generator...');
    setupImageGeneratorIPC();
    console.log('[MAIN] Image generator ready ✓');
    
    // Initialize account system (workspaces and rate limiting)
    console.log('[MAIN] Initializing account system...');
    accountSystem = new AccountSystemIntegration(db);
    await accountSystem.initialize();
    console.log('[MAIN] Account system initialized ✓');
    
    // Initialize scheduler
    console.log('[MAIN] Initializing scheduler...');
    initScheduler();
    console.log('[MAIN] Scheduler initialized ✓');
    
    // Initialize rate limiter event listeners
    console.log('[MAIN] Setting up rate limiter...');
    const rateLimiter = getRateLimiter();
    
    rateLimiter.on('rate-limit-warning', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('rate-limit-warning', data);
      }
    });
    
    rateLimiter.on('rate-limit-exceeded', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('rate-limit-exceeded', data);
      }
    });
    
    rateLimiter.on('approaching-limit', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('rate-limit-warning', data);
      }
    });
    console.log('[MAIN] Rate limiter ready ✓');
    
    // Start OAuth server - THIS IS CRITICAL!
    console.log('[MAIN] Starting OAuth server...');
    try {
      await oauthServer.start();
      console.log('[MAIN] OAuth server started successfully ✓');
    } catch (error) {
      console.error('[MAIN] Failed to start OAuth server:', error);
      console.error('[MAIN] OAuth authentication will not work!');
    }
    
    // Handle OAuth callbacks
    console.log('[MAIN] Setting up OAuth server event listeners');
    
    oauthServer.on('auth-code', async (data) => {
      console.log('[MAIN] ====== AUTH-CODE EVENT RECEIVED ======');
      console.log('[MAIN] Platform:', data.platform);
      console.log('[MAIN] Code present:', !!data.code);
      console.log('[MAIN] State:', data.state);
      
      try {
        const { platform, code, state } = data;
        
        if (platform === 'twitter' && activeAuthFlows.has('twitter')) {
          const auth = activeAuthFlows.get('twitter');
          // Browser auth with PKCE doesn't need client secret
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
        } else if (platform === 'mastodon') {
          console.log('[MASTODON CALLBACK] ====== CALLBACK RECEIVED ======');
          console.log('[MASTODON CALLBACK] Code:', code ? 'present' : 'missing');
          console.log('[MASTODON CALLBACK] State:', state);
          console.log('[MASTODON CALLBACK] Active auth flows:', Array.from(activeAuthFlows.keys()));
          
          // Find the matching Mastodon auth flow
          let mastodonAuth = null;
          let authKey = null;
          
          // Method 1: Try to find by state key directly
          const stateKey = `state-${state}`;
          if (activeAuthFlows.has(stateKey)) {
            mastodonAuth = activeAuthFlows.get(stateKey);
            authKey = stateKey;
            console.log(`[MASTODON CALLBACK] Found auth instance by state key: ${stateKey}`);
          }
          
          // Method 2: Search all mastodon keys for matching state
          if (!mastodonAuth) {
            for (const [key, auth] of activeAuthFlows) {
              console.log(`[MASTODON CALLBACK] Checking key: ${key}`);
              console.log(`[MASTODON CALLBACK] Auth object:`, auth ? 'exists' : 'null');
              console.log(`[MASTODON CALLBACK] Auth state:`, auth ? auth.state : 'N/A');
              
              if (auth && auth.state === state) {
                mastodonAuth = auth;
                authKey = key;
                console.log(`[MASTODON CALLBACK] Found matching auth instance by state search: ${key}`);
                break;
              }
            }
          }
          
          // Method 3: If still not found, try to get the most recent Mastodon auth
          if (!mastodonAuth) {
            console.log('[MASTODON CALLBACK] WARNING: Could not find auth by state, trying fallback...');
            for (const [key, auth] of activeAuthFlows) {
              if (key.startsWith('mastodon-') && auth) {
                mastodonAuth = auth;
                authKey = key;
                console.log(`[MASTODON CALLBACK] Using fallback auth instance: ${key}`);
                console.log(`[MASTODON CALLBACK] Fallback auth state: ${auth.state}`);
                break;
              }
            }
          }
          
          if (mastodonAuth) {
            console.log('[MASTODON CALLBACK] Calling exchangeCodeForToken...');
            console.log('[MASTODON CALLBACK] Auth instance:', mastodonAuth.instance);
            console.log('[MASTODON CALLBACK] Auth state:', mastodonAuth.state);
            console.log('[MASTODON CALLBACK] Callback state:', state);
            
            const tokens = await mastodonAuth.exchangeCodeForToken(code, state);
            
            // Get user info
            const userInfo = await mastodonAuth.getUserInfo(tokens.accessToken);
            
            // Store tokens with instance info
            const credentials = {
              ...tokens,
              username: userInfo.username,
              userId: userInfo.id,
              displayName: userInfo.displayName,
              instance: mastodonAuth.instance
            };
            
            await db.createOrUpdateAccount('mastodon', JSON.stringify(credentials));
            console.log('[MASTODON CALLBACK] Account saved to database');
            
            // Notify renderer
            if (mainWindow) {
              console.log('[MASTODON CALLBACK] Sending auth-success to renderer');
              mainWindow.webContents.send('auth-success', {
                platform: 'mastodon',
                username: `@${userInfo.username}@${mastodonAuth.instance}`
              });
            } else {
              console.error('[MASTODON CALLBACK] No mainWindow to send success event!');
            }
            
            // Clean up auth flows
            activeAuthFlows.delete(authKey);
            activeAuthFlows.delete(`mastodon-${mastodonAuth.instance}`);
            activeAuthFlows.delete(`state-${mastodonAuth.state}`);
            
            console.log(`[MASTODON CALLBACK] Successfully connected Mastodon account: @${userInfo.username}@${mastodonAuth.instance}`);
            console.log('[MASTODON CALLBACK] ====== SUCCESS ======');
          } else {
            console.error('[MASTODON CALLBACK] ====== ERROR: NO AUTH INSTANCE FOUND ======');
            console.error('[MASTODON CALLBACK] State from callback:', state);
            console.error('[MASTODON CALLBACK] Active auth flows:', Array.from(activeAuthFlows.keys()));
            console.error('[MASTODON CALLBACK] This usually means:');
            console.error('[MASTODON CALLBACK] 1. The auth flow expired');
            console.error('[MASTODON CALLBACK] 2. The app was restarted during auth');
            console.error('[MASTODON CALLBACK] 3. Multiple auth attempts interfered');
            throw new Error('No matching Mastodon auth session found. Please try connecting again.');
          }
        } else if (platform === 'github' && activeAuthFlows.has('github')) {
          const auth = activeAuthFlows.get('github');
          // Browser auth doesn't need client secret
          const tokens = await auth.exchangeCodeForToken(code, state);
          
          // Get user info
          const userInfo = await auth.getUserInfo(tokens.accessToken);
          
          // Store tokens securely
          const credentials = {
            ...tokens,
            username: userInfo.username,
            userId: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
            defaultRepo: 'social-posts', // Can be configured later
            postType: 'issue' // Can be 'issue', 'file', or 'gist'
          };
          
          await db.createOrUpdateAccount('github', JSON.stringify(credentials));
          
          // Notify renderer
          if (mainWindow) {
            mainWindow.webContents.send('auth-success', {
              platform: 'github',
              username: userInfo.username
            });
          }
          
          activeAuthFlows.delete('github');
          console.log(`Successfully connected GitHub account: @${userInfo.username}`);
        } else if (platform === 'linkedin' && activeAuthFlows.has('linkedin')) {
          const auth = activeAuthFlows.get('linkedin');
          
          try {
            // Exchange code for token (now works with client secret!)
            const tokens = await auth.exchangeCodeForToken(code, state);
            
            // Get user info
            const userInfo = await auth.getUserInfo(tokens.accessToken);
            
            // Store tokens securely
            const credentials = {
              ...tokens,
              name: userInfo.name,
              userId: userInfo.id,
              email: userInfo.email
            };
            
            await db.createOrUpdateAccount('linkedin', JSON.stringify(credentials));
            
            // Notify renderer
            if (mainWindow) {
              mainWindow.webContents.send('auth-success', {
                platform: 'linkedin',
                username: userInfo.name
              });
            }
            
            activeAuthFlows.delete('linkedin');
            console.log(`✅ Successfully connected LinkedIn account: ${userInfo.name}`);
            console.log('LinkedIn posting is now enabled with w_member_social scope!');
          } catch (error) {
            console.error('LinkedIn auth error:', error);
            if (mainWindow) {
              mainWindow.webContents.send('auth-error', {
                platform: 'linkedin',
                error: error.message
              });
            }
            activeAuthFlows.delete('linkedin');
          }
        }
      } catch (error) {
        console.error('[OAUTH CALLBACK ERROR] ====== ERROR DETAILS ======');
        console.error('[OAUTH CALLBACK ERROR] Platform:', data.platform);
        console.error('[OAUTH CALLBACK ERROR] Error message:', error.message);
        console.error('[OAUTH CALLBACK ERROR] Error stack:', error.stack);
        console.error('[OAUTH CALLBACK ERROR] Active auth flows:', Array.from(activeAuthFlows.keys()));
        console.error('[OAUTH CALLBACK ERROR] ====== END ERROR ======');
        
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
    
    console.log('[MAIN] OAuth event listeners attached ✓');
    console.log('[MAIN] ====== APP READY ======');
    console.log('[MAIN] Buffer Killer is running!');
    console.log('[MAIN] OAuth server: http://127.0.0.1:3000/');
    console.log('[MAIN] Ready for authentication');
  } catch (error) {
    console.error('[MAIN] ====== STARTUP FAILED ======');
    console.error('[MAIN] Fatal error during initialization:', error);
    console.error('[MAIN] Stack trace:', error.stack);
    console.error('[MAIN] The app may not work correctly');
    
    // Show error dialog
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Startup Error',
      `Failed to initialize Buffer Killer:\n\n${error.message}\n\nPlease restart the application.`
    );
    
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    // Clean up scheduled jobs
    scheduledJobs.forEach(job => job.cancel());
    oauthServer.stop(); // Stop OAuth server
    
    app.quit();
  }
});

// Recreate window on macOS when dock icon is clicked
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// Security: Prevent remote content from creating new windows
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // In development, ignore certificate errors for localhost
  if (process.env.NODE_ENV === 'development' && url.startsWith('https://127.0.0.1')) {
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});

// Export for testing
module.exports = { initDatabase, createMainWindow };