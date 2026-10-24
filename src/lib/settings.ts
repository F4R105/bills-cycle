export type ThemePreference = 'system' | 'light' | 'dark';
/** Which palette "dark" uses: true black, or navy Midnight. */
export type DarkStyle = 'black' | 'midnight';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export type Settings = {
  theme: ThemePreference;
  darkStyle: DarkStyle;
  cycleLengthMonths: number;
  notificationsEnabled: boolean;
  reminderDaysBefore: number;
  /** "HH:MM", 24-hour local time. */
  reminderTime: string;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  darkStyle: 'midnight',
  cycleLengthMonths: 1,
  notificationsEnabled: false,
  reminderDaysBefore: 2,
  reminderTime: '09:00',
};

/** Builds typed settings from the key/value rows stored in SQLite. Unknown keys are ignored. */
export function parseSettings(raw: Record<string, string>): Settings {
  const int = (value: string | undefined, fallback: number) => {
    const n = Number.parseInt(value ?? '', 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    // "midnight" used to be a theme of its own; it is now Dark with the Midnight style.
    theme:
      raw.theme === 'midnight'
        ? 'dark'
        : THEMES.includes(raw.theme as ThemePreference)
          ? (raw.theme as ThemePreference)
          : 'system',
    darkStyle:
      raw.darkStyle === 'black' || raw.darkStyle === 'midnight'
        ? raw.darkStyle
        : raw.theme === 'midnight'
          ? 'midnight'
          : DEFAULT_SETTINGS.darkStyle,
    cycleLengthMonths: Math.max(1, int(raw.cycleLengthMonths, DEFAULT_SETTINGS.cycleLengthMonths)),
    notificationsEnabled: raw.notificationsEnabled === 'true',
    reminderDaysBefore: Math.max(0, int(raw.reminderDaysBefore, DEFAULT_SETTINGS.reminderDaysBefore)),
    reminderTime: /^\d{2}:\d{2}$/.test(raw.reminderTime ?? '')
      ? raw.reminderTime
      : DEFAULT_SETTINGS.reminderTime,
  };
}

export function serializeSetting(value: Settings[keyof Settings]): string {
  return String(value);
}
