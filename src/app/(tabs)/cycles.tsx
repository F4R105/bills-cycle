import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fab } from '@/components/ui/fab';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { getTrackingStart, listBills, listCycles, listIncomes, listPayments } from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { computeCycle, cycleMonthLabel, type CycleSummary } from '@/lib/budget';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { Cycle } from '@/lib/types';

export default function CyclesScreen() {
  const { data } = useDbData(async (db) => {
    const [cycles, incomes, bills, payments, trackingStart] = await Promise.all([
      listCycles(db),
      listIncomes(db),
      listBills(db),
      listPayments(db),
      getTrackingStart(db),
    ]);
    const today = todayISO();
    return cycles.map((cycle) => ({
      cycle,
      summary: computeCycle({
        cycle,
        incomes: incomes.filter((i) => i.cycleId === cycle.id),
        bills,
        payments,
        today,
        trackingStart: trackingStart ?? cycle.startDate,
      }),
    }));
  });

  const startCycle = () => router.push('/cycle-form');

  return (
    <Screen
      tab
      title="Cycles"
      subtitle="One card per month"
      bottomInset={72}
      overlay={
        data ? (
          <Fab
            icon="renew"
            label={data.length ? 'Start a new cycle' : 'Start your first cycle'}
            onPress={startCycle}
            pulse={data.length === 0}
          />
        ) : null
      }>
      {data && data.length === 0 ? (
        <EmptyState title="No cycles yet" message="Start your first cycle when you get paid. After that, a new one starts automatically every month.">
          <Button title="Start a cycle" icon="renew" onPress={startCycle} />
        </EmptyState>
      ) : null}
      {data?.map(({ cycle, summary }) => <CycleRow key={cycle.id} cycle={cycle} summary={summary} />)}
    </Screen>
  );
}

function CycleRow({ cycle, summary }: { cycle: Cycle; summary: CycleSummary }) {
  const current = cycle.endedOn == null;
  const unattended = summary.items.filter((o) => !o.record).length + summary.carriedOver.length;
  const progress = summary.totalBills > 0 ? summary.paid / summary.totalBills : 1;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/cycle/[id]', params: { id: cycle.id } })}>
      {({ pressed }) => (
        <Card style={pressed && styles.pressed}>
          <View style={styles.top}>
            <View style={styles.flex}>
              <ThemedText type="heading">{cycleMonthLabel(cycle)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDate(summary.range.start, { withYear: false })} – {formatDate(summary.range.end)}
              </ThemedText>
            </View>
            <View style={styles.badges}>
              {cycle.autoStarted ? <Badge label="Auto" /> : null}
              {current ? <Badge label="Current" tone="accent" /> : null}
            </View>
          </View>
          <View style={styles.stats}>
            <Stat label="Income" value={formatMoney(summary.income)} />
            <Stat label="Paid" value={formatMoney(summary.paid)} />
            <Stat label={current ? 'Unattended' : 'Left unattended'} value={String(unattended)} />
          </View>
          <ProgressBar value={progress} />
        </Card>
      )}
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.flex}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="amount" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
