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
const LinkedInBrowserAuth = require('./lib/platforms/linkedin-browser-auth');

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

// Global reference to prevent garbage collection
let mainWindow = null;
let oauthWindow = null;
let scheduledJobs = new Map();

// Import the new database system
const Database = require('./src/database/database');
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
      const existing = await db.findOne('accounts', { platform });
      if (existing) {
        return await db.update('accounts', existing.id, { credentials });
      } else {
        return await db.insert('accounts', { platform, credentials, active: true });
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
  }
  
  // Other platforms...
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
    try {
      // Start OAuth server if not running
      await oauthServer.start();
      
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
        // For Mastodon, we need the instance URL
        const instance = options.instance || 'mastodon.social';
        
        // Create new Mastodon auth instance
        const mastodonAuth = new MastodonAuth(instance);
        
        // Register app and start OAuth flow
        const result = await mastodonAuth.authenticate();
        
        // Store auth instance and app credentials for later
        const authKey = `mastodon-${instance}`;
        activeAuthFlows.set(authKey, mastodonAuth);
        mastodonApps.set(instance, {
          clientId: result.clientId,
          clientSecret: result.clientSecret
        });
        
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
        // Use browser-based auth (simplified OAuth)
        const linkedinAuth = new LinkedInBrowserAuth();
        
        // Start browser-based LinkedIn OAuth flow
        const result = await linkedinAuth.authenticate();
        
        // Store auth instance for later
        activeAuthFlows.set('linkedin', linkedinAuth);
        
        console.log('Using simplified LinkedIn authentication');
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
      const accounts = await db.getAccounts();
      // Don't send credentials to renderer
      return accounts.map(({ credentials, ...account }) => account);
    } catch (error) {
      console.error('Error fetching accounts:', error);
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
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Initialize database
    await initDatabase();
    
    // Create main window
    createMainWindow();
    
    // Set up IPC handlers
    setupIpcHandlers();
    
    // Set up Image Generator IPC handlers
    setupImageGeneratorIPC();
    
    // Initialize account system (workspaces and rate limiting)
    accountSystem = new AccountSystemIntegration(db);
    await accountSystem.initialize();
    console.log('Account and workspace system initialized');
    
    // Initialize scheduler
    initScheduler();
    
    // Initialize rate limiter event listeners
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
    
    // Start OAuth server
    await oauthServer.start();
    
    // Handle OAuth callbacks
    oauthServer.on('auth-code', async (data) => {
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
          // Find the matching Mastodon auth flow
          let mastodonAuth = null;
          let authKey = null;
          
          for (const [key, auth] of activeAuthFlows) {
            if (key.startsWith('mastodon-')) {
              mastodonAuth = auth;
              authKey = key;
              break;
            }
          }
          
          if (mastodonAuth) {
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
            
            // Notify renderer
            if (mainWindow) {
              mainWindow.webContents.send('auth-success', {
                platform: 'mastodon',
                username: `@${userInfo.username}@${mastodonAuth.instance}`
              });
            }
            
            activeAuthFlows.delete(authKey);
            console.log(`Successfully connected Mastodon account: @${userInfo.username}@${mastodonAuth.instance}`);
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
            // Try to exchange code for token
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
            console.log(`Successfully connected LinkedIn account: ${userInfo.name}`);
          } catch (error) {
            // LinkedIn requires server-side token exchange
            console.error('LinkedIn auth error:', error);
            if (mainWindow) {
              mainWindow.webContents.send('auth-error', {
                platform: 'linkedin',
                error: 'LinkedIn requires API keys for full functionality. Please configure in Settings.'
              });
            }
            activeAuthFlows.delete('linkedin');
          }
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
    
    console.log('Buffer Killer app initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
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