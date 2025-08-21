// OAuth Server Fix - Ensures server is running before authentication
// This module provides a wrapper to guarantee OAuth server availability

const OAuthServer = require('../src/main/auth/oauth-server');

let serverInstance = null;
let startPromise = null;

async function ensureOAuthServer() {
  // If server is already starting, wait for it
  if (startPromise) {
    return await startPromise;
  }
  
  // If server exists and is running, return it
  if (serverInstance && serverInstance.isRunning) {
    console.log('[OAuth Fix] Server already running');
    return serverInstance;
  }
  
  // Start the server
  startPromise = (async () => {
    try {
      console.log('[OAuth Fix] Starting OAuth server...');
      
      if (!serverInstance) {
        serverInstance = new OAuthServer(3000);
      }
      
      await serverInstance.start();
      console.log('[OAuth Fix] OAuth server started successfully');
      
      // Add error handling
      serverInstance.on('error', (error) => {
        console.error('[OAuth Fix] Server error:', error);
      });
      
      return serverInstance;
    } catch (error) {
      console.error('[OAuth Fix] Failed to start OAuth server:', error);
      
      // Try alternative port if 3000 is busy
      if (error.code === 'EADDRINUSE') {
        console.log('[OAuth Fix] Port 3000 is busy, trying 3001...');
        serverInstance = new OAuthServer(3001);
        await serverInstance.start();
        console.log('[OAuth Fix] OAuth server started on port 3001');
        
        // Update callback URLs in auth modules
        updateCallbackUrls(3001);
      } else {
        throw error;
      }
    } finally {
      startPromise = null;
    }
  })();
  
  return await startPromise;
}

function updateCallbackUrls(port) {
  // Update the callback URLs in the auth modules if using alternative port
  console.log(`[OAuth Fix] Updating callback URLs to use port ${port}`);
  
  // This would need to be implemented to update the auth modules
  // For now, just log a warning
  console.warn(`[OAuth Fix] WARNING: OAuth callbacks are configured for port 3000`);
  console.warn(`[OAuth Fix] You may need to update your OAuth app settings to use port ${port}`);
}

function getOAuthServer() {
  return serverInstance;
}

function stopOAuthServer() {
  if (serverInstance) {
    serverInstance.stop();
    serverInstance = null;
  }
}

// Auto-start server when module is loaded
if (require.main !== module) {
  // Only auto-start if imported, not if run directly
  ensureOAuthServer().catch(console.error);
}

module.exports = {
  ensureOAuthServer,
  getOAuthServer,
  stopOAuthServer
};
