import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { HeaderButton } from '@/components/ui/header-button';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { getTrackingStart, listBills, listCycles, listIncomes, listPayments } from '@/db/queries';
import { useDbData } from '@/hooks/use-db-data';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/dates';
import { formatAmount, formatMoney } from '@/lib/money';
import { buildCsv, buildReport, type Attendance, type CycleTrend } from '@/lib/reports';
import { shareTextFile } from '@/lib/share-file';

export default function ReportsScreen() {
  const { data } = useDbData(async (db) => {
    const [cycles, incomes, bills, payments, trackingStart] = await Promise.all([
      listCycles(db),
      listIncomes(db),
      listBills(db),
      listPayments(db),
      getTrackingStart(db),
    ]);
    const input = { cycles, incomes, bills, payments, today: todayISO(), trackingStart };
    return { report: buildReport(input), input };
  });

  const exportCsv = async () => {
    if (!data) return;
    try {
      await shareTextFile({
        name: `bills-report-${todayISO()}.csv`,
        content: buildCsv(data.input),
        mimeType: 'text/csv',
        uti: 'public.comma-separated-values-text',
        dialogTitle: 'Export report',
      });
    } catch (error) {
      Alert.alert('Export failed', String(error));
    }
  };

  const header = <Stack.Screen options={{ headerRight: () => <HeaderButton icon="export" label="Export CSV" onPress={exportCsv} /> }} />;

  if (!data) return <Screen>{header}</Screen>;
  const { report } = data;

  if (data.input.cycles.length === 0) {
    return (
      <Screen>
        {header}
        <EmptyState title="Nothing to report yet" message="Reports appear once you have a cycle with bills." />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <View style={styles.tiles}>
        <StatTile
          label="Monthly bills"
          value={formatMoney(report.commitment.total)}
          detail={`${formatAmount(report.commitment.essential)} essential · ${formatAmount(report.commitment.optional)} optional`}
        />
      </View>
      <View style={styles.tiles}>
        <StatTile label="Carried-over debt" value={formatMoney(report.carriedDebt)} tone={report.carriedDebt ? 'danger' : undefined} />
        <StatTile label="Saved by skipping" value={formatMoney(report.savedBySkipping)} tone="success" />
      </View>

      <TrendChart trend={report.trend} />
      <AttendanceBar attendance={report.attendance} />
      <TopBills topBills={report.topBills} totalPaid={report.totalPaid} />
    </Screen>
  );
}

function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'danger' | 'success';
}) {
  const theme = useTheme();
  return (
    <Card style={styles.tile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="amount" numberOfLines={1} adjustsFontSizeToFit style={tone && { color: theme[tone] }}>
        {value}
      </ThemedText>
      {detail ? (
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const CHART_HEIGHT = 140;

/** Grouped bars per cycle on one TZS axis: income vs paid. Tap a cycle to read its values. */
function TrendChart({ trend }: { trend: CycleTrend[] }) {
  const theme = useTheme();
  const [selected, setSelected] = useState(trend.length - 1);
  const max = Math.max(1, ...trend.flatMap((t) => [t.income, t.paid]));
  const current = trend[selected] ?? trend.at(-1);

  return (
    <Card>
      <ThemedText type="heading">Income vs paid</ThemedText>
      <View style={styles.legend}>
        <LegendItem color={theme.chartIncome} label="Income" />
        <LegendItem color={theme.chartPaid} label="Paid" />
      </View>

      <View style={[styles.chart, { borderBottomColor: theme.border }]}>
        {trend.map((t, i) => (
          <Pressable
            key={t.id}
            style={styles.column}
            onPress={() => setSelected(i)}
            accessibilityRole="button"
            accessibilityLabel={`${t.label}: income ${formatMoney(t.income)}, paid ${formatMoney(t.paid)}`}>
            <View style={[styles.columnBars, i === selected && { backgroundColor: theme.backgroundSelected }]}>
              <Bar value={t.income} max={max} color={theme.chartIncome} />
              <Bar value={t.paid} max={max} color={theme.chartPaid} />
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.axis}>
        {trend.map((t, i) => (
          <ThemedText
            key={t.id}
            type="label"
            themeColor={i === selected ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.axisLabel}>
            {t.label.split(' ')[0]}
          </ThemedText>
        ))}
      </View>

      {current ? (
        <View style={[styles.readout, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{current.label}</ThemedText>
          <ReadoutRow label="Income" value={formatMoney(current.income)} />
          <ReadoutRow label="Paid" value={formatMoney(current.paid)} />
          <ReadoutRow label="Bills due" value={formatMoney(current.totalBills)} />
          <ReadoutRow label="Balance" value={formatMoney(current.balance)} />
        </View>
      ) : null}
    </Card>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const height = value > 0 ? Math.max(4, (value / max) * CHART_HEIGHT) : 0;
  return <View style={[styles.bar, { height, backgroundColor: color }]} />;
}

function ReadoutRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readoutRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.tabular}>
        {value}
      </ThemedText>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

/** One stacked bar of every bill occurrence by outcome, with a labelled legend. */
function AttendanceBar({ attendance }: { attendance: Attendance }) {
  const theme = useTheme();
  const parts = [
    { key: 'onTime', label: 'Paid on time', color: theme.success },
    { key: 'late', label: 'Paid late', color: theme.warning },
    { key: 'skipped', label: 'Skipped', color: theme.textSecondary },
    { key: 'unattended', label: 'Unattended', color: theme.danger },
    { key: 'pending', label: 'Due this cycle', color: theme.backgroundSelected },
  ] as const;
  const total = parts.reduce((s, p) => s + attendance[p.key], 0);
  const attended = attendance.onTime + attendance.late;
  const rate = total - attendance.pending > 0 ? attended / (total - attendance.pending) : null;

  return (
    <Card>
      <ThemedText type="heading">Attendance</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {rate == null ? 'No past bills yet.' : `${Math.round(rate * 100)}% of past bills were paid.`}
      </ThemedText>
      {total > 0 ? (
        <View style={styles.stack}>
          {parts
            .filter((p) => attendance[p.key] > 0)
            .map((p) => (
              <View key={p.key} style={{ flex: attendance[p.key], backgroundColor: p.color }} />
            ))}
        </View>
      ) : null}
      {parts.map((p) => (
        <View key={p.key} style={styles.readoutRow}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: p.color }]} />
            <ThemedText type="small">{p.label}</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.tabular}>
            {attendance[p.key]}
            {total ? ` · ${Math.round((attendance[p.key] / total) * 100)}%` : ''}
          </ThemedText>
        </View>
      ))}
    </Card>
  );
}

function TopBills({
  topBills,
  totalPaid,
}: {
  topBills: ReturnType<typeof buildReport>['topBills'];
  totalPaid: number;
}) {
  const theme = useTheme();
  return (
    <Card>
      <ThemedText type="heading">Where the money went</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatMoney(totalPaid)} paid in total
      </ThemedText>
      {topBills.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No payments yet.
        </ThemedText>
      ) : (
        topBills.map(({ bill, paid, share }) => (
          <View key={bill.id} style={styles.topBill}>
            <View style={styles.readoutRow}>
              <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
                {bill.name}
              </ThemedText>
              <ThemedText type="small" style={styles.tabular}>
                {formatMoney(paid)} · {Math.round(share * 100)}%
              </ThemedText>
            </View>
            <View style={[styles.shareTrack, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.shareFill, { width: `${share * 100}%`, backgroundColor: theme.chartPaid }]} />
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    gap: Spacing.one,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  chart: {
    flexDirection: 'row',
    height: CHART_HEIGHT + Spacing.two,
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.two,
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  columnBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: '100%',
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.one,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  bar: {
    width: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axis: {
    flexDirection: 'row',
  },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
  },
  readout: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
    marginTop: Spacing.one,
  },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  stack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    gap: 2,
    marginVertical: Spacing.one,
  },
  topBill: {
    gap: Spacing.one,
  },
  shareTrack: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  shareFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  flex: {
    flex: 1,
  },
});
