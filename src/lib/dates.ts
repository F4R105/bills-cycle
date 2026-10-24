/**
 * Calendar-date helpers. Dates are plain `YYYY-MM-DD` strings (local calendar days, no time zone),
 * which sort correctly as strings. Arithmetic is done in UTC so DST never shifts a day.
 */

export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

function fromUTC(d: Date): ISODate {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parseISODate(iso: ISODate): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

/** Local calendar day of a JS Date. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseISODate(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** `month` is 1-12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(iso: ISODate, days: number): ISODate {
  const { year, month, day } = parseISODate(iso);
  return fromUTC(new Date(Date.UTC(year, month - 1, day + days)));
}

/** Adds months, clamping the day to the target month's length (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(iso: ISODate, months: number): ISODate {
  const { year, month, day } = parseISODate(iso);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const a = parseISODate(from);
  const b = parseISODate(to);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000
  );
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

/** The date a monthly bill falls on in a given month; day 31 becomes the last day of short months. */
export function occurrenceInMonth(dueDay: number, year: number, month: number): ISODate {
  return `${year}-${pad(month)}-${pad(Math.min(dueDay, daysInMonth(year, month)))}`;
}

/** All occurrences of a monthly bill within [from, to], never before `startDate`. Ascending. */
export function occurrencesBetween(
  dueDay: number,
  startDate: ISODate,
  from: ISODate,
  to: ISODate
): ISODate[] {
  const lower = maxDate(from, startDate);
  if (lower > to) return [];

  const result: ISODate[] = [];
  let { year, month } = parseISODate(lower);
  const end = parseISODate(to);
  while (year < end.year || (year === end.year && month <= end.month)) {
    const date = occurrenceInMonth(dueDay, year, month);
    if (date >= lower && date <= to) result.push(date);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

/** The first occurrence on or after `from`. */
export function nextOccurrence(dueDay: number, startDate: ISODate, from: ISODate): ISODate {
  return occurrencesBetween(dueDay, startDate, from, addMonths(maxDate(from, startDate), 1))[0];
}

export function formatDate(iso: ISODate, options?: { withYear?: boolean }): string {
  const { year, month, day } = parseISODate(iso);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: options?.withYear === false ? undefined : 'numeric',
    timeZone: 'UTC',
  });
}

export function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}
