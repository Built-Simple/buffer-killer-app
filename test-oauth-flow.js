// OAuth Flow Test - Run this to test Twitter authentication
const readline = require('readline');
const { shell } = require('electron');

// Load environment variables
require('dotenv').config();

console.log('\n========================================');
console.log('   TWITTER OAUTH FLOW TEST');
console.log('========================================\n');

// Check configuration
const hasKeys = process.env.TWITTER_CLIENT_ID && 
               process.env.TWITTER_CLIENT_ID !== 'YOUR_TWITTER_CLIENT_ID_HERE' &&
               process.env.TWITTER_CLIENT_SECRET && 
               process.env.TWITTER_CLIENT_SECRET !== 'YOUR_TWITTER_CLIENT_SECRET_HERE';

if (!hasKeys) {
  console.log('❌ ERROR: Twitter API keys not configured!\n');
  console.log('Please add your Twitter API credentials to the .env file:');
  console.log('  TWITTER_CLIENT_ID=your_actual_client_id');
  console.log('  TWITTER_CLIENT_SECRET=your_actual_client_secret\n');
  process.exit(1);
}

console.log('✅ Twitter API keys found in .env\n');

// Test OAuth server
const OAuthServer = require('./src/main/auth/oauth-server');
const TwitterAuth = require('./lib/platforms/twitter-auth');

async function testFlow() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('Starting OAuth server on port 3000...');
  const server = new OAuthServer(3000);
  await server.start();
  console.log('✅ OAuth server started\n');
  
  console.log('Initializing Twitter authentication...');
  const twitterAuth = new TwitterAuth();
  
  // Generate auth URL
  const authUrl = twitterAuth.getAuthorizationUrl();
  console.log('✅ Authorization URL generated\n');
  
  console.log('MANUAL TEST INSTRUCTIONS:');
  console.log('==========================');
  console.log('1. Copy this URL and paste in your browser:');
  console.log('\n' + authUrl + '\n');
  console.log('2. Log in to Twitter and authorize the app');
  console.log('3. You\'ll be redirected to a success page');
  console.log('4. Come back here and press Enter to stop the test\n');
  
  // Listen for OAuth callbacks
  server.on('auth-code', (data) => {
    console.log('✅ SUCCESS! Received authorization code');
    console.log('   Platform:', data.platform);
    console.log('   Code:', data.code ? data.code.substring(0, 10) + '...' : 'none');
    console.log('   State:', data.state ? data.state.substring(0, 10) + '...' : 'none');
    console.log('\nThe OAuth flow is working correctly!');
    console.log('You can now use the main app to connect Twitter.\n');
  });
  
  server.on('auth-error', (data) => {
    console.log('❌ ERROR! Authentication failed');
    console.log('   Platform:', data.platform);
    console.log('   Error:', data.error);
    console.log('   Description:', data.description);
  });
  
  // Wait for user to press Enter
  await new Promise(resolve => {
    rl.question('Press Enter when done testing...', () => {
      rl.close();
      resolve();
    });
  });
  
  console.log('\nStopping OAuth server...');
  server.stop();
  console.log('✅ Test complete\n');
  process.exit(0);
}

testFlow().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
