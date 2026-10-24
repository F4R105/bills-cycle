/**
 * The app works in Tanzanian shillings only. Amounts are stored as integer cents (×100) so the
 * schema and old backups stay valid, but shillings are always whole in the UI.
 */

export const CURRENCY = 'TZS';

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Whole shillings with thousands separators, e.g. 125000000 -> "1,250,000". */
export function formatAmount(cents: number): string {
  const shillings = Math.round(cents / 100);
  const sign = shillings < 0 ? '−' : '';
  return sign + group(String(Math.abs(shillings)));
}

/** e.g. 125000000 -> "TZS 1,250,000". */
export function formatMoney(cents: number): string {
  return `${CURRENCY} ${formatAmount(cents)}`;
}

/** Keeps digits only and groups them while typing, e.g. "1250000" -> "1,250,000". */
export function formatAmountInput(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return group(digits);
}

/** Parses "1,250,000" into cents. Returns null for empty or invalid input. */
export function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[\s,]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned) * 100;
}

/** Cents to the editable, grouped form, e.g. 125000000 -> "1,250,000". */
export function centsToInput(cents: number): string {
  return formatAmountInput(String(Math.round(cents / 100)));
}
