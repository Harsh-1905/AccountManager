import * as SQLite from 'expo-sqlite';

let db = null;

export const getDatabase = () => {
  if (!db) {
    db = SQLite.openDatabaseSync('accountmanager.db');
  }
  return db;
};

export const initDatabase = () => {
  const database = getDatabase();

  database.execSync(`PRAGMA journal_mode = WAL;`);

  // Settings table (key-value store for PIN, currency, security questions, etc.)
  database.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Accounts table
  database.execSync(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Transactions table
  // Always check columns and recreate if schema is outdated
  const txCols = database.getAllSync(`PRAGMA table_info(transactions)`);
  const colNames = txCols.map(c => c.name);
  const hasParticular = colNames.includes('particular');
  const hasEvent      = colNames.includes('event');

  if (!hasParticular || !hasEvent) {
    // Schema is outdated — drop and recreate with full schema
    database.execSync(`DROP TABLE IF EXISTS transactions;`);
  }

  database.execSync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      particular TEXT NOT NULL,
      event TEXT,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );
  `);

  // Events table — user-defined event tags for transactions
  database.execSync(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add price column to events if it doesn't exist yet
  const eventCols = database.getAllSync(`PRAGMA table_info(events)`);
  const eventColNames = eventCols.map(c => c.name);
  if (!eventColNames.includes('price')) {
    database.execSync(`ALTER TABLE events ADD COLUMN price REAL;`);
  }

  // Seed default events if table is empty
  const eventCount = database.getFirstSync(`SELECT COUNT(*) as cnt FROM events`);
  if (!eventCount || eventCount.cnt === 0) {
    const defaults = ['Wedding Shoot', 'Birthday Shoot', 'Advertisement Shoot', 'Content Shoot'];
    for (const name of defaults) {
      database.runSync(`INSERT OR IGNORE INTO events (name) VALUES (?)`, [name]);
    }
  }

  // Seed default currency if not set
  const currencySetting = database.getFirstSync(`SELECT value FROM settings WHERE key = 'currency_symbol'`);
  if (!currencySetting) {
    database.runSync(`INSERT INTO settings (key, value) VALUES ('currency_symbol', '₹')`);
    database.runSync(`INSERT INTO settings (key, value) VALUES ('currency_code', 'INR')`);
  }

  // Seed default app settings if not set
  const defaults = [
    ['tx_sort',          'desc'],   // 'desc' = newest first, 'asc' = oldest first
    ['account_sort',     'recent'], // 'recent' | 'name' | 'balance'
    ['backup_reminder',  'off'],    // 'off' | 'daily' | 'weekly' | 'monthly'
    ['last_backup_date', ''],       // ISO date string of last backup
    ['default_tx_type',  'credit'], // 'credit' | 'debit'
  ];
  for (const [key, value] of defaults) {
    const exists = database.getFirstSync(`SELECT value FROM settings WHERE key = ?`, [key]);
    if (!exists) {
      database.runSync(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    }
  }
};
