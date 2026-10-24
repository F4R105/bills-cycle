import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type SectionProps = ViewProps & {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function Section({ title, subtitle, action, children, style, ...rest }: SectionProps) {
  return (
    <View style={[styles.section, style]} {...rest}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <ThemedText type="heading">
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  titles: {
    flex: 1,
  },
});
