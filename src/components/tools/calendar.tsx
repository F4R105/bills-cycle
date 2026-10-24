import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HeaderButton } from '@/components/ui/header-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, daysInMonth, formatDate, parseISODate, type ISODate } from '@/lib/dates';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

type CalendarProps = {
  today: ISODate;
  /** The current cycle's dates, highlighted as a band. */
  cycle: { start: ISODate; end: ISODate } | null;
};

/** Month grid showing today and the current cycle as a band. */
export function Calendar({ today, cycle }: CalendarProps) {
  const theme = useTheme();
  const now = parseISODate(today);
  const [month, setMonth] = useState({ year: now.year, month: now.month });

  const days = daysInMonth(month.year, month.month);
  // Monday-first offset of the 1st.
  const offset = (new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay() + 6) % 7;

  const shift = (delta: number) => {
    const index = month.year * 12 + (month.month - 1) + delta;
    setMonth({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  };

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const cycleDays = cycle ? daysBetween(cycle.start, cycle.end) + 1 : 0;
  const cycleDay = cycle ? Math.min(cycleDays, daysBetween(cycle.start, today) + 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HeaderButton icon="chevronLeft" label="Previous month" onPress={() => shift(-1)} />
        <ThemedText type="heading" style={styles.monthTitle}>
          {MONTHS[month.month - 1]} {month.year}
        </ThemedText>
        <HeaderButton icon="chevronRight" label="Next month" onPress={() => shift(1)} />
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <ThemedText key={i} type="label" themeColor="textSecondary" style={styles.weekday}>
            {d}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, i) => {
            if (day == null) return <View key={i} style={styles.cell} />;
            const date = iso(month.year, month.month, day);
            const inCycle = !!cycle && date >= cycle.start && date <= cycle.end;
            const edge = !!cycle && (date === cycle.start || date === cycle.end);
            const isToday = date === today;
            const filled = isToday || edge;

            return (
              <View key={i} style={styles.cell} accessible accessibilityLabel={formatDate(date)}>
                {/* The cycle band: rounded at its ends and at week edges. */}
                {inCycle ? (
                  <View
                    style={[
                      styles.band,
                      { backgroundColor: theme.accentSoft },
                      (date === cycle!.start || i === 0) && styles.bandStart,
                      (date === cycle!.end || i === 6) && styles.bandEnd,
                    ]}
                  />
                ) : null}
                <View style={[styles.day, filled && { backgroundColor: isToday ? theme.accent : theme.text }]}>
                  <ThemedText
                    type={filled ? 'smallBold' : 'small'}
                    style={{ color: filled ? (isToday ? theme.onAccent : theme.background) : theme.text }}>
                    {day}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <Legend color={theme.accent} label={`Today, ${formatDate(today, { withYear: false })}`} round />
        {cycle ? (
          <Legend
            color={theme.accentSoft}
            label={`Cycle ${formatDate(cycle.start, { withYear: false })} – ${formatDate(cycle.end, { withYear: false })} · day ${cycleDay} of ${cycleDays}`}
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No cycle yet
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function Legend({ color, label, round }: { color: string; label: string; round?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }, round && styles.legendRound]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const CELL = 42;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: Spacing.one,
  },
  cell: {
    flex: 1,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    right: 0,
  },
  bandStart: {
    left: 4,
    borderTopLeftRadius: CELL,
    borderBottomLeftRadius: CELL,
  },
  bandEnd: {
    right: 4,
    borderTopRightRadius: CELL,
    borderBottomRightRadius: CELL,
  },
  day: {
    width: CELL - 6,
    height: CELL - 6,
    borderRadius: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendSwatch: {
    width: 14,
    height: 10,
    borderRadius: 5,
  },
  legendRound: {
    width: 10,
  },
});
