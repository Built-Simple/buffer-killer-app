// Buffer Killer - Configuration Checker
// Run this to verify your setup: node check-setup.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Buffer Killer Setup Checker\n');
console.log('================================\n');

let errors = 0;
let warnings = 0;

// Check Node version
console.log('📌 Node.js Version:');
const nodeVersion = process.version;
console.log(`   ${nodeVersion}`);
if (parseInt(nodeVersion.split('.')[0].substring(1)) < 18) {
  console.log('   ⚠️  Warning: Node.js 18+ recommended');
  warnings++;
} else {
  console.log('   ✅ Node version OK');
}
console.log('');

// Check if .env exists
console.log('📌 Environment File:');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env file exists');
  
  // Check for Twitter credentials
  require('dotenv').config();
  
  if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_ID !== 'YOUR_TWITTER_CLIENT_ID_HERE') {
    console.log('   ✅ Twitter Client ID configured');
  } else {
    console.log('   ⚠️  Twitter Client ID not configured');
    console.log('      Get it from: https://developer.twitter.com/en/portal/dashboard');
    warnings++;
  }
  
  if (process.env.TWITTER_CLIENT_SECRET && process.env.TWITTER_CLIENT_SECRET !== 'YOUR_TWITTER_CLIENT_SECRET_HERE') {
    console.log('   ✅ Twitter Client Secret configured');
  } else {
    console.log('   ⚠️  Twitter Client Secret not configured');
    warnings++;
  }
} else {
  console.log('   ❌ .env file not found!');
  console.log('      Run: copy .env.template .env');
  errors++;
}
console.log('');

// Check dependencies
console.log('📌 Dependencies:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['electron', 'axios', 'node-schedule', 'dotenv'];

for (const dep of requiredDeps) {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`   ✅ ${dep} listed in package.json`);
  } else {
    console.log(`   ❌ ${dep} missing from package.json`);
    errors++;
  }
}

// Check if node_modules exists
if (fs.existsSync('node_modules')) {
  console.log('   ✅ node_modules exists');
} else {
  console.log('   ❌ node_modules not found - run: npm install');
  errors++;
}
console.log('');

// Check required files
console.log('📌 Required Files:');
const requiredFiles = [
  'main.js',
  'index.html',
  'renderer.js',
  'preload.js',
  'src/main/auth/oauth-server.js',
  'lib/platforms/twitter-auth.js',
  'lib/platforms/twitter.js'
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} missing`);
    errors++;
  }
}
console.log('');

// Check database directory
console.log('📌 Database:');
if (fs.existsSync('db')) {
  console.log('   ✅ db/ directory exists');
} else {
  console.log('   ⚠️  db/ directory missing (will be created on first run)');
  warnings++;
}
console.log('');

// Summary
console.log('================================\n');
console.log('📊 Summary:');
if (errors === 0 && warnings === 0) {
  console.log('   🎉 Everything looks good! You\'re ready to go!');
  console.log('   Run: npm start');
} else {
  if (errors > 0) {
    console.log(`   ❌ ${errors} error(s) found - fix these before running`);
  }
  if (warnings > 0) {
    console.log(`   ⚠️  ${warnings} warning(s) - optional but recommended to fix`);
  }
}
console.log('');

// Next steps
console.log('📚 Next Steps:');
if (!process.env.TWITTER_CLIENT_ID || process.env.TWITTER_CLIENT_ID === 'YOUR_TWITTER_CLIENT_ID_HERE') {
  console.log('   1. Get Twitter API keys from: https://developer.twitter.com');
  console.log('   2. Add them to your .env file');
  console.log('   3. Run: npm start');
} else {
  console.log('   1. Run: npm start');
  console.log('   2. Click "Add Account" in the app');
  console.log('   3. Connect your Twitter account');
  console.log('   4. Schedule your first post!');
}
console.log('');

process.exit(errors > 0 ? 1 : 0);