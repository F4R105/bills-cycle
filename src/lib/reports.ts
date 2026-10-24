/** Pure aggregations for the Reports screen and its CSV export. */

import { computeCycle, cycleMonthLabel, indexPayments, recordKey } from './budget';
import { maxDate, occurrencesBetween, type ISODate } from './dates';
import type { Bill, Cycle, Income, Payment } from './types';

/** How many recent cycles the trend chart shows. */
export const TREND_CYCLES = 6;
const TOP_BILLS = 5;

export type CycleTrend = {
  id: number;
  label: string;
  income: number;
  paid: number;
  totalBills: number;
  balance: number;
};

export type Attendance = {
  onTime: number;
  late: number;
  skipped: number;
  unattended: number;
  /** Due in the current cycle and not attended yet. */
  pending: number;
};

export type Report = {
  commitment: { essential: number; optional: number; total: number };
  trend: CycleTrend[];
  attendance: Attendance;
  topBills: { bill: Bill; paid: number; share: number }[];
  savedBySkipping: number;
  carriedDebt: number;
  totalPaid: number;
  totalIncome: number;
};

type Input = {
  cycles: Cycle[];
  incomes: Income[];
  bills: Bill[];
  payments: Payment[];
  today: ISODate;
  trackingStart: ISODate | null;
};

export function buildReport({ cycles, incomes, bills, payments, today, trackingStart }: Input): Report {
  const active = bills.filter((b) => b.active);
  const essential = active.filter((b) => b.isEssential).reduce((s, b) => s + b.amountCents, 0);
  const optional = active.filter((b) => !b.isEssential).reduce((s, b) => s + b.amountCents, 0);

  const summarize = (cycle: Cycle) =>
    computeCycle({
      cycle,
      incomes: incomes.filter((i) => i.cycleId === cycle.id),
      bills,
      payments,
      today,
      trackingStart: trackingStart ?? cycle.startDate,
    });

  const ordered = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const trend = ordered.slice(-TREND_CYCLES).map((cycle) => {
    const s = summarize(cycle);
    return {
      id: cycle.id,
      label: cycleMonthLabel(cycle),
      income: s.income,
      paid: s.paid,
      totalBills: s.totalBills,
      balance: s.remaining,
    };
  });

  const current = cycles.find((c) => c.endedOn == null) ?? null;
  const currentSummary = current ? summarize(current) : null;
  const carriedDebt = currentSummary?.carriedOver.reduce((s, o) => s + o.bill.amountCents, 0) ?? 0;

  // Attendance over every occurrence since tracking began.
  const attendance: Attendance = { onTime: 0, late: 0, skipped: 0, unattended: 0, pending: 0 };
  const records = indexPayments(payments);
  if (trackingStart) {
    for (const bill of bills) {
      for (const dueDate of occurrencesBetween(bill.dueDay, bill.startDate, maxDate(trackingStart, bill.startDate), today)) {
        const record = records.get(recordKey(bill.id, dueDate));
        if (record?.status === 'paid') attendance[record.paidOn <= dueDate ? 'onTime' : 'late']++;
        else if (record?.status === 'skipped') attendance.skipped++;
        else if (!bill.active) continue;
        else if (current && dueDate >= current.startDate) attendance.pending++;
        else attendance.unattended++;
      }
    }
  }

  const paidByBill = new Map<number, number>();
  let savedBySkipping = 0;
  const billsById = new Map(bills.map((b) => [b.id, b]));
  for (const p of payments) {
    if (p.status === 'paid') paidByBill.set(p.billId, (paidByBill.get(p.billId) ?? 0) + p.amountCents);
    else savedBySkipping += billsById.get(p.billId)?.amountCents ?? 0;
  }
  const totalPaid = [...paidByBill.values()].reduce((s, v) => s + v, 0);
  const topBills = [...paidByBill.entries()]
    .filter(([id]) => billsById.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_BILLS)
    .map(([id, paid]) => ({ bill: billsById.get(id)!, paid, share: totalPaid ? paid / totalPaid : 0 }));

  return {
    commitment: { essential, optional, total: essential + optional },
    trend,
    attendance,
    topBills,
    savedBySkipping,
    carriedDebt,
    totalPaid,
    totalIncome: incomes.reduce((s, i) => s + i.amountCents, 0),
  };
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** One row per bill occurrence in each cycle, plus income rows. Amounts are whole TZS. */
export function buildCsv({ cycles, incomes, bills, payments, today, trackingStart }: Input): string {
  const rows: (string | number)[][] = [
    ['Cycle', 'Type', 'Name', 'Category', 'Due date', 'Status', 'Amount (TZS)', 'Paid on', 'Note'],
  ];
  const ordered = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const cycle of ordered) {
    const label = cycleMonthLabel(cycle);
    const cycleIncomes = incomes.filter((i) => i.cycleId === cycle.id);
    for (const income of cycleIncomes) {
      rows.push([label, 'Income', income.note ?? 'Income', '', income.receivedOn, 'Received', income.amountCents / 100, '', '']);
    }
    const summary = computeCycle({
      cycle,
      incomes: cycleIncomes,
      bills,
      payments,
      today,
      trackingStart: trackingStart ?? cycle.startDate,
    });
    for (const { bill, dueDate, record } of summary.items) {
      const status = record ? (record.status === 'paid' ? 'Paid' : 'Skipped') : cycle.endedOn ? 'Unattended' : 'Due';
      rows.push([
        label,
        'Bill',
        bill.name,
        bill.isEssential ? 'Essential' : 'Optional',
        dueDate,
        status,
        (record?.status === 'paid' ? record.amountCents : record ? 0 : bill.amountCents) / 100,
        record?.status === 'paid' ? record.paidOn : '',
        record?.note ?? '',
      ]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
