// Initialize Database Schema - Complete Version
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
      is_active INTEGER DEFAULT 1,
      workspace_id INTEGER
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      workspace_id INTEGER
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

  // Workspaces table - IMPORTANT!
  db.run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      is_default INTEGER DEFAULT 0,
      settings TEXT,
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      workspace_id INTEGER
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

  // A/B tests table
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

  // Workspace members table (for future team features)
  db.run(`
    CREATE TABLE IF NOT EXISTS workspace_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    )
  `, (err) => {
    if (err) console.error('Error creating workspace_members table:', err);
    else console.log('✓ Workspace members table ready');
  });

  // Queue table for advanced scheduling
  db.run(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      platform TEXT NOT NULL,
      account_id INTEGER,
      priority INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_attempt DATETIME,
      next_attempt DATETIME,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )
  `, (err) => {
    if (err) console.error('Error creating queue table:', err);
    else console.log('✓ Queue table ready');
  });

  // Media library table
  db.run(`
    CREATE TABLE IF NOT EXISTS media_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      filepath TEXT,
      mimetype TEXT,
      size INTEGER,
      dimensions TEXT,
      thumbnail TEXT,
      workspace_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    )
  `, (err) => {
    if (err) console.error('Error creating media_library table:', err);
    else console.log('✓ Media library table ready');
  });

  // Create indexes for better performance
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_scheduled_time ON posts(scheduled_time)');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_workspace ON posts(workspace_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_analytics_post_id ON analytics(post_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform)');
  db.run('CREATE INDEX IF NOT EXISTS idx_accounts_workspace ON accounts(workspace_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_queue_next_attempt ON queue(next_attempt)');

  // Insert default workspace
  db.run(`
    INSERT OR IGNORE INTO workspaces (id, name, color, icon, is_default)
    VALUES (1, 'Personal', '#667eea', '🚀', 1)
  `, (err) => {
    if (err) console.error('Error creating default workspace:', err);
    else console.log('✓ Default workspace created');
  });

  console.log('\n✅ Database initialization complete!');
});

// Close the database after a short delay to ensure all operations complete
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
      console.log('\nYou can now run: npm start');
    }
  });
}, 1000);
