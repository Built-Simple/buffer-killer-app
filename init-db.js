// Initialize Database Schema
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Initializing Buffer Killer database...');

const db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database.');
});

// Create tables
db.serialize(() => {
  // Posts table
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      platforms TEXT NOT NULL,
      scheduled_time DATETIME NOT NULL,
      status TEXT DEFAULT 'scheduled',
      media TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      error_message TEXT,
      workspace_id INTEGER
    )
  `, (err) => {
    if (err) console.error('Error creating posts table:', err);
    else console.log('✓ Posts table ready');
  });

  // Accounts table
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      username TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at DATETIME,
      profile_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    )
  `, (err) => {
    if (err) console.error('Error creating accounts table:', err);
    else console.log('✓ Accounts table ready');
  });

  // Drafts table
  db.run(`
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      platforms TEXT,
      media TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating drafts table:', err);
    else console.log('✓ Drafts table ready');
  });

  // Analytics table
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      platform TEXT,
      impressions INTEGER DEFAULT 0,
      engagements INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `, (err) => {
    if (err) console.error('Error creating analytics table:', err);
    else console.log('✓ Analytics table ready');
  });

  // Workspaces table
  db.run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating workspaces table:', err);
    else console.log('✓ Workspaces table ready');
  });

  // Templates table
  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT,
      platforms TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating templates table:', err);
    else console.log('✓ Templates table ready');
  });

  // Rate limits table
  db.run(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      account_id INTEGER,
      requests_made INTEGER DEFAULT 0,
      window_start DATETIME,
      window_end DATETIME,
      max_requests INTEGER,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )
  `, (err) => {
    if (err) console.error('Error creating rate_limits table:', err);
    else console.log('✓ Rate limits table ready');
  });

  // Plugin settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plugin_id TEXT NOT NULL,
      settings TEXT,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating plugin_settings table:', err);
    else console.log('✓ Plugin settings table ready');
  });

  // AB test results table
  db.run(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_name TEXT NOT NULL,
      variants TEXT,
      results TEXT,
      winner TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `, (err) => {
    if (err) console.error('Error creating ab_tests table:', err);
    else console.log('✓ A/B tests table ready');
  });

  // Create indexes for better performance
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_scheduled_time ON posts(scheduled_time)');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_analytics_post_id ON analytics(post_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform)');

  console.log('\n✅ Database initialization complete!');
});

// Close the database
db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('Database connection closed.');
    console.log('\nYou can now run: npm test');
  }
});
