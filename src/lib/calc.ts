/**
 * A small calculator engine: the expression is a list of numbers and operators, evaluated with
 * normal precedence (× ÷ before + −). No `eval`.
 */

export type Operator = '+' | '−' | '×' | '÷';
export type Token = number | Operator;

export const OPERATORS: Operator[] = ['+', '−', '×', '÷'];

const isOperator = (t: Token | string): t is Operator => OPERATORS.includes(t as Operator);

/** Evaluates `tokens`; a trailing operator is ignored. Returns null for division by zero. */
export function evaluate(tokens: Token[]): number | null {
  const list = isOperator(tokens.at(-1) ?? 0) ? tokens.slice(0, -1) : tokens;
  if (list.length === 0) return 0;

  // First pass: × and ÷ collapse into terms.
  const terms: (number | '+' | '−')[] = [];
  let current = list[0] as number;
  for (let i = 1; i < list.length; i += 2) {
    const op = list[i] as Operator;
    const value = list[i + 1] as number;
    if (op === '×') current *= value;
    else if (op === '÷') {
      if (value === 0) return null;
      current /= value;
    } else {
      terms.push(current, op);
      current = value;
    }
  }
  terms.push(current);

  // Second pass: + and − left to right.
  let result = terms[0] as number;
  for (let i = 1; i < terms.length; i += 2) {
    result = terms[i] === '+' ? result + (terms[i + 1] as number) : result - (terms[i + 1] as number);
  }
  // Trim floating-point noise such as 0.1 + 0.2.
  return Math.round(result * 1e8) / 1e8;
}

/** Calculator state: completed tokens plus the number being typed. */
export type CalcState = { tokens: Token[]; entry: string; justEvaluated: boolean };

export const initialCalc: CalcState = { tokens: [], entry: '', justEvaluated: false };

export type CalcKey = 'C' | '⌫' | '=' | '%' | '.' | Operator | `${number}`;

const toNumber = (entry: string) => (entry === '' || entry === '.' ? 0 : Number(entry));

/** Applies one key press to the calculator state. */
export function press(state: CalcState, key: CalcKey): CalcState {
  if (key === 'C') return initialCalc;

  if (key === '⌫') {
    if (state.entry) return { ...state, entry: state.entry.slice(0, -1), justEvaluated: false };
    return { ...state, tokens: state.tokens.slice(0, -1), justEvaluated: false };
  }

  if (key === '=') {
    const tokens = state.entry !== '' ? [...state.tokens, toNumber(state.entry)] : state.tokens;
    const result = evaluate(tokens);
    if (result == null) return { tokens: [], entry: 'Error', justEvaluated: true };
    return { tokens: [], entry: String(result), justEvaluated: true };
  }

  if (key === '%') {
    if (state.entry === '' || state.entry === 'Error') return state;
    return { ...state, entry: String(toNumber(state.entry) / 100) };
  }

  if (isOperator(key)) {
    if (state.entry === 'Error') return state;
    if (state.entry !== '') {
      return { tokens: [...state.tokens, toNumber(state.entry), key], entry: '', justEvaluated: false };
    }
    // Replace a trailing operator, or start from 0.
    const tokens = state.tokens.length ? state.tokens.slice(0, isOperator(state.tokens.at(-1)!) ? -1 : undefined) : [0];
    return { tokens: [...tokens, key], entry: '', justEvaluated: false };
  }

  // Digit or decimal point. Typing after "=" starts a fresh number.
  const entry = state.justEvaluated || state.entry === 'Error' ? '' : state.entry;
  if (key === '.' && entry.includes('.')) return state;
  if (entry.replace(/\D/g, '').length >= 15) return state;
  const next = entry === '0' && key !== '.' ? key : entry + key;
  return { ...state, entry: next === '.' ? '0.' : next, justEvaluated: false };
}

/** Groups the integer part with commas, e.g. "1250000.5" -> "1,250,000.5". */
export function formatNumber(text: string): string {
  if (text === 'Error' || text === '') return text;
  const negative = text.startsWith('-');
  const [int, frac] = (negative ? text.slice(1) : text).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (negative ? '−' : '') + grouped + (frac !== undefined ? `.${frac}` : '');
}

/** The expression line shown above the result, e.g. "1,200 × 3 +". */
export function expressionText(state: CalcState): string {
  return [...state.tokens.map((t) => (typeof t === 'number' ? formatNumber(String(t)) : t)), formatNumber(state.entry)]
    .filter(Boolean)
    .join(' ');
}

/** The value currently shown: the entry, or the running result of the expression. */
export function displayValue(state: CalcState): number | null {
  if (state.entry === 'Error') return null;
  if (state.entry !== '') return toNumber(state.entry);
  return evaluate(state.tokens);
}
