import { buildCsv, buildReport } from '../reports';
import type { Bill, Cycle, Income, Payment } from '../types';

const bill = (id: number, overrides: Partial<Bill> = {}): Bill => ({
  id,
  name: `Bill ${id}`,
  amountCents: 10_000_00,
  dueDay: 10,
  isEssential: true,
  startDate: '2026-08-01',
  active: true,
  notes: null,
  ...overrides,
});

const cycles: Cycle[] = [
  { id: 1, startDate: '2026-08-23', plannedEnd: '2026-09-22', endedOn: '2026-09-22', autoStarted: false, note: null },
  { id: 2, startDate: '2026-09-23', plannedEnd: '2026-10-22', endedOn: '2026-10-22', autoStarted: true, note: null },
  { id: 3, startDate: '2026-10-23', plannedEnd: '2026-11-22', endedOn: null, autoStarted: false, note: null },
];

const incomes: Income[] = [
  { id: 1, cycleId: 1, amountCents: 50_000_00, receivedOn: '2026-08-23', note: 'Salary' },
  { id: 2, cycleId: 3, amountCents: 60_000_00, receivedOn: '2026-10-23', note: 'Salary, Oct' },
];

const bills = [bill(1), bill(2, { isEssential: false, amountCents: 5_000_00, dueDay: 15 })];

const payments: Payment[] = [
  // Bill 1: Sep paid on time, Oct paid late, Nov unpaid (current cycle).
  { id: 1, billId: 1, dueDate: '2026-09-10', status: 'paid', amountCents: 10_000_00, paidOn: '2026-09-10', note: null },
  { id: 2, billId: 1, dueDate: '2026-10-10', status: 'paid', amountCents: 10_000_00, paidOn: '2026-10-12', note: null },
  // Bill 2: Sep skipped, Oct unattended.
  { id: 3, billId: 2, dueDate: '2026-09-15', status: 'skipped', amountCents: 0, paidOn: '2026-09-15', note: null },
];

const input = { cycles, incomes, bills, payments, today: '2026-11-12', trackingStart: '2026-08-23' };

describe('buildReport', () => {
  const report = buildReport(input);

  it('splits the monthly commitment', () => {
    expect(report.commitment).toEqual({ essential: 10_000_00, optional: 5_000_00, total: 15_000_00 });
  });

  it('builds the trend oldest first', () => {
    expect(report.trend.map((t) => t.label)).toEqual(['Aug – Sep 2026', 'Sep – Oct 2026', 'Oct – Nov 2026']);
    expect(report.trend[0].income).toBe(50_000_00);
  });

  it('counts attendance since tracking began', () => {
    expect(report.attendance).toEqual({ onTime: 1, late: 1, skipped: 1, unattended: 1, pending: 1 });
  });

  it('ranks bills and totals skips', () => {
    expect(report.topBills).toHaveLength(1);
    expect(report.topBills[0]).toMatchObject({ paid: 20_000_00, share: 1 });
    expect(report.savedBySkipping).toBe(5_000_00);
    expect(report.totalPaid).toBe(20_000_00);
  });
});

describe('buildCsv', () => {
  it('writes a header, income and bill rows, quoting commas', () => {
    const lines = buildCsv(input).split('\n');
    expect(lines[0]).toBe('Cycle,Type,Name,Category,Due date,Status,Amount (TZS),Paid on,Note');
    expect(lines).toContain('Aug – Sep 2026,Income,Salary,,2026-08-23,Received,50000,,');
    expect(lines).toContain('Oct – Nov 2026,Income,"Salary, Oct",,2026-10-23,Received,60000,,');
    expect(lines).toContain('Sep – Oct 2026,Bill,Bill 2,Optional,2026-10-15,Unattended,5000,,');
  });
});
