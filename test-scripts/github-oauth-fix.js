// GitHub OAuth Quick Fix
// This script runs a standalone OAuth server specifically for GitHub authentication
// Run with: node test-scripts/github-oauth-fix.js

const express = require('express');
const axios = require('axios');
const GitHubBrowserAuth = require('../lib/platforms/github-browser-auth');
const Database = require('../src/database/sqlite-database');
const open = require('open');

console.log('🔧 GitHub OAuth Quick Fix Tool\n');
console.log('=================================\n');

async function runGitHubOAuthFix() {
  const app = express();
  const port = 3000;
  let server = null;
  let authInstance = null;
  
  try {
    // Initialize GitHub auth
    console.log('🔐 Initializing GitHub authentication...');
    authInstance = new GitHubBrowserAuth();
    
    // Set up OAuth callback handler
    app.get('/auth/github/callback', async (req, res) => {
      const { code, state, error, error_description } = req.query;
      
      console.log('\n📨 Received GitHub callback!');
      console.log('  Code:', code ? '✅ Present' : '❌ Missing');
      console.log('  State:', state || 'Missing');
      
      if (error) {
        console.error('❌ OAuth Error:', error);
        console.error('  Description:', error_description);
        
        res.send(`
          <html>
            <head>
              <title>Authentication Failed</title>
              <style>
                body { font-family: Arial; padding: 50px; text-align: center; }
                .error { color: red; }
              </style>
            </head>
            <body>
              <h1>❌ Authentication Failed</h1>
              <p class="error">${error_description || error}</p>
              <p>Please close this window and try again.</p>
            </body>
          </html>
        `);
        return;
      }
      
      if (code) {
        try {
          console.log('\n🔄 Exchanging code for access token...');
          const tokens = await authInstance.exchangeCodeForToken(code, state);
          
          console.log('✅ Access token received!');
          
          // Get user info
          console.log('👤 Fetching user information...');
          const userInfo = await authInstance.getUserInfo(tokens.accessToken);
          
          console.log('✅ User authenticated:', userInfo.username);
          
          // Save to database
          console.log('💾 Saving to database...');
          const db = new Database();
          await db.initialize();
          
          const credentials = {
            ...tokens,
            username: userInfo.username,
            userId: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
            defaultRepo: 'social-posts',
            postType: 'issue'
          };
          
          // Store in database
          const existing = await db.findOne('accounts', { platform: 'github' });
          if (existing) {
            await db.update('accounts', existing.id, {
              credentials: JSON.stringify(credentials),
              username: userInfo.username,
              access_token: tokens.accessToken,
              updated_at: new Date().toISOString()
            });
            console.log('✅ Updated existing GitHub account');
          } else {
            await db.insert('accounts', {
              platform: 'github',
              username: userInfo.username,
              credentials: JSON.stringify(credentials),
              access_token: tokens.accessToken,
              active: true,
              workspace_id: 1
            });
            console.log('✅ Added new GitHub account');
          }
          
          res.send(`
            <html>
              <head>
                <title>Success!</title>
                <style>
                  body { 
                    font-family: Arial; 
                    padding: 50px; 
                    text-align: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                  }
                  .success { color: #4caf50; }
                  .info {
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px auto;
                    max-width: 500px;
                  }
                </style>
              </head>
              <body>
                <h1>✅ GitHub Connected Successfully!</h1>
                <div class="info">
                  <p><strong>Username:</strong> @${userInfo.username}</p>
                  <p><strong>Name:</strong> ${userInfo.name || 'Not set'}</p>
                  <p><strong>Public Repos:</strong> ${userInfo.publicRepos}</p>
                </div>
                <p>Your GitHub account has been connected to Buffer Killer!</p>
                <p>You can close this window and return to the app.</p>
                <script>
                  setTimeout(() => {
                    window.close();
                  }, 5000);
                </script>
              </body>
            </html>
          `);
          
          console.log('\n🎉 SUCCESS! GitHub account connected!');
          console.log('You can now post to GitHub from Buffer Killer.');
          
          // Stop server after success
          setTimeout(() => {
            console.log('\n✅ Authentication complete. Stopping server...');
            server.close();
            process.exit(0);
          }, 3000);
          
        } catch (error) {
          console.error('❌ Error processing callback:', error.message);
          res.status(500).send(`
            <html>
              <body>
                <h1>Error Processing Authentication</h1>
                <p>${error.message}</p>
                <p>Please check the console for details.</p>
              </body>
            </html>
          `);
        }
      } else {
        res.status(400).send('Missing authorization code');
      }
    });
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', server: 'GitHub OAuth Fix Server' });
    });
    
    // Root endpoint
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>GitHub OAuth Server</title>
            <style>
              body { font-family: Arial; padding: 50px; }
              button { 
                background: #24292e; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                font-size: 16px;
                border-radius: 5px;
                cursor: pointer;
              }
              button:hover { background: #1a1d21; }
            </style>
          </head>
          <body>
            <h1>GitHub OAuth Server Running</h1>
            <p>Port: ${port}</p>
            <p>Ready to handle GitHub OAuth callbacks</p>
            <button onclick="window.location.href='${authInstance.getAuthorizationUrl()}'">
              🔐 Authenticate with GitHub
            </button>
          </body>
        </html>
      `);
    });
    
    // Start server
    await new Promise((resolve, reject) => {
      server = app.listen(port, '127.0.0.1', () => {
        console.log(`✅ OAuth server running at http://127.0.0.1:${port}`);
        resolve();
      });
      
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${port} is already in use!`);
          console.log('\nTrying to connect to existing server...');
          // Assume existing server is running, proceed with auth
          resolve();
        } else {
          reject(error);
        }
      });
    });
    
    // Get authorization URL
    const authUrl = authInstance.getAuthorizationUrl();
    
    console.log('\n📋 GitHub OAuth Configuration:');
    console.log('  Client ID:', authInstance.clientId);
    console.log('  Redirect URI:', authInstance.redirectUri);
    console.log('  State:', authInstance.state);
    console.log('  Scopes:', authInstance.scopes.join(', '));
    
    console.log('\n🌐 Opening browser for authentication...');
    console.log('  URL:', authUrl);
    console.log('\n⏳ Waiting for you to authorize the app...');
    console.log('  The browser should open automatically.');
    console.log('  If not, visit: http://127.0.0.1:3000');
    
    // Open browser
    try {
      await open(authUrl);
    } catch (e) {
      console.log('\n⚠️ Could not open browser automatically.');
      console.log('Please open this URL manually:');
      console.log(authUrl);
    }
    
    // Keep server running
    console.log('\n📡 Server is running. Complete the authentication in your browser.');
    console.log('Press Ctrl+C to stop the server.\n');
    
  } catch (error) {
    console.error('\n❌ Failed to start OAuth fix:', error.message);
    
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('\n⚠️ Missing dependencies. Please run:');
      console.error('  npm install express axios open');
    }
    
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  process.exit(0);
});

// Run the fix
runGitHubOAuthFix().catch(console.error);
