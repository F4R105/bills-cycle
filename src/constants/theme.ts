/**
 * Design tokens: palettes for each theme, fonts and spacing.
 * Colors are always read through `useTheme()` so the active theme applies everywhere.
 */

import '@/global.css';

import { Platform } from 'react-native';

const light = {
  text: '#0E1116',
  textSecondary: '#6B7280',
  background: '#F4F5F7',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#EBEDF0',
  border: '#E3E5E9',
  accent: '#0F9D7A',
  accentSoft: '#DDF4EC',
  onAccent: '#FFFFFF',
  success: '#12804F',
  successSoft: '#DCF3E6',
  warning: '#A15C00',
  warningSoft: '#FCEFD6',
  danger: '#C8322F',
  dangerSoft: '#FBE3E1',
  tabBar: '#16181D',
  tabBarText: '#9CA3AF',
  shadow: '#0E1116',
  /** Chart series (validated for CVD separation and contrast on cards). */
  chartPaid: '#0F9D7A',
  chartIncome: '#6D5BD0',
};

export type Palette = typeof light;

const dark: Palette = {
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  background: '#0B0C0E',
  backgroundElement: '#17191D',
  backgroundSelected: '#23262C',
  border: '#2A2D33',
  accent: '#2CC9A0',
  accentSoft: '#123B31',
  onAccent: '#04140F',
  success: '#3DD68C',
  successSoft: '#123824',
  warning: '#FFB224',
  warningSoft: '#3A2A0D',
  danger: '#FF6B66',
  dangerSoft: '#3D1716',
  tabBar: '#202329',
  tabBarText: '#8B919C',
  shadow: '#000000',
  chartPaid: '#17A07D',
  chartIncome: '#8572F0',
};

const midnight: Palette = {
  text: '#E6EDF7',
  textSecondary: '#93A4BD',
  background: '#0F1B2D',
  backgroundElement: '#16263D',
  backgroundSelected: '#1D3150',
  border: '#243A5C',
  accent: '#2CC9A0',
  accentSoft: '#15403F',
  onAccent: '#04140F',
  success: '#43D99A',
  successSoft: '#153B3A',
  warning: '#FFC15C',
  warningSoft: '#3B3324',
  danger: '#FF7A7A',
  dangerSoft: '#3E2533',
  tabBar: '#0A1424',
  tabBarText: '#8295B0',
  shadow: '#000000',
  chartPaid: '#17A07D',
  chartIncome: '#8572F0',
};

export const Colors = { light, dark, midnight } as const;

export type ThemeName = keyof typeof Colors;
export type ThemeColor = keyof Palette;

/** One family per weight: Android ignores `fontWeight` for custom fonts. */
export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  /** Amounts and big numbers. */
  numberMedium: 'SpaceGrotesk_500Medium',
  numberBold: 'SpaceGrotesk_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  default: { mono: 'monospace' },
  web: { mono: 'var(--font-mono)' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

/** Height of the floating tab bar, excluding the bottom safe-area inset. */
export const TabBarHeight = 64;
/** Space content must leave below itself on tab screens (bar + its margin). */
export const TabBarClearance = TabBarHeight + Spacing.three * 2;
export const MaxContentWidth = 800;
