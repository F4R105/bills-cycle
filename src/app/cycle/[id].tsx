import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { OccurrenceRow } from '@/components/occurrence-row';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { getCycle, getTrackingStart, incomesForCycle, listBills, listPayments } from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { useTheme } from '@/hooks/use-theme';
import { computeCycle, cycleMonthLabel, type Occurrence } from '@/lib/budget';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

/** One cycle: its income, and the bills attended and left unattended in it. */
export default function CycleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const today = todayISO();

  const { data } = useDbData(async (db) => {
    const cycle = await getCycle(db, Number(id));
    if (!cycle) return { cycle: null };
    const [incomes, bills, payments, trackingStart] = await Promise.all([
      incomesForCycle(db, cycle.id),
      listBills(db),
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
    return { cycle, incomes, summary };
  });

  if (!data) return <Screen />;
  if (!data.cycle || !data.summary) {
    return (
      <Screen>
        <EmptyState title="Cycle not found" message="It may have been deleted." />
      </Screen>
    );
  }

  const { cycle, incomes, summary } = data;
  const current = cycle.endedOn == null;
  const openBill = (o: Occurrence) => router.push({ pathname: '/bill/[id]', params: { id: o.bill.id } });
  const pay = (o: Occurrence) =>
    router.push({ pathname: '/pay', params: { billId: o.bill.id, dueDate: o.dueDate } });

  const attended = [...summary.lateSettled, ...summary.items.filter((o) => o.record)];
  const unattended = [...(current ? summary.carriedOver : []), ...summary.items.filter((o) => !o.record)];
  const carriedKeys = new Set(summary.carriedOver.map((o) => `${o.bill.id}|${o.dueDate}`));
  const unattendedTotal = unattended.reduce((sum, o) => sum + o.bill.amountCents, 0);
  const balance = summary.remaining;

  return (
    <Screen>
      <Stack.Screen options={{ title: cycleMonthLabel(cycle) }} />

      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          {formatDate(summary.range.start, { withYear: false })} – {formatDate(summary.range.end)}
        </ThemedText>
        {cycle.autoStarted ? <Badge label="Auto" /> : null}
        {current ? <Badge label="Current" tone="accent" /> : null}
      </View>

      <View style={styles.tiles}>
        <StatTile label="Income" value={formatMoney(summary.income)} />
        <StatTile label="Paid" value={formatMoney(summary.paid)} />
        <StatTile label="Unattended" value={formatMoney(unattendedTotal)} tone={unattendedTotal ? 'danger' : undefined} />
      </View>

      <Card style={styles.balance}>
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            Balance (income − bills)
          </ThemedText>
          <ThemedText type="amount" style={{ color: balance < 0 ? theme.danger : theme.success }}>
            {formatMoney(balance)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.balanceNote}>
          {balance < 0 ? 'Bills are more than the income recorded so far.' : 'Income covers every bill this cycle.'}
        </ThemedText>
      </Card>

      <View style={styles.sectionHeader}>
        <ThemedText type="heading" style={styles.flex}>
          Income
        </ThemedText>
        <Button
          title="Add"
          icon="add"
          size="sm"
          variant="secondary"
          onPress={() => router.push({ pathname: '/income-form', params: { cycleId: cycle.id } })}
        />
      </View>
      {incomes.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No income recorded for this cycle yet.
        </ThemedText>
      ) : (
        incomes.map((income) => (
          <Pressable
            key={income.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/income-form', params: { id: income.id } })}>
            {({ pressed }) => (
              <Card style={[styles.incomeRow, pressed && styles.pressed]}>
                <IconCircle name="income" tone="success" />
                <View style={styles.flex}>
                  <ThemedText type="heading">{income.note || 'Income'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDate(income.receivedOn)}
                  </ThemedText>
                </View>
                <ThemedText type="amount" style={{ color: theme.success }}>
                  +{formatMoney(income.amountCents)}
                </ThemedText>
              </Card>
            )}
          </Pressable>
        ))
      )}

      <ThemedText type="heading">Unattended bills ({unattended.length})</ThemedText>
      {unattended.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing unattended.
        </ThemedText>
      ) : (
        unattended.map((o) => (
          <OccurrenceRow
            key={`${o.bill.id}-${o.dueDate}`}
            occurrence={o}
            today={today}
            // In a past cycle every unpaid bill is unattended; in the current one only carried-over ones are.
            variant={!current || carriedKeys.has(`${o.bill.id}|${o.dueDate}`) ? 'carried' : 'todo'}
            onOpen={() => openBill(o)}
            onPay={() => pay(o)}
          />
        ))
      )}

      <ThemedText type="heading">Attended bills ({attended.length})</ThemedText>
      {attended.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No bills paid or skipped yet.
        </ThemedText>
      ) : (
        attended.map((o) => (
          <OccurrenceRow
            key={`${o.bill.id}-${o.dueDate}`}
            occurrence={o}
            today={today}
            variant="attended"
            onOpen={() => openBill(o)}
          />
        ))
      )}
    </Screen>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  const theme = useTheme();
  return (
    <Card style={styles.tile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type="amount"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={tone ? { color: theme[tone] } : undefined}>
        {value}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  balance: {
    gap: Spacing.one,
  },
  balanceNote: {
    marginTop: Spacing.half,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
