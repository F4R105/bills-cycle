import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fab } from '@/components/ui/fab';
import { IconCircle } from '@/components/ui/icon-circle';
import { Screen } from '@/components/ui/screen';
import { Chips } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { listBills } from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { formatDate, nextOccurrence, ordinal, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { Bill } from '@/lib/types';

type Filter = 'active' | 'essential' | 'optional' | 'paused';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'essential', label: 'Essential' },
  { value: 'optional', label: 'Optional' },
  { value: 'paused', label: 'Paused' },
];

export default function BillsScreen() {
  const { data: bills } = useDbData(listBills);
  const [filter, setFilter] = useState<Filter>('active');
  const today = todayISO();

  const active = bills?.filter((b) => b.active) ?? [];
  const monthlyTotal = active.reduce((sum, b) => sum + b.amountCents, 0);
  const visible =
    bills?.filter((b) =>
      filter === 'paused' ? !b.active : b.active && (filter === 'active' || b.isEssential === (filter === 'essential'))
    ) ?? [];

  const addBill = () => router.push('/bill-form');

  return (
    <Screen
      tab
      title="Bills"
      subtitle={bills?.length ? `${active.length} active · ${formatMoney(monthlyTotal)} a month` : undefined}
      bottomInset={72}
      overlay={bills ? <Fab icon="add" label="Add a bill" onPress={addBill} pulse={bills.length === 0} /> : null}>
      {bills && bills.length === 0 ? (
        <EmptyState title="No bills yet" message="Add the bills and subscriptions you pay every month.">
          <Button title="Add a bill" icon="add" onPress={addBill} />
        </EmptyState>
      ) : null}

      {bills?.length ? <Chips options={FILTERS} value={filter} onChange={setFilter} /> : null}

      {bills?.length && visible.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          No bills here.
        </ThemedText>
      ) : null}

      {visible.map((bill) => (
        <BillRow key={bill.id} bill={bill} today={today} />
      ))}
    </Screen>
  );
}

function BillRow({ bill, today }: { bill: Bill; today: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/bill/[id]', params: { id: bill.id } })}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.pressed]}>
          <IconCircle name="receipt" tone={bill.active ? (bill.isEssential ? 'accent' : 'neutral') : 'warning'} />
          <View style={styles.flex}>
            <ThemedText type="heading" numberOfLines={1}>
              {bill.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {bill.active
                ? `Next ${formatDate(nextOccurrence(bill.dueDay, bill.startDate, today), { withYear: false })} · every ${ordinal(bill.dueDay)}`
                : `Paused · every ${ordinal(bill.dueDay)}`}
            </ThemedText>
          </View>
          <View style={styles.right}>
            <ThemedText type="amount">{formatMoney(bill.amountCents)}</ThemedText>
            <Badge
              label={bill.isEssential ? 'Essential' : 'Optional'}
              tone={bill.isEssential ? 'accent' : 'neutral'}
            />
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
});
