import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { MoneyInput } from '@/components/ui/money-input';
import { Sheet } from '@/components/ui/sheet';
import { Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings';
import {
  getCurrentCycle,
  getTrackingStart,
  incomesForCycle,
  listBills,
  listPayments,
  shiftCycleStart,
  startCycle,
} from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { useTheme } from '@/hooks/use-theme';
import { computeCycle, cycleMonthLabel, defaultPlannedEnd } from '@/lib/budget';
import { addDays, daysBetween, formatDate, isValidISODate, todayISO } from '@/lib/dates';
import { formatMoney, parseMoney } from '@/lib/money';
import { syncReminders } from '@/lib/notifications';
import type { Cycle } from '@/lib/types';

/** An auto-started cycle this recent most likely means the salary came late. */
const LATE_SALARY_DAYS = 10;

type Mode = 'new' | 'shift';

export default function CycleFormScreen() {
  const { data } = useDbData(async (db) => {
    const cycle = await getCurrentCycle(db);
    const [bills, payments, trackingStart, incomes] = await Promise.all([
      listBills(db),
      listPayments(db),
      getTrackingStart(db),
      cycle ? incomesForCycle(db, cycle.id) : Promise.resolve([]),
    ]);
    return { cycle, bills, payments, trackingStart, incomes };
  });

  if (!data) return <Sheet title="Start a new cycle">{null}</Sheet>;
  return <CycleForm {...data} />;
}

function CycleForm({
  cycle: current,
  bills,
  payments,
  trackingStart,
  incomes,
}: {
  cycle: Cycle | null;
  bills: Awaited<ReturnType<typeof listBills>>;
  payments: Awaited<ReturnType<typeof listPayments>>;
  trackingStart: string | null;
  incomes: Awaited<ReturnType<typeof incomesForCycle>>;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings } = useSettings();
  const today = todayISO();

  const canShift = !!current?.autoStarted && current.startDate < today;
  const [mode, setMode] = useState<Mode>(
    canShift && daysBetween(current!.startDate, today) <= LATE_SALARY_DAYS ? 'shift' : 'new'
  );
  const [startDate, setStartDate] = useState(today);
  const [plannedEnd, setPlannedEnd] = useState(defaultPlannedEnd(today, settings.cycleLengthMonths));
  const [endEdited, setEndEdited] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [income, setIncome] = useState('');
  const [incomeNote, setIncomeNote] = useState('Salary');
  const [submitted, setSubmitted] = useState(false);

  const validStart = isValidISODate(startDate);
  const changeStart = (value: string) => {
    setStartDate(value);
    if (!endEdited && isValidISODate(value)) setPlannedEnd(defaultPlannedEnd(value, settings.cycleLengthMonths));
  };

  // What the new (or moved) cycle starts with: its bills plus essential bills carried over.
  const preview =
    validStart && isValidISODate(plannedEnd) && plannedEnd >= startDate
      ? computeCycle({
          cycle: { id: -1, startDate, plannedEnd, endedOn: null, autoStarted: false, note: null },
          incomes: [],
          bills,
          payments,
          today,
          trackingStart: trackingStart ?? startDate,
        })
      : null;

  // The current cycle as it will close (new mode only).
  const closeOn = validStart ? addDays(startDate, -1) : null;
  const recap =
    mode === 'new' && current && closeOn && closeOn >= current.startDate
      ? computeCycle({
          cycle: { ...current, endedOn: closeOn },
          incomes,
          bills,
          payments,
          today: closeOn,
          trackingStart: trackingStart ?? current.startDate,
        })
      : null;
  const leftUnattended = recap?.items.filter((o) => !o.record) ?? [];
  const carrying = leftUnattended.filter((o) => o.bill.isEssential);

  const incomeCents = income ? parseMoney(income) : null;
  const errors = {
    startDate: !validStart
      ? 'Enter a valid date'
      : current && startDate <= current.startDate
        ? `Must be after ${formatDate(current.startDate)}, when the current cycle started`
        : null,
    plannedEnd: !isValidISODate(plannedEnd)
      ? 'Enter a valid date'
      : validStart && plannedEnd < startDate
        ? 'Must be on or after the start date'
        : null,
    income: income && (incomeCents == null || incomeCents <= 0) ? 'Enter a valid amount, or leave it empty' : null,
  };
  const valid = Object.values(errors).every((e) => e == null);
  const show = (error: string | null) => (submitted ? error : null);
  // Date errors live in the collapsed section, so open it when they need attention.
  const dateError = submitted && (errors.startDate || errors.plannedEnd);

  const save = async () => {
    setSubmitted(true);
    if (!valid) {
      if (errors.startDate || errors.plannedEnd) setShowDates(true);
      return;
    }
    const incomeInput = incomeCents ? { amountCents: incomeCents, note: incomeNote.trim() || null } : null;
    if (mode === 'shift' && current) {
      await shiftCycleStart(db, { cycle: current, newStart: startDate, plannedEnd, income: incomeInput });
    } else {
      await startCycle(db, { startDate, plannedEnd, closeOpenOn: closeOn!, income: incomeInput });
    }
    await syncReminders(db);
    router.back();
  };

  const covers =
    preview && incomeCents && preview.totalBills > 0
      ? incomeCents >= preview.totalBills
        ? `${formatMoney(incomeCents - preview.totalBills)} left after bills`
        : `Income covers ${Math.floor((incomeCents / preview.totalBills) * 100)}% of bills`
      : null;

  return (
    <Sheet
      title={mode === 'shift' ? 'Salary came late' : 'Start a new cycle'}
      subtitle={
        preview ? `${cycleMonthLabel({ startDate, plannedEnd, endedOn: null })} · ${formatDate(startDate, { withYear: false })} – ${formatDate(plannedEnd)}` : undefined
      }>
      {canShift ? (
        <View style={styles.modes}>
          <ModeOption
            selected={mode === 'shift'}
            title="Move this cycle to start today"
            description={`This cycle started automatically on ${formatDate(current!.startDate, { withYear: false })}. Bills due before today go back to the previous cycle.`}
            onPress={() => setMode('shift')}
          />
          <ModeOption
            selected={mode === 'new'}
            title="Start a new cycle"
            description="Close the current cycle and begin a fresh one."
            onPress={() => setMode('new')}
          />
        </View>
      ) : null}

      <MoneyInput
        label="Income received (optional)"
        value={income}
        onChangeText={setIncome}
        error={show(errors.income)}
        hint={covers ?? 'You can also add income later from the cycle page.'}
      />
      {income ? <FormField label="Income note" value={incomeNote} onChangeText={setIncomeNote} /> : null}

      {preview ? (
        <Card style={[styles.preview, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="small">
            Starts with <ThemedText type="smallBold">{formatMoney(preview.totalBills)}</ThemedText> in bills due
            {preview.carriedOver.length ? ` · ${preview.carriedOver.length} carried over` : ''}
          </ThemedText>
        </Card>
      ) : null}

      <Pressable
        onPress={() => setShowDates((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showDates }}
        style={styles.datesToggle}>
        <Icon name="calendar" size={18} color={dateError ? theme.danger : theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          Starts {startDate === today ? 'today' : validStart ? formatDate(startDate) : '…'}
          {isValidISODate(plannedEnd) ? ` · ends ${formatDate(plannedEnd)}` : ''}
        </ThemedText>
        <ThemedText type="link">{showDates ? 'Done' : 'Change'}</ThemedText>
      </Pressable>
      {showDates ? (
        <>
          <DateField label="Start date" value={startDate} onChangeDate={changeStart} error={show(errors.startDate)} />
          <DateField
            label="Planned end"
            value={plannedEnd}
            onChangeDate={(value) => {
              setEndEdited(true);
              setPlannedEnd(value);
            }}
            error={show(errors.plannedEnd)}
          />
        </>
      ) : null}

      {recap && leftUnattended.length > 0 ? (
        <ThemedText type="small" style={{ color: theme.warning }}>
          Closing {cycleMonthLabel({ ...current!, endedOn: closeOn })}: {leftUnattended.length} bill
          {leftUnattended.length === 1 ? '' : 's'} left unattended
          {carrying.length
            ? `, ${carrying.length} essential (${formatMoney(carrying.reduce((s, o) => s + o.bill.amountCents, 0))}) will carry over`
            : ''}
          .
        </ThemedText>
      ) : null}

      <Button title={mode === 'shift' ? 'Move cycle start' : 'Start cycle'} icon="renew" onPress={save} />
    </Sheet>
  );
}

function ModeOption({
  selected,
  title,
  description,
  onPress,
}: {
  selected: boolean;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
      <View
        style={[
          styles.mode,
          { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.accent : 'transparent' },
        ]}>
        <View style={[styles.radio, { borderColor: selected ? theme.accent : theme.border }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: theme.accent }]} /> : null}
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modes: {
    gap: Spacing.two,
  },
  mode: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  preview: {
    paddingVertical: Spacing.two + Spacing.half,
  },
  datesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
