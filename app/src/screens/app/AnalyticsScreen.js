import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useBaby }          from "../../context/BabyContext";
import { usePermissions }   from "../../hooks/usePermissions";
import { useAnalytics, fmtMinutes, fmtTime } from "../../hooks/useAnalytics";
import MiniBarChart         from "../../components/charts/MiniBarChart";
import { ROLES }            from "../../utils/permissions";
import { exportEventsToCsvFile } from "../../utils/csvExport";
import { useTheme }         from "../../context/ThemeContext";
import { useLanguage }      from "../../context/LanguageContext";

// ── Stat card ────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "#e3f2fd", textColor = "#1565c0" }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ── Section header ────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ── Insight card (themed) ──────────────────────────────────
function InsightCard({ icon, title, value, subtitle, bgColor, valueColor }) {
  const { theme } = useTheme();
  return (
    <View style={[insightCardStyles.card, { backgroundColor: bgColor ?? theme.card }]}>
      <Text style={insightCardStyles.icon}>{icon}</Text>
      <Text style={[insightCardStyles.title, { color: theme.textMuted }]}>{title}</Text>
      <Text style={[insightCardStyles.value, { color: valueColor ?? theme.text }]}>{value}</Text>
      {subtitle ? (
        <Text style={[insightCardStyles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const insightCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    gap: 3,
    minWidth: "30%",
  },
  icon:     { fontSize: 20, marginBottom: 2 },
  title:    { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  value:    { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 11, marginTop: 1 },
});

export default function AnalyticsScreen() {
  const { activeBaby, activeBabyId } = useBaby();
  const { myRole }                   = usePermissions();
  const { theme }                    = useTheme();
  const { t }                        = useLanguage();

  const [range, setRange]            = useState(7); // 7 or 30
  const [exporting, setExporting]    = useState(false);

  const { stats, insights, events, loading, error, refresh } = useAnalytics(activeBabyId, range);
  const [refreshing, setRefreshing]        = useState(false);

  const isPediatrician = myRole === ROLES.PEDIATRICIAN;

  const handleExport = async () => {
    if (Platform.OS === "web") return;
    setExporting(true);
    try {
      await exportEventsToCsvFile(events, activeBaby?.name ?? "baby");
    } catch (e) {
      console.error("[Analytics] export error:", e);
    } finally {
      setExporting(false);
    }
  };

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (!activeBaby) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('noBabySelectedShort')}</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565c0" />
        <Text style={styles.loadingText}>{t('loadingStats')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('couldNotLoadAnalytics')}</Text>
      </View>
    );
  }

  // Chart data helpers
  const chartData   = (range === 7 ? stats.week : stats.month) ?? [];
  const feedChart   = chartData.map((d) => ({ ...d, value: d.feedingMl }));
  const sleepChart  = chartData.map((d) => ({ ...d, value: d.sleepMin }));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Baby name + export button */}
      <View style={styles.titleRow}>
        <Text style={styles.babyTitle}>{activeBaby.name}</Text>
        {Platform.OS !== "web" ? (
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExport}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Export to CSV"
          >
            {exporting
              ? <ActivityIndicator size="small" color="#1565c0" />
              : <Text style={styles.exportBtnText}>{t('exportCsv')}</Text>
            }
          </TouchableOpacity>
        ) : null}
      </View>
      {/* Pediatrician notice */}
      {isPediatrician ? (
        <View style={styles.pediBanner}>
          <Text style={styles.pediBannerText}>
            {t('viewingAggregatedOnly')}
          </Text>
        </View>
      ) : null}

      {/* ── Today Summary ─────────────────────────────────── */}
      <SectionHeader title={t('today')} />
      <View style={styles.cardGrid}>
        <StatCard
          icon="🍼"
          label={t('feeding')}
          value={stats.todayFeedTotal > 0 ? `${stats.todayFeedTotal} ml` : "—"}
          sub={stats.todayFeedCount > 0 ? `${stats.todayFeedCount} ${t('sessions')}` : null}
          color="#e3f2fd"
          textColor="#1565c0"
        />
        <StatCard
          icon="😴"
          label={t('sleep')}
          value={fmtMinutes(stats.todaySleepTotal)}
          sub={stats.todaySleepCount > 0 ? `${stats.todaySleepCount} ${t('sessions')}` : null}
          color="#ede7f6"
          textColor="#4527a0"
        />
        <StatCard
          icon="💩"
          label={t('poops')}
          value={String(stats.todayPoopCount || "—")}
          color="#fff8e1"
          textColor="#e65100"
        />
        <StatCard
          icon="💧"
          label={t('pees')}
          value={String(stats.todayPeeCount || "—")}
          color="#e0f7fa"
          textColor="#00695c"
        />
      </View>

      {/* ── Last 24h ──────────────────────────────────────── */}
      <SectionHeader title={t('last24h')} />
      <View style={styles.cardRow}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>
            {stats.last24FeedTotal > 0 ? `${stats.last24FeedTotal} ml` : "—"}
          </Text>
          <Text style={styles.summaryLabel}>{t('totalFeeding')}</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>
            {fmtMinutes(stats.last24SleepTotal)}
          </Text>
          <Text style={styles.summaryLabel}>{t('totalSleep')}</Text>
        </View>
      </View>

      {/* Last events */}
      <View style={styles.cardRow}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>
            {fmtTime(stats.lastFeeding?.time)}
          </Text>
          <Text style={styles.summaryLabel}>{t('lastFeeding')}</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>
            {fmtTime(stats.lastSleep?.time)}
          </Text>
          <Text style={styles.summaryLabel}>{t('lastSleep')}</Text>
        </View>
      </View>

      {/* ── Sleep stats ────────────────────────────────────── */}
      <SectionHeader title={t('sleepAverages')} />
      <View style={styles.cardRow}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>{fmtMinutes(stats.avgSleep)}</Text>
          <Text style={styles.summaryLabel}>{t('avgSession')}</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>{fmtMinutes(stats.longestSleep)}</Text>
          <Text style={styles.summaryLabel}>{t('longestSession')}</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>{fmtMinutes(stats.avgFeeding)}</Text>
          <Text style={styles.summaryLabel}>{t('avgFeeding')}</Text>
        </View>
      </View>

      {/* ── Chart range toggle ────────────────────────────── */}
      <View style={styles.rangeToggle}>
        {[7, 30].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>
              {r === 7 ? t('sevenDays') : t('thirtyDays')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Feeding chart ─────────────────────────────────── */}
      <SectionHeader title={t('feedingChartTitle', { n: range })} />
      <View style={styles.chartCard}>
        <MiniBarChart
          data={feedChart}
          color="#1565c0"
          height={100}
          formatValue={(v) => `${v}`}
          unit=" ml"
        />
        <Text style={styles.chartNote}>{t('mlPerDay')}</Text>
      </View>

      {/* ── Sleep chart ───────────────────────────────────── */}
      <SectionHeader title={t('sleepChartTitle', { n: range })} />
      <View style={styles.chartCard}>
        <MiniBarChart
          data={sleepChart}
          color="#4527a0"
          height={100}
          formatValue={(v) => fmtMinutes(v)}
        />
        <Text style={styles.chartNote}>{t('minPerDay')}</Text>
      </View>

      {/* ── Sleep breakdown ──────────────────────────────── */}
      {(stats.avgNapDuration > 0 || stats.avgNightDuration > 0) ? (
        <>
          <SectionHeader title={t('sleepBreakdown')} />
          <View style={styles.cardRow}>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryValue}>{fmtMinutes(stats.avgNapDuration)}</Text>
              <Text style={styles.summaryLabel}>{t('avgNap')}</Text>
            </View>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryValue}>{fmtMinutes(stats.avgNightDuration)}</Text>
              <Text style={styles.summaryLabel}>{t('avgNight')}</Text>
            </View>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryValue}>{fmtMinutes(stats.todayNapTotal)}</Text>
              <Text style={styles.summaryLabel}>{t('todayNaps')}</Text>
            </View>
          </View>
        </>
      ) : null}

      {/* ── Insights ─────────────────────────────────────── */}
      {!isPediatrician ? (
        <>
          <SectionHeader title={t('insights')} />
          <View style={styles.cardRow}>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryValue}>
                {insights.avgFeedingGapMin != null ? fmtMinutes(insights.avgFeedingGapMin) : "—"}
              </Text>
              <Text style={styles.summaryLabel}>{t('avgGapBetweenFeedings')}</Text>
            </View>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryValue}>
                {insights.avgSleepOnsetAfterFeedingMin != null
                  ? fmtMinutes(insights.avgSleepOnsetAfterFeedingMin)
                  : "—"}
              </Text>
              <Text style={styles.summaryLabel}>{t('sleepAfterFeeding')}</Text>
            </View>
          </View>
          {insights.sleepTrendPercent != null ? (
            <View style={styles.insightTrend}>
              <Text style={styles.trendIcon}>
                {insights.sleepTrendDirection === "up" ? "↑" : insights.sleepTrendDirection === "down" ? "↓" : "→"}
              </Text>
              <Text style={styles.trendText}>
                {insights.sleepTrendDirection === "up"
                  ? t('sleepImproved', { pct: Math.abs(insights.sleepTrendPercent) })
                  : insights.sleepTrendDirection === "down"
                    ? t('sleepDeclined', { pct: insights.sleepTrendPercent })
                    : t('sleepStable')}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {/* ── Patterns ──────────────────────────────────────── */}
      {!isPediatrician && (
        insights.avgFeedingGapMin != null ||
        insights.sleepTrendPercent != null ||
        insights.avgSleepOnsetAfterFeedingMin != null
      ) ? (
        <>
          <SectionHeader title={t('patterns')} />
          <View style={styles.cardRow}>
            {insights.avgFeedingGapMin != null ? (
              <InsightCard
                icon="🍼"
                title={t('feedingRhythm')}
                value={(() => {
                  const h = Math.floor(insights.avgFeedingGapMin / 60);
                  const m = insights.avgFeedingGapMin % 60;
                  return h > 0 ? (m > 0 ? `Every ~${h}h ${m}m` : `Every ~${h}h`) : `Every ~${m}m`;
                })()}
                subtitle={t('avgGapSubtitle')}
                bgColor={theme.primaryLight}
                valueColor={theme.primary}
              />
            ) : null}
            {insights.sleepTrendPercent != null ? (
              <InsightCard
                icon={
                  insights.sleepTrendDirection === "up" ? "📈"
                  : insights.sleepTrendDirection === "down" ? "📉"
                  : "📊"
                }
                title={t('sleepTrend')}
                value={
                  insights.sleepTrendDirection === "stable"
                    ? t('stable')
                    : `${insights.sleepTrendPercent > 0 ? "+" : ""}${insights.sleepTrendPercent}%`
                }
                subtitle={t('vsPreviousWeek')}
                bgColor={
                  insights.sleepTrendDirection === "up" ? theme.successLight
                  : insights.sleepTrendDirection === "down" ? theme.warningLight
                  : theme.card
                }
                valueColor={
                  insights.sleepTrendDirection === "up" ? theme.success
                  : insights.sleepTrendDirection === "down" ? theme.warning
                  : theme.text
                }
              />
            ) : null}
            {insights.avgSleepOnsetAfterFeedingMin != null ? (
              <InsightCard
                icon="😴"
                title={t('fallsAsleep')}
                value={`~${insights.avgSleepOnsetAfterFeedingMin}m after feeding`}
                subtitle={t('avgTimeFromFeedToSleep')}
                bgColor={theme.accentLight}
                valueColor={theme.accent}
              />
            ) : null}
          </View>
        </>
      ) : null}

      {/* ── Detailed table — hidden for pediatricians ─────── */}
      {!isPediatrician ? (
        <>
          <SectionHeader title={t('dailyBreakdown')} />
          <View style={styles.table}>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 2 }]}>{t('day')}</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>{t('feeding')}</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>{t('sleep')}</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>💩</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>💧</Text>
            </View>
            {/* Rows — most recent first */}
            {[...chartData].reverse().map((d, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCell, { flex: 2, color: "#555" }]}>
                  {d.label}
                </Text>
                <Text style={styles.tableCell}>
                  {d.feedingMl > 0 ? `${d.feedingMl}ml` : "—"}
                </Text>
                <Text style={styles.tableCell}>
                  {d.sleepMin > 0 ? fmtMinutes(d.sleepMin) : "—"}
                </Text>
                <Text style={styles.tableCell}>{d.poopCount || "—"}</Text>
                <Text style={styles.tableCell}>{d.peeCount  || "—"}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  centered: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 32,
  },
  emptyText:   { color: "#888", fontSize: 15 },
  loadingText: { color: "#888", fontSize: 14, marginTop: 12 },
  errorText:   { color: "#c62828", fontSize: 14, textAlign: "center" },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  babyTitle: { fontSize: 22, fontWeight: "800", color: "#1a1a2e" },
  exportBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { fontSize: 12, color: "#1565c0", fontWeight: "600" },

  insightTrend: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    gap: 8,
  },
  trendIcon: { fontSize: 20, fontWeight: "700", color: "#2e7d32" },
  trendText: { fontSize: 13, color: "#2e7d32", fontWeight: "500", flex: 1 },

  pediBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  pediBannerText: { fontSize: 13, color: "#2e7d32", fontWeight: "600" },

  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },

  // Stat cards (2x2 grid)
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  statIcon:  { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  statSub:   { fontSize: 11, color: "#999" },

  // Summary cards (horizontal row)
  cardRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#1a1a2e" },
  summaryLabel: { fontSize: 12, color: "#999", marginTop: 3 },

  // Range toggle
  rangeToggle: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 3,
    marginTop: 20,
    marginBottom: 4,
    alignSelf: "center",
    width: "60%",
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  rangeBtnActive: { backgroundColor: "#fff", elevation: 1 },
  rangeBtnText: { fontSize: 13, color: "#888", fontWeight: "600" },
  rangeBtnTextActive: { color: "#1a1a2e" },

  // Chart
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  chartNote: { fontSize: 10, color: "#ccc", textAlign: "right", marginTop: 4 },

  // Table
  table: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRowAlt:   { backgroundColor: "#fafafa" },
  tableHeader:   { backgroundColor: "#f5f5f5" },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    textAlign: "center",
  },
  tableCellHeader: {
    fontWeight: "700",
    color: "#888",
    fontSize: 11,
    textTransform: "uppercase",
  },
});
