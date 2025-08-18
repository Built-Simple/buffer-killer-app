// Test script to verify Twitter OAuth setup
require('dotenv').config();

console.log('🔍 Testing Twitter OAuth Configuration...\n');

// Check environment variables
const hasClientId = !!process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_ID !== 'YOUR_TWITTER_CLIENT_ID_HERE';
const hasClientSecret = !!process.env.TWITTER_CLIENT_SECRET && process.env.TWITTER_CLIENT_SECRET !== 'YOUR_TWITTER_CLIENT_SECRET_HERE';

console.log('✅ Configuration Check:');
console.log(`   Client ID configured: ${hasClientId ? '✅ Yes' : '❌ No - Please add your Twitter Client ID to .env'}`);
console.log(`   Client Secret configured: ${hasClientSecret ? '✅ Yes' : '❌ No - Please add your Twitter Client Secret to .env'}`);
console.log(`   Callback URL: ${process.env.TWITTER_CALLBACK_URL || 'Not set'}\n`);

if (!hasClientId || !hasClientSecret) {
  console.log('⚠️  Twitter API keys not configured!\n');
  console.log('To get Twitter API keys:');
  console.log('1. Go to https://developer.twitter.com/en/portal/dashboard');
  console.log('2. Create a new app (or use existing)');
  console.log('3. Enable OAuth 2.0');
  console.log('4. Add http://127.0.0.1:3000/auth/twitter/callback as redirect URI');
  console.log('5. Copy Client ID and Client Secret to .env file\n');
  console.log('Note: Twitter Developer account costs $100/month for Basic tier');
  process.exit(1);
}

// Test OAuth server
const OAuthServer = require('./src/main/auth/oauth-server');
const TwitterAuth = require('./lib/platforms/twitter-auth');

async function testOAuth() {
  try {
    console.log('🚀 Starting OAuth server test...');
    const server = new OAuthServer(3000);
    await server.start();
    console.log('✅ OAuth server started successfully\n');
    
    console.log('🔐 Testing Twitter Auth module...');
    const twitterAuth = new TwitterAuth();
    
    // Generate PKCE parameters
    const pkce = twitterAuth.generatePKCE();
    console.log('✅ PKCE parameters generated');
    console.log(`   State: ${pkce.state.substring(0, 10)}...`);
    console.log(`   Code Verifier: ${pkce.codeVerifier.substring(0, 10)}...`);
    console.log(`   Code Challenge: ${pkce.codeChallenge.substring(0, 10)}...\n`);
    
    // Get authorization URL
    const authUrl = twitterAuth.getAuthorizationUrl();
    console.log('✅ Authorization URL generated:');
    console.log(`   ${authUrl.substring(0, 80)}...\n`);
    
    console.log('✅ All tests passed! Twitter OAuth is properly configured.\n');
    console.log('To test the full flow:');
    console.log('1. Run the app: npm start');
    console.log('2. Click "Connect Twitter Account"');
    console.log('3. Complete authentication in your browser');
    
    server.stop();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testOAuth();
