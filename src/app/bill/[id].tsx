import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import {
  deleteBill,
  getBill,
  getCurrentCycle,
  getTrackingStart,
  paymentsForBill,
  setBillActive,
  undoPayment,
} from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { billHistory, type HistoryEntry, type HistoryStatus } from '@/lib/budget';
import { formatDate, ordinal, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { syncReminders } from '@/lib/notifications';

const STATUS: Record<HistoryStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  skipped: { label: 'Skipped', tone: 'neutral' },
  unattended: { label: 'Unattended', tone: 'danger' },
  due: { label: 'Due', tone: 'warning' },
  upcoming: { label: 'Upcoming', tone: 'neutral' },
};

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const billId = Number(id);
  const money = formatMoney;

  const { data, refresh, db } = useDbData(async (db) => {
    const [bill, payments, cycle, trackingStart] = await Promise.all([
      getBill(db, billId),
      paymentsForBill(db, billId),
      getCurrentCycle(db),
      getTrackingStart(db),
    ]);
    if (!bill) return { bill: null };
    const history = billHistory(bill, payments, {
      today: todayISO(),
      currentCycleStart: cycle?.startDate ?? null,
      trackingStart,
    });
    const totalPaid = payments.reduce((sum, p) => sum + (p.status === 'paid' ? p.amountCents : 0), 0);
    return { bill, history, totalPaid, paidCount: payments.filter((p) => p.status === 'paid').length };
  });

  if (!data) return <Screen />;
  if (!data.bill) {
    return (
      <Screen>
        <EmptyState title="Bill not found" message="It may have been deleted." />
      </Screen>
    );
  }

  const { bill, history, totalPaid, paidCount } = data;

  const toggleActive = async () => {
    await setBillActive(db, bill.id, !bill.active);
    await refresh();
    await syncReminders(db);
  };

  const confirmDelete = () =>
    Alert.alert('Delete bill?', `"${bill.name}" and its whole payment history will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBill(db, bill.id);
          await syncReminders(db);
          router.back();
        },
      },
    ]);

  const undo = async (entry: HistoryEntry) => {
    await undoPayment(db, bill.id, entry.dueDate);
    await refresh();
    await syncReminders(db);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: bill.name }} />

      <Card style={styles.summary}>
        <ThemedText type="amountLarge" style={styles.amount}>{money(bill.amountCents)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Every month on the {ordinal(bill.dueDay)} · since {formatDate(bill.startDate)}
        </ThemedText>
        <View style={styles.badges}>
          <Badge
            label={bill.isEssential ? 'Essential' : 'Optional'}
            tone={bill.isEssential ? 'accent' : 'neutral'}
          />
          {!bill.active ? <Badge label="Paused" tone="warning" /> : null}
        </View>
        {bill.notes ? <ThemedText type="small">{bill.notes}</ThemedText> : null}
        <ThemedText type="small" themeColor="textSecondary">
          Total paid: {money(totalPaid)} over {paidCount} payment{paidCount === 1 ? '' : 's'}
        </ThemedText>
        <View style={styles.actions}>
          <Button
            title="Edit"
            size="sm"
            variant="secondary"
            onPress={() => router.push({ pathname: '/bill-form', params: { id: bill.id } })}
          />
          <Button title={bill.active ? 'Pause' : 'Resume'} size="sm" variant="secondary" onPress={toggleActive} />
          <Button title="Delete" size="sm" variant="danger" onPress={confirmDelete} />
        </View>
      </Card>

      <Section title="History">
        {history.length === 0 ? (
          <EmptyState title="No history yet" message="Payments for this bill will show up here." />
        ) : (
          history.map((entry) => (
            <Card key={entry.dueDate} style={styles.historyRow}>
              <View style={styles.historyText}>
                <ThemedText type="heading">{formatDate(entry.dueDate)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {entry.record?.status === 'paid'
                    ? `${money(entry.record.amountCents)} on ${formatDate(entry.record.paidOn)}`
                    : entry.record?.status === 'skipped'
                      ? `Skipped on ${formatDate(entry.record.paidOn)}`
                      : money(bill.amountCents)}
                </ThemedText>
                {entry.record?.note ? <ThemedText type="small">{entry.record.note}</ThemedText> : null}
              </View>
              <View style={styles.historyActions}>
                <Badge {...STATUS[entry.status]} />
                {entry.status === 'unattended' || entry.status === 'due' ? (
                  <Button
                    title="Pay"
                    size="sm"
                    onPress={() =>
                      router.push({ pathname: '/pay', params: { billId: bill.id, dueDate: entry.dueDate } })
                    }
                  />
                ) : entry.record ? (
                  <Button title="Undo" size="sm" variant="ghost" onPress={() => undo(entry)} />
                ) : null}
              </View>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: Spacing.four,
  },
  amount: {
    marginBottom: Spacing.one,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  historyText: {
    flex: 1,
  },
  historyActions: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
});
