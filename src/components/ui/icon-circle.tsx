import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import type { BadgeTone } from '@/components/ui/badge';
import { useTheme } from '@/hooks/use-theme';

/** A round, softly tinted icon tile used at the start of list rows. */
export function IconCircle({ name, tone = 'neutral', size = 44 }: { name: IconName; tone?: BadgeTone; size?: number }) {
  const theme = useTheme();
  const { color, background } =
    tone === 'neutral'
      ? { color: theme.textSecondary, background: theme.backgroundSelected }
      : { color: theme[tone], background: theme[`${tone}Soft`] };

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
      <Icon name={name} size={size * 0.45} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
