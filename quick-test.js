// Quick smoke test - only check what actually exists
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

console.log('Running quick smoke test...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}: ${err.message}`);
    failed++;
  }
}

// Test core files
test('Main files exist', () => {
  ['main.js', 'renderer.js', 'index.html', 'package.json'].forEach(f => {
    if (!fs.existsSync(f)) throw new Error(`Missing ${f}`);
  });
});

// Test directories
test('Core directories exist', () => {
  ['lib', 'components', 'docs'].forEach(d => {
    if (!fs.existsSync(d)) throw new Error(`Missing ${d}/`);
  });
});

// Test database
test('Database exists and has tables', () => {
  const db = new sqlite3.Database('database.db');
  db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'", (err, row) => {
    if (err) throw err;
    if (row.count === 0) throw new Error('No tables in database');
  });
  db.close();
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
