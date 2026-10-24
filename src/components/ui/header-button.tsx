import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

/** Round icon button for screen headers. */
export function HeaderButton({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Filled with the accent colour, for a header's main action. */
  accent?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: accent ? theme.accent : theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={20} color={accent ? theme.onAccent : theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
