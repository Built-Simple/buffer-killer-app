// SQLite Database Wrapper for Buffer Killer
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath || 'database.db';
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          this.isInitialized = true;
          console.log('SQLite database initialized successfully');
          
          // Ensure tables exist
          this.ensureTables().then(() => {
            resolve();
          }).catch(reject);
        }
      });
    });
  }

  async ensureTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS posts (
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
      )`,
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        username TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        profile_data TEXT,
        credentials TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        active INTEGER DEFAULT 1,
        workspace_id INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        is_default INTEGER DEFAULT 0,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        platforms TEXT,
        media TEXT,
        tags TEXT,
        status TEXT DEFAULT 'draft',
        title TEXT DEFAULT 'Untitled Draft',
        notes TEXT,
        template_id TEXT,
        auto_hashtags INTEGER DEFAULT 0,
        link_tracking INTEGER DEFAULT 0,
        category TEXT DEFAULT 'general',
        scheduled_time DATETIME,
        draft_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        workspace_id INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT,
        html TEXT,
        css TEXT,
        dimensions TEXT,
        platforms TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        workspace_id INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        platform TEXT,
        impressions INTEGER DEFAULT 0,
        engagements INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )`,
      `CREATE TABLE IF NOT EXISTS queue (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        account_id INTEGER,
        requests_made INTEGER DEFAULT 0,
        window_start DATETIME,
        window_end DATETIME,
        max_requests INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // Ensure default workspace exists
    await this.run(`
      INSERT OR IGNORE INTO workspaces (id, name, color, icon, is_default)
      VALUES (1, 'Personal', '#667eea', '🚀', 1)
    `);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async insert(tableName, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.run(sql, values);
    
    return { ...data, id: result.id };
  }

  async find(tableName, conditions = {}) {
    let sql = `SELECT * FROM ${tableName}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const where = Object.keys(conditions).map(key => {
        params.push(conditions[key]);
        return `${key} = ?`;
      }).join(' AND ');
      sql += ` WHERE ${where}`;
    }
    
    return await this.all(sql, params);
  }

  async findOne(tableName, conditions = {}) {
    const results = await this.find(tableName, conditions);
    return results[0] || null;
  }

  async update(tableName, id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    
    const sql = `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    values.push(id);
    
    await this.run(sql, values);
    return await this.findOne(tableName, { id });
  }

  async delete(tableName, id) {
    const sql = `DELETE FROM ${tableName} WHERE id = ?`;
    const result = await this.run(sql, [id]);
    return result.changes > 0;
  }

  async count(tableName, conditions = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const where = Object.keys(conditions).map(key => {
        params.push(conditions[key]);
        return `${key} = ?`;
      }).join(' AND ');
      sql += ` WHERE ${where}`;
    }
    
    const result = await this.get(sql, params);
    return result.count;
  }

  async findById(tableName, id) {
    return await this.findOne(tableName, { id });
  }

  async upsert(tableName, conditions, data) {
    const existing = await this.findOne(tableName, conditions);
    if (existing) {
      return await this.update(tableName, existing.id, data);
    } else {
      return await this.insert(tableName, { ...conditions, ...data });
    }
  }

  query(tableName) {
    return new QueryBuilder(this, tableName);
  }

  async getAllRecords(tableName) {
    return await this.all(`SELECT * FROM ${tableName}`);
  }

  async migrateFromJSON(jsonPath) {
    // Migration not needed for SQLite
    return false;
  }
}

class QueryBuilder {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
    this.conditions = [];
    this.params = [];
    this.orderByClause = '';
    this.limitNum = null;
    this.offsetNum = null;
    this.groupByField = null;
  }

  where(field, operator, value) {
    if (value === undefined) {
      this.conditions.push(`${field} = ?`);
      this.params.push(operator);
    } else {
      const opMap = {
        'lt': '<',
        'lte': '<=',
        'gt': '>',
        'gte': '>=',
        'ne': '!=',
        'eq': '='
      };
      this.conditions.push(`${field} ${opMap[operator] || operator} ?`);
      this.params.push(value);
    }
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this.orderByClause = ` ORDER BY ${field} ${direction.toUpperCase()}`;
    return this;
  }

  orderByField(field, direction = 'asc') {
    return this.orderBy(field, direction);
  }

  limit(num) {
    this.limitNum = num;
    return this;
  }

  offset(num) {
    this.offsetNum = num;
    return this;
  }

  groupBy(field) {
    this.groupByField = field;
    return this;
  }

  async execute() {
    let sql = `SELECT * FROM ${this.tableName}`;
    
    if (this.conditions.length > 0) {
      sql += ` WHERE ${this.conditions.join(' AND ')}`;
    }
    
    if (this.groupByField) {
      sql += ` GROUP BY ${this.groupByField}`;
    }
    
    sql += this.orderByClause;
    
    if (this.limitNum !== null) {
      sql += ` LIMIT ${this.limitNum}`;
    }
    
    if (this.offsetNum !== null) {
      sql += ` OFFSET ${this.offsetNum}`;
    }
    
    return await this.db.all(sql, this.params);
  }

  async first() {
    this.limit(1);
    const results = await this.execute();
    return results[0] || null;
  }

  async count() {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    
    if (this.conditions.length > 0) {
      sql += ` WHERE ${this.conditions.join(' AND ')}`;
    }
    
    const result = await this.db.get(sql, this.params);
    return result.count;
  }
}

module.exports = Database;
