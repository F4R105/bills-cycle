import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, type IconName } from '@/components/ui/icon';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings';
import { useTheme } from '@/hooks/use-theme';

type Page = {
  title: string;
  body: string;
  icon: IconName;
};

const PAGES: Page[] = [
  {
    title: 'Never lose track\nof a bill',
    body: 'Every bill in one place, and one number that shows what is still unpaid.',
    icon: 'receipt',
  },
  {
    title: 'Plan from salary\nto salary',
    body: 'Cycles follow your pay day. Essential bills carry over, optional ones can wait.',
    icon: 'cycles',
  },
  {
    title: 'Get reminded\nbefore it’s due',
    body: 'Gentle reminders on your phone. No account, and your data never leaves it.',
    icon: 'bell',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  // Measured from the pager itself: at launch the window size can be stale while the splash is up.
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const width = measured || window.width;
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const artSize = Math.min(width * 0.7, 300);

  const { updateSetting } = useSettings();

  // Flipping the setting opens the app's screens; the root layout's guard moves on to Home.
  const finish = () => updateSetting('onboardingSeen', true);
  const next = () => scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          overScrollMode="never"
          bounces={false}
          onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {PAGES.map(({ title, body, icon }, index) => (
            <View key={title} style={[styles.page, { width }]}>
              {/* Concentric accent rings around a solid accent disc. */}
              <View style={[styles.art, { width: artSize, height: artSize }]}>
                <Ring size={artSize} color={theme.accentSoft} faded />
                <Ring size={artSize * 0.74} color={theme.accentSoft} />
                <Ring size={artSize * 0.44} color={theme.accent} />
                <Icon name={icon} size={artSize * 0.18} color={theme.onAccent} />
              </View>

              <View style={styles.dots}>
                {PAGES.map((p, i) => (
                  <View
                    key={p.title}
                    style={[
                      styles.dot,
                      { borderColor: theme.accent },
                      i === index && [styles.dotActive, { backgroundColor: theme.accent }],
                    ]}
                  />
                ))}
              </View>

              <ThemedText type="subtitle" style={styles.title}>
                {title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.body}>
                {body}
              </ThemedText>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, last && styles.footerCentered]}>
          {last ? (
            <PillButton title="START" wide onPress={finish} />
          ) : (
            <>
              <Pressable accessibilityRole="button" onPress={finish} hitSlop={16} style={styles.skip}>
                <ThemedText type="smallBold">SKIP</ThemedText>
              </Pressable>
              <PillButton title="NEXT" onPress={next} />
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Ring({ size, color, faded }: { size: number; color: string; faded?: boolean }) {
  return (
    <View
      style={[styles.ring, { width: size, height: size, backgroundColor: color }, faded && styles.faded]}
    />
  );
}

/** A solid accent pill with a soft accent glow. */
function PillButton({ title, wide, onPress }: { title: string; wide?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        wide && styles.pillWide,
        { backgroundColor: theme.accent, shadowColor: theme.accent },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={[styles.pillText, { color: theme.onAccent }]}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  art: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },
  ring: {
    position: 'absolute',
    borderRadius: Radius.pill,
  },
  faded: {
    opacity: 0.45,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one + Spacing.half,
    marginBottom: Spacing.three,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  dotActive: {
    width: 20,
  },
  title: {
    fontFamily: FontFamily.bold,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  footerCentered: {
    justifyContent: 'center',
  },
  skip: {
    paddingVertical: Spacing.two,
  },
  pill: {
    minHeight: 52,
    minWidth: 112,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  pillWide: {
    minWidth: 240,
  },
  pillText: {
    letterSpacing: 0.6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
