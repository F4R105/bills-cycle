import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, TabBarClearance } from '@/constants/theme';

type ScreenProps = ScrollViewProps & {
  /** Fixed title above the scrolling content (tab screens and sheets; pushed screens use the native header). */
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  /** Tab screens need room for the floating tab bar. */
  tab?: boolean;
  /** Extra bottom room, e.g. for a floating action button. */
  bottomInset?: number;
  /** Rendered over the content and outside the scroll view, e.g. a FAB. */
  overlay?: React.ReactNode;
};

export function Screen({
  title,
  subtitle,
  headerAction,
  tab,
  bottomInset = 0,
  overlay,
  children,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const header = title ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <ThemedText type="subtitle" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {headerAction ? <View style={styles.headerActions}>{headerAction}</View> : null}
    </View>
  ) : null;

  const content = (
    <>
      {header}
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (tab ? TabBarClearance + insets.bottom : Spacing.five) + bottomInset },
          contentContainerStyle,
        ]}
        {...rest}>
        {children}
      </ScrollView>
      {overlay}
    </>
  );

  return (
    <ThemedView style={styles.container}>
      {tab ? (
        <SafeAreaView edges={['top']} style={styles.container}>
          {content}
        </SafeAreaView>
      ) : (
        content
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
