import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
};

export function Button({ title, icon, variant = 'primary', size = 'md', disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const background = {
    primary: theme.accent,
    secondary: theme.backgroundSelected,
    danger: theme.dangerSoft,
    ghost: 'transparent',
  }[variant];
  const color = {
    primary: theme.onAccent,
    secondary: theme.text,
    danger: theme.danger,
    ghost: theme.accent,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: background },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...rest}>
      <View style={styles.content}>
        {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={color} /> : null}
        <ThemedText type={size === 'sm' ? 'smallBold' : 'heading'} style={{ color }}>
          {title}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  md: {
    minHeight: 52,
    paddingHorizontal: Spacing.four,
  },
  sm: {
    minHeight: 34,
    paddingHorizontal: Spacing.three,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
