import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useBaby }          from "../../context/BabyContext";
import { usePermissions }   from "../../hooks/usePermissions";
import { useAnalytics, fmtMinutes, fmtTime } from "../../hooks/useAnalytics";
import MiniBarChart         from "../../components/charts/MiniBarChart";
import { ROLES }            from "../../utils/permissions";

// ── Stat card ────────────────────────────────────────────────
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

// ── Section header ────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function AnalyticsScreen() {
  const { activeBaby, activeBabyId } = useBaby();
  const { myRole }                   = usePermissions();

  const [range, setRange]            = useState(7); // 7 or 30

  const { stats, loading, error, refresh } = useAnalytics(activeBabyId, range);
  const [refreshing, setRefreshing]        = useState(false);

  const isPediatrician = myRole === ROLES.PEDIATRICIAN;

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (!activeBaby) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No baby selected.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565c0" />
        <Text style={styles.loadingText}>Loading statistics…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load analytics. Pull to retry.</Text>
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
      {/* Baby name + pediatrician notice */}
      <Text style={styles.babyTitle}>{activeBaby.name}</Text>
      {isPediatrician ? (
        <View style={styles.pediBanner}>
          <Text style={styles.pediBannerText}>
            👨‍⚕️ Viewing aggregated statistics only
          </Text>
        </View>
      ) : null}

      {/* ── Today Summary ─────────────────────────────────── */}
      <SectionHeader title="Today" />
      <View style={styles.cardGrid}>
        <StatCard
          icon="🍼"
          label="Feeding"
          value={stats.todayFeedTotal > 0 ? `${stats.todayFeedTotal} ml` : "—"}
          sub={stats.todayFeedCount > 0 ? `${stats.todayFeedCount} sessions` : null}
          color="#e3f2fd"
          textColor="#1565c0"
        />
        <StatCard
          icon="😴"
          label="Sleep"
          value={fmtMinutes(stats.todaySleepTotal)}
          sub={stats.todaySleepCount > 0 ? `${stats.todaySleepCount} sessions` : null}
          color="#ede7f6"
          textColor="#4527a0"
        />
        <StatCard
          icon="💩"
          label="Poops"
          value={String(stats.todayPoopCount || "—")}
          color="#fff8e1"
          textColor="#e65100"
        />
        <StatCard
          icon="💧"
          label="Pees"
          value={String(stats.todayPeeCount || "—")}
          color="#e0f7fa"
          textColor="#00695c"
        />
      </View>

      {/* ── Last 24h ──────────────────────────────────────── */}
      <SectionHeader title="Last 24 Hours" />
      <View style={styles.cardRow}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>
            {stats.last24FeedTotal > 0 ? `${stats.last24FeedTotal} ml` : "—"}
          </Text>
          <Text style={styles.summaryLabel}>Total feeding</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>
            {fmtMinutes(stats.last24SleepTotal)}
          </Text>
          <Text style={styles.summaryLabel}>Total sleep</Text>
        </View>
      </View>

      {/* Last events */}
      <View style={styles.cardRow}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>
            {fmtTime(stats.lastFeeding?.time)}
          </Text>
          <Text style={styles.summaryLabel}>Last feeding</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>
            {fmtTime(stats.lastSleep?.time)}
          </Text>
          <Text style={styles.summaryLabel}>Last sleep</Text>
        </View>
      </View>

      {/* ── Sleep stats ────────────────────────────────────── */}
      <SectionHeader title="Sleep Averages" />
      <View style={styles.cardRow}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>{fmtMinutes(stats.avgSleep)}</Text>
          <Text style={styles.summaryLabel}>Avg session</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>{fmtMinutes(stats.longestSleep)}</Text>
          <Text style={styles.summaryLabel}>Longest session</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryValue}>{fmtMinutes(stats.avgFeeding)}</Text>
          <Text style={styles.summaryLabel}>Avg feeding</Text>
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
              {r === 7 ? "7 days" : "30 days"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Feeding chart ─────────────────────────────────── */}
      <SectionHeader title={`Feeding — last ${range} days`} />
      <View style={styles.chartCard}>
        <MiniBarChart
          data={feedChart}
          color="#1565c0"
          height={100}
          formatValue={(v) => `${v}`}
          unit=" ml"
        />
        <Text style={styles.chartNote}>ml per day · today is rightmost bar</Text>
      </View>

      {/* ── Sleep chart ───────────────────────────────────── */}
      <SectionHeader title={`Sleep — last ${range} days`} />
      <View style={styles.chartCard}>
        <MiniBarChart
          data={sleepChart}
          color="#4527a0"
          height={100}
          formatValue={(v) => fmtMinutes(v)}
        />
        <Text style={styles.chartNote}>minutes per day · today is rightmost bar</Text>
      </View>

      {/* ── Detailed table — hidden for pediatricians ─────── */}
      {!isPediatrician ? (
        <>
          <SectionHeader title="Daily Breakdown" />
          <View style={styles.table}>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 2 }]}>Day</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>Feed</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>Sleep</Text>
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

  babyTitle: { fontSize: 22, fontWeight: "800", color: "#1a1a2e", marginBottom: 8 },

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
