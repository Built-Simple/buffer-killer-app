// Manual OAuth Server Starter
// Use this to test if the OAuth server can run independently

const OAuthServer = require('./src/main/auth/oauth-server');

console.log('='.repeat(60));
console.log('MANUAL OAUTH SERVER STARTER');
console.log('='.repeat(60));

async function startServer() {
  console.log('\nStarting OAuth server manually...\n');
  
  const server = new OAuthServer(3000);
  
  // Add event listeners
  server.on('auth-code', (data) => {
    console.log('[OAUTH] Auth code received:', data);
  });
  
  server.on('auth-error', (data) => {
    console.log('[OAUTH] Auth error:', data);
  });
  
  try {
    await server.start();
    console.log('\n✅ OAuth server started successfully!');
    console.log('Server is running at: http://127.0.0.1:3000/');
    console.log('\nTest URLs:');
    console.log('- Health check: http://127.0.0.1:3000/health');
    console.log('- Main page: http://127.0.0.1:3000/');
    console.log('- Callback: http://127.0.0.1:3000/auth/mastodon/callback');
    console.log('\nPress Ctrl+C to stop the server\n');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('\nPossible issues:');
    console.error('1. Port 3000 is already in use');
    console.error('2. Missing dependencies (run: npm install express)');
    console.error('3. Firewall blocking the port');
    
    if (error.code === 'EADDRINUSE') {
      console.error('\n🔧 Fix: Kill process using port 3000:');
      console.error('Windows: netstat -ano | findstr :3000');
      console.error('Then: taskkill /F /PID <PID>');
    }
  }
}

startServer();

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n\nShutting down OAuth server...');
  process.exit(0);
});
