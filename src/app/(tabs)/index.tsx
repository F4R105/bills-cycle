import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { OccurrenceRow } from '@/components/occurrence-row';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeaderButton } from '@/components/ui/header-button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Chips } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings';
import {
  ensureCurrentCycle,
  getCurrentCycle,
  getTrackingStart,
  incomesForCycle,
  listBills,
  listPayments,
  recordPayment,
  undoPayment,
} from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { useTheme } from '@/hooks/use-theme';
import { computeCycle, cycleRange, type Occurrence } from '@/lib/budget';
import { daysBetween, formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { syncReminders } from '@/lib/notifications';

type Filter = 'all' | 'soon' | 'carried' | 'essential' | 'optional';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'soon', label: 'Due soon' },
  { value: 'carried', label: 'Carried over' },
  { value: 'essential', label: 'Essential' },
  { value: 'optional', label: 'Optional' },
];

/** "Due soon" means within this many days (or already past). */
const SOON_DAYS = 7;

export default function HomeScreen() {
  const theme = useTheme();
  const { settings } = useSettings();
  const [filter, setFilter] = useState<Filter>('all');
  const [showAttended, setShowAttended] = useState(false);
  const today = todayISO();

  const { data, refresh, db } = useDbData(async (db) => {
    await ensureCurrentCycle(db, todayISO(), settings.cycleLengthMonths);
    const [cycle, bills] = await Promise.all([getCurrentCycle(db), listBills(db)]);
    if (!cycle) return { cycle: null, billCount: bills.length };
    const [incomes, payments, trackingStart] = await Promise.all([
      incomesForCycle(db, cycle.id),
      listPayments(db),
      getTrackingStart(db),
    ]);
    const summary = computeCycle({
      cycle,
      incomes,
      bills,
      payments,
      today: todayISO(),
      trackingStart: trackingStart ?? cycle.startDate,
    });
    return { cycle, summary, billCount: bills.length };
  });

  const openBill = (o: Occurrence) => router.push({ pathname: '/bill/[id]', params: { id: o.bill.id } });
  const pay = (o: Occurrence) =>
    router.push({ pathname: '/pay', params: { billId: o.bill.id, dueDate: o.dueDate } });
  const startCycle = () => router.push('/cycle-form');

  const afterChange = async () => {
    await refresh();
    await syncReminders(db);
  };
  const skip = async (o: Occurrence) => {
    await recordPayment(db, { billId: o.bill.id, dueDate: o.dueDate, status: 'skipped', amountCents: 0, paidOn: today });
    await afterChange();
  };
  const undo = async (o: Occurrence) => {
    await undoPayment(db, o.bill.id, o.dueDate);
    await afterChange();
  };

  const reports = <HeaderButton icon="reports" label="Reports" onPress={() => router.push('/reports')} />;

  if (!data) return <Screen tab title="Home" />;

  if (!data.cycle || !data.summary) {
    return (
      <Screen
        tab
        title="Home"
        headerAction={reports}>
        <EmptyState
          title="Start your first cycle"
          message="A cycle is the month your income has to cover, usually from one payday to the next. After that, a new one starts automatically every month.">
          <Button title="Start a cycle" icon="renew" onPress={startCycle} />
        </EmptyState>
        {data.billCount === 0 ? (
          <EmptyState title="No bills yet" message="Add the bills and subscriptions you pay every month.">
            <Button title="Add a bill" variant="secondary" icon="add" onPress={() => router.push('/bill-form')} />
          </EmptyState>
        ) : null}
      </Screen>
    );
  }

  const { cycle, summary } = data;
  const range = cycleRange(cycle, today);
  const totalDays = daysBetween(range.start, range.end) + 1;
  const day = Math.min(totalDays, daysBetween(range.start, today) + 1);

  const unattended = [
    ...summary.carriedOver.map((o) => ({ o, carried: true })),
    ...summary.items.filter((o) => !o.record).map((o) => ({ o, carried: false })),
  ];
  const visible = unattended.filter(({ o, carried }) => {
    switch (filter) {
      case 'soon':
        return carried || daysBetween(today, o.dueDate) <= SOON_DAYS;
      case 'carried':
        return carried;
      case 'essential':
        return o.bill.isEssential;
      case 'optional':
        return !o.bill.isEssential;
      default:
        return true;
    }
  });
  const attended = [...summary.lateSettled, ...summary.items.filter((o) => o.record)];
  const attendedTotal = attended.reduce((sum, o) => sum + (o.record?.status === 'paid' ? o.record.amountCents : 0), 0);
  const allAttended = summary.outstanding === 0;

  return (
    <Screen
      tab
      title="Home"
      subtitle={`${formatDate(range.start, { withYear: false })} – ${formatDate(range.end, { withYear: false })} · Day ${day} of ${totalDays}`}
      headerAction={reports}>
      <Card style={styles.hero}>
        <ThemedText type="label" themeColor="textSecondary">
          UNATTENDED BILLS
        </ThemedText>
        <ThemedText type="amountLarge" style={!allAttended && { color: theme.text }}>
          {formatMoney(summary.outstanding)}
        </ThemedText>
        {allAttended ? (
          <Badge label="All bills attended ✓" tone="success" />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {unattended.length} bill{unattended.length === 1 ? '' : 's'}
            {summary.carriedOver.length ? ` · ${summary.carriedOver.length} carried over` : ''} · Paid{' '}
            {formatMoney(summary.paid)} this cycle
          </ThemedText>
        )}
      </Card>

      {unattended.length > 0 ? (
        <>
          <Chips options={FILTERS} value={filter} onChange={setFilter} />
          <ThemedText type="heading">Unattended bills</ThemedText>
          {visible.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              No bills match this filter.
            </ThemedText>
          ) : (
            visible.map(({ o, carried }) => (
              <OccurrenceRow
                key={`${o.bill.id}-${o.dueDate}`}
                occurrence={o}
                today={today}
                variant={carried ? 'carried' : 'todo'}
                onOpen={() => openBill(o)}
                onPay={() => pay(o)}
                onSkip={() => skip(o)}
              />
            ))
          )}
        </>
      ) : data.billCount === 0 ? (
        <EmptyState title="No bills yet" message="Add the bills and subscriptions you pay every month.">
          <Button title="Add a bill" icon="add" onPress={() => router.push('/bill-form')} />
        </EmptyState>
      ) : null}

      {attended.length > 0 ? (
        <>
          <Pressable
            onPress={() => setShowAttended((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAttended }}>
            <Card style={styles.attendedRow}>
              <Icon name="checkCircle" size={20} color={theme.success} />
              <ThemedText style={styles.flex}>
                {attended.length} attended · {formatMoney(attendedTotal)}
              </ThemedText>
              <ThemedText type="link">{showAttended ? 'Hide' : 'Show'}</ThemedText>
            </Card>
          </Pressable>
          {showAttended
            ? attended.map((o) => (
                <OccurrenceRow
                  key={`${o.bill.id}-${o.dueDate}`}
                  occurrence={o}
                  today={today}
                  variant="attended"
                  onOpen={() => openBill(o)}
                  onUndo={() => undo(o)}
                />
              ))
            : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingVertical: Spacing.four,
    gap: Spacing.one,
  },
  center: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  attendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
