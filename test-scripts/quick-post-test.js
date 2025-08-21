// Quick Post Test - Posts to all connected platforms
// Run this with: node test-scripts/quick-post-test.js

require('dotenv').config();
const path = require('path');

// Import the main posting function
const Database = require('../src/database/sqlite-database');
const TwitterAPI = require('../lib/platforms/twitter');
const GitHubAPI = require('../lib/platforms/github');
const MastodonAPI = require('../lib/platforms/mastodon');
const LinkedInAPI = require('../lib/platforms/linkedin');
const WebsiteAPI = require('../lib/platforms/website');
const SkoolAPI = require('../lib/platforms/skool');

// Try to import YouTube (may fail if googleapis not installed)
let YouTubeAPI;
try {
  YouTubeAPI = require('../lib/platforms/youtube');
} catch (error) {
  console.warn('⚠️ YouTube integration not available (googleapis not installed)');
}

async function quickPostTest() {
  console.log('🚀 Quick Post Test - Testing all connected platforms\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Get test message from user
  const testMessage = await new Promise(resolve => {
    readline.question('Enter test message (or press Enter for default): ', answer => {
      resolve(answer || `Test post from Buffer Killer! 🤖\nTesting multi-platform posting.\n\nTime: ${new Date().toLocaleString()}\n#BufferKiller #Testing`);
    });
  });
  
  console.log('\n📝 Message to post:\n', testMessage);
  console.log('\n=====================================\n');
  
  const db = new Database();
  await db.initialize();
  
  const results = [];
  
  // Test Twitter
  try {
    const account = await db.findOne('accounts', { platform: 'twitter', active: true });
    if (account) {
      console.log('🐦 Posting to Twitter...');
      const creds = JSON.parse(account.credentials);
      const twitter = new TwitterAPI(creds.accessToken);
      const result = await twitter.postTweet(testMessage);
      results.push({
        platform: 'Twitter',
        status: '✅ Success',
        url: `https://twitter.com/i/web/status/${result.id}`
      });
    }
  } catch (error) {
    results.push({
      platform: 'Twitter',
      status: '❌ Failed',
      error: error.message
    });
  }
  
  // Test Mastodon
  try {
    const account = await db.findOne('accounts', { platform: 'mastodon', active: true });
    if (account) {
      console.log('🐘 Posting to Mastodon...');
      const creds = JSON.parse(account.credentials);
      const mastodon = new MastodonAPI(creds.accessToken, creds.instance);
      const result = await mastodon.postToot(testMessage);
      results.push({
        platform: 'Mastodon',
        status: '✅ Success',
        url: result.url
      });
    }
  } catch (error) {
    results.push({
      platform: 'Mastodon',
      status: '❌ Failed',
      error: error.message
    });
  }
  
  // Test GitHub
  try {
    const account = await db.findOne('accounts', { platform: 'github', active: true });
    if (account) {
      console.log('🐙 Posting to GitHub...');
      const creds = JSON.parse(account.credentials);
      const github = new GitHubAPI(creds.accessToken);
      const result = await github.postStatus(testMessage, {
        repo: creds.defaultRepo || 'social-posts',
        owner: creds.username,
        type: 'issue'
      });
      results.push({
        platform: 'GitHub',
        status: '✅ Success',
        url: result.url
      });
    }
  } catch (error) {
    results.push({
      platform: 'GitHub',
      status: '❌ Failed',
      error: error.message
    });
  }
  
  // Test LinkedIn
  try {
    const account = await db.findOne('accounts', { platform: 'linkedin', active: true });
    if (account) {
      console.log('💼 Posting to LinkedIn...');
      const creds = JSON.parse(account.credentials);
      const linkedin = new LinkedInAPI(creds.accessToken, creds.userId);
      const result = await linkedin.post(testMessage);
      results.push({
        platform: 'LinkedIn',
        status: '✅ Success',
        url: result.url
      });
    }
  } catch (error) {
    results.push({
      platform: 'LinkedIn',
      status: '❌ Failed',
      error: error.message
    });
  }
  
  // Test Website
  try {
    const webhookUrl = process.env.WEBSITE_WEBHOOK_URL;
    if (webhookUrl) {
      console.log('🌐 Posting to Website...');
      const website = new WebsiteAPI(webhookUrl, process.env.WEBSITE_API_KEY);
      const result = await website.post(testMessage);
      results.push({
        platform: 'Website',
        status: '✅ Success',
        url: result.url
      });
    }
  } catch (error) {
    results.push({
      platform: 'Website',
      status: '❌ Failed',
      error: error.message
    });
  }
  
  // Test Skool (if configured)
  try {
    const webhookUrl = process.env.SKOOL_WEBHOOK_URL;
    if (webhookUrl) {
      console.log('🎓 Posting to Skool...');
      const skool = new SkoolAPI(process.env.SKOOL_API_KEY, process.env.SKOOL_COMMUNITY_URL);
      const result = await skool.post(testMessage, { webhookUrl });
      results.push({
        platform: 'Skool',
        status: '✅ Success',
        url: result.url
      });
    }
  } catch (error) {
    results.push({
      platform: 'Skool',
      status: '❌ Failed',
      error: error.message
    });
  }
  
  // Test YouTube (if available and configured)
  if (YouTubeAPI) {
    try {
      const account = await db.findOne('accounts', { platform: 'youtube', active: true });
      if (account) {
        console.log('📺 Posting to YouTube...');
        const creds = JSON.parse(account.credentials);
        const youtube = new YouTubeAPI(creds.accessToken, creds.refreshToken);
        
        // Try to post as comment on most recent video
        const videos = await youtube.getVideos(1);
        if (videos && videos.length > 0) {
          const result = await youtube.post(testMessage, { videoId: videos[0].id });
          results.push({
            platform: 'YouTube',
            status: '✅ Success',
            url: result.url
          });
        } else {
          results.push({
            platform: 'YouTube',
            status: '⚠️ No videos',
            error: 'No videos found to comment on'
          });
        }
      }
    } catch (error) {
      results.push({
        platform: 'YouTube',
        status: '❌ Failed',
        error: error.message
      });
    }
  }
  
  // Display results
  console.log('\n=====================================');
  console.log('           POST RESULTS');
  console.log('=====================================\n');
  
  results.forEach(result => {
    console.log(`${result.platform}: ${result.status}`);
    if (result.url) {
      console.log(`  📎 ${result.url}`);
    }
    if (result.error) {
      console.log(`  ⚠️ ${result.error}`);
    }
    console.log();
  });
  
  const successCount = results.filter(r => r.status.includes('Success')).length;
  console.log(`✨ Posted successfully to ${successCount}/${results.length} platforms\n`);
  
  readline.close();
  process.exit(0);
}

// Run the test
quickPostTest().catch(console.error);