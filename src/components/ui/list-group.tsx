import { Children, Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A titled card of rows separated by hairlines, as in a settings screen. */
export function ListGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.group}>
      {title ? (
        <ThemedText type="heading" style={styles.title}>
          {title}
        </ThemedText>
      ) : null}
      <Card style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
            {row}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

type ListRowProps = {
  icon?: IconName;
  label: string;
  description?: string;
  /** Right-side content such as a value, switch or badge. A chevron is shown when pressable and empty. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** Content shown under the row, e.g. a choice of options. */
  children?: React.ReactNode;
};

export function ListRow({ icon, label, description, trailing, onPress, destructive, children }: ListRowProps) {
  const theme = useTheme();
  const color = destructive ? theme.danger : theme.text;

  const body = (
    <View style={styles.rowWrap}>
      <View style={styles.row}>
        {icon ? (
          <View style={[styles.icon, { backgroundColor: destructive ? theme.dangerSoft : theme.backgroundSelected }]}>
            <Icon name={icon} size={18} color={color} />
          </View>
        ) : null}
        <View style={styles.text}>
          <ThemedText style={{ color }}>{label}</ThemedText>
          {description ? (
            <ThemedText type="small" themeColor="textSecondary">
              {description}
            </ThemedText>
          ) : null}
        </View>
        {trailing ?? (onPress ? <Icon name="chevronRight" size={16} color={theme.textSecondary} /> : null)}
      </View>
      {children}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  title: {
    paddingHorizontal: Spacing.one,
  },
  card: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  rowWrap: {
    paddingVertical: Spacing.two + Spacing.half,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
