import { StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';

/** A rounded surface. Light theme gets a soft shadow; dark themes rely on contrast instead. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  const scheme = useResolvedScheme();
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, scheme === 'light' && [styles.shadow, { shadowColor: theme.shadow }], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  shadow: {
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
});
