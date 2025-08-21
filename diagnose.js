// Complete Startup Diagnostic for Buffer Killer
// This tests each component individually

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('BUFFER KILLER STARTUP DIAGNOSTIC');
console.log('='.repeat(70));

// Step 1: Check dependencies
console.log('\n📦 STEP 1: Checking Dependencies...\n');

const requiredModules = [
  'express',
  'electron',
  'axios',
  'dotenv',
  'node-schedule',
  'sqlite3'
];

let missingModules = [];
for (const mod of requiredModules) {
  try {
    require.resolve(mod);
    console.log(`  ✅ ${mod} - installed`);
  } catch {
    console.log(`  ❌ ${mod} - MISSING`);
    missingModules.push(mod);
  }
}

if (missingModules.length > 0) {
  console.log('\n  ⚠️ Missing modules! Run: npm install');
}

// Step 2: Check files
console.log('\n📁 STEP 2: Checking Required Files...\n');

const requiredFiles = [
  'main.js',
  'index.html',
  'renderer.js',
  'preload.js',
  'src/main/auth/oauth-server.js',
  'lib/platforms/mastodon-auth.js',
  'src/database/sqlite-database.js'
];

let missingFiles = [];
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file} - exists`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
}

// Step 3: Test OAuth Server
console.log('\n🌐 STEP 3: Testing OAuth Server Component...\n');

const OAuthServer = require('./src/main/auth/oauth-server');
const testServer = new OAuthServer(3000);

testServer.start().then(() => {
  console.log('  ✅ OAuth server can start successfully');
  console.log('  Server running at: http://127.0.0.1:3000/');
  
  // Test if we can reach it
  const http = require('http');
  http.get('http://127.0.0.1:3000/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('  ✅ Health check successful:', data);
      testServer.stop();
      testDatabase();
    });
  }).on('error', (err) => {
    console.log('  ❌ Cannot reach OAuth server:', err.message);
    testServer.stop();
    testDatabase();
  });
}).catch(error => {
  console.log('  ❌ OAuth server failed to start:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.log('  ⚠️ Port 3000 is already in use!');
    console.log('  Run: netstat -ano | findstr :3000');
  }
  testDatabase();
});

// Step 4: Test Database
function testDatabase() {
  console.log('\n💾 STEP 4: Testing Database...\n');
  
  try {
    const Database = require('./src/database/sqlite-database');
    const db = new Database();
    console.log('  ✅ Database module loaded');
    
    db.initialize().then(() => {
      console.log('  ✅ Database initialized successfully');
      showResults();
    }).catch(error => {
      console.log('  ❌ Database initialization failed:', error.message);
      showResults();
    });
  } catch (error) {
    console.log('  ❌ Cannot load database module:', error.message);
    showResults();
  }
}

// Show results
function showResults() {
  console.log('\n' + '='.repeat(70));
  console.log('DIAGNOSTIC RESULTS');
  console.log('='.repeat(70));
  
  if (missingModules.length === 0 && missingFiles.length === 0) {
    console.log('\n✅ All components are present!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run the app: npm start');
    console.log('2. Open DevTools (Ctrl+Shift+I)');
    console.log('3. Look for [MAIN] logs in console');
    console.log('4. Check if OAuth server starts');
  } else {
    console.log('\n❌ Issues found:');
    if (missingModules.length > 0) {
      console.log('\nMissing npm modules:');
      missingModules.forEach(m => console.log(`  - ${m}`));
      console.log('\n  Fix: npm install');
    }
    if (missingFiles.length > 0) {
      console.log('\nMissing files:');
      missingFiles.forEach(f => console.log(`  - ${f}`));
      console.log('\n  These files need to be created or restored');
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('If the app still doesn\'t work after fixing issues:');
  console.log('1. Check antivirus/firewall settings');
  console.log('2. Run as administrator');
  console.log('3. Try: node start-oauth-server.js (test OAuth alone)');
  console.log('4. Share all [MAIN] console logs');
  console.log('='.repeat(70));
  
  process.exit(0);
}
