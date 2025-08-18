// Automated Test Suite for Buffer Killer
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Test runner
async function runTest(name, testFn) {
  try {
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed' });
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', error: error.message });
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
  }
}

// Assert helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// DATABASE TESTS
async function testDatabase() {
  console.log(`\n${colors.blue}Testing Database...${colors.reset}`);
  
  await runTest('Database file exists', () => {
    assert(fs.existsSync('database.db'), 'Database file not found');
  });

  await runTest('Can connect to database', async () => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database('database.db', (err) => {
        if (err) reject(err);
        else {
          db.close();
          resolve();
        }
      });
    });
  });

  await runTest('Posts table exists', async () => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database('database.db');
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'", (err, row) => {
        db.close();
        if (err) reject(err);
        assert(row, 'Posts table not found');
        resolve();
      });
    });
  });

  await runTest('Can insert and retrieve post', async () => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database('database.db');
      const testPost = {
        content: 'Test post ' + Date.now(),
        platforms: JSON.stringify(['twitter']),
        scheduled_time: new Date().toISOString(),
        status: 'scheduled'
      };
      
      db.run(
        'INSERT INTO posts (content, platforms, scheduled_time, status) VALUES (?, ?, ?, ?)',
        [testPost.content, testPost.platforms, testPost.scheduled_time, testPost.status],
        function(err) {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          const id = this.lastID;
          db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
            db.close();
            if (err) reject(err);
            assert(row.content === testPost.content, 'Content mismatch');
            resolve();
          });
        }
      );
    });
  });
}

// FILE SYSTEM TESTS
async function testFileSystem() {
  console.log(`\n${colors.blue}Testing File System...${colors.reset}`);
  
  await runTest('Required directories exist', () => {
    const dirs = ['lib', 'components', 'styles', 'docs'];
    dirs.forEach(dir => {
      assert(fs.existsSync(dir), `Directory ${dir} not found`);
    });
  });

  await runTest('Main files exist', () => {
    const files = ['main.js', 'renderer.js', 'index.html', 'package.json'];
    files.forEach(file => {
      assert(fs.existsSync(file), `File ${file} not found`);
    });
  });

  await runTest('Platform modules exist', () => {
    const platforms = ['twitter.js', 'linkedin.js', 'facebook.js', 'mastodon.js', 'github.js'];
    platforms.forEach(platform => {
      const filePath = path.join('lib', 'platforms', platform);
      assert(fs.existsSync(filePath), `Platform module ${platform} not found`);
    });
  });
}

// CONFIGURATION TESTS
async function testConfiguration() {
  console.log(`\n${colors.blue}Testing Configuration...${colors.reset}`);
  
  await runTest('package.json is valid', () => {
    const packageJson = require('./package.json');
    assert(packageJson.name === 'buffer-killer-app', 'Invalid package name');
    assert(packageJson.main === 'main.js', 'Invalid main entry');
    assert(packageJson.scripts.start, 'Start script not defined');
  });

  await runTest('Electron version is compatible', () => {
    const packageJson = require('./package.json');
    const electronVersion = packageJson.devDependencies?.electron || packageJson.dependencies?.electron;
    assert(electronVersion, 'Electron not found in dependencies');
    const majorVersion = parseInt(electronVersion.match(/\d+/)[0]);
    assert(majorVersion >= 20, `Electron version too old: ${electronVersion}`);
  });
}

// RENDERER PROCESS TESTS
async function testRendererProcess() {
  console.log(`\n${colors.blue}Testing Renderer Process...${colors.reset}`);
  
  await runTest('HTML file is valid', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('<!DOCTYPE html>'), 'Invalid HTML structure');
    assert(html.includes('<div class="main-container">'), 'Main container not found');
    assert(html.includes('renderer.js'), 'Renderer script not included');
  });

  await runTest('CSS variables are defined', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const cssVars = ['--primary-color', '--dark-bg', '--dark-surface', '--light-text'];
    cssVars.forEach(cssVar => {
      assert(html.includes(cssVar), `CSS variable ${cssVar} not defined`);
    });
  });

  await runTest('Required scripts are loaded', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const scripts = [
      'renderer.js',
      'components/image-generator-ui.js',
      'lib/plugins/plugin-system.js'
    ];
    scripts.forEach(script => {
      assert(html.includes(script), `Script ${script} not loaded`);
    });
  });
}

// API TESTS
async function testAPIs() {
  console.log(`\n${colors.blue}Testing APIs...${colors.reset}`);
  
  await runTest('IPC channels are defined', () => {
    const mainJs = fs.readFileSync('main.js', 'utf8');
    const channels = ['schedule-post', 'get-scheduled-posts', 'delete-post'];
    channels.forEach(channel => {
      assert(mainJs.includes(channel), `IPC channel ${channel} not defined`);
    });
  });

  await runTest('Rate limiter is configured', () => {
    const rateLimiterPath = path.join('lib', 'rate-limiter.js');
    assert(fs.existsSync(rateLimiterPath), 'Rate limiter not found');
    const rateLimiter = fs.readFileSync(rateLimiterPath, 'utf8');
    assert(rateLimiter.includes('class RateLimiter'), 'RateLimiter class not defined');
  });
}

// SECURITY TESTS
async function testSecurity() {
  console.log(`\n${colors.blue}Testing Security...${colors.reset}`);
  
  await runTest('Context isolation is enabled', () => {
    const mainJs = fs.readFileSync('main.js', 'utf8');
    assert(mainJs.includes('contextIsolation: true'), 'Context isolation not enabled');
  });

  await runTest('Node integration is disabled in renderer', () => {
    const mainJs = fs.readFileSync('main.js', 'utf8');
    assert(mainJs.includes('nodeIntegration: false'), 'Node integration not disabled');
  });

  await runTest('Sandbox is enabled', () => {
    const mainJs = fs.readFileSync('main.js', 'utf8');
    assert(mainJs.includes('sandbox: true'), 'Sandbox not enabled');
  });

  await runTest('No hardcoded API keys', () => {
    const libFiles = fs.readdirSync('lib', { recursive: true });
    libFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const content = fs.readFileSync(path.join('lib', file), 'utf8');
        assert(!content.includes('sk_live_'), 'Live API key found in ' + file);
        assert(!content.includes('pk_live_'), 'Live API key found in ' + file);
        assert(!/[a-zA-Z0-9]{40,}/.test(content) || content.includes('YOUR_'), 
          'Potential API key found in ' + file);
      }
    });
  });
}

// PLUGIN SYSTEM TESTS
async function testPluginSystem() {
  console.log(`\n${colors.blue}Testing Plugin System...${colors.reset}`);
  
  await runTest('Plugin system exists', () => {
    const pluginSystemPath = path.join('lib', 'plugins', 'plugin-system.js');
    assert(fs.existsSync(pluginSystemPath), 'Plugin system not found');
  });

  await runTest('Example plugin exists', () => {
    const examplePluginPath = path.join('plugins', 'word-counter');
    assert(fs.existsSync(examplePluginPath), 'Example plugin not found');
    
    const manifestPath = path.join(examplePluginPath, 'manifest.json');
    assert(fs.existsSync(manifestPath), 'Plugin manifest not found');
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(manifest.id === 'word-counter', 'Invalid plugin ID');
  });

  await runTest('Plugin sandboxing is configured', () => {
    const pluginSystem = fs.readFileSync(path.join('lib', 'plugins', 'plugin-system.js'), 'utf8');
    assert(pluginSystem.includes('createSandbox'), 'Sandbox creation not implemented');
    assert(pluginSystem.includes('iframe.sandbox'), 'iframe sandboxing not configured');
  });
}

// PERFORMANCE TESTS
async function testPerformance() {
  console.log(`\n${colors.blue}Testing Performance...${colors.reset}`);
  
  await runTest('Bundle size is reasonable', () => {
    const stats = fs.statSync('index.html');
    const sizeInMB = stats.size / (1024 * 1024);
    assert(sizeInMB < 1, `HTML file too large: ${sizeInMB.toFixed(2)}MB`);
  });

  await runTest('No synchronous file operations in renderer', () => {
    const renderer = fs.readFileSync('renderer.js', 'utf8');
    assert(!renderer.includes('readFileSync'), 'Synchronous file read found in renderer');
    assert(!renderer.includes('writeFileSync'), 'Synchronous file write found in renderer');
  });
}

// MAIN TEST RUNNER
async function runAllTests() {
  console.log(`${colors.yellow}================================${colors.reset}`);
  console.log(`${colors.yellow}Buffer Killer Test Suite${colors.reset}`);
  console.log(`${colors.yellow}================================${colors.reset}`);
  
  await testDatabase();
  await testFileSystem();
  await testConfiguration();
  await testRendererProcess();
  await testAPIs();
  await testSecurity();
  await testPluginSystem();
  await testPerformance();
  
  // Print summary
  console.log(`\n${colors.yellow}================================${colors.reset}`);
  console.log(`${colors.yellow}Test Summary${colors.reset}`);
  console.log(`${colors.yellow}================================${colors.reset}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  
  if (testResults.failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
    process.exit(1);
  } else {
    console.log(`\n${colors.green}All tests passed! 🎉${colors.reset}`);
    process.exit(0);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
