import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

export function EmptyState({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <ThemedText type="default" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {message}
      </ThemedText>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
});
