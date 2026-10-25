import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconCircle } from '@/components/ui/icon-circle';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Page = {
  eyebrow: string;
  title: string;
  body: string;
  art: () => React.ReactNode;
};

const PAGES: Page[] = [
  {
    eyebrow: 'Bills cycle',
    title: 'Know what is still unpaid, at a glance',
    body: 'Salary comes in, bills go out, and somewhere in between one gets forgotten. Bills cycle keeps every bill in one place and shows the single number that matters: what you haven’t attended to yet.',
    art: UnattendedArt,
  },
  {
    eyebrow: 'Cycles',
    title: 'Plan salary to salary, not by calendar month',
    body: 'Each cycle runs from one pay day to the next and starts again on its own. Paid early or late? Start the next cycle yourself and add the income you received.',
    art: CyclesArt,
  },
  {
    eyebrow: 'Essential or optional',
    title: 'Not every bill has to be paid every time',
    body: 'Essential bills you miss carry over and add to the next cycle, so rent never slips. Optional ones can simply be skipped when money is tight.',
    art: BillsArt,
  },
  {
    eyebrow: 'Private by design',
    title: 'Reminders on your phone, data stays on your phone',
    body: 'Get a nudge before a bill is due. No account, no sign-in, nothing uploaded. Export a backup whenever you like.',
    art: PrivacyArt,
  },
];

export default function UserGuideScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const finish = () => router.back();
  const next = () => {
    if (last) return finish();
    scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          {last ? null : (
            <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
              <ThemedText type="link" themeColor="textSecondary">
                Skip
              </ThemedText>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {PAGES.map(({ eyebrow, title, body, art: Art }) => (
            <View key={eyebrow} style={[styles.page, { width }]}>
              <View style={styles.art}>
                <Art />
              </View>
              <View style={styles.copy}>
                <ThemedText type="label" themeColor="accent">
                  {eyebrow.toUpperCase()}
                </ThemedText>
                <ThemedText type="subtitle">{title}</ThemedText>
                <ThemedText themeColor="textSecondary">{body}</ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {PAGES.map((p, i) => (
              <View
                key={p.eyebrow}
                style={[
                  styles.dot,
                  { backgroundColor: i === page ? theme.accent : theme.backgroundSelected },
                  i === page && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <Button title={last ? 'Done' : 'Next'} onPress={next} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Mini replica of Home's main card. */
function UnattendedArt() {
  return (
    <View style={styles.stack}>
      <Card style={styles.hero}>
        <ThemedText type="small" themeColor="textSecondary">
          Unattended this cycle
        </ThemedText>
        <ThemedText type="amountLarge">TZS 185,000</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          2 of 7 bills left · Oct – Nov 2026
        </ThemedText>
      </Card>
      <ArtRow icon="receipt" title="Electricity" amount="65,000" badge="Due in 3 days" tone="warning" />
      <ArtRow icon="checkCircle" title="Rent" amount="450,000" badge="Paid" tone="success" />
    </View>
  );
}

function CyclesArt() {
  const theme = useTheme();
  const cycles = [
    { label: 'Sep – Oct', state: 'Closed', tone: 'neutral' as const },
    { label: 'Oct – Nov', state: 'Current', tone: 'accent' as const },
    { label: 'Nov – Dec', state: 'Next', tone: 'neutral' as const },
  ];
  return (
    <Card style={styles.timeline}>
      {cycles.map((c, i) => (
        <View key={c.label} style={styles.timelineRow}>
          <View style={styles.rail}>
            <View
              style={[
                styles.node,
                { backgroundColor: c.tone === 'accent' ? theme.accent : theme.backgroundSelected },
              ]}>
              {c.tone === 'accent' ? <Icon name="renew" size={14} color={theme.onAccent} /> : null}
            </View>
            {i < cycles.length - 1 ? <View style={[styles.line, { backgroundColor: theme.border }]} /> : null}
          </View>
          <View style={styles.timelineText}>
            <ThemedText type="heading">{c.label} 2026</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {i === 1 ? 'Salary in · TZS 1,200,000' : i === 0 ? 'All bills attended' : 'Starts on its own'}
            </ThemedText>
          </View>
          <Badge label={c.state} tone={c.tone} />
        </View>
      ))}
    </Card>
  );
}

function BillsArt() {
  return (
    <View style={styles.stack}>
      <ArtRow icon="home" title="Rent" amount="450,000" badge="Essential · carries over" tone="danger" />
      <ArtRow icon="bills" title="Water" amount="30,000" badge="Essential" tone="accent" />
      <ArtRow icon="pause" title="Netflix" amount="22,000" badge="Optional · skipped" tone="neutral" />
    </View>
  );
}

function PrivacyArt() {
  const theme = useTheme();
  return (
    <View style={styles.stack}>
      <Card style={styles.notification}>
        <View style={[styles.appIcon, { backgroundColor: theme.accent }]}>
          <Icon name="bell" size={18} color={theme.onAccent} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Electricity is due tomorrow</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            TZS 65,000 · tap to mark as paid
          </ThemedText>
        </View>
      </Card>
      <View style={styles.pills}>
        <Badge label="No account" tone="accent" />
        <Badge label="Works offline" tone="accent" />
        <Badge label="Backup anytime" tone="accent" />
      </View>
    </View>
  );
}

function ArtRow({
  icon,
  title,
  amount,
  badge,
  tone,
}: {
  icon: React.ComponentProps<typeof IconCircle>['name'];
  title: string;
  amount: string;
  badge: string;
  tone: React.ComponentProps<typeof Badge>['tone'];
}) {
  return (
    <Card style={styles.row}>
      <IconCircle name={icon} tone={tone} size={40} />
      <View style={styles.flex}>
        <ThemedText type="heading">{title}</ThemedText>
        <Badge label={badge} tone={tone} />
      </View>
      <ThemedText type="amount">{amount}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
    justifyContent: 'center',
  },
  art: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  copy: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  footer: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  dotActive: {
    width: 24,
  },
  stack: {
    gap: Spacing.two,
  },
  hero: {
    paddingVertical: Spacing.four,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  timeline: {
    gap: 0,
    paddingVertical: Spacing.four,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rail: {
    alignItems: 'center',
    width: 28,
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 24,
  },
  timelineText: {
    flex: 1,
    paddingBottom: Spacing.four,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
