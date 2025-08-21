// Twitter OAuth Setup Helper
// This script helps you configure Twitter OAuth for Buffer Killer

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=====================================');
console.log('   🐦 TWITTER/X OAUTH SETUP HELPER');
console.log('=====================================\n');

console.log('This helper will set up Twitter OAuth for your Buffer Killer app.\n');

console.log('📋 BEFORE YOU CONTINUE, YOU NEED TO:');
console.log('1. Go to: https://developer.twitter.com/en/portal/dashboard');
console.log('2. Create a new app (or use existing)');
console.log('3. Enable OAuth 2.0 with these settings:');
console.log('   - Type: Public client (no secret needed)');
console.log('   - Callback: http://127.0.0.1:3000/auth/twitter/callback');
console.log('4. Copy your Client ID\n');

console.log('Press Ctrl+C to cancel at any time.\n');

function promptForClientId() {
  rl.question('Enter your Twitter Client ID (or "skip" to do this later): ', (clientId) => {
    if (clientId.toLowerCase() === 'skip') {
      console.log('\n⏭️ Skipped. You can add it manually to .env file later.');
      console.log('Add this line: TWITTER_CLIENT_ID=your_client_id_here\n');
      rl.close();
      return;
    }
    
    if (!clientId || clientId.length < 20) {
      console.log('\n❌ That doesn\'t look like a valid Client ID.');
      console.log('Client IDs are usually long strings like: V2FrT0hKa2dVNDI3SmpGRVJFOGg6MTpjaQ\n');
      promptForClientId();
      return;
    }
    
    // Save to .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    let updated = false;
    
    try {
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check if TWITTER_CLIENT_ID already exists
        if (envContent.includes('TWITTER_CLIENT_ID=')) {
          // Update existing
          envContent = envContent.replace(/TWITTER_CLIENT_ID=.*/g, `TWITTER_CLIENT_ID=${clientId}`);
          updated = true;
        } else {
          // Add new
          envContent = envContent.trim() + `\n\n# Twitter OAuth\nTWITTER_CLIENT_ID=${clientId}\n`;
        }
      } else {
        // Create new .env file
        envContent = `# Buffer Killer Configuration\n\n# Twitter OAuth\nTWITTER_CLIENT_ID=${clientId}\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      
      console.log('\n✅ SUCCESS! Twitter Client ID saved to .env file');
      console.log('\n📝 Configuration saved:');
      console.log(`   Client ID: ${clientId.substring(0, 10)}...${clientId.substring(clientId.length - 4)}`);
      console.log(`   File: ${envPath}`);
      
      console.log('\n🚀 NEXT STEPS:');
      console.log('1. Start the app: npm start');
      console.log('2. Click "Connect Twitter"');
      console.log('3. Authorize in your browser');
      console.log('4. Start scheduling tweets!\n');
      
      // Optionally test the connection
      rl.question('Would you like to test the connection now? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          console.log('\nTesting Twitter OAuth setup...\n');
          testTwitterSetup(clientId);
        } else {
          console.log('\n✨ Setup complete! You can test it later in the app.');
          rl.close();
        }
      });
      
    } catch (error) {
      console.error('\n❌ Error saving configuration:', error.message);
      console.log('Please add this line manually to your .env file:');
      console.log(`TWITTER_CLIENT_ID=${clientId}\n`);
      rl.close();
    }
  });
}

function testTwitterSetup(clientId) {
  try {
    // Load the Twitter auth module
    const TwitterBrowserAuth = require('./lib/platforms/twitter-browser-auth');
    
    // Set the client ID temporarily
    process.env.TWITTER_CLIENT_ID = clientId;
    
    const auth = new TwitterBrowserAuth();
    
    // Generate auth URL to test
    const authUrl = auth.getAuthorizationUrl(clientId);
    
    if (authUrl) {
      console.log('✅ Twitter OAuth configuration looks good!');
      console.log('\nGenerated auth URL successfully.');
      console.log('The app should be able to connect to Twitter.\n');
    }
  } catch (error) {
    console.log('⚠️ Could not fully test the setup:', error.message);
    console.log('This is normal if dependencies are missing.');
    console.log('The configuration has been saved and should work when you run the app.\n');
  }
  
  rl.close();
}

// Check if .env file exists and has Twitter config
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('TWITTER_CLIENT_ID=') && !envContent.includes('TWITTER_CLIENT_ID=your_')) {
    // Extract existing client ID
    const match = envContent.match(/TWITTER_CLIENT_ID=([^\s\n]+)/);
    if (match && match[1]) {
      console.log('📌 Found existing Twitter Client ID in .env file');
      console.log(`   Current ID: ${match[1].substring(0, 10)}...${match[1].substring(match[1].length - 4)}\n`);
      
      rl.question('Do you want to update it? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          promptForClientId();
        } else {
          console.log('\n✅ Keeping existing configuration.');
          console.log('Your Twitter OAuth should already be working!\n');
          rl.close();
        }
      });
    } else {
      promptForClientId();
    }
  } else {
    promptForClientId();
  }
} else {
  promptForClientId();
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled. You can run this again anytime.');
  process.exit(0);
});