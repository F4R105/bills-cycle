import type { SQLiteDatabase } from 'expo-sqlite';

import { nextCycles } from '@/lib/budget';
import { addDays, type ISODate } from '@/lib/dates';
import type { Bill, Cycle, Income, Payment, PaymentStatus } from '@/lib/types';

const now = () => new Date().toISOString();

// ---- Bills ----

type BillRow = Omit<Bill, 'isEssential' | 'active'> & { isEssential: number; active: number };

const BILL_COLUMNS = `id, name, amount_cents AS amountCents, due_day AS dueDay, is_essential AS isEssential,
  start_date AS startDate, active, notes`;

const toBill = (row: BillRow): Bill => ({
  ...row,
  isEssential: row.isEssential === 1,
  active: row.active === 1,
});

export async function listBills(db: SQLiteDatabase): Promise<Bill[]> {
  const rows = await db.getAllAsync<BillRow>(
    `SELECT ${BILL_COLUMNS} FROM bills ORDER BY active DESC, due_day, name COLLATE NOCASE`
  );
  return rows.map(toBill);
}

export async function getBill(db: SQLiteDatabase, id: number): Promise<Bill | null> {
  const row = await db.getFirstAsync<BillRow>(`SELECT ${BILL_COLUMNS} FROM bills WHERE id = ?`, id);
  return row ? toBill(row) : null;
}

export type BillInput = Omit<Bill, 'id'>;

export async function saveBill(db: SQLiteDatabase, input: BillInput, id?: number): Promise<number> {
  const params = [
    input.name,
    input.amountCents,
    input.dueDay,
    input.isEssential ? 1 : 0,
    input.startDate,
    input.active ? 1 : 0,
    input.notes,
  ];
  if (id != null) {
    await db.runAsync(
      `UPDATE bills SET name = ?, amount_cents = ?, due_day = ?, is_essential = ?, start_date = ?,
        active = ?, notes = ? WHERE id = ?`,
      ...params,
      id
    );
    return id;
  }
  const result = await db.runAsync(
    `INSERT INTO bills (name, amount_cents, due_day, is_essential, start_date, active, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ...params,
    now()
  );
  return result.lastInsertRowId;
}

export async function setBillActive(db: SQLiteDatabase, id: number, active: boolean) {
  await db.runAsync('UPDATE bills SET active = ? WHERE id = ?', active ? 1 : 0, id);
}

export async function deleteBill(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM bills WHERE id = ?', id);
}

// ---- Payments ----

const PAYMENT_COLUMNS = `id, bill_id AS billId, due_date AS dueDate, status, amount_cents AS amountCents,
  paid_on AS paidOn, note`;

export async function listPayments(db: SQLiteDatabase): Promise<Payment[]> {
  return db.getAllAsync<Payment>(`SELECT ${PAYMENT_COLUMNS} FROM payments ORDER BY due_date DESC`);
}

export async function paymentsForBill(db: SQLiteDatabase, billId: number): Promise<Payment[]> {
  return db.getAllAsync<Payment>(
    `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE bill_id = ? ORDER BY due_date DESC`,
    billId
  );
}

/** Marks one occurrence as paid or skipped, replacing any existing record for it. */
export async function recordPayment(
  db: SQLiteDatabase,
  input: {
    billId: number;
    dueDate: ISODate;
    status: PaymentStatus;
    amountCents: number;
    paidOn: ISODate;
    note?: string | null;
  }
) {
  await db.runAsync(
    `INSERT INTO payments (bill_id, due_date, status, amount_cents, paid_on, note)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (bill_id, due_date) DO UPDATE SET
        status = excluded.status, amount_cents = excluded.amount_cents,
        paid_on = excluded.paid_on, note = excluded.note`,
    input.billId,
    input.dueDate,
    input.status,
    input.status === 'paid' ? input.amountCents : 0,
    input.paidOn,
    input.note ?? null
  );
}

export async function undoPayment(db: SQLiteDatabase, billId: number, dueDate: ISODate) {
  await db.runAsync('DELETE FROM payments WHERE bill_id = ? AND due_date = ?', billId, dueDate);
}

// ---- Cycles ----

type CycleRow = Omit<Cycle, 'autoStarted'> & { autoStarted: number };

const CYCLE_COLUMNS = `id, start_date AS startDate, planned_end AS plannedEnd, ended_on AS endedOn,
  auto_started AS autoStarted, note`;

const toCycle = (row: CycleRow): Cycle => ({ ...row, autoStarted: row.autoStarted === 1 });

export async function listCycles(db: SQLiteDatabase): Promise<Cycle[]> {
  const rows = await db.getAllAsync<CycleRow>(`SELECT ${CYCLE_COLUMNS} FROM cycles ORDER BY start_date DESC`);
  return rows.map(toCycle);
}

export async function getCycle(db: SQLiteDatabase, id: number): Promise<Cycle | null> {
  const row = await db.getFirstAsync<CycleRow>(`SELECT ${CYCLE_COLUMNS} FROM cycles WHERE id = ?`, id);
  return row ? toCycle(row) : null;
}

export async function getCurrentCycle(db: SQLiteDatabase): Promise<Cycle | null> {
  const row = await db.getFirstAsync<CycleRow>(
    `SELECT ${CYCLE_COLUMNS} FROM cycles WHERE ended_on IS NULL ORDER BY start_date DESC LIMIT 1`
  );
  return row ? toCycle(row) : null;
}

/** The cycle that ended right before `cycle` started, if any. */
export async function getPreviousCycle(db: SQLiteDatabase, cycle: Cycle): Promise<Cycle | null> {
  const row = await db.getFirstAsync<CycleRow>(
    `SELECT ${CYCLE_COLUMNS} FROM cycles WHERE start_date < ? ORDER BY start_date DESC LIMIT 1`,
    cycle.startDate
  );
  return row ? toCycle(row) : null;
}

/** Start of the first cycle: the point from which unattended bills are tracked. */
export async function getTrackingStart(db: SQLiteDatabase): Promise<ISODate | null> {
  const row = await db.getFirstAsync<{ start: ISODate | null }>(
    'SELECT MIN(start_date) AS start FROM cycles'
  );
  return row?.start ?? null;
}

let rollOver: Promise<number> | null = null;

/**
 * Rolls the open cycle over month by month until one covers `today`.
 * Returns how many cycles were created. Concurrent calls share one run.
 */
export function ensureCurrentCycle(db: SQLiteDatabase, today: ISODate, months: number): Promise<number> {
  rollOver ??= (async () => {
    const open = await getCurrentCycle(db);
    const next = open ? nextCycles(open, today, months) : [];
    if (!open || next.length === 0) return 0;
    await db.withTransactionAsync(async () => {
      let previousEnd = open.plannedEnd;
      let previousId = open.id;
      for (const cycle of next) {
        await db.runAsync('UPDATE cycles SET ended_on = ? WHERE id = ?', previousEnd, previousId);
        const result = await db.runAsync(
          'INSERT INTO cycles (start_date, planned_end, auto_started, created_at) VALUES (?, ?, 1, ?)',
          cycle.startDate,
          cycle.plannedEnd,
          now()
        );
        previousEnd = cycle.plannedEnd;
        previousId = result.lastInsertRowId;
      }
    });
    return next.length;
  })().finally(() => {
    rollOver = null;
  });
  return rollOver;
}

/** Closes the open cycle (if any) the day before `startDate`, opens a new one, and optionally adds income. */
export async function startCycle(
  db: SQLiteDatabase,
  input: {
    startDate: ISODate;
    plannedEnd: ISODate;
    closeOpenOn: ISODate;
    income?: { amountCents: number; note: string | null } | null;
  }
): Promise<number> {
  let cycleId = 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE cycles SET ended_on = ? WHERE ended_on IS NULL', input.closeOpenOn);
    const result = await db.runAsync(
      'INSERT INTO cycles (start_date, planned_end, created_at) VALUES (?, ?, ?)',
      input.startDate,
      input.plannedEnd,
      now()
    );
    cycleId = result.lastInsertRowId;
    if (input.income) await insertIncome(db, cycleId, input.income, input.startDate);
  });
  return cycleId;
}

/**
 * Late salary: moves the start of an auto-started cycle to `newStart` (and its planned end with
 * it), extending the previous cycle to the day before. Optionally records the income.
 */
export async function shiftCycleStart(
  db: SQLiteDatabase,
  input: {
    cycle: Cycle;
    newStart: ISODate;
    plannedEnd: ISODate;
    income?: { amountCents: number; note: string | null } | null;
  }
) {
  const previous = await getPreviousCycle(db, input.cycle);
  await db.withTransactionAsync(async () => {
    if (previous) {
      await db.runAsync('UPDATE cycles SET ended_on = ? WHERE id = ?', addDays(input.newStart, -1), previous.id);
    }
    await db.runAsync(
      'UPDATE cycles SET start_date = ?, planned_end = ?, auto_started = 0 WHERE id = ?',
      input.newStart,
      input.plannedEnd,
      input.cycle.id
    );
    if (input.income) await insertIncome(db, input.cycle.id, input.income, input.newStart);
  });
}

async function insertIncome(
  db: SQLiteDatabase,
  cycleId: number,
  income: { amountCents: number; note: string | null },
  receivedOn: ISODate
) {
  await db.runAsync(
    'INSERT INTO incomes (cycle_id, amount_cents, received_on, note, created_at) VALUES (?, ?, ?, ?, ?)',
    cycleId,
    income.amountCents,
    receivedOn,
    income.note,
    now()
  );
}

// ---- Incomes ----

const INCOME_COLUMNS = `id, cycle_id AS cycleId, amount_cents AS amountCents, received_on AS receivedOn, note`;

export async function listIncomes(db: SQLiteDatabase): Promise<Income[]> {
  return db.getAllAsync<Income>(
    `SELECT ${INCOME_COLUMNS} FROM incomes ORDER BY received_on DESC, id DESC`
  );
}

export async function incomesForCycle(db: SQLiteDatabase, cycleId: number): Promise<Income[]> {
  return db.getAllAsync<Income>(
    `SELECT ${INCOME_COLUMNS} FROM incomes WHERE cycle_id = ? ORDER BY received_on`,
    cycleId
  );
}

export async function getIncome(db: SQLiteDatabase, id: number): Promise<Income | null> {
  return db.getFirstAsync<Income>(`SELECT ${INCOME_COLUMNS} FROM incomes WHERE id = ?`, id);
}

export type IncomeInput = Omit<Income, 'id'>;

export async function saveIncome(db: SQLiteDatabase, input: IncomeInput, id?: number) {
  if (id != null) {
    await db.runAsync(
      'UPDATE incomes SET cycle_id = ?, amount_cents = ?, received_on = ?, note = ? WHERE id = ?',
      input.cycleId,
      input.amountCents,
      input.receivedOn,
      input.note,
      id
    );
    return;
  }
  await db.runAsync(
    'INSERT INTO incomes (cycle_id, amount_cents, received_on, note, created_at) VALUES (?, ?, ?, ?, ?)',
    input.cycleId,
    input.amountCents,
    input.receivedOn,
    input.note,
    now()
  );
}

export async function deleteIncome(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM incomes WHERE id = ?', id);
}

// ---- Settings ----

export async function getAllSettings(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}

// ---- Danger zone ----

export async function deleteAllData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      'DELETE FROM payments; DELETE FROM incomes; DELETE FROM bills; DELETE FROM cycles; DELETE FROM settings;'
    );
  });
}
