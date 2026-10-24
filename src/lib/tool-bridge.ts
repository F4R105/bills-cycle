/**
 * Lets a money field borrow the calculator: the field registers a callback, opens the tools
 * sheet, and the calculator hands its result back with "Use result".
 */

type ResultHandler = (cents: number) => void;

let pending: ResultHandler | null = null;

export function requestCalculatorResult(handler: ResultHandler) {
  pending = handler;
}

export function hasPendingCalculatorRequest() {
  return pending != null;
}

/** Delivers the result to the waiting field, if any. Returns whether one was waiting. */
export function deliverCalculatorResult(cents: number): boolean {
  const handler = pending;
  pending = null;
  handler?.(cents);
  return handler != null;
}

export function cancelCalculatorRequest() {
  pending = null;
}
