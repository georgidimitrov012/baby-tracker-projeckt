import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSleepTimer, formatElapsed } from "../hooks/useSleepTimer";
import { usePermissions }               from "../hooks/usePermissions";

/**
 * SleepTimerCard
 *
 * Shows:
 *  - When ACTIVE:  live elapsed time, start time, sleep type badge, stop button (if permitted)
 *  - When INACTIVE: nap/night picker + start button (if permitted)
 *
 * Props:
 *   compact {boolean} - smaller layout for Dashboard
 */
export default function SleepTimerCard({ compact = false }) {
  const {
    isActive,
    elapsedSeconds,
    startedAt,
    starting,
    stopping,
    handleStart,
    handleStop,
  } = useSleepTimer();

  const { canWriteEvents } = usePermissions();
  const [sleepType, setSleepType] = useState("nap");

  const startTimeStr = startedAt
    ? startedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  if (!isActive && !canWriteEvents) return null;

  return (
    <View style={[styles.card, isActive && styles.cardActive, compact && styles.cardCompact]}>

      {isActive ? (
        <>
          <View style={styles.row}>
            <View style={styles.pulse} />
            <Text style={[styles.label, compact && styles.labelSmall]}>
              Baby is sleeping
            </Text>
          </View>

          <Text style={[styles.timer, compact && styles.timerSmall]}>
            {formatElapsed(elapsedSeconds)}
          </Text>

          {startTimeStr ? (
            <Text style={styles.startedAt}>Started at {startTimeStr}</Text>
          ) : null}

          {canWriteEvents ? (
            <TouchableOpacity
              style={[styles.btn, styles.stopBtn, stopping && styles.btnDisabled]}
              onPress={handleStop}
              disabled={stopping}
              accessibilityRole="button"
              accessibilityLabel="Stop sleep timer"
            >
              {stopping
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>⏹  Stop Sleep</Text>
              }
            </TouchableOpacity>
          ) : (
            <Text style={styles.readOnlyNote}>Read-only — cannot stop timer</Text>
          )}
        </>
      ) : (
        <>
          <Text style={[styles.label, styles.labelInactive, compact && styles.labelSmall]}>
            😴 Sleep Tracker
          </Text>
          {!compact ? (
            <Text style={styles.hint}>
              Select type and tap Start when your baby falls asleep.
            </Text>
          ) : null}
          {canWriteEvents ? (
            <>
              <View style={styles.typeRow}>
                {["nap", "night"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, sleepType === t && styles.typeBtnActive]}
                    onPress={() => setSleepType(t)}
                    accessibilityRole="button"
                    accessibilityLabel={t === "nap" ? "Nap" : "Night sleep"}
                  >
                    <Text style={[styles.typeBtnText, sleepType === t && styles.typeBtnTextActive]}>
                      {t === "nap" ? "💤 Nap" : "🌙 Night"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.btn, styles.startBtn, starting && styles.btnDisabled]}
                onPress={() => handleStart(sleepType)}
                disabled={starting}
                accessibilityRole="button"
                accessibilityLabel="Start sleep timer"
              >
                {starting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnText}>▶  Start Sleep</Text>
                }
              </TouchableOpacity>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f3e5f5",
    borderRadius:    16,
    padding:         20,
    marginBottom:    16,
    gap:             10,
  },
  cardActive: {
    backgroundColor: "#1a237e",
  },
  cardCompact: {
    padding:      14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  pulse: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: "#69f0ae",
  },
  label: {
    fontSize:   16,
    fontWeight: "700",
    color:      "#fff",
  },
  labelInactive: {
    color: "#6a1b9a",
  },
  labelSmall: {
    fontSize: 14,
  },
  timer: {
    fontSize:          42,
    fontWeight:        "800",
    color:             "#fff",
    letterSpacing:     2,
    fontVariant:       ["tabular-nums"],
  },
  timerSmall: {
    fontSize: 28,
  },
  startedAt: {
    fontSize: 13,
    color:    "#b39ddb",
  },
  hint: {
    fontSize: 13,
    color:    "#6a1b9a",
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(106,27,154,0.1)",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeBtnActive: {
    backgroundColor: "#ede7f6",
    borderColor: "#6a1b9a",
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6a1b9a",
  },
  typeBtnTextActive: {
    color: "#4527a0",
  },
  btn: {
    borderRadius:   12,
    paddingVertical: 12,
    alignItems:      "center",
    marginTop:       4,
  },
  startBtn: { backgroundColor: "#6a1b9a" },
  stopBtn:  { backgroundColor: "#c62828" },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color:      "#fff",
    fontSize:   15,
    fontWeight: "700",
  },
  readOnlyNote: {
    fontSize: 12,
    color:    "#9fa8da",
    textAlign:"center",
  },
});
