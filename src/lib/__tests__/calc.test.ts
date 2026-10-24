import { evaluate, expressionText, formatNumber, initialCalc, press, type CalcKey, type CalcState } from '../calc';

const type = (keys: CalcKey[], from: CalcState = initialCalc) => keys.reduce(press, from);

describe('evaluate', () => {
  it('applies × and ÷ before + and −', () => {
    expect(evaluate([2, '+', 3, '×', 4])).toBe(14);
    expect(evaluate([20, '−', 10, '÷', 2])).toBe(15);
  });

  it('ignores a trailing operator and trims float noise', () => {
    expect(evaluate([5, '+'])).toBe(5);
    expect(evaluate([0.1, '+', 0.2])).toBe(0.3);
  });

  it('returns null on division by zero', () => {
    expect(evaluate([1, '÷', 0])).toBeNull();
  });
});

describe('press', () => {
  it('builds numbers and evaluates', () => {
    const state = type(['1', '2', '0', '0', '×', '3', '=']);
    expect(state.entry).toBe('3600');
  });

  it('replaces a repeated operator', () => {
    expect(type(['5', '+', '×', '2', '=']).entry).toBe('10');
  });

  it('handles percent, backspace and clear', () => {
    expect(type(['5', '0', '%']).entry).toBe('0.5');
    expect(type(['1', '2', '3', '⌫']).entry).toBe('12');
    expect(type(['9', '+', 'C'])).toEqual(initialCalc);
  });

  it('starts a new number after equals', () => {
    expect(type(['2', '+', '2', '=', '7']).entry).toBe('7');
  });

  it('allows one decimal point', () => {
    expect(type(['.', '5', '.', '2']).entry).toBe('0.52');
  });

  it('shows Error on division by zero', () => {
    expect(type(['4', '÷', '0', '=']).entry).toBe('Error');
  });
});

describe('formatting', () => {
  it('groups with commas', () => {
    expect(formatNumber('1250000')).toBe('1,250,000');
    expect(formatNumber('-4500.25')).toBe('−4,500.25');
    expect(expressionText(type(['1', '2', '0', '0', '×']))).toBe('1,200 ×');
  });
});
