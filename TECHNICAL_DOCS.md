# 🔧 Buffer Killer - Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Installation Guide](#installation-guide)
3. [Platform Integration](#platform-integration)
4. [API Reference](#api-reference)
5. [Plugin Development](#plugin-development)
6. [Database Schema](#database-schema)
7. [Security Model](#security-model)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)
10. [Development Guide](#development-guide)

---

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Database  │  │ OAuth Server │  │ Platform Manager │  │
│  │   (SQLite)  │  │  Port 3000   │  │   (API Calls)    │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│         ↑                ↑                    ↑            │
│         └────────────────┼────────────────────┘            │
│                          │                                 │
│                    IPC Bridge (Secure)                     │
│                          │                                 │
└─────────────────────────┼─────────────────────────────────┘
                          │
┌─────────────────────────┼─────────────────────────────────┐
│                   Renderer Process                         │
│  ┌──────────────────────┼──────────────────────────────┐  │
│  │                      UI Layer                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │  │
│  │  │ Composer │  │ Analytics│  │ Plugin Manager  │  │  │
│  │  └──────────┘  └──────────┘  └─────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Plugin Sandbox (iframe)                │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │  Plugin 1  │  │  Plugin 2  │  │  Plugin 3  │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure
```
buffer-killer-app/
├── main.js                 # Electron main process
├── renderer.js             # UI controller
├── preload.js             # Secure bridge
├── index.html             # Main UI
│
├── lib/                   # Core libraries
│   ├── platforms/         # Platform integrations
│   │   ├── twitter.js
│   │   ├── mastodon.js
│   │   ├── github.js
│   │   ├── linkedin.js
│   │   └── facebook.js
│   │
│   ├── plugins/           # Plugin system
│   │   └── plugin-system.js
│   │
│   ├── content/           # Content tools
│   │   ├── link-shortener.js
│   │   ├── hashtag-suggestions.js
│   │   ├── trending-topics.js
│   │   ├── content-ai-assistant.js
│   │   └── ab-testing.js
│   │
│   ├── video/             # Video processing
│   │   ├── ffmpeg-loader.js
│   │   └── video-editor.js
│   │
│   ├── image-generator/   # Image creation
│   │   ├── generator.js
│   │   └── templates/
│   │
│   ├── analytics/         # Analytics engine
│   │   └── dashboard.js
│   │
│   ├── rate-limiter/      # Rate limiting
│   │   ├── manager.js
│   │   └── config.js
│   │
│   └── bulk/              # Bulk operations
│       └── bulk-operations-manager.js
│
├── components/            # UI components
│   ├── image-generator-ui.js
│   ├── content-enhancement-ui.js
│   └── plugin-manager-ui.js
│
├── plugins/               # Installed plugins
│   └── word-counter/      # Example plugin
│
├── database.db            # SQLite database
└── package.json           # Dependencies
```

---

## Installation Guide

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+
- Git
- 500MB free disk space
- Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)

### Development Installation
```bash
# Clone repository
git clone https://github.com/Built-Simple/buffer-killer-app.git
cd buffer-killer-app

# Install dependencies
npm install

# Initialize database
node init-db.js

# Start development server
npm run dev
```

### Production Build
```bash
# Windows
npm run build-win

# macOS
npm run build-mac

# Linux
npm run build-linux

# All platforms
npm run build
```

### Docker Installation (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build-linux
CMD ["npm", "start"]
```

---

## Platform Integration

### Twitter/X Integration

#### Authentication Flow (No API Keys!)
```javascript
// Uses OAuth 2.0 with PKCE - no client secret needed
const TwitterBrowserAuth = require('./lib/platforms/twitter-browser-auth');

async function connectTwitter() {
  const auth = new TwitterBrowserAuth();
  
  // Step 1: Generate PKCE challenge
  const { authUrl, codeVerifier, state } = await auth.authenticate();
  
  // Step 2: Open browser for user auth
  shell.openExternal(authUrl);
  
  // Step 3: Handle callback (automatic via OAuth server)
  // OAuth server listens on http://localhost:3000/callback
  
  // Step 4: Exchange code for tokens
  const tokens = await auth.exchangeCodeForToken(code, state);
  
  // Step 5: Store securely
  await db.createOrUpdateAccount('twitter', JSON.stringify(tokens));
}
```

#### Posting to Twitter
```javascript
const TwitterAPI = require('./lib/platforms/twitter');

async function postToTwitter(content, mediaFiles = []) {
  const twitter = new TwitterAPI(accessToken, userId);
  
  // Upload media first (if any)
  const mediaIds = [];
  for (const file of mediaFiles) {
    const result = await twitter.uploadMedia(file.buffer, file.mimeType);
    mediaIds.push(result.mediaId);
  }
  
  // Post tweet with media
  const tweet = await twitter.postTweet(content, { mediaIds });
  return tweet;
}
```

### Mastodon Integration

#### Zero-Config Authentication
```javascript
const MastodonAuth = require('./lib/platforms/mastodon-auth');

async function connectMastodon(instance = 'mastodon.social') {
  const auth = new MastodonAuth(instance);
  
  // Auto-registers app with instance (no pre-registration!)
  const { authUrl, clientId, clientSecret } = await auth.authenticate();
  
  // User authorizes in browser
  shell.openExternal(authUrl);
  
  // Get access token
  const tokens = await auth.exchangeCodeForToken(code);
  
  // Ready to post!
}
```

### GitHub Integration

#### Device Flow Authentication (No Keys!)
```javascript
const GitHubBrowserAuth = require('./lib/platforms/github-browser-auth');

async function connectGitHub() {
  const auth = new GitHubBrowserAuth();
  
  // Uses GitHub Device Flow - no client secret!
  const { verificationUrl, userCode } = await auth.authenticate();
  
  // User enters code at github.com/login/device
  console.log(`Enter code: ${userCode}`);
  
  // Poll for completion
  const tokens = await auth.pollForToken();
}
```

---

## API Reference

### Main Process IPC Handlers

#### `schedule-post`
Schedule a new post across platforms.

```javascript
const result = await ipcRenderer.invoke('schedule-post', {
  content: 'Hello world!',
  platforms: ['twitter', 'mastodon'],
  scheduledTime: '2025-01-20T10:00:00Z',
  media: [
    {
      filename: 'image.jpg',
      mimeType: 'image/jpeg',
      buffer: base64String
    }
  ]
});
```

#### `get-scheduled-posts`
Retrieve all scheduled posts.

```javascript
const posts = await ipcRenderer.invoke('get-scheduled-posts');
// Returns: Array of post objects
```

#### `authenticate-platform`
Initiate OAuth flow for a platform.

```javascript
const result = await ipcRenderer.invoke('authenticate-platform', 'twitter', {
  // Platform-specific options
});
```

#### `get-rate-limit-stats`
Get current rate limit status.

```javascript
const stats = await ipcRenderer.invoke('get-rate-limit-stats');
// Returns: { twitter: { remaining: 250, reset: timestamp }, ... }
```

### Database API

#### Query Builder Pattern
```javascript
const db = new Database();

// Simple query
const posts = await db.query('posts')
  .where('status', 'pending')
  .where('scheduled_time', 'lte', new Date())
  .orderBy('scheduled_time', 'asc')
  .limit(10)
  .execute();

// Complex query with joins
const analytics = await db.query('analytics')
  .join('posts', 'analytics.post_id', 'posts.id')
  .where('posts.platform', 'twitter')
  .groupBy('date')
  .select(['date', 'SUM(impressions) as total'])
  .execute();
```

---

## Plugin Development

### Plugin Structure
```
my-plugin/
├── manifest.json          # Plugin metadata
├── index.js              # Main plugin code
├── styles.css            # Optional styles
└── README.md            # Documentation
```

### manifest.json
```json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Does awesome things",
  "main": "index.js",
  "permissions": ["storage", "notifications", "ui"],
  "requires": "1.0.0"
}
```

### Plugin Class Template
```javascript
class MyAwesomePlugin {
  constructor(api) {
    this.api = api;
  }

  async onLoad() {
    // Called when plugin loads
    console.log('Plugin loaded!');
    
    // Add UI elements
    this.api.ui.addMenuItem({
      label: 'My Plugin',
      icon: '🚀',
      onClick: () => this.showUI()
    });
    
    // Listen to hooks
    this.api.hooks.on('before-post-schedule', async (post) => {
      // Modify post before scheduling
      post.content += '\n\n#PoweredByMyPlugin';
      return post;
    });
  }

  async onEnable() {
    // Called when plugin is enabled
  }

  async onDisable() {
    // Called when plugin is disabled
  }

  async onUnload() {
    // Cleanup
  }
  
  showUI() {
    this.api.ui.showModal({
      title: 'My Plugin',
      body: '<p>Hello from my plugin!</p>'
    });
  }
}

module.exports = MyAwesomePlugin;
```

### Available Plugin APIs

#### Storage API
```javascript
// Store data
await api.storage.set('myKey', 'myValue');

// Retrieve data
const value = await api.storage.get('myKey');

// Remove data
await api.storage.remove('myKey');
```

#### UI API
```javascript
// Add menu item
api.ui.addMenuItem({
  label: 'My Item',
  icon: '🎯',
  onClick: () => {}
});

// Show modal
api.ui.showModal({
  title: 'My Modal',
  body: '<p>Content</p>',
  footer: '<button>Close</button>'
});

// Add panel
api.ui.addPanel({
  title: 'My Panel',
  content: '<div>Panel content</div>'
});
```

#### Hooks API
```javascript
// Available hooks
api.hooks.on('before-post-schedule', callback);
api.hooks.on('after-post-schedule', callback);
api.hooks.on('before-post-publish', callback);
api.hooks.on('after-post-publish', callback);
api.hooks.on('account-connected', callback);
api.hooks.on('account-disconnected', callback);
api.hooks.on('composer-opened', callback);
api.hooks.on('composer-submitted', callback);
```

---

## Database Schema

### Tables

#### posts
```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  platforms TEXT NOT NULL,           -- JSON array
  scheduled_time DATETIME NOT NULL,
  status TEXT DEFAULT 'scheduled',   -- scheduled|published|failed
  media TEXT,                        -- JSON array of media
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  error_message TEXT,
  workspace_id INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

#### accounts
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  username TEXT,
  access_token TEXT,        -- Encrypted
  refresh_token TEXT,       -- Encrypted
  token_expires_at DATETIME,
  profile_data TEXT,        -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1
);
```

#### analytics
```sql
CREATE TABLE analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  platform TEXT,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);
```

#### drafts
```sql
CREATE TABLE drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  platforms TEXT,           -- JSON array
  media TEXT,               -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Security Model

### Token Storage
```javascript
// Tokens are encrypted using Electron's safeStorage API
const { safeStorage } = require('electron');

// Encrypt
const encrypted = safeStorage.encryptString(token);
await db.save('tokens', encrypted.toString('base64'));

// Decrypt
const encrypted = Buffer.from(stored, 'base64');
const decrypted = safeStorage.decryptString(encrypted);
```

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.twitter.com https://api.github.com;
">
```

### IPC Security
```javascript
// Main process validation
ipcMain.handle('secure-action', async (event, data) => {
  // Validate sender
  if (!event.sender.getURL().startsWith('file://')) {
    throw new Error('Invalid sender');
  }
  
  // Validate input
  if (!validateInput(data)) {
    throw new Error('Invalid input');
  }
  
  // Process safely
  return await processAction(data);
});
```

### Plugin Sandboxing
```javascript
// Plugins run in isolated iframes
const sandbox = document.createElement('iframe');
sandbox.sandbox = 'allow-scripts';
sandbox.srcdoc = pluginCode;

// Controlled API access via postMessage
sandbox.contentWindow.postMessage({
  type: 'api-response',
  data: limitedAPIResponse
}, '*');
```

---

## Performance Optimization

### Database Optimization
```javascript
// Use indexes for common queries
db.run('CREATE INDEX idx_posts_scheduled ON posts(scheduled_time)');
db.run('CREATE INDEX idx_posts_status ON posts(status)');

// Batch operations
const stmt = db.prepare('INSERT INTO posts VALUES (?, ?, ?, ?)');
for (const post of posts) {
  stmt.run(post.content, post.platforms, post.time, post.status);
}
stmt.finalize();
```

### Image Optimization
```javascript
// Lazy load images
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

// Compress before upload
const compressed = await imageCompressor.compress(image, {
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080
});
```

### Memory Management
```javascript
// Clean up unused media
setInterval(async () => {
  const unusedMedia = await db.query('media')
    .leftJoin('posts', 'media.id', 'posts.media_id')
    .where('posts.id', null)
    .where('media.created_at', '<', Date.now() - 86400000)
    .execute();
  
  for (const media of unusedMedia) {
    await fs.unlink(media.path);
    await db.delete('media', media.id);
  }
}, 3600000); // Every hour
```

---

## Troubleshooting

### Common Issues

#### "Cannot connect to platform"
```bash
# Check OAuth server
netstat -an | grep 3000

# Restart OAuth server
npm run restart-oauth

# Check firewall
# Windows: Windows Defender may block port 3000
# Mac: Check System Preferences > Security
# Linux: sudo ufw allow 3000
```

#### "Database locked"
```javascript
// Enable WAL mode for better concurrency
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA busy_timeout = 5000');
```

#### "Rate limit exceeded"
```javascript
// Check current limits
const limits = await getRateLimiter().getStats();
console.log(limits);

// Reset limits (development only)
await getRateLimiter().resetLimiter('twitter', accountId);
```

#### "Plugin not loading"
```bash
# Check plugin structure
ls -la plugins/my-plugin/

# Validate manifest
node -e "console.log(require('./plugins/my-plugin/manifest.json'))"

# Check permissions
# Plugin permissions must be declared in manifest.json
```

### Debug Mode
```bash
# Run with debug logging
DEBUG=* npm start

# Run with DevTools open
npm run dev

# Check Electron logs
# Windows: %APPDATA%/buffer-killer-app/logs
# Mac: ~/Library/Logs/buffer-killer-app
# Linux: ~/.config/buffer-killer-app/logs
```

---

## Development Guide

### Setting Up Development Environment
```bash
# Install development dependencies
npm install --save-dev

# Set up Git hooks
npm run setup-hooks

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

### Code Style Guide
```javascript
// Use async/await over callbacks
// ✅ Good
async function fetchData() {
  try {
    const data = await api.get('/data');
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// ❌ Bad
function fetchData(callback) {
  api.get('/data', (err, data) => {
    if (err) callback(err);
    else callback(null, data);
  });
}

// Use const/let, never var
const immutable = 'value';
let mutable = 'value';

// Use template literals
const message = `Hello ${name}!`;

// Use destructuring
const { content, platforms } = post;
```

### Testing

#### Unit Tests
```javascript
// test/unit/platforms.test.js
const { TwitterAPI } = require('../../lib/platforms/twitter');

describe('TwitterAPI', () => {
  test('should post tweet', async () => {
    const api = new TwitterAPI('token', 'user123');
    const result = await api.postTweet('Hello world!');
    expect(result.id).toBeDefined();
  });
});
```

#### Integration Tests
```javascript
// test/integration/scheduler.test.js
describe('Scheduler', () => {
  test('should schedule and publish post', async () => {
    // Create post
    const post = await db.createPost({
      content: 'Test',
      platforms: ['twitter'],
      scheduled_time: new Date()
    });
    
    // Run scheduler
    await scheduler.check();
    
    // Verify published
    const updated = await db.getPost(post.id);
    expect(updated.status).toBe('published');
  });
});
```

### Contributing

#### Pull Request Process
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

#### Commit Message Format
```
type(scope): subject

body

footer
```

Examples:
```
feat(twitter): add thread support
fix(scheduler): handle timezone correctly
docs(readme): update installation steps
perf(db): add indexes for faster queries
```

---

## Advanced Topics

### Custom Platform Integration
```javascript
// lib/platforms/custom-platform.js
class CustomPlatformAPI {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }
  
  async authenticate() {
    // Implement OAuth flow
  }
  
  async post(content, options) {
    // Implement posting
  }
  
  async getAnalytics(postId) {
    // Implement analytics
  }
}

// Register with platform manager
platformManager.register('custom', CustomPlatformAPI);
```

### Webhook Integration
```javascript
// Set up webhook server
const webhookServer = express();

webhookServer.post('/webhook/:platform', async (req, res) => {
  const { platform } = req.params;
  const { event, data } = req.body;
  
  // Handle platform events
  if (event === 'post.published') {
    await analytics.track(platform, data.postId, data.metrics);
  }
  
  res.json({ received: true });
});

webhookServer.listen(3001);
```

### Scaling Considerations

#### Multi-Account Queue System
```javascript
// Separate queue per account to prevent blocking
class AccountQueue {
  constructor(platform, accountId) {
    this.queue = new PQueue({
      concurrency: 1,
      interval: 1000,
      intervalCap: getRateLimit(platform)
    });
  }
  
  async add(task) {
    return this.queue.add(task);
  }
}

// Queue manager
const queues = new Map();

function getQueue(platform, accountId) {
  const key = `${platform}:${accountId}`;
  if (!queues.has(key)) {
    queues.set(key, new AccountQueue(platform, accountId));
  }
  return queues.get(key);
}
```

---

## Support & Resources

### Getting Help
- GitHub Issues: [Report bugs](https://github.com/Built-Simple/buffer-killer-app/issues)
- Discussions: [Ask questions](https://github.com/Built-Simple/buffer-killer-app/discussions)
- Wiki: [Community docs](https://github.com/Built-Simple/buffer-killer-app/wiki)

### Useful Links
- [Electron Documentation](https://www.electronjs.org/docs)
- [OAuth 2.0 Spec](https://oauth.net/2/)
- [Twitter API Docs](https://developer.twitter.com/en/docs)
- [Mastodon API Docs](https://docs.joinmastodon.org/api/)
- [GitHub API Docs](https://docs.github.com/en/rest)

### Community Plugins
- [Awesome Buffer Killer](https://github.com/Built-Simple/awesome-buffer-killer)
- [Plugin Registry](https://buffer-killer-plugins.com)

---

*Last Updated: January 2025*
*Version: 1.0.0*
