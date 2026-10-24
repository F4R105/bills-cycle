import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeaderButton } from '@/components/ui/header-button';
import { Spacing } from '@/constants/theme';

type SheetProps = {
  title: string;
  subtitle?: string;
  /** For sheets with a fixed detent: content scrolls under a fixed header. */
  scroll?: boolean;
  /** For sheets with a fixed detent whose content stretches to fill it, without scrolling. */
  fill?: boolean;
  children: React.ReactNode;
};

/** Content of a bottom sheet (formSheet route): a title row with a close button, then the body. */
export function Sheet({ title, subtitle, scroll, fill, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const bottom = { paddingBottom: insets.bottom + Spacing.four };

  return (
    <ThemedView style={(scroll || fill) && styles.fill}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="heading">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <HeaderButton icon="close" label="Close" onPress={() => router.back()} />
      </View>
      {scroll ? (
        <ScrollView
          style={styles.fill}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, bottom]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, bottom, fill && styles.fill]}>{children}</View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  headerText: {
    flex: 1,
  },
  body: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingTop: Spacing.two,
  },
});
