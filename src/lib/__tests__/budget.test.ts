import {
  billHistory,
  computeCycle,
  cycleMonthLabel,
  cycleRange,
  defaultPlannedEnd,
  dueLabel,
  nextCycles,
} from '../budget';
import type { Bill, Cycle, Payment } from '../types';

const bill = (overrides: Partial<Bill> & Pick<Bill, 'id' | 'dueDay'>): Bill => ({
  name: `Bill ${overrides.id}`,
  amountCents: 1000,
  isEssential: true,
  startDate: '2026-01-01',
  active: true,
  notes: null,
  ...overrides,
});

const payment = (
  overrides: Partial<Payment> & Pick<Payment, 'billId' | 'dueDate'>
): Payment => ({
  id: Math.floor(Math.random() * 1e9),
  status: 'paid',
  amountCents: 1000,
  paidOn: overrides.dueDate,
  note: null,
  ...overrides,
});

const openCycle: Cycle = {
  id: 2,
  startDate: '2026-10-23',
  plannedEnd: '2026-11-22',
  endedOn: null,
  autoStarted: false,
  note: null,
};

describe('cycleRange', () => {
  it('uses the planned end while it is in the future', () => {
    expect(cycleRange(openCycle, '2026-11-01')).toEqual({
      start: '2026-10-23',
      end: '2026-11-22',
    });
  });

  it('extends an open cycle to today when the planned end has passed', () => {
    expect(cycleRange(openCycle, '2026-11-25').end).toBe('2026-11-25');
  });

  it('uses ended_on for closed cycles', () => {
    expect(cycleRange({ ...openCycle, endedOn: '2026-11-20' }, '2027-01-01').end).toBe(
      '2026-11-20'
    );
  });

  it('defaults the planned end to one month minus a day', () => {
    expect(defaultPlannedEnd('2026-10-23', 1)).toBe('2026-11-22');
    expect(defaultPlannedEnd('2026-01-31', 1)).toBe('2026-02-27');
  });
});

describe('computeCycle', () => {
  const today = '2026-11-01';

  it('totals bills due in the cycle and subtracts them from income', () => {
    const summary = computeCycle({
      cycle: openCycle,
      incomes: [{ id: 1, cycleId: 2, amountCents: 100_000, receivedOn: '2026-10-23', note: null }],
      bills: [bill({ id: 1, dueDay: 25 }), bill({ id: 2, dueDay: 5, amountCents: 2500 })],
      payments: [],
      today,
    });
    expect(summary.items.map((o) => o.dueDate)).toEqual(['2026-10-25', '2026-11-05']);
    expect(summary.totalBills).toBe(3500);
    expect(summary.outstanding).toBe(3500);
    expect(summary.paid).toBe(0);
    expect(summary.remaining).toBe(96_500);
  });

  it('counts paid amounts and skipped bills as zero', () => {
    const summary = computeCycle({
      cycle: openCycle,
      incomes: [],
      bills: [
        bill({ id: 1, dueDay: 25 }),
        bill({ id: 2, dueDay: 5, isEssential: false, amountCents: 2500 }),
      ],
      payments: [
        payment({ billId: 1, dueDate: '2026-10-25', amountCents: 1200 }),
        payment({ billId: 2, dueDate: '2026-11-05', status: 'skipped', amountCents: 0 }),
      ],
      today,
    });
    expect(summary.totalBills).toBe(1200);
    expect(summary.paid).toBe(1200);
    expect(summary.outstanding).toBe(0);
  });

  it('carries over unattended essential bills but not optional ones', () => {
    const summary = computeCycle({
      cycle: openCycle,
      incomes: [],
      bills: [
        bill({ id: 1, dueDay: 10 }),
        bill({ id: 2, dueDay: 10, isEssential: false, amountCents: 2500 }),
      ],
      payments: [],
      today,
      trackingStart: '2026-09-23',
    });
    expect(summary.carriedOver.map((o) => [o.bill.id, o.dueDate])).toEqual([[1, '2026-10-10']]);
    // Nothing from before the first cycle carries over.
    expect(summary.carriedOver.some((o) => o.dueDate < '2026-09-23')).toBe(false);
    // Carried-over amount adds to this cycle's total; Nov 10 is also due in range.
    expect(summary.totalBills).toBe(1000 + 1000 + 2500);
  });

  it('moves a late payment of a carried-over bill into this cycle', () => {
    const summary = computeCycle({
      cycle: openCycle,
      incomes: [],
      bills: [bill({ id: 1, dueDay: 10 })],
      payments: [payment({ billId: 1, dueDate: '2026-10-10', paidOn: '2026-10-24' })],
      today,
      trackingStart: '2026-09-23',
    });
    expect(summary.carriedOver).toEqual([]);
    expect(summary.lateSettled).toHaveLength(1);
    expect(summary.paid).toBe(1000);
    expect(summary.totalBills).toBe(2000);
  });

  it('respects the bill start date and paused bills', () => {
    const summary = computeCycle({
      cycle: openCycle,
      incomes: [],
      bills: [
        // Oct 25 is before the start date and Nov 25 is after the cycle.
        bill({ id: 1, dueDay: 25, startDate: '2026-10-26' }),
        bill({ id: 2, dueDay: 30, active: false }),
      ],
      payments: [],
      today,
    });
    expect(summary.items).toEqual([]);
  });
});

describe('billHistory', () => {
  it('labels past months unattended and the current cycle as due', () => {
    const history = billHistory(
      bill({ id: 1, dueDay: 10, startDate: '2026-08-01' }),
      [payment({ billId: 1, dueDate: '2026-08-10' })],
      { today: '2026-11-12', currentCycleStart: '2026-10-23', trackingStart: '2026-08-01' }
    );
    expect(history.map((h) => [h.dueDate, h.status])).toEqual([
      ['2026-12-10', 'upcoming'],
      ['2026-11-10', 'due'],
      ['2026-10-10', 'unattended'],
      ['2026-09-10', 'unattended'],
      ['2026-08-10', 'paid'],
    ]);
  });
});

describe('dueLabel', () => {
  it('uses neutral wording', () => {
    expect(dueLabel('2026-11-01', '2026-11-01')).toBe('Due today');
    expect(dueLabel('2026-11-02', '2026-11-01')).toBe('Due tomorrow');
    expect(dueLabel('2026-11-05', '2026-11-01')).toBe('Due in 4 days');
    expect(dueLabel('2026-10-30', '2026-11-01')).toBe('Due date passed');
  });
});

describe('nextCycles (monthly roll-over)', () => {
  it('does nothing while the open cycle still covers today', () => {
    expect(nextCycles({ plannedEnd: '2026-11-22' }, '2026-11-22', 1)).toEqual([]);
  });

  it('starts the next cycle the day after the planned end', () => {
    expect(nextCycles({ plannedEnd: '2026-11-22' }, '2026-11-23', 1)).toEqual([
      { startDate: '2026-11-23', plannedEnd: '2026-12-22' },
    ]);
  });

  it('clamps short months (Jan 31 start ends Feb 28)', () => {
    expect(nextCycles({ plannedEnd: '2027-01-30' }, '2027-02-01', 1)).toEqual([
      { startDate: '2027-01-31', plannedEnd: '2027-02-27' },
    ]);
  });

  it('creates one contiguous cycle per missed month', () => {
    const cycles = nextCycles({ plannedEnd: '2026-08-22' }, '2026-11-01', 1);
    expect(cycles.map((c) => c.startDate)).toEqual(['2026-08-23', '2026-09-23', '2026-10-23']);
    expect(cycles.at(-1)!.plannedEnd >= '2026-11-01').toBe(true);
  });
});

describe('cycleMonthLabel', () => {
  it('names cycles by month', () => {
    const c = (startDate: string, plannedEnd: string) => ({ startDate, plannedEnd, endedOn: null });
    expect(cycleMonthLabel(c('2026-10-23', '2026-11-22'))).toBe('Oct – Nov 2026');
    expect(cycleMonthLabel(c('2026-12-23', '2027-01-22'))).toBe('Dec 2026 – Jan 2027');
    expect(cycleMonthLabel(c('2026-02-01', '2026-02-28'))).toBe('Feb 2026');
  });
});
