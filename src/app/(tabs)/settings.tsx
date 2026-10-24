import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormField } from '@/components/ui/form-field';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings';
import { exportData, importData, parseBackup } from '@/db/backup';
import { deleteAllData } from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/dates';
import { ensureNotificationPermission, syncReminders } from '@/lib/notifications';
import type { DarkStyle, ThemePreference } from '@/lib/settings';
import { shareTextFile } from '@/lib/share-file';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const DARK_STYLES: { value: DarkStyle; label: string }[] = [
  { value: 'midnight', label: 'Midnight' },
  { value: 'black', label: 'Black' },
];

const REMINDER_DAYS = ['0', '1', '2', '3', '5', '7'] as const;

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings, updateSetting, reloadSettings } = useSettings();
  const [busy, setBusy] = useState(false);

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled && !(await ensureNotificationPermission())) {
      Alert.alert(
        'Notifications are blocked',
        'Allow notifications for this app in your phone settings to get bill reminders.'
      );
      return;
    }
    await updateSetting('notificationsEnabled', enabled);
    await syncReminders(db);
  };

  const changeReminderDays = async (value: string) => {
    await updateSetting('reminderDaysBefore', Number(value));
    await syncReminders(db);
  };

  const exportBackup = async () => {
    setBusy(true);
    try {
      await shareTextFile({
        name: `bills-backup-${todayISO()}.json`,
        content: JSON.stringify(await exportData(db), null, 2),
        mimeType: 'application/json',
        uti: 'public.json',
        dialogTitle: 'Save your backup',
      });
    } catch (error) {
      Alert.alert('Export failed', String(error));
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    let backup;
    try {
      backup = parseBackup(JSON.parse(await new File(result.assets[0].uri).text()));
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof SyntaxError ? 'The file is not valid JSON.' : String((error as Error).message)
      );
      return;
    }

    const counts = `${backup.data.bills.length} bills, ${backup.data.payments.length} payments, ${backup.data.incomes.length} incomes`;
    Alert.alert('Replace all data?', `This backup has ${counts}. Your current data will be replaced.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await importData(db, backup);
            await reloadSettings();
            await syncReminders(db);
            Alert.alert('Import complete', 'Your data has been restored.');
          } catch (error) {
            Alert.alert('Import failed', String(error));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const confirmDeleteAll = () =>
    Alert.alert(
      'Delete all data?',
      'Bills, payments, income, cycles and settings will be permanently deleted. Export a backup first if you might need them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData(db);
            await reloadSettings();
            await syncReminders(db);
          },
        },
      ]
    );

  return (
    <Screen tab title="Settings">
      <ListGroup title="Appearance">
        <ListRow icon="palette" label="Theme">
          <Segmented<ThemePreference> options={THEMES} value={settings.theme} onChange={(v) => updateSetting('theme', v)} />
        </ListRow>
        <ListRow
          icon="palette"
          label="Dark style"
          description="How Dark looks, including System when your phone is in dark mode.">
          <Segmented<DarkStyle>
            options={DARK_STYLES}
            value={settings.darkStyle}
            onChange={(v) => updateSetting('darkStyle', v)}
          />
        </ListRow>
      </ListGroup>

      <ListGroup title="Cycles">
        <ListRow icon="cycles" label="Cycle length" description="Cycles start again automatically after this long.">
          <Segmented
            options={[
              { value: '1', label: '1 month' },
              { value: '2', label: '2 months' },
              { value: '3', label: '3 months' },
            ]}
            value={String(settings.cycleLengthMonths) as '1' | '2' | '3'}
            onChange={(value) => updateSetting('cycleLengthMonths', Number(value))}
          />
        </ListRow>
      </ListGroup>

      <ListGroup title="Reminders">
        <ListRow
          icon="bell"
          label="Bill notifications"
          description="Local reminders for unpaid bills. Nothing leaves your phone."
          trailing={
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
              thumbColor="#FFFFFF"
            />
          }
        />
        {settings.notificationsEnabled ? (
          <ListRow icon="calendar" label="Days before the due date">
            <Segmented
              options={REMINDER_DAYS.map((d) => ({ value: d, label: d === '0' ? 'Off' : d }))}
              value={String(settings.reminderDaysBefore) as (typeof REMINDER_DAYS)[number]}
              onChange={changeReminderDays}
            />
            <ThemedText type="small" themeColor="textSecondary">
              You&apos;ll also get a reminder on the due date itself.
            </ThemedText>
          </ListRow>
        ) : null}
        {settings.notificationsEnabled ? (
          <ListRow icon="clock" label="Reminder time">
            {/* Keyed so the field resets when the saved value changes (e.g. after an import). */}
            <ReminderTimeField key={settings.reminderTime} />
          </ListRow>
        ) : null}
      </ListGroup>

      <ListGroup title="Data">
        <ListRow
          icon="export"
          label="Export backup"
          description="Everything is stored only on this device."
          onPress={busy ? undefined : exportBackup}
        />
        <ListRow icon="import" label="Import backup" onPress={busy ? undefined : importBackup} />
        <ListRow icon="trash" label="Delete all data" destructive onPress={busy ? undefined : confirmDeleteAll} />
      </ListGroup>

      <View style={styles.about}>
        <ThemedText type="small" themeColor="textSecondary">
          Subscription Tracker {Constants.expoConfig?.version ?? ''} · Amounts in TZS
        </ThemedText>
      </View>
    </Screen>
  );
}

function ReminderTimeField() {
  const db = useSQLiteContext();
  const { settings, updateSetting } = useSettings();
  const [time, setTime] = useState(settings.reminderTime);
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  const save = async () => {
    if (!valid || time === settings.reminderTime) return;
    await updateSetting('reminderTime', time);
    await syncReminders(db);
  };

  return (
    <FormField
      label="24-hour time"
      value={time}
      onChangeText={setTime}
      onBlur={save}
      onSubmitEditing={save}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      placeholder="HH:MM"
      error={time && !valid ? 'Use 24-hour time, e.g. 09:00' : null}
    />
  );
}

const styles = StyleSheet.create({
  about: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
