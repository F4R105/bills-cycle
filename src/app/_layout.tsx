import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

import { FontFamily, Radius } from '@/constants/theme';
import { SettingsProvider, useSettings } from '@/context/settings';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  if (!ready) return null;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <SettingsProvider>
        <ThemedNavigation />
      </SettingsProvider>
    </SQLiteProvider>
  );
}

/** Sheets slide up over the current screen; their height follows their content. */
const sheet = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: Radius.lg + 6,
} as const;

function ThemedNavigation() {
  const scheme = useResolvedScheme();
  const theme = useTheme();
  const { settings, loaded } = useSettings();

  // Wait for settings so the right theme and first screen (onboarding or Home) show at once.
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'light' ? DefaultTheme : DarkTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.accent,
        background: theme.background,
        card: theme.background,
        text: theme.text,
        border: theme.border,
      },
    };
  }, [scheme, theme]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: FontFamily.bold },
          contentStyle: { backgroundColor: theme.background },
        }}>
        {/* Until onboarding is finished it is the only screen, so a new user starts there. */}
        <Stack.Protected guard={!settings.onboardingSeen}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={settings.onboardingSeen}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="bill/[id]" options={{ title: 'Bill' }} />
          <Stack.Screen name="cycle/[id]" options={{ title: 'Cycle' }} />
          <Stack.Screen name="reports" options={{ title: 'Reports' }} />
          <Stack.Screen name="user-guide" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="cycle-form" options={{ ...sheet, headerShown: false }} />
          <Stack.Screen name="income-form" options={{ ...sheet, headerShown: false }} />
          <Stack.Screen name="pay" options={{ ...sheet, headerShown: false }} />
          <Stack.Screen name="bill-form" options={{ ...sheet, sheetAllowedDetents: [0.92], headerShown: false }} />
          {/* One fixed detent: the tools sheet can't be dragged taller. */}
          <Stack.Screen name="tools" options={{ ...sheet, sheetAllowedDetents: [0.82], headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
