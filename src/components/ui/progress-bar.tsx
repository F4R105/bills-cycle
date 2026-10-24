import { StyleSheet, View, type ColorValue } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A thin rounded bar filled to `value` (0–1). */
export function ProgressBar({ value, color }: { value: number; color?: ColorValue }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color ?? theme.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});
