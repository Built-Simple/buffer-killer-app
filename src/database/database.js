// Enhanced Database System for Buffer Killer App
// Uses a structured file-based approach with indexing and better performance than JSON

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '../../db');
    this.tables = {};
    this.indexes = {};
    this.transactions = [];
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Create database directory
      await fs.mkdir(this.dbPath, { recursive: true });
      
      // Initialize tables
      await this.createTable('posts', {
        id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
        content: { type: 'TEXT', required: true },
        platforms: { type: 'TEXT' }, // JSON string
        scheduled_time: { type: 'DATETIME' },
        status: { type: 'TEXT', default: 'pending' },
        media: { type: 'TEXT' }, // JSON string
        error_message: { type: 'TEXT' },
        created_at: { type: 'DATETIME', default: () => new Date().toISOString() },
        updated_at: { type: 'DATETIME', default: () => new Date().toISOString() }
      });
      
      await this.createTable('accounts', {
        id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
        platform: { type: 'TEXT', required: true, unique: true },
        credentials: { type: 'TEXT', required: true }, // Encrypted JSON
        username: { type: 'TEXT' },
        active: { type: 'BOOLEAN', default: true },
        created_at: { type: 'DATETIME', default: () => new Date().toISOString() },
        updated_at: { type: 'DATETIME', default: () => new Date().toISOString() }
      });
      
      await this.createTable('templates', {
        id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
        name: { type: 'TEXT', required: true },
        html: { type: 'TEXT' },
        css: { type: 'TEXT' },
        dimensions: { type: 'TEXT' },
        created_at: { type: 'DATETIME', default: () => new Date().toISOString() },
        updated_at: { type: 'DATETIME', default: () => new Date().toISOString() }
      });
      
      await this.createTable('analytics', {
        id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
        post_id: { type: 'INTEGER', foreignKey: 'posts.id' },
        platform: { type: 'TEXT' },
        impressions: { type: 'INTEGER', default: 0 },
        engagements: { type: 'INTEGER', default: 0 },
        clicks: { type: 'INTEGER', default: 0 },
        recorded_at: { type: 'DATETIME', default: () => new Date().toISOString() }
      });
      
      await this.createTable('drafts', {
        id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
        content: { type: 'TEXT' },
        platforms: { type: 'TEXT' }, // JSON string
        media: { type: 'TEXT' }, // JSON string
        tags: { type: 'TEXT' }, // JSON array
        created_at: { type: 'DATETIME', default: () => new Date().toISOString() },
        updated_at: { type: 'DATETIME', default: () => new Date().toISOString() }
      });
      
      // Create indexes for better performance
      await this.createIndex('posts', 'status');
      await this.createIndex('posts', 'scheduled_time');
      await this.createIndex('accounts', 'platform');
      await this.createIndex('analytics', 'post_id');
      
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }
  
  async createTable(tableName, schema) {
    const tablePath = path.join(this.dbPath, `${tableName}.db`);
    const metaPath = path.join(this.dbPath, `${tableName}.meta.json`);
    
    // Check if table exists
    try {
      await fs.access(tablePath);
      // Table exists, load metadata
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      this.tables[tableName] = meta;
    } catch {
      // Table doesn't exist, create it
      this.tables[tableName] = {
        schema,
        autoIncrement: 1,
        indexes: {}
      };
      
      // Save metadata
      await fs.writeFile(metaPath, JSON.stringify(this.tables[tableName], null, 2));
      
      // Create empty data file
      await fs.writeFile(tablePath, '');
    }
  }
  
  async createIndex(tableName, fieldName) {
    const indexPath = path.join(this.dbPath, `${tableName}.${fieldName}.idx`);
    
    try {
      // Load existing index
      const indexData = await fs.readFile(indexPath, 'utf8');
      this.indexes[`${tableName}.${fieldName}`] = JSON.parse(indexData);
    } catch {
      // Create new index
      this.indexes[`${tableName}.${fieldName}`] = {};
      await this.rebuildIndex(tableName, fieldName);
    }
  }
  
  async rebuildIndex(tableName, fieldName) {
    const records = await this.getAllRecords(tableName);
    const index = {};
    
    for (const record of records) {
      const value = record[fieldName];
      if (value !== undefined) {
        if (!index[value]) {
          index[value] = [];
        }
        index[value].push(record.id);
      }
    }
    
    this.indexes[`${tableName}.${fieldName}`] = index;
    
    // Save index to disk
    const indexPath = path.join(this.dbPath, `${tableName}.${fieldName}.idx`);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
  
  async insert(tableName, data) {
    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }
    
    const schema = this.tables[tableName].schema;
    const record = {};
    
    // Generate ID
    record.id = this.tables[tableName].autoIncrement++;
    
    // Validate and apply schema
    for (const [field, config] of Object.entries(schema)) {
      if (field === 'id') continue;
      
      if (data[field] !== undefined) {
        record[field] = data[field];
      } else if (config.default !== undefined) {
        record[field] = typeof config.default === 'function' ? config.default() : config.default;
      } else if (config.required) {
        throw new Error(`Field ${field} is required`);
      }
    }
    
    // Save record
    const tablePath = path.join(this.dbPath, `${tableName}.db`);
    const line = JSON.stringify(record) + '\n';
    await fs.appendFile(tablePath, line);
    
    // Update metadata
    const metaPath = path.join(this.dbPath, `${tableName}.meta.json`);
    await fs.writeFile(metaPath, JSON.stringify(this.tables[tableName], null, 2));
    
    // Update indexes
    for (const indexKey of Object.keys(this.indexes)) {
      if (indexKey.startsWith(`${tableName}.`)) {
        const fieldName = indexKey.split('.')[1];
        const value = record[fieldName];
        if (value !== undefined) {
          if (!this.indexes[indexKey][value]) {
            this.indexes[indexKey][value] = [];
          }
          this.indexes[indexKey][value].push(record.id);
        }
      }
    }
    
    return record;
  }
  
  async getAllRecords(tableName) {
    const tablePath = path.join(this.dbPath, `${tableName}.db`);
    
    try {
      const content = await fs.readFile(tablePath, 'utf8');
      if (!content) return [];
      
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
  
  async find(tableName, conditions = {}) {
    let records = await this.getAllRecords(tableName);
    
    // Apply conditions
    for (const [field, value] of Object.entries(conditions)) {
      // Check if we have an index for this field
      const indexKey = `${tableName}.${field}`;
      if (this.indexes[indexKey] && Object.keys(conditions).length === 1) {
        // Use index for single-field queries
        const ids = this.indexes[indexKey][value] || [];
        records = records.filter(r => ids.includes(r.id));
      } else {
        // Filter normally
        records = records.filter(r => {
          if (typeof value === 'object' && value !== null) {
            // Handle operators like { $lt: value, $gt: value }
            for (const [op, val] of Object.entries(value)) {
              switch (op) {
                case '$lt': return r[field] < val;
                case '$lte': return r[field] <= val;
                case '$gt': return r[field] > val;
                case '$gte': return r[field] >= val;
                case '$ne': return r[field] !== val;
                case '$in': return val.includes(r[field]);
                default: return r[field] === val;
              }
            }
          }
          return r[field] === value;
        });
      }
    }
    
    return records;
  }
  
  async findOne(tableName, conditions = {}) {
    const records = await this.find(tableName, conditions);
    return records[0] || null;
  }
  
  async update(tableName, id, updates) {
    const records = await this.getAllRecords(tableName);
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) {
      throw new Error(`Record with id ${id} not found in ${tableName}`);
    }
    
    // Apply updates
    records[index] = {
      ...records[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Rewrite entire table (not optimal for large datasets, but simple)
    const tablePath = path.join(this.dbPath, `${tableName}.db`);
    const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    await fs.writeFile(tablePath, content);
    
    // Rebuild indexes
    for (const indexKey of Object.keys(this.indexes)) {
      if (indexKey.startsWith(`${tableName}.`)) {
        const fieldName = indexKey.split('.')[1];
        await this.rebuildIndex(tableName, fieldName);
      }
    }
    
    return records[index];
  }
  
  async delete(tableName, id) {
    const records = await this.getAllRecords(tableName);
    const filtered = records.filter(r => r.id !== id);
    
    if (records.length === filtered.length) {
      throw new Error(`Record with id ${id} not found in ${tableName}`);
    }
    
    // Rewrite table without the deleted record
    const tablePath = path.join(this.dbPath, `${tableName}.db`);
    const content = filtered.map(r => JSON.stringify(r)).join('\n') + '\n';
    await fs.writeFile(tablePath, content);
    
    // Rebuild indexes
    for (const indexKey of Object.keys(this.indexes)) {
      if (indexKey.startsWith(`${tableName}.`)) {
        const fieldName = indexKey.split('.')[1];
        await this.rebuildIndex(tableName, fieldName);
      }
    }
    
    return true;
  }
  
  // Migration helper from old JSON database
  async migrateFromJSON(jsonDbPath) {
    try {
      const jsonData = JSON.parse(await fs.readFile(jsonDbPath, 'utf8'));
      
      // Migrate posts
      if (jsonData.data.posts) {
        for (const post of jsonData.data.posts) {
          await this.insert('posts', post);
        }
        console.log(`Migrated ${jsonData.data.posts.length} posts`);
      }
      
      // Migrate accounts
      if (jsonData.data.accounts) {
        for (const account of jsonData.data.accounts) {
          await this.insert('accounts', account);
        }
        console.log(`Migrated ${jsonData.data.accounts.length} accounts`);
      }
      
      // Migrate templates
      if (jsonData.data.templates) {
        for (const template of jsonData.data.templates) {
          await this.insert('templates', template);
        }
        console.log(`Migrated ${jsonData.data.templates.length} templates`);
      }
      
      // Migrate analytics
      if (jsonData.data.analytics) {
        for (const analytic of jsonData.data.analytics) {
          await this.insert('analytics', analytic);
        }
        console.log(`Migrated ${jsonData.data.analytics.length} analytics`);
      }
      
      console.log('Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }
  
  // Backup database
  async backup(backupPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = backupPath || path.join(this.dbPath, '..', 'backups', timestamp);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Copy all database files
    const files = await fs.readdir(this.dbPath);
    for (const file of files) {
      const src = path.join(this.dbPath, file);
      const dest = path.join(backupDir, file);
      await fs.copyFile(src, dest);
    }
    
    console.log(`Database backed up to ${backupDir}`);
    return backupDir;
  }
  
  // Query builder for complex queries
  query(tableName) {
    return new QueryBuilder(this, tableName);
  }
}

// Query Builder for more complex queries
class QueryBuilder {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
    this.conditions = {};
    this.orderBy = null;
    this.limitNum = null;
    this.offsetNum = 0;
  }
  
  where(field, operator, value) {
    if (value === undefined) {
      // Simple equality
      this.conditions[field] = operator;
    } else {
      // Operator-based condition
      if (!this.conditions[field]) {
        this.conditions[field] = {};
      }
      this.conditions[field][`$${operator}`] = value;
    }
    return this;
  }
  
  orderByField(field, direction = 'asc') {
    this.orderBy = { field, direction };
    return this;
  }
  
  limit(num) {
    this.limitNum = num;
    return this;
  }
  
  offset(num) {
    this.offsetNum = num;
    return this;
  }
  
  async execute() {
    let results = await this.db.find(this.tableName, this.conditions);
    
    // Apply ordering
    if (this.orderBy) {
      results.sort((a, b) => {
        const aVal = a[this.orderBy.field];
        const bVal = b[this.orderBy.field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return this.orderBy.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    // Apply limit and offset
    if (this.limitNum !== null) {
      results = results.slice(this.offsetNum, this.offsetNum + this.limitNum);
    } else if (this.offsetNum > 0) {
      results = results.slice(this.offsetNum);
    }
    
    return results;
  }
  
  async first() {
    this.limitNum = 1;
    const results = await this.execute();
    return results[0] || null;
  }
  
  async count() {
    const results = await this.db.find(this.tableName, this.conditions);
    return results.length;
  }
}

module.exports = Database;