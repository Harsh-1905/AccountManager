import { getDatabase } from './db';

// ─── EVENTS ──────────────────────────────────────────────────────────────────

export const getAllEvents = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM events ORDER BY name ASC`);
};

export const createEvent = (name, price = null) => {
  const db = getDatabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Event name cannot be empty.');
  const priceValue = price !== null && price !== '' ? parseFloat(price) : null;
  const result = db.runSync(
    `INSERT INTO events (name, price) VALUES (?, ?)`,
    [trimmed, priceValue]
  );
  return result.lastInsertRowId;
};

export const deleteEvent = (id) => {
  const db = getDatabase();
  db.runSync(`DELETE FROM events WHERE id = ?`, [id]);
};

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export const getSetting = (key) => {
  const db = getDatabase();
  const row = db.getFirstSync(`SELECT value FROM settings WHERE key = ?`, [key]);
  return row ? row.value : null;
};

export const setSetting = (key, value) => {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
};

export const deleteSetting = (key) => {
  const db = getDatabase();
  db.runSync(`DELETE FROM settings WHERE key = ?`, [key]);
};

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────

export const getAllAccounts = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM accounts ORDER BY created_at ASC`);
};

export const getAccountById = (id) => {
  const db = getDatabase();
  return db.getFirstSync(`SELECT * FROM accounts WHERE id = ?`, [id]);
};

export const createAccount = (name) => {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO accounts (name) VALUES (?)`,
    [name]
  );
  return result.lastInsertRowId;
};

export const updateAccount = (id, name) => {
  const db = getDatabase();
  db.runSync(`UPDATE accounts SET name = ? WHERE id = ?`, [name, id]);
};

export const deleteAccount = (id) => {
  const db = getDatabase();
  db.runSync(`DELETE FROM transactions WHERE account_id = ?`, [id]);
  db.runSync(`DELETE FROM accounts WHERE id = ?`, [id]);
};

// ─── ACCOUNT BALANCES ────────────────────────────────────────────────────────

export const getAccountSummary = (accountId) => {
  const db = getDatabase();
  const result = db.getFirstSync(
    `SELECT
       COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END), 0) as total_credit,
       COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END), 0) as total_debit
     FROM transactions WHERE account_id = ?`,
    [accountId]
  );
  const credit = result?.total_credit ?? 0;
  const debit = result?.total_debit ?? 0;
  return { credit, debit, balance: credit - debit };
};

export const getAllAccountsWithSummary = () => {
  const db = getDatabase();
  return db.getAllSync(
    `SELECT 
       a.*,
       COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount ELSE 0 END), 0) as total_credit,
       COALESCE(SUM(CASE WHEN t.type='debit' THEN t.amount ELSE 0 END), 0) as total_debit,
       COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount ELSE -t.amount END), 0) as balance
     FROM accounts a
     LEFT JOIN transactions t ON t.account_id = a.id
     GROUP BY a.id
     ORDER BY a.created_at ASC`
  );
};

export const getOverallSummary = () => {
  const db = getDatabase();
  const result = db.getFirstSync(
    `SELECT
       COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END), 0) as total_credit,
       COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END), 0) as total_debit
     FROM transactions`
  );
  const credit = result?.total_credit ?? 0;
  const debit = result?.total_debit ?? 0;
  return { credit, debit, balance: credit - debit };
};

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export const getTransactionsByAccount = (accountId, sortOrder = 'desc') => {
  const db = getDatabase();
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return db.getAllSync(
    `SELECT * FROM transactions WHERE account_id = ? ORDER BY date ${order}, created_at ${order}`,
    [accountId]
  );
};

export const createTransaction = (accountId, particular, event, amount, type, date) => {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO transactions (account_id, particular, event, amount, type, date) VALUES (?, ?, ?, ?, ?, ?)`,
    [accountId, particular, event || null, amount, type, date]
  );
  return result.lastInsertRowId;
};

export const updateTransaction = (id, particular, event, amount, type, date) => {
  const db = getDatabase();
  db.runSync(
    `UPDATE transactions SET particular = ?, event = ?, amount = ?, type = ?, date = ? WHERE id = ?`,
    [particular, event || null, amount, type, date, id]
  );
};

export const deleteTransaction = (id) => {
  const db = getDatabase();
  db.runSync(`DELETE FROM transactions WHERE id = ?`, [id]);
};

// ─── REPORTS ─────────────────────────────────────────────────────────────────

export const getReportData = () => {
  const db = getDatabase();
  return db.getAllSync(
    `SELECT 
       a.id,
       a.name,
       COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount ELSE 0 END), 0) as total_credit,
       COALESCE(SUM(CASE WHEN t.type='debit' THEN t.amount ELSE 0 END), 0) as total_debit,
       COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount ELSE -t.amount END), 0) as balance
     FROM accounts a
     LEFT JOIN transactions t ON t.account_id = a.id
     GROUP BY a.id
     ORDER BY a.name ASC`
  );
};

// ─── BACKUP / RESTORE ────────────────────────────────────────────────────────

export const exportAllData = () => {
  const db = getDatabase();
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    settings: db.getAllSync(`SELECT key, value FROM settings`),
    accounts: db.getAllSync(`SELECT * FROM accounts`),
    transactions: db.getAllSync(`SELECT * FROM transactions`),
  };
};

export const importData = (data) => {
  const db = getDatabase();
  let accountsImported = 0;
  let transactionsImported = 0;

  db.withTransactionSync(() => {
    // Restore settings (only non-sensitive keys)
    if (Array.isArray(data.settings)) {
      for (const s of data.settings) {
        if (['currency_symbol', 'currency_code'].includes(s.key)) {
          db.runSync(
            `INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            [s.key, s.value]
          );
        }
      }
    }

    // Restore accounts — skip if ID already exists
    if (Array.isArray(data.accounts)) {
      for (const a of data.accounts) {
        const exists = db.getFirstSync(`SELECT id FROM accounts WHERE id = ?`, [a.id]);
        if (!exists) {
          db.runSync(
            `INSERT INTO accounts (id, name, created_at) VALUES (?, ?, ?)`,
            [a.id, a.name, a.created_at]
          );
          accountsImported++;
        }
      }
    }

    // Restore transactions — skip if ID already exists
    if (Array.isArray(data.transactions)) {
      for (const t of data.transactions) {
        const exists = db.getFirstSync(`SELECT id FROM transactions WHERE id = ?`, [t.id]);
        if (!exists) {
          db.runSync(
            `INSERT INTO transactions (id, account_id, particular, event, amount, type, date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [t.id, t.account_id, t.particular, t.event ?? null,
             t.amount, t.type, t.date, t.created_at]
          );
          transactionsImported++;
        }
      }
    }
  });

  return { accountsImported, transactionsImported };
};
