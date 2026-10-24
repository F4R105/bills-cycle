import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'bills.db';
const DATABASE_VERSION = 2;

/** Runs pending migrations. Passed to `SQLiteProvider onInit`. */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE cycles (
        id INTEGER PRIMARY KEY NOT NULL,
        start_date TEXT NOT NULL,
        planned_end TEXT NOT NULL,
        ended_on TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE incomes (
        id INTEGER PRIMARY KEY NOT NULL,
        cycle_id INTEGER REFERENCES cycles(id) ON DELETE SET NULL,
        amount_cents INTEGER NOT NULL,
        received_on TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE bills (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
        is_essential INTEGER NOT NULL DEFAULT 1,
        start_date TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE payments (
        id INTEGER PRIMARY KEY NOT NULL,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('paid', 'skipped')),
        amount_cents INTEGER NOT NULL DEFAULT 0,
        paid_on TEXT NOT NULL,
        note TEXT,
        UNIQUE (bill_id, due_date)
      );
      CREATE INDEX incomes_cycle ON incomes (cycle_id);
      CREATE INDEX payments_bill ON payments (bill_id);
    `);
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    // Cycles now roll over monthly on their own; flag the ones the app created.
    await db.execAsync('ALTER TABLE cycles ADD COLUMN auto_started INTEGER NOT NULL DEFAULT 0');
    currentVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
