import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

const BACKUP_FORMAT = 'subscription-tracker-backup';
const BACKUP_VERSION = 1;

/** Tables in insert order (parents before children) with the columns a backup carries. */
const TABLES = {
  settings: ['key', 'value'],
  cycles: ['id', 'start_date', 'planned_end', 'ended_on', 'auto_started', 'note', 'created_at'],
  incomes: ['id', 'cycle_id', 'amount_cents', 'received_on', 'note', 'created_at'],
  bills: [
    'id',
    'name',
    'amount_cents',
    'due_day',
    'is_essential',
    'start_date',
    'active',
    'notes',
    'created_at',
  ],
  payments: ['id', 'bill_id', 'due_date', 'status', 'amount_cents', 'paid_on', 'note'],
} as const;

type TableName = keyof typeof TABLES;

/** Values for columns that older backups don't have. */
const COLUMN_DEFAULTS: Record<string, SQLiteBindValue> = { auto_started: 0 };
type Row = Record<string, SQLiteBindValue>;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: Record<TableName, Row[]>;
};

export async function exportData(db: SQLiteDatabase): Promise<Backup> {
  const data = {} as Record<TableName, Row[]>;
  for (const [table, columns] of Object.entries(TABLES) as [TableName, readonly string[]][]) {
    data[table] = await db.getAllAsync<Row>(`SELECT ${columns.join(', ')} FROM ${table}`);
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

/** Validates a parsed backup file; throws a user-readable error if it isn't one. */
export function parseBackup(json: unknown): Backup {
  const backup = json as Partial<Backup> | null;
  if (!backup || backup.format !== BACKUP_FORMAT || typeof backup.data !== 'object') {
    throw new Error("This file isn't a Subscription Tracker backup.");
  }
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  for (const table of Object.keys(TABLES)) {
    if (!Array.isArray(backup.data?.[table as TableName])) {
      throw new Error(`The backup is missing its "${table}" data.`);
    }
  }
  return backup as Backup;
}

/** Replaces all current data with the backup's contents, atomically. */
export async function importData(db: SQLiteDatabase, backup: Backup) {
  await db.withTransactionAsync(async () => {
    for (const table of (Object.keys(TABLES) as TableName[]).reverse()) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    for (const [table, columns] of Object.entries(TABLES) as [TableName, readonly string[]][]) {
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
      for (const row of backup.data[table]) {
        await db.runAsync(sql, columns.map((c) => row[c] ?? COLUMN_DEFAULTS[c] ?? null));
      }
    }
  });
}
