import type { ISODate } from './dates';

export type Bill = {
  id: number;
  name: string;
  amountCents: number;
  /** 1-31; clamped to the month's length. */
  dueDay: number;
  /** Essential bills carry over when left unattended; optional ones don't. */
  isEssential: boolean;
  startDate: ISODate;
  active: boolean;
  notes: string | null;
};

export type PaymentStatus = 'paid' | 'skipped';

export type Payment = {
  id: number;
  billId: number;
  /** The occurrence this record settles. */
  dueDate: ISODate;
  status: PaymentStatus;
  amountCents: number;
  paidOn: ISODate;
  note: string | null;
};

export type Cycle = {
  id: number;
  startDate: ISODate;
  plannedEnd: ISODate;
  /** Set when the next cycle starts; null for the open cycle. */
  endedOn: ISODate | null;
  /** Created by monthly roll-over rather than by the user. */
  autoStarted: boolean;
  note: string | null;
};

export type Income = {
  id: number;
  cycleId: number | null;
  amountCents: number;
  receivedOn: ISODate;
  note: string | null;
};
