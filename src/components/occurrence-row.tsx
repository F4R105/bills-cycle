import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import type { IconName } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { dueLabel, type Occurrence } from '@/lib/budget';
import { daysBetween, formatDate, type ISODate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

type OccurrenceRowProps = {
  occurrence: Occurrence;
  today: ISODate;
  /** `carried`: unattended from an earlier cycle. `attended`: paid or skipped. */
  variant: 'todo' | 'carried' | 'attended';
  onOpen: () => void;
  onPay?: () => void;
  onSkip?: () => void;
  onUndo?: () => void;
};

export function OccurrenceRow({
  occurrence: { bill, dueDate, record },
  today,
  variant,
  onOpen,
  onPay,
  onSkip,
  onUndo,
}: OccurrenceRowProps) {
  let badge: { label: string; tone: BadgeTone };
  let icon: IconName = 'receipt';
  if (variant === 'attended') {
    const skipped = record?.status === 'skipped';
    badge = skipped
      ? { label: 'Skipped', tone: 'neutral' }
      : { label: `Paid ${formatDate(record!.paidOn, { withYear: false })}`, tone: 'success' };
    icon = skipped ? 'undo' : 'checkCircle';
  } else if (variant === 'carried') {
    badge = { label: 'Unattended', tone: 'danger' };
    icon = 'history';
  } else {
    const days = daysBetween(today, dueDate);
    badge = { label: dueLabel(dueDate, today), tone: days < 0 ? 'danger' : days <= 3 ? 'warning' : 'neutral' };
  }

  const amount =
    record?.status === 'paid' ? record.amountCents : record?.status === 'skipped' ? 0 : bill.amountCents;
  const actionable = variant !== 'attended';

  return (
    <Card>
      <Pressable onPress={onOpen} style={styles.top} accessibilityRole="button">
        <IconCircle name={icon} tone={badge.tone} />
        <View style={styles.titles}>
          <ThemedText type="heading" numberOfLines={1}>
            {bill.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {formatDate(dueDate, { withYear: false })} · {bill.isEssential ? 'Essential' : 'Optional'}
          </ThemedText>
        </View>
        <View style={styles.right}>
          <ThemedText type="amount">{formatMoney(amount)}</ThemedText>
          <Badge {...badge} />
        </View>
      </Pressable>
      {(actionable && (onPay || onSkip)) || (!actionable && onUndo) ? (
        <View style={styles.actions}>
          {actionable && !bill.isEssential && onSkip ? (
            <Button title="Skip" variant="secondary" size="sm" onPress={onSkip} />
          ) : null}
          {actionable && onPay ? <Button title="Pay" icon="check" size="sm" onPress={onPay} /> : null}
          {!actionable && onUndo ? (
            <Button title="Undo" icon="undo" variant="ghost" size="sm" onPress={onUndo} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  titles: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    borderTopWidth: 0,
    paddingTop: Spacing.one,
  },
});
