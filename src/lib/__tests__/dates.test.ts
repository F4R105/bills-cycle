import {
  addDays,
  addMonths,
  daysBetween,
  isValidISODate,
  nextOccurrence,
  occurrenceInMonth,
  occurrencesBetween,
} from '../dates';

describe('occurrenceInMonth', () => {
  it('clamps day 31 to the end of short months', () => {
    expect(occurrenceInMonth(31, 2026, 2)).toBe('2026-02-28');
    expect(occurrenceInMonth(31, 2028, 2)).toBe('2028-02-29');
    expect(occurrenceInMonth(31, 2026, 4)).toBe('2026-04-30');
    expect(occurrenceInMonth(31, 2026, 1)).toBe('2026-01-31');
  });

  it('keeps ordinary days', () => {
    expect(occurrenceInMonth(5, 2026, 11)).toBe('2026-11-05');
  });
});

describe('occurrencesBetween', () => {
  it('includes both range boundaries', () => {
    expect(occurrencesBetween(23, '2020-01-01', '2026-10-23', '2026-11-23')).toEqual([
      '2026-10-23',
      '2026-11-23',
    ]);
  });

  it('crosses year boundaries', () => {
    expect(occurrencesBetween(5, '2020-01-01', '2026-12-01', '2027-02-10')).toEqual([
      '2026-12-05',
      '2027-01-05',
      '2027-02-05',
    ]);
  });

  it('never returns dates before the bill start date', () => {
    expect(occurrencesBetween(5, '2026-10-10', '2026-10-01', '2026-11-30')).toEqual([
      '2026-11-05',
    ]);
  });

  it('returns nothing for an empty range', () => {
    expect(occurrencesBetween(5, '2026-12-01', '2026-10-01', '2026-11-30')).toEqual([]);
  });
});

describe('date arithmetic', () => {
  it('adds days across months and leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds months with clamping', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -2)).toBe('2025-11-15');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-23', '2026-11-23')).toBe(31);
    expect(daysBetween('2026-10-23', '2026-10-20')).toBe(-3);
  });

  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-2-1')).toBe(false);
  });

  it('finds the next occurrence', () => {
    expect(nextOccurrence(10, '2020-01-01', '2026-10-11')).toBe('2026-11-10');
    expect(nextOccurrence(10, '2020-01-01', '2026-10-10')).toBe('2026-10-10');
  });
});
