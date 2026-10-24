import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { MoneyInput } from '@/components/ui/money-input';
import { Sheet } from '@/components/ui/sheet';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { getBill, getCurrentCycle, saveBill } from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { isValidISODate, todayISO } from '@/lib/dates';
import { centsToInput, parseMoney } from '@/lib/money';
import { syncReminders } from '@/lib/notifications';
import type { Bill } from '@/lib/types';

export default function BillFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const billId = id ? Number(id) : undefined;

  const { data } = useDbData(async (db) => ({
    bill: billId != null ? await getBill(db, billId) : null,
    // New bills count from the current cycle so this cycle's occurrence shows up on Home.
    defaultStart: (await getCurrentCycle(db))?.startDate ?? todayISO(),
  }));

  if (!data) return <Sheet title={billId != null ? 'Edit bill' : 'New bill'} scroll>{null}</Sheet>;
  return <BillForm bill={data.bill} defaultStart={data.defaultStart} />;
}

function BillForm({ bill, defaultStart }: { bill: Bill | null; defaultStart: string }) {
  const db = useSQLiteContext();
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill ? centsToInput(bill.amountCents) : '');
  const [dueDay, setDueDay] = useState(bill ? String(bill.dueDay) : '');
  const [kind, setKind] = useState<'essential' | 'optional'>(
    bill && !bill.isEssential ? 'optional' : 'essential'
  );
  const [startDate, setStartDate] = useState(bill?.startDate ?? defaultStart);
  const [notes, setNotes] = useState(bill?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const amountCents = parseMoney(amount);
  const day = Number(dueDay);
  const errors = {
    name: name.trim() ? null : 'Enter a name',
    amount: amountCents != null && amountCents > 0 ? null : 'Enter an amount greater than 0',
    dueDay: Number.isInteger(day) && day >= 1 && day <= 31 ? null : 'Enter a day from 1 to 31',
    startDate: isValidISODate(startDate) ? null : 'Enter a valid date',
  };
  const valid = Object.values(errors).every((e) => e == null);
  const show = (error: string | null) => (submitted ? error : null);

  const save = async () => {
    setSubmitted(true);
    if (!valid) return;
    await saveBill(
      db,
      {
        name: name.trim(),
        amountCents: amountCents!,
        dueDay: day,
        isEssential: kind === 'essential',
        startDate,
        active: bill?.active ?? true,
        notes: notes.trim() || null,
      },
      bill?.id
    );
    await syncReminders(db);
    router.back();
  };

  return (
    <Sheet title={bill ? 'Edit bill' : 'New bill'} scroll>
      <FormField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Netflix, Rent, Electricity"
        error={show(errors.name)}
        autoFocus={!bill}
      />
      <MoneyInput label="Amount" value={amount} onChangeText={setAmount} error={show(errors.amount)} />
      <FormField
        label="Due day of the month"
        value={dueDay}
        onChangeText={setDueDay}
        placeholder="1-31"
        keyboardType="number-pad"
        maxLength={2}
        error={show(errors.dueDay)}
        hint="Days past the end of a short month fall on its last day (31 → Feb 28)."
      />
      <View style={{ gap: Spacing.one }}>
        <ThemedText type="label" themeColor="textSecondary">TYPE</ThemedText>
        <Segmented
          options={[
            { value: 'essential', label: 'Essential' },
            { value: 'optional', label: 'Optional' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {kind === 'essential'
            ? 'Must be paid. If left unattended, it carries over to the next cycle.'
            : "Nice to have. If left unattended, it doesn't carry over, and you can skip a month."}
        </ThemedText>
      </View>
      <DateField
        label="Tracking starts"
        value={startDate}
        onChangeDate={setStartDate}
        error={show(errors.startDate)}
      />
      <FormField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
        multiline
      />
      <Button title={bill ? 'Save changes' : 'Add bill'} icon="check" onPress={save} />
    </Sheet>
  );
}
