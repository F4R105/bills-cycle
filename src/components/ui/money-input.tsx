import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormField, type FormFieldProps } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { CURRENCY, centsToInput, formatAmountInput } from '@/lib/money';
import { useTheme } from '@/hooks/use-theme';
import { requestCalculatorResult } from '@/lib/tool-bridge';

type MoneyInputProps = Omit<FormFieldProps, 'value' | 'onChangeText' | 'keyboardType' | 'prefix'> & {
  /** The grouped text, e.g. "1,250,000". Parse with `parseMoney`. */
  value: string;
  onChangeText: (value: string) => void;
};

/** A TZS amount field that groups digits with commas as you type, with a calculator shortcut. */
export function MoneyInput({ value, onChangeText, accessory, ...rest }: MoneyInputProps) {
  const theme = useTheme();

  const openCalculator = () => {
    requestCalculatorResult((cents) => onChangeText(centsToInput(cents)));
    router.push({ pathname: '/tools', params: { mode: 'calculator' } });
  };

  return (
    <FormField
      value={value}
      onChangeText={(text) => onChangeText(formatAmountInput(text))}
      keyboardType="number-pad"
      large
      placeholder="0"
      prefix={
        <ThemedText type="amount" themeColor="textSecondary">
          {CURRENCY}
        </ThemedText>
      }
      accessory={
        accessory ?? (
          <Pressable
            onPress={openCalculator}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open calculator"
            style={[styles.calc, { backgroundColor: theme.backgroundSelected }]}>
            <Icon name="calculator" size={18} color={theme.textSecondary} />
          </Pressable>
        )
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  calc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
