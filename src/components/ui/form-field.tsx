import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FormFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  /** Rendered inside the field before the text, e.g. a "TZS" prefix. */
  prefix?: React.ReactNode;
  /** Rendered inside the field after the text, e.g. a "Today" button. */
  accessory?: React.ReactNode;
  /** Larger number text for the main value of a form, such as an amount. */
  large?: boolean;
};

export function FormField({ label, hint, error, prefix, accessory, large, style, ...rest }: FormFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label.toUpperCase()}
      </ThemedText>
      <View
        style={[
          styles.box,
          { backgroundColor: theme.backgroundElement, borderColor: error ? theme.danger : 'transparent' },
        ]}>
        {prefix}
        <TextInput
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, large && styles.large, { color: theme.text }, style]}
          {...rest}
        />
        {accessory}
      </View>
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one + Spacing.half,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 16,
    paddingVertical: Spacing.two + Spacing.half,
  },
  large: {
    fontFamily: FontFamily.numberBold,
    fontSize: 24,
  },
});
