import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'heading'
    | 'label'
    | 'link'
    | 'code'
    | 'amount'
    | 'amountLarge';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? (type === 'link' ? 'accent' : 'text')] },
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  smallBold: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: FontFamily.extrabold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: FontFamily.extrabold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
  },
  link: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  amount: {
    fontFamily: FontFamily.numberBold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  amountLarge: {
    fontFamily: FontFamily.numberBold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
});
