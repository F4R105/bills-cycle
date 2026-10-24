/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, type ThemeName } from '@/constants/theme';
import { useThemePreference } from '@/context/settings';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The palette in effect: light, or the chosen dark style when dark (picked or from the system). */
export function useResolvedScheme(): ThemeName {
  const { theme, darkStyle } = useThemePreference();
  const system = useColorScheme();
  const dark = theme === 'dark' || (theme === 'system' && system === 'dark');
  if (!dark) return 'light';
  return darkStyle === 'midnight' ? 'midnight' : 'dark';
}

export function useTheme() {
  return Colors[useResolvedScheme()];
}
