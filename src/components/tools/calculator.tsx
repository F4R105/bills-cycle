import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  displayValue,
  expressionText,
  formatNumber,
  initialCalc,
  press,
  type CalcKey,
} from '@/lib/calc';

const KEYS: CalcKey[][] = [
  ['C', '%', '⌫', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['.', '0', '='],
];

type CalculatorProps = {
  /** When set, a "Use result" button hands the (rounded) result back as cents. */
  onUseResult?: (cents: number) => void;
};

export function Calculator({ onUseResult }: CalculatorProps) {
  const theme = useTheme();
  const [state, setState] = useState(initialCalc);
  const [copied, setCopied] = useState(false);

  const value = displayValue(state);
  const shown = state.entry === 'Error' ? 'Error' : formatNumber(state.entry || String(value ?? 0));
  const expression = state.tokens.length ? expressionText(state) : '';

  const copy = async () => {
    if (value == null) return;
    await Clipboard.setStringAsync(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const keyStyle = (key: CalcKey) => {
    if (key === '=') return { backgroundColor: theme.accent };
    if (key === 'C' || key === '⌫') return { backgroundColor: theme.dangerSoft };
    if (['÷', '×', '−', '+', '%'].includes(key)) return { backgroundColor: theme.accentSoft };
    return { backgroundColor: theme.backgroundElement };
  };
  const keyColor = (key: CalcKey) =>
    key === '=' ? theme.onAccent : key === 'C' || key === '⌫' ? theme.danger : ['÷', '×', '−', '+', '%'].includes(key) ? theme.accent : theme.text;

  return (
    <View style={styles.container}>
      <View style={[styles.display, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.displayTop}>
          <Pressable
            onPress={copy}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Copied' : 'Copy result'}
            style={({ pressed }) => [styles.copy, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
            <Icon name={copied ? 'check' : 'copy'} size={14} color={copied ? theme.success : theme.textSecondary} />
            <ThemedText type="label" style={{ color: copied ? theme.success : theme.textSecondary }}>
              {copied ? 'COPIED' : 'COPY'}
            </ThemedText>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.expression}>
            {expression || ' '}
          </ThemedText>
        </View>
        <ThemedText
          type="amountLarge"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.value, state.entry === 'Error' && { color: theme.danger }]}>
          {shown}
        </ThemedText>
      </View>

      <View style={styles.keys}>
        {KEYS.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === '⌫' ? 'Backspace' : key}
                onPress={() => setState((s) => press(s, key))}
                style={({ pressed }) => [
                  styles.key,
                  key === '=' && styles.wide,
                  keyStyle(key),
                  pressed && styles.pressed,
                ]}>
                {key === '⌫' ? (
                  <Icon name="backspace" size={22} color={keyColor(key)} />
                ) : (
                  <ThemedText style={[styles.keyLabel, { color: keyColor(key) }]}>{key}</ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {onUseResult ? (
        <Button
          title="Use result"
          icon="check"
          disabled={value == null || value < 0}
          onPress={() => value != null && onUseResult(Math.round(value) * 100)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.three,
  },
  display: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'flex-end',
  },
  displayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  expression: {
    flex: 1,
    textAlign: 'right',
    fontFamily: FontFamily.numberMedium,
  },
  value: {
    fontSize: 44,
    lineHeight: 52,
  },
  keys: {
    flex: 1,
    gap: Spacing.two,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  key: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: {
    flex: 2.08,
  },
  keyLabel: {
    fontFamily: FontFamily.numberMedium,
    fontSize: 24,
    lineHeight: 30,
  },
  pressed: {
    opacity: 0.7,
  },
});
