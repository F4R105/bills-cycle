import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Semantic icon names mapped to SF Symbols (iOS) and Material Symbols (Android, web). */
const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  cycles: { ios: 'calendar.badge.clock', android: 'event_repeat' },
  bills: { ios: 'list.bullet.rectangle.fill', android: 'receipt_long' },
  settings: { ios: 'gearshape.fill', android: 'settings' },
  tools: { ios: 'wrench.and.screwdriver.fill', android: 'handyman' },
  renew: { ios: 'arrow.triangle.2.circlepath', android: 'autorenew' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  calculator: { ios: 'plus.forwardslash.minus', android: 'calculate' },
  reports: { ios: 'chart.bar.fill', android: 'bar_chart' },
  income: { ios: 'banknote.fill', android: 'payments' },
  wallet: { ios: 'wallet.pass.fill', android: 'account_balance_wallet' },
  receipt: { ios: 'doc.text.fill', android: 'receipt_long' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  add: { ios: 'plus', android: 'add' },
  close: { ios: 'xmark', android: 'close' },
  backspace: { ios: 'delete.left', android: 'backspace' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  palette: { ios: 'paintpalette.fill', android: 'palette' },
  bell: { ios: 'bell.fill', android: 'notifications' },
  export: { ios: 'square.and.arrow.up', android: 'upload' },
  import: { ios: 'square.and.arrow.down', android: 'download' },
  trash: { ios: 'trash.fill', android: 'delete' },
  info: { ios: 'info.circle.fill', android: 'info' },
  edit: { ios: 'pencil', android: 'edit' },
  pause: { ios: 'pause.fill', android: 'pause' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  clock: { ios: 'clock.fill', android: 'schedule' },
  trend: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: ColorValue }) {
  const theme = useTheme();
  const { ios, android } = ICONS[name];
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      size={size}
      tintColor={color ?? theme.text}
      resizeMode="scaleAspectFit"
    />
  );
}
