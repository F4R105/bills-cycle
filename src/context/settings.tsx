import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { ensureCurrentCycle, getAllSettings, setSetting } from '@/db/queries';
import { todayISO } from '@/lib/dates';
import { syncReminders } from '@/lib/notifications';
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSetting,
  type Settings,
  type DarkStyle,
  type ThemePreference,
} from '@/lib/settings';

type SettingsContextValue = {
  settings: Settings;
  /** False until settings have been read from the database; `settings` holds defaults until then. */
  loaded: boolean;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  /** Re-reads settings from the database, e.g. after importing a backup. */
  reloadSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const reloadSettings = useCallback(async () => {
    setSettings(parseSettings(await getAllSettings(db)));
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = parseSettings(await getAllSettings(db));
      if (cancelled) return;
      setSettings(loaded);
      setLoaded(true);
      // Roll over any cycles that ended while the app was closed, then refresh reminders.
      await ensureCurrentCycle(db, todayISO(), loaded.cycleLengthMonths);
      await syncReminders(db);
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    const scheme = { system: 'unspecified', light: 'light', dark: 'dark' } as const;
    Appearance.setColorScheme(scheme[settings.theme]);
  }, [settings.theme]);

  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
      await setSetting(db, key, serializeSetting(value));
    },
    [db]
  );

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSetting, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}

/** The theme choice and dark style; defaults outside the provider. */
export function useThemePreference(): { theme: ThemePreference; darkStyle: DarkStyle } {
  const settings = useContext(SettingsContext)?.settings ?? DEFAULT_SETTINGS;
  return { theme: settings.theme, darkStyle: settings.darkStyle };
}
