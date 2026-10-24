import {
  addDays,
  addMonths,
  daysBetween,
  formatDate,
  maxDate,
  nextOccurrence,
  occurrencesBetween,
  type ISODate,
} from './dates';
import type { Bill, Cycle, Income, Payment } from './types';

/** How far back unattended essential bills are carried over. */
const CARRY_OVER_MONTHS = 12;
/** How far back a bill's history is listed. */
const HISTORY_MONTHS = 24;

export type Occurrence = {
  bill: Bill;
  dueDate: ISODate;
  record?: Payment;
};

export type CycleSummary = {
  range: { start: ISODate; end: ISODate };
  income: number;
  /** Occurrences due inside the cycle range, ascending by due date. */
  items: Occurrence[];
  /** Unpaid essential occurrences from before the cycle start. */
  carriedOver: Occurrence[];
  /** Earlier occurrences settled (paid) during this cycle. */
  lateSettled: Occurrence[];
  totalBills: number;
  paid: number;
  outstanding: number;
  /** Income minus everything this cycle has to cover. */
  remaining: number;
};

export const recordKey = (billId: number, dueDate: ISODate) => `${billId}|${dueDate}`;

export function indexPayments(payments: Payment[]): Map<string, Payment> {
  return new Map(payments.map((p) => [recordKey(p.billId, p.dueDate), p]));
}

/**
 * Cycles that should follow `open` so that one covers `today`: each starts the day after the
 * previous planned end and lasts `months`. Empty when `open` still covers today.
 */
export function nextCycles(
  open: Pick<Cycle, 'plannedEnd'>,
  today: ISODate,
  months: number
): { startDate: ISODate; plannedEnd: ISODate }[] {
  const result: { startDate: ISODate; plannedEnd: ISODate }[] = [];
  let end = open.plannedEnd;
  while (end < today) {
    const startDate = addDays(end, 1);
    end = defaultPlannedEnd(startDate, months);
    result.push({ startDate, plannedEnd: end });
  }
  return result;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Month-based name for a cycle, e.g. "Oct – Nov 2026", "Dec 2026 – Jan 2027", "Feb 2026". */
export function cycleMonthLabel(cycle: Pick<Cycle, 'startDate' | 'plannedEnd' | 'endedOn'>): string {
  const [sy, sm] = cycle.startDate.split('-').map(Number);
  const [ey, em] = (cycle.endedOn ?? cycle.plannedEnd).split('-').map(Number);
  const start = MONTHS[sm - 1];
  const end = MONTHS[em - 1];
  if (sy === ey && sm === em) return `${start} ${sy}`;
  if (sy === ey) return `${start} – ${end} ${sy}`;
  return `${start} ${sy} – ${end} ${ey}`;
}

/**
 * An open cycle normally ends at its planned end (cycles roll over automatically). It still
 * stretches to today as a safety net, so bills are never hidden before roll-over has run.
 */
export function cycleRange(cycle: Cycle, today: ISODate): { start: ISODate; end: ISODate } {
  return {
    start: cycle.startDate,
    end: cycle.endedOn ?? maxDate(cycle.plannedEnd, today),
  };
}

/** e.g. "23 Oct – 22 Nov 2026". */
export function cycleLabel(cycle: Cycle): string {
  const end = cycle.endedOn ?? cycle.plannedEnd;
  return `${formatDate(cycle.startDate, { withYear: false })} – ${formatDate(end)}`;
}

/** Default planned end for a cycle starting on `start`. */
export function defaultPlannedEnd(start: ISODate, months: number): ISODate {
  return addDays(addMonths(start, months), -1);
}

const amountOf = (o: Occurrence) =>
  o.record ? (o.record.status === 'paid' ? o.record.amountCents : 0) : o.bill.amountCents;

export function computeCycle({
  cycle,
  incomes,
  bills,
  payments,
  today,
  trackingStart = cycle.startDate,
}: {
  cycle: Cycle;
  /** Incomes belonging to this cycle. */
  incomes: Income[];
  bills: Bill[];
  payments: Payment[];
  today: ISODate;
  /** Start of the first cycle; nothing before it is carried over. */
  trackingStart?: ISODate;
}): CycleSummary {
  const range = cycleRange(cycle, today);
  const records = indexPayments(payments);

  const items: Occurrence[] = [];
  const carriedOver: Occurrence[] = [];
  const carryFrom = maxDate(trackingStart, addMonths(range.start, -CARRY_OVER_MONTHS));
  const carryTo = addDays(range.start, -1);

  for (const bill of bills) {
    for (const dueDate of occurrencesBetween(bill.dueDay, bill.startDate, range.start, range.end)) {
      const record = records.get(recordKey(bill.id, dueDate));
      // Paused bills only show what was already attended.
      if (bill.active || record) items.push({ bill, dueDate, record });
    }
    if (bill.active && bill.isEssential && !cycle.endedOn) {
      for (const dueDate of occurrencesBetween(bill.dueDay, bill.startDate, carryFrom, carryTo)) {
        if (!records.has(recordKey(bill.id, dueDate))) carriedOver.push({ bill, dueDate });
      }
    }
  }

  const billsById = new Map(bills.map((b) => [b.id, b]));
  const lateSettled: Occurrence[] = payments
    .filter(
      (p) =>
        p.status === 'paid' &&
        p.dueDate < range.start &&
        p.paidOn >= range.start &&
        p.paidOn <= range.end &&
        billsById.has(p.billId)
    )
    .map((p) => ({ bill: billsById.get(p.billId)!, dueDate: p.dueDate, record: p }));

  const byDue = (a: Occurrence, b: Occurrence) =>
    a.dueDate.localeCompare(b.dueDate) || a.bill.name.localeCompare(b.bill.name);
  items.sort(byDue);
  carriedOver.sort(byDue);
  lateSettled.sort(byDue);

  const sum = (list: Occurrence[], pick: (o: Occurrence) => number) =>
    list.reduce((total, o) => total + pick(o), 0);

  const income = incomes.reduce((total, i) => total + i.amountCents, 0);
  const totalBills = sum(items, amountOf) + sum(carriedOver, amountOf) + sum(lateSettled, amountOf);
  const paid =
    sum(items, (o) => (o.record?.status === 'paid' ? o.record.amountCents : 0)) +
    sum(lateSettled, amountOf);
  const outstanding =
    sum(
      items.filter((o) => !o.record),
      amountOf
    ) + sum(carriedOver, amountOf);

  return {
    range,
    income,
    items,
    carriedOver,
    lateSettled,
    totalBills,
    paid,
    outstanding,
    remaining: income - totalBills,
  };
}

export type HistoryStatus = 'paid' | 'skipped' | 'unattended' | 'due' | 'upcoming';

export type HistoryEntry = {
  dueDate: ISODate;
  status: HistoryStatus;
  record?: Payment;
};

/**
 * Every month of a bill, newest first, including the next upcoming one.
 * Occurrences before the current cycle with no record are "unattended".
 */
export function billHistory(
  bill: Bill,
  payments: Payment[],
  {
    today,
    currentCycleStart,
    trackingStart,
  }: { today: ISODate; currentCycleStart: ISODate | null; trackingStart: ISODate | null }
): HistoryEntry[] {
  const records = new Map(
    payments.filter((p) => p.billId === bill.id).map((p) => [p.dueDate, p] as const)
  );
  const from = maxDate(
    maxDate(bill.startDate, trackingStart ?? bill.startDate),
    addMonths(today, -HISTORY_MONTHS)
  );
  const dates = new Set(occurrencesBetween(bill.dueDay, bill.startDate, from, today));
  if (bill.active) dates.add(nextOccurrence(bill.dueDay, bill.startDate, addDays(today, 1)));
  for (const dueDate of records.keys()) dates.add(dueDate);

  const cutoff = currentCycleStart ?? today;
  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((dueDate) => {
      const record = records.get(dueDate);
      if (record) return { dueDate, status: record.status, record };
      if (dueDate > today) return { dueDate, status: 'upcoming' as const };
      if (dueDate < cutoff) return { dueDate, status: 'unattended' as const };
      return { dueDate, status: 'due' as const };
    });
}

export function dueLabel(dueDate: ISODate, today: ISODate): string {
  const days = daysBetween(today, dueDate);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  return 'Due date passed';
}
