import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { getAllSettings, listBills, listPayments } from '@/db/queries';
import { indexPayments, recordKey } from './budget';
import { addDays, occurrencesBetween, parseISODate, todayISO, type ISODate } from './dates';
import { formatMoney } from './money';
import { parseSettings } from './settings';

const CHANNEL_ID = 'bill-reminders';
const LOOKAHEAD_DAYS = 60;
/** iOS keeps at most 64 pending local notifications per app. */
const MAX_SCHEDULED = 60;

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Asks for permission (once) and creates the Android channel. Returns whether reminders can be shown. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Bill reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function atTime(date: ISODate, time: string): Date {
  const { year, month, day } = parseISODate(date);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Rebuilds all scheduled reminders from the database. Safe to call any time:
 * it cancels everything and schedules reminders for unattended occurrences in the next 60 days.
 */
export async function syncReminders(db: SQLiteDatabase) {
  if (!supported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const settings = parseSettings(await getAllSettings(db));
    if (!settings.notificationsEnabled) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;

    const [bills, payments] = await Promise.all([listBills(db), listPayments(db)]);
    const records = indexPayments(payments);
    const today = todayISO();
    const until = addDays(today, LOOKAHEAD_DAYS);
    const now = Date.now();

    const requests: Notifications.NotificationRequestInput[] = [];
    for (const bill of bills.filter((b) => b.active)) {
      const amount = formatMoney(bill.amountCents);
      for (const dueDate of occurrencesBetween(bill.dueDay, bill.startDate, today, until)) {
        if (records.has(recordKey(bill.id, dueDate))) continue;

        const reminders: { kind: string; at: Date; body: string }[] = [
          { kind: 'due', at: atTime(dueDate, settings.reminderTime), body: `${amount} is due today.` },
        ];
        if (settings.reminderDaysBefore > 0) {
          const days = settings.reminderDaysBefore;
          reminders.push({
            kind: 'before',
            at: atTime(addDays(dueDate, -days), settings.reminderTime),
            body: `${amount} is due in ${days} day${days === 1 ? '' : 's'}.`,
          });
        }

        for (const { kind, at, body } of reminders) {
          if (at.getTime() <= now) continue;
          requests.push({
            identifier: `bill-${bill.id}-${dueDate}-${kind}`,
            content: { title: bill.name, body, data: { billId: bill.id, dueDate } },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: at,
              channelId: CHANNEL_ID,
            },
          });
        }
      }
    }

    requests.sort(
      (a, b) =>
        Number((a.trigger as { date: Date }).date) - Number((b.trigger as { date: Date }).date)
    );
    for (const request of requests.slice(0, MAX_SCHEDULED)) {
      await Notifications.scheduleNotificationAsync(request);
    }
  } catch (error) {
    // Reminders are best-effort; never block a save because scheduling failed.
    console.warn('Could not sync reminders', error);
  }
}
