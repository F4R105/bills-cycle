import { centsToInput, formatAmountInput, formatMoney, parseMoney } from '../money';

describe('money (TZS)', () => {
  it('formats whole shillings with thousands separators', () => {
    expect(formatMoney(125_000_000)).toBe('TZS 1,250,000');
    expect(formatMoney(0)).toBe('TZS 0');
    expect(formatMoney(99_900)).toBe('TZS 999');
    expect(formatMoney(-4_500_000)).toBe('TZS −45,000');
  });

  it('groups digits while typing and drops anything else', () => {
    expect(formatAmountInput('1250000')).toBe('1,250,000');
    expect(formatAmountInput('1,2500')).toBe('12,500');
    expect(formatAmountInput('00450')).toBe('450');
    expect(formatAmountInput('12.50')).toBe('1,250');
    expect(formatAmountInput('')).toBe('');
  });

  it('parses grouped input into cents', () => {
    expect(parseMoney('1,250,000')).toBe(125_000_000);
    expect(parseMoney('0')).toBe(0);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('12.5')).toBeNull();
  });

  it('round-trips stored cents to the editable form', () => {
    expect(centsToInput(125_000_000)).toBe('1,250,000');
    expect(parseMoney(centsToInput(4_200_000))).toBe(4_200_000);
  });
});
