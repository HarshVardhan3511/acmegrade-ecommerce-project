const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.resolve(__dirname, '../shopeasy.db');

// Ensure parent directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`Connected to SQLite database at: ${dbPath}`);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON;');

/**
 * Execute a query that returns multiple rows
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array>}
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

/**
 * Execute a query that returns a single row
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Object|undefined>}
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Execute an INSERT / UPDATE / DELETE query
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<{ lastID: number, changes: number }>}
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Execute raw multi-statement SQL (e.g., schema scripts)
 * @param {string} sql 
 * @returns {Promise<void>}
 */
function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Run operations inside a Database Transaction (BEGIN ... COMMIT / ROLLBACK)
 * @param {Function} asyncCallback (dbHelper) => Promise<any>
 * @returns {Promise<any>}
 */
async function transaction(asyncCallback) {
  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const result = await asyncCallback({ all, get, run });
    await run('COMMIT');
    return result;
  } catch (err) {
    try {
      await run('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }
    throw err;
  }
}

/**
 * Initialize database schema and verify base tables
 */
async function initDatabase() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await exec(schemaSql);
    console.log('Database schema checked/initialized.');
  }

  // Add gst_amount column to orders if it doesn't exist (migration)
  await run(`ALTER TABLE orders ADD COLUMN gst_amount REAL NOT NULL DEFAULT 0`).catch(() => {});
  // Add max_discount column to coupons if it doesn't exist (percentage cap)
  await run(`ALTER TABLE coupons ADD COLUMN max_discount REAL DEFAULT NULL`).catch(() => {});

  // Seed default coupons (INSERT OR IGNORE so they aren't duplicated)
  await run(`INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, is_active)
    VALUES ('SAVE10', 'percentage', 10, 200, 100, 1)`).catch(() => {});
  await run(`INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, is_active)
    VALUES ('FLAT50', 'flat', 50, 500, 50, 1)`).catch(() => {});
  await run(`INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, is_active)
    VALUES ('NEWUSER20', 'percentage', 20, 0, 1000, 1)`).catch(() => {});
  await run(`INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, is_active)
    VALUES ('SUMMER15', 'percentage', 15, 300, 200, 1)`).catch(() => {});

  // Check if products exist; if empty, seed automatically
  const countRow = await get('SELECT COUNT(*) as count FROM products');
  if (countRow && countRow.count === 0) {
    console.log('Database empty, auto-seeding sample data...');
    const seedPath = path.resolve(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await exec(seedSql);
      console.log('Database seeded successfully.');
    }
  }
}

module.exports = {
  db,
  all,
  get,
  run,
  exec,
  transaction,
  initDatabase,
};
