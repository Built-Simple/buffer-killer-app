// Quick diagnostic for Twitter setup
const path = require('path');
const fs = require('fs');

console.log('\n=== BUFFER KILLER - TWITTER SETUP DIAGNOSTIC ===\n');

// Check .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for placeholder values
  const hasPlaceholderClientId = envContent.includes('YOUR_TWITTER_CLIENT_ID_HERE');
  const hasPlaceholderSecret = envContent.includes('YOUR_TWITTER_CLIENT_SECRET_HERE');
  
  if (hasPlaceholderClientId || hasPlaceholderSecret) {
    console.log('❌ TWITTER API KEYS NOT CONFIGURED!\n');
    console.log('You need to add your Twitter API credentials to the .env file.\n');
    console.log('STEPS TO GET TWITTER API KEYS:');
    console.log('================================');
    console.log('1. Go to: https://developer.twitter.com/en/portal/dashboard');
    console.log('2. Sign up for Twitter Developer account ($100/month for Basic tier)');
    console.log('3. Create a new App (or use existing one)');
    console.log('4. In App Settings, enable OAuth 2.0');
    console.log('5. Add this Redirect URI: http://127.0.0.1:3000/auth/twitter/callback');
    console.log('6. Copy your Client ID and Client Secret');
    console.log('7. Open .env file in this folder');
    console.log('8. Replace YOUR_TWITTER_CLIENT_ID_HERE with your actual Client ID');
    console.log('9. Replace YOUR_TWITTER_CLIENT_SECRET_HERE with your actual Client Secret');
    console.log('10. Save the file and restart the app\n');
    
    console.log('ALTERNATIVE: Use Mastodon instead (free, no API costs)');
    console.log('=========================================\n');
  } else {
    console.log('✅ Twitter API keys appear to be configured\n');
    
    // Parse .env to check values
    require('dotenv').config();
    
    if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
      console.log('Client ID starts with:', process.env.TWITTER_CLIENT_ID.substring(0, 5) + '...');
      console.log('Client Secret is set: Yes\n');
      console.log('✅ Configuration looks good! You should be able to connect Twitter.\n');
    }
  }
} else {
  console.log('❌ .env file not found!\n');
}

console.log('CURRENT STATUS:');
console.log('===============');

// Check if database exists
const dbPath = path.join(__dirname, 'db', 'database.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const twitterAccount = db.data.accounts.find(a => a.platform === 'twitter');
  
  if (twitterAccount) {
    try {
      const creds = JSON.parse(twitterAccount.credentials);
      console.log(`✅ Twitter account connected: @${creds.username || 'unknown'}`);
      
      // Check if token is expired
      if (creds.expiresAt) {
        const expiresAt = new Date(creds.expiresAt);
        const now = new Date();
        if (expiresAt <= now) {
          console.log('⚠️  Token expired - will refresh automatically on next use');
        } else {
          const hoursLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60));
          console.log(`✅ Token valid for ${hoursLeft} more hours`);
        }
      }
    } catch (e) {
      console.log('✅ Twitter account found but credentials encrypted');
    }
  } else {
    console.log('❌ No Twitter account connected yet');
  }
  
  const pendingPosts = db.data.posts.filter(p => p.status === 'pending');
  console.log(`📝 Scheduled posts: ${pendingPosts.length}`);
} else {
  console.log('ℹ️  No database yet (will be created on first run)');
}

console.log('\n===========================================\n');
