// OAuth Server for handling browser-based authentication callbacks
const express = require('express');
const { EventEmitter } = require('events');

class OAuthServer extends EventEmitter {
  constructor(port = 3000) {
    super();
    this.port = port;
    this.app = null;
    this.server = null;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('OAuth server already running');
      return;
    }

    this.app = express();
    
    // OAuth callback endpoints
    this.app.get('/auth/:platform/callback', (req, res) => {
      const { platform } = req.params;
      const { code, state, error, error_description } = req.query;
      
      if (error) {
        // Handle OAuth error
        this.emit('auth-error', {
          platform,
          error,
          description: error_description
        });
        
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Authentication Failed</title>
              <style>
                body {
                  font-family: -apple-system, system-ui, sans-serif;
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
                  padding: 2rem;
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 12px;
                  backdrop-filter: blur(10px);
                }
                h1 { margin-bottom: 1rem; }
                p { margin-bottom: 1.5rem; opacity: 0.9; }
                .error { color: #ff6b6b; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>❌ Authentication Failed</h1>
                <p class="error">${error_description || error}</p>
                <p>You can close this window and try again.</p>
              </div>
            </body>
          </html>
        `);
        return;
      }
      
      if (code) {
        // Successfully received authorization code
        this.emit('auth-code', {
          platform,
          code,
          state
        });
        
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Authentication Successful</title>
              <style>
                body {
                  font-family: -apple-system, system-ui, sans-serif;
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
                  padding: 2rem;
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 12px;
                  backdrop-filter: blur(10px);
                }
                h1 { margin-bottom: 1rem; }
                p { margin-bottom: 1.5rem; opacity: 0.9; }
                .success { color: #51cf66; }
                .loader {
                  border: 3px solid rgba(255, 255, 255, 0.3);
                  border-radius: 50%;
                  border-top: 3px solid white;
                  width: 30px;
                  height: 30px;
                  animation: spin 1s linear infinite;
                  margin: 0 auto;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </head>
            <body>
              <div class="container">
                <h1>✅ Authentication Successful!</h1>
                <p>Connecting your ${platform.charAt(0).toUpperCase() + platform.slice(1)} account...</p>
                <div class="loader"></div>
                <p style="font-size: 0.9rem; opacity: 0.7;">You can close this window or it will close automatically.</p>
              </div>
            </body>
          </html>
        `);
      } else {
        res.status(400).send('Missing authorization code');
      }
    });
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', port: this.port });
    });
    
    // Start server
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        this.isRunning = true;
        console.log(`OAuth server listening on http://127.0.0.1:${this.port}`);
        resolve();
      });
      
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`Port ${this.port} is already in use, assuming OAuth server is running`);
          this.isRunning = true;
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('OAuth server stopped');
        this.isRunning = false;
      });
    }
  }
}

module.exports = OAuthServer;