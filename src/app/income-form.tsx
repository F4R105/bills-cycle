import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';

import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { MoneyInput } from '@/components/ui/money-input';
import { Sheet } from '@/components/ui/sheet';
import { deleteIncome, getCurrentCycle, getCycle, getIncome, saveIncome } from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { cycleMonthLabel } from '@/lib/budget';
import { isValidISODate, todayISO } from '@/lib/dates';
import { centsToInput, parseMoney } from '@/lib/money';
import type { Cycle, Income } from '@/lib/types';

/** Add income to a cycle (`?cycleId=`, default the current one), or view and edit one (`?id=`). */
export default function IncomeFormScreen() {
  const { id, cycleId } = useLocalSearchParams<{ id?: string; cycleId?: string }>();

  const { data } = useDbData(async (db) => {
    const income = id ? await getIncome(db, Number(id)) : null;
    const targetId = income?.cycleId ?? (cycleId ? Number(cycleId) : null);
    const cycle = targetId != null ? await getCycle(db, targetId) : await getCurrentCycle(db);
    return { income, cycle };
  });

  if (!data) return <Sheet title={id ? 'Income' : 'Add income'}>{null}</Sheet>;
  return <IncomeForm income={data.income} cycle={data.cycle} />;
}

function IncomeForm({ income, cycle }: { income: Income | null; cycle: Cycle | null }) {
  const db = useSQLiteContext();
  const [amount, setAmount] = useState(income ? centsToInput(income.amountCents) : '');
  const [receivedOn, setReceivedOn] = useState(income?.receivedOn ?? todayISO());
  const [note, setNote] = useState(income?.note ?? 'Salary');
  const [submitted, setSubmitted] = useState(false);

  const amountCents = parseMoney(amount);
  const errors = {
    amount: amountCents != null && amountCents > 0 ? null : 'Enter an amount greater than 0',
    receivedOn: isValidISODate(receivedOn) ? null : 'Enter a valid date',
  };
  const valid = Object.values(errors).every((e) => e == null);
  const show = (error: string | null) => (submitted ? error : null);

  const save = async () => {
    setSubmitted(true);
    if (!valid) return;
    await saveIncome(
      db,
      { cycleId: cycle?.id ?? null, amountCents: amountCents!, receivedOn, note: note.trim() || null },
      income?.id
    );
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert('Delete income?', 'It will be removed from this cycle.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteIncome(db, income!.id);
          router.back();
        },
      },
    ]);

  return (
    <Sheet
      title={income ? 'Income details' : 'Add income'}
      subtitle={cycle ? `Counts toward ${cycleMonthLabel(cycle)}` : 'Not linked to a cycle'}>
      <MoneyInput
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        error={show(errors.amount)}
        autoFocus={!income}
      />
      <DateField label="Received on" value={receivedOn} onChangeDate={setReceivedOn} error={show(errors.receivedOn)} />
      <FormField label="Note" value={note} onChangeText={setNote} placeholder="e.g. Salary, Bonus, Side job" />
      {!cycle ? (
        <ThemedText type="small" themeColor="textSecondary">
          Start a cycle from Home to plan income against your bills.
        </ThemedText>
      ) : null}
      <Button title={income ? 'Save changes' : 'Add income'} icon="check" onPress={save} />
      {income ? <Button title="Delete" icon="trash" variant="danger" onPress={confirmDelete} /> : null}
    </Sheet>
  );
}
