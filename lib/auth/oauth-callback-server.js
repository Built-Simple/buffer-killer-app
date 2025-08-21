// OAuth Callback Server
// Handles OAuth callbacks from all platforms

const http = require('http');
const url = require('url');
const { EventEmitter } = require('events');

class OAuthCallbackServer extends EventEmitter {
  constructor(port = 3000) {
    super();
    this.port = port;
    this.server = null;
    this.activeAuth = null;
  }

  // Start the callback server
  async start() {
    if (this.server) {
      console.log('OAuth callback server already running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`OAuth callback server listening on http://127.0.0.1:${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('OAuth callback server error:', error);
        reject(error);
      });
    });
  }

  // Stop the callback server
  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('OAuth callback server stopped');
    }
  }

  // Handle incoming requests
  handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Handle different OAuth callback paths
    if (pathname === '/auth/github/callback') {
      this.handleGitHubCallback(query, res);
    } else if (pathname === '/auth/twitter/callback') {
      this.handleTwitterCallback(query, res);
    } else if (pathname === '/auth/linkedin/callback') {
      this.handleLinkedInCallback(query, res);
    } else if (pathname === '/auth/mastodon/callback') {
      this.handleMastodonCallback(query, res);
    } else if (pathname === '/auth/facebook/callback') {
      this.handleFacebookCallback(query, res);
    } else {
      // Default response for unknown paths
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Not Found</h1>');
    }
  }

  // Handle GitHub OAuth callback
  handleGitHubCallback(query, res) {
    const { code, state, error, error_description } = query;

    if (error) {
      this.sendErrorResponse(res, 'GitHub', error_description || error);
      this.emit('github-error', { error, error_description });
      return;
    }

    if (code) {
      this.sendSuccessResponse(res, 'GitHub');
      this.emit('github-callback', { code, state });
    } else {
      this.sendErrorResponse(res, 'GitHub', 'No authorization code received');
      this.emit('github-error', { error: 'No authorization code received' });
    }
  }

  // Handle Twitter OAuth callback
  handleTwitterCallback(query, res) {
    const { code, state, error, error_description } = query;

    if (error) {
      this.sendErrorResponse(res, 'Twitter', error_description || error);
      this.emit('twitter-error', { error, error_description });
      return;
    }

    if (code) {
      this.sendSuccessResponse(res, 'Twitter');
      this.emit('twitter-callback', { code, state });
    } else {
      this.sendErrorResponse(res, 'Twitter', 'No authorization code received');
      this.emit('twitter-error', { error: 'No authorization code received' });
    }
  }

  // Handle LinkedIn OAuth callback
  handleLinkedInCallback(query, res) {
    const { code, state, error, error_description } = query;

    if (error) {
      this.sendErrorResponse(res, 'LinkedIn', error_description || error);
      this.emit('linkedin-error', { error, error_description });
      return;
    }

    if (code) {
      this.sendSuccessResponse(res, 'LinkedIn');
      this.emit('linkedin-callback', { code, state });
    } else {
      this.sendErrorResponse(res, 'LinkedIn', 'No authorization code received');
      this.emit('linkedin-error', { error: 'No authorization code received' });
    }
  }

  // Handle Mastodon OAuth callback
  handleMastodonCallback(query, res) {
    const { code, state, error, error_description } = query;

    if (error) {
      this.sendErrorResponse(res, 'Mastodon', error_description || error);
      this.emit('mastodon-error', { error, error_description });
      return;
    }

    if (code) {
      this.sendSuccessResponse(res, 'Mastodon');
      this.emit('mastodon-callback', { code, state });
    } else {
      this.sendErrorResponse(res, 'Mastodon', 'No authorization code received');
      this.emit('mastodon-error', { error: 'No authorization code received' });
    }
  }

  // Handle Facebook OAuth callback
  handleFacebookCallback(query, res) {
    const { code, state, error, error_description } = query;

    if (error) {
      this.sendErrorResponse(res, 'Facebook', error_description || error);
      this.emit('facebook-error', { error, error_description });
      return;
    }

    if (code) {
      this.sendSuccessResponse(res, 'Facebook');
      this.emit('facebook-callback', { code, state });
    } else {
      this.sendErrorResponse(res, 'Facebook', 'No authorization code received');
      this.emit('facebook-error', { error: 'No authorization code received' });
    }
  }

  // Send success response HTML
  sendSuccessResponse(res, platform) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
          }
          h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
          }
          .success-icon {
            font-size: 5em;
            margin-bottom: 20px;
          }
          .message {
            font-size: 1.2em;
            margin-bottom: 30px;
          }
          .close-message {
            font-size: 0.9em;
            opacity: 0.8;
          }
        </style>
        <script>
          setTimeout(function() {
            window.close();
          }, 3000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Success!</h1>
          <div class="message">
            ${platform} has been successfully connected to Buffer Killer.
          </div>
          <div class="close-message">
            This window will close automatically...
          </div>
        </div>
      </body>
      </html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  // Send error response HTML
  sendErrorResponse(res, platform, errorMessage) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 500px;
          }
          h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
          }
          .error-icon {
            font-size: 5em;
            margin-bottom: 20px;
          }
          .message {
            font-size: 1.2em;
            margin-bottom: 20px;
          }
          .error-details {
            font-size: 0.9em;
            opacity: 0.8;
            margin-top: 20px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
          }
          .close-message {
            font-size: 0.9em;
            opacity: 0.8;
            margin-top: 20px;
          }
        </style>
        <script>
          setTimeout(function() {
            window.close();
          }, 10000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <h1>Authentication Failed</h1>
          <div class="message">
            Failed to connect ${platform} to Buffer Killer.
          </div>
          <div class="error-details">
            ${errorMessage || 'An unknown error occurred'}
          </div>
          <div class="close-message">
            Please try again. This window will close automatically...
          </div>
        </div>
      </body>
      </html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  // Set active authentication (to track which platform is being authenticated)
  setActiveAuth(platform, state) {
    this.activeAuth = { platform, state, timestamp: Date.now() };
  }

  // Clear active authentication
  clearActiveAuth() {
    this.activeAuth = null;
  }

  // Get active authentication
  getActiveAuth() {
    // Clear if older than 10 minutes
    if (this.activeAuth && Date.now() - this.activeAuth.timestamp > 600000) {
      this.activeAuth = null;
    }
    return this.activeAuth;
  }
}

// Create singleton instance
let instance = null;

function getCallbackServer() {
  if (!instance) {
    instance = new OAuthCallbackServer();
  }
  return instance;
}

module.exports = {
  OAuthCallbackServer,
  getCallbackServer
};