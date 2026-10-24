import { FormField, type FormFieldProps } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { formatDate, isValidISODate, todayISO, type ISODate } from '@/lib/dates';

type DateFieldProps = Omit<FormFieldProps, 'value' | 'onChangeText' | 'onChange' | 'hint'> & {
  value: string;
  onChangeDate: (value: ISODate) => void;
};

/** A YYYY-MM-DD text field with a "Today" shortcut and a readable preview. */
export function DateField({ value, onChangeDate, error, ...rest }: DateFieldProps) {
  return (
    <FormField
      value={value}
      onChangeText={onChangeDate}
      placeholder="YYYY-MM-DD"
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      error={error}
      hint={isValidISODate(value) ? formatDate(value) : 'Format: YYYY-MM-DD'}
      accessory={<Button title="Today" variant="secondary" size="sm" onPress={() => onChangeDate(todayISO())} />}
      {...rest}
    />
  );
}
