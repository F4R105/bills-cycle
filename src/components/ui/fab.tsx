import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Spacing, TabBarHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FabProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Gently pulses to draw attention, e.g. when there's no cycle yet. */
  pulse?: boolean;
};

/** Round floating action button that sits above the tab bar, bottom-right. */
export function Fab({ icon, label, onPress, pulse }: FabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (pulse) {
      scale.value = withRepeat(withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1);
    }
  }, [pulse, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: insets.bottom + TabBarHeight + Spacing.three * 2, shadowColor: theme.accent },
        animated,
      ]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
        <Icon name={icon} size={26} color={theme.onAccent} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: Spacing.three,
    borderRadius: 30,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
