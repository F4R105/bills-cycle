import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/** A soft, filled status pill. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();
  const { color, background } =
    tone === 'neutral'
      ? { color: theme.textSecondary, background: theme.backgroundSelected }
      : { color: theme[tone], background: theme[`${tone}Soft`] };

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <ThemedText type="label" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.half + 1,
  },
});
