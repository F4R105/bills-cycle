import { router } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { MaxContentWidth, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'cycles', href: '/cycles', label: 'Cycles', icon: 'cycles' },
  { name: 'bills', href: '/bills', label: 'Bills', icon: 'bills' },
  { name: 'settings', href: '/settings', label: 'Settings', icon: 'settings' },
] as const satisfies readonly { name: string; href: string; label: string; icon: IconName }[];

/** Floating pill tab bar with always-visible labels, plus a round button for the tools sheet. */
export default function AppTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + Spacing.three;

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      {/* TabList must be a direct child of Tabs (that's how Tabs finds its routes), and the
          child of an asChild Slot must get a flat style object, not an array. */}
      <TabList asChild>
        <View style={StyleSheet.flatten([styles.bar, { bottom, backgroundColor: theme.tabBar, shadowColor: theme.shadow }])}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton label={tab.label} icon={tab.icon} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
      <Pressable
        onPress={() => router.push('/tools')}
        accessibilityRole="button"
        accessibilityLabel="Calendar and calculator"
        style={({ pressed }) => [
          styles.tools,
          { bottom, backgroundColor: theme.tabBar, shadowColor: theme.shadow },
          pressed && styles.pressed,
        ]}>
        <Icon name="tools" size={22} color={theme.accent} />
      </Pressable>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { label: string; icon: IconName };

const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { label, icon, isFocused, ...props },
  ref
) {
  const theme = useTheme();
  const color = isFocused ? theme.onAccent : theme.tabBarText;

  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tab,
        isFocused && { backgroundColor: theme.accent },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={20} color={color} />
      <ThemedText type="label" numberOfLines={1} style={[styles.tabLabel, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  bar: {
    position: 'absolute',
    left: Spacing.three,
    // Leave room for the tools button and the gap before it.
    right: Spacing.three + TabBarHeight + Spacing.two,
    maxWidth: MaxContentWidth,
    height: TabBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    padding: Spacing.one + Spacing.half,
    gap: Spacing.one,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderRadius: Radius.pill,
  },
  tabLabel: {
    letterSpacing: 0.2,
  },
  tools: {
    position: 'absolute',
    right: Spacing.three,
    width: TabBarHeight,
    height: TabBarHeight,
    borderRadius: TabBarHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pressed: {
    opacity: 0.75,
  },
});
