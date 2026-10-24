import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { MoneyInput } from '@/components/ui/money-input';
import { Sheet } from '@/components/ui/sheet';
import { getBill, recordPayment } from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { formatDate, isValidISODate, todayISO } from '@/lib/dates';
import { centsToInput, formatMoney, parseMoney } from '@/lib/money';
import { syncReminders } from '@/lib/notifications';
import type { Bill } from '@/lib/types';

export default function PayScreen() {
  const { billId, dueDate } = useLocalSearchParams<{ billId: string; dueDate: string }>();
  const { data } = useDbData(async (db) => ({ bill: await getBill(db, Number(billId)) }));

  if (!data) return <Sheet title="Pay bill">{null}</Sheet>;
  if (!data.bill || !isValidISODate(dueDate ?? '')) {
    return (
      <Sheet title="Pay bill">
        <EmptyState title="Bill not found" message="It may have been deleted." />
      </Sheet>
    );
  }
  return <PayForm bill={data.bill} dueDate={dueDate} />;
}

function PayForm({ bill, dueDate }: { bill: Bill; dueDate: string }) {
  const db = useSQLiteContext();
  const [amount, setAmount] = useState(centsToInput(bill.amountCents));
  const [paidOn, setPaidOn] = useState(todayISO());
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const amountCents = parseMoney(amount);
  const errors = {
    amount: amountCents != null ? null : 'Enter the amount paid',
    paidOn: isValidISODate(paidOn) ? null : 'Enter a valid date',
  };
  const show = (error: string | null) => (submitted ? error : null);

  const save = async () => {
    setSubmitted(true);
    if (errors.amount || errors.paidOn) return;
    await recordPayment(db, {
      billId: bill.id,
      dueDate,
      status: 'paid',
      amountCents: amountCents!,
      paidOn,
      note: note.trim() || null,
    });
    await syncReminders(db);
    router.back();
  };

  return (
    <Sheet title={`Pay ${bill.name}`} subtitle={`Due ${formatDate(dueDate)} · ${formatMoney(bill.amountCents)}`}>
      <MoneyInput label="Amount paid" value={amount} onChangeText={setAmount} error={show(errors.amount)} />
      <DateField label="Paid on" value={paidOn} onChangeDate={setPaidOn} error={show(errors.paidOn)} />
      <FormField label="Note" value={note} onChangeText={setNote} placeholder="Optional, e.g. reference number" />
      <Button title="Mark as paid" icon="check" onPress={save} />
    </Sheet>
  );
}
