import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from "react-native";
import { useBaby }           from "../../context/BabyContext";
import { useTheme }          from "../../context/ThemeContext";
import { usePermissions }    from "../../hooks/usePermissions";
import { useGrowth }         from "../../hooks/useGrowth";
import { validateWeight }    from "../../utils/validation";
import { showAlert, showConfirm } from "../../utils/platform";
import DatePickerInput       from "../../components/DatePickerInput";

function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function dateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// WHO weight-for-age (kg) — Girls, simplified reference points
// [ageMonths, p3, p15, p50, p85, p97]
const WHO_WEIGHT_GIRLS = [
  [0,  2.4, 2.8, 3.3, 3.9, 4.2],
  [1,  3.2, 3.6, 4.2, 4.8, 5.1],
  [2,  3.9, 4.5, 5.1, 5.8, 6.2],
  [3,  4.5, 5.2, 5.8, 6.6, 7.0],
  [4,  5.0, 5.7, 6.4, 7.3, 7.8],
  [6,  5.7, 6.5, 7.3, 8.2, 8.7],
  [9,  6.5, 7.3, 8.2, 9.3, 9.9],
  [12, 7.0, 7.9, 8.9, 10.1, 10.8],
  [18, 7.8, 8.8, 9.9, 11.3, 12.1],
  [24, 8.5, 9.6, 10.8, 12.4, 13.2],
];

function getPercentileForAge(ageMonths) {
  const clampedAge = Math.max(0, Math.min(ageMonths, 24));
  // Find surrounding rows for interpolation
  let lo = WHO_WEIGHT_GIRLS[0];
  let hi = WHO_WEIGHT_GIRLS[WHO_WEIGHT_GIRLS.length - 1];
  for (let i = 0; i < WHO_WEIGHT_GIRLS.length - 1; i++) {
    if (WHO_WEIGHT_GIRLS[i][0] <= clampedAge && WHO_WEIGHT_GIRLS[i + 1][0] >= clampedAge) {
      lo = WHO_WEIGHT_GIRLS[i];
      hi = WHO_WEIGHT_GIRLS[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0];
  const t = span === 0 ? 0 : (clampedAge - lo[0]) / span;
  const interp = (col) => lo[col] + t * (hi[col] - lo[col]);
  return {
    p3:  parseFloat(interp(1).toFixed(1)),
    p15: parseFloat(interp(2).toFixed(1)),
    p50: parseFloat(interp(3).toFixed(1)),
    p85: parseFloat(interp(4).toFixed(1)),
    p97: parseFloat(interp(5).toFixed(1)),
  };
}

function PercentileBadge({ currentWeight, ageMonths }) {
  const { theme } = useTheme();
  if (ageMonths == null || currentWeight == null) return null;

  const { p3, p15, p50, p85, p97 } = getPercentileForAge(ageMonths);

  let band, isWarning;
  if (currentWeight < p3) {
    band = "Below 3rd percentile — mention to your doctor";
    isWarning = true;
  } else if (currentWeight < p15) {
    band = "3rd–15th percentile";
    isWarning = false;
  } else if (currentWeight < p50) {
    band = "15th–50th percentile";
    isWarning = false;
  } else if (currentWeight < p85) {
    band = "50th–85th percentile";
    isWarning = false;
  } else if (currentWeight < p97) {
    band = "85th–97th percentile";
    isWarning = false;
  } else {
    band = "Above 97th percentile — mention to your doctor";
    isWarning = true;
  }

  const bandBg  = isWarning ? theme.warningLight  ?? "#fff3cd" : theme.successLight ?? "#e8f5e9";
  const bandFg  = isWarning ? theme.warningText   ?? "#7c5800" : theme.successText  ?? "#1b5e20";
  const borderC = isWarning ? theme.warning       ?? "#f59e0b" : theme.success      ?? "#43a047";

  return (
    <View style={[pStyles.wrapper, { borderColor: borderC }]}>
      <Text style={[pStyles.label, { color: theme.textMuted }]}>WHO Percentile Reference</Text>
      <View style={[pStyles.bandChip, { backgroundColor: bandBg }]}>
        <Text style={[pStyles.bandText, { color: bandFg }]}>{band}</Text>
      </View>
      <Text style={[pStyles.refText, { color: theme.textMuted }]}>
        Reference at {Math.round(ageMonths)}mo: p3 = {p3} kg  ·  p50 = {p50} kg  ·  p97 = {p97} kg
      </Text>
    </View>
  );
}

const pStyles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  bandChip: {
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  bandText: {
    fontSize: 13,
    fontWeight: "600",
  },
  refText: {
    fontSize: 11,
    marginTop: 2,
  },
});

// Minimal line-chart using Views
function GrowthChart({ logs }) {
  if (logs.length < 2) {
    return (
      <View style={chartStyles.empty}>
        <Text style={chartStyles.emptyText}>Add at least 2 weight logs to see a chart.</Text>
      </View>
    );
  }

  const weights = logs.map((l) => l.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const chartH = 120;
  const dotSize = 10;

  return (
    <View style={chartStyles.container}>
      {/* Y labels */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.axisLabel}>{maxW.toFixed(1)}</Text>
        <Text style={chartStyles.axisLabel}>{((maxW + minW) / 2).toFixed(1)}</Text>
        <Text style={chartStyles.axisLabel}>{minW.toFixed(1)}</Text>
      </View>

      {/* Chart area */}
      <View style={[chartStyles.area, { height: chartH }]}>
        {logs.map((log, i) => {
          const x = (i / (logs.length - 1)) * 100;
          const y = ((maxW - log.weight) / range) * (chartH - dotSize);
          return (
            <View
              key={log.id ?? i}
              style={[
                chartStyles.dot,
                { left: `${x}%`, top: y },
              ]}
            />
          );
        })}
      </View>

      {/* X labels (first + last) */}
      <View style={chartStyles.xAxis}>
        <Text style={chartStyles.axisLabel}>{formatDate(logs[0].date)}</Text>
        <Text style={chartStyles.axisLabel}>{formatDate(logs[logs.length - 1].date)}</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginBottom: 4 },
  empty: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 13, color: "#aaa", textAlign: "center" },
  yAxis: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 20,
    width: 36,
    justifyContent: "space-between",
  },
  axisLabel: { fontSize: 9, color: "#aaa" },
  area: {
    marginLeft: 40,
    marginRight: 4,
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1565c0",
    marginLeft: -5,
  },
  xAxis: {
    marginLeft: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
});

export default function GrowthScreen() {
  const { activeBaby, activeBabyId } = useBaby();
  const { theme }                    = useTheme();
  const { canEditBaby }              = usePermissions();
  const { logs, loading, error, addLog, removeLog } = useGrowth(activeBabyId);

  const [weight, setWeight]   = useState("");
  const [dateStr, setDateStr] = useState(dateKey(new Date()));
  const [notes, setNotes]     = useState("");
  const [weightError, setWeightError] = useState(null);
  const [saving, setSaving]   = useState(false);

  const handleAdd = async () => {
    const { valid, error: err } = validateWeight(weight);
    if (!valid) { setWeightError(err); return; }
    setWeightError(null);

    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) {
      showAlert("Invalid date", "Please use YYYY-MM-DD format.");
      return;
    }

    setSaving(true);
    try {
      await addLog(parseFloat(weight), date, notes);
      setWeight("");
      setNotes("");
      setDateStr(dateKey(new Date()));
    } catch (e) {
      console.error("[Growth] add error:", e);
      showAlert("Error", "Could not save weight log. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (log) => {
    const ok = await showConfirm("Delete Log", `Delete weight entry of ${log.weight} kg?`);
    if (!ok) return;
    try {
      await removeLog(log.id);
    } catch (e) {
      showAlert("Error", "Could not delete log.");
    }
  };

  const s = makeStyles(theme);

  const birthDateMs = activeBaby?.birthDate
    ? (activeBaby.birthDate?.toDate?.() ?? new Date(activeBaby.birthDate)).getTime()
    : null;
  const ageMonths = (birthDateMs != null && !isNaN(birthDateMs))
    ? Math.max(0, (Date.now() - birthDateMs) / (1000 * 60 * 60 * 24 * 30.44))
    : null;
  const latestWeight = logs.length > 0 ? logs[logs.length - 1].weight : null;

  if (!activeBaby) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyText}>No baby selected.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.title}>📏 Growth — {activeBaby.name}</Text>

      {/* Chart */}
      <View style={s.card}>
        <Text style={s.sectionHeader}>Weight Over Time (kg)</Text>
        <GrowthChart logs={logs} />
        {ageMonths != null && logs.length > 0 ? (
          <PercentileBadge currentWeight={latestWeight} ageMonths={ageMonths} />
        ) : null}
      </View>

      {/* Add form */}
      {canEditBaby ? (
        <View style={s.card}>
          <Text style={s.sectionHeader}>Add Weight Log</Text>

          <Text style={s.inputLabel}>Weight (kg)</Text>
          <TextInput
            style={[s.input, weightError ? s.inputError : null]}
            value={weight}
            onChangeText={(v) => { setWeight(v); setWeightError(null); }}
            keyboardType="numeric"
            placeholder="e.g. 3.5"
            placeholderTextColor={theme.placeholder}
          />
          {weightError ? <Text style={s.errorText}>{weightError}</Text> : null}

          <Text style={s.inputLabel}>Date</Text>
          <DatePickerInput
            value={dateStr || null}
            onChange={setDateStr}
            placeholder="Tap to choose date"
            maxDate={new Date()}
          />

          <Text style={s.inputLabel}>Notes (optional)</Text>
          <TextInput
            style={[s.input, s.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. After doctor visit"
            placeholderTextColor={theme.placeholder}
            multiline
          />

          <TouchableOpacity
            style={[s.addBtn, saving && s.addBtnDisabled]}
            onPress={handleAdd}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.addBtnText}>Save Weight Log</Text>
            }
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Log history */}
      {logs.length > 0 ? (
        <View style={s.card}>
          <Text style={s.sectionHeader}>History</Text>
          {[...logs].reverse().map((log) => (
            <View key={log.id} style={s.logRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.logWeight}>{log.weight} kg</Text>
                <Text style={s.logDate}>{formatDate(log.date)}</Text>
                {log.notes ? <Text style={s.logNotes}>{log.notes}</Text> : null}
              </View>
              {canEditBaby ? (
                <TouchableOpacity
                  onPress={() => handleDelete(log)}
                  style={s.deleteBtn}
                  accessibilityRole="button"
                >
                  <Text style={s.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={s.emptyText}>No weight logs yet. Add one above.</Text>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { padding: 16, backgroundColor: theme.background, flexGrow: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: theme.inputText,
    backgroundColor: theme.inputBg,
  },
  inputError: { borderColor: theme.danger },
  notesInput: { height: 70, paddingTop: 10, textAlignVertical: "top" },
  errorText: { fontSize: 12, color: theme.danger, marginTop: 4 },
  addBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  logWeight: { fontSize: 16, fontWeight: "700", color: theme.text },
  logDate: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  logNotes: { fontSize: 12, color: theme.textSecondary, fontStyle: "italic", marginTop: 2 },
  deleteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: theme.dangerLight,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 12, color: theme.danger, fontWeight: "600" },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 16 },
});
