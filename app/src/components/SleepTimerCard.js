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
import { useTheme }                     from "../context/ThemeContext";
import { useLanguage }                  from "../context/LanguageContext";

export default function SleepTimerCard({ compact = false }) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
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

  const s = makeStyles(theme, compact);

  return (
    <View style={s.card}>
      {isActive ? (
        <>
          <View style={s.activeHeader}>
            <View style={s.pulseOuter}>
              <View style={s.pulseInner} />
            </View>
            <Text style={s.activeLabel}>{t('babyIsSleeping')}</Text>
          </View>

          <Text style={s.timer}>{formatElapsed(elapsedSeconds)}</Text>

          {startTimeStr ? (
            <Text style={s.startedAt}>{t('startedAt')} {startTimeStr}</Text>
          ) : null}

          {canWriteEvents ? (
            <TouchableOpacity
              style={[s.btn, s.stopBtn, stopping && s.btnDisabled]}
              onPress={handleStop}
              disabled={stopping}
              accessibilityRole="button"
              accessibilityLabel="Stop sleep timer"
            >
              {stopping
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnText}>{t('stopSleep')}</Text>
              }
            </TouchableOpacity>
          ) : (
            <Text style={s.readOnlyNote}>{t('readOnlyCannotStop')}</Text>
          )}
        </>
      ) : (
        <>
          <Text style={s.inactiveLabel}>{t('sleepTrackerCard')}</Text>
          {!compact ? (
            <Text style={s.hint}>{t('tapStartWhenSleeping')}</Text>
          ) : null}
          {canWriteEvents ? (
            <>
              <View style={s.typeRow}>
                {["nap", "night"].map((sType) => (
                  <TouchableOpacity
                    key={sType}
                    style={[s.typeBtn, sleepType === sType && s.typeBtnActive]}
                    onPress={() => setSleepType(sType)}
                    accessibilityRole="button"
                    accessibilityLabel={sType === "nap" ? "Nap" : "Night sleep"}
                  >
                    <Text style={[s.typeBtnText, sleepType === sType && s.typeBtnTextActive]}>
                      {sType === "nap" ? t('napType') : t('nightType')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[s.btn, s.startBtn, starting && s.btnDisabled]}
                onPress={() => handleStart(sleepType)}
                disabled={starting}
                accessibilityRole="button"
                accessibilityLabel="Start sleep timer"
              >
                {starting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnText}>{t('startSleep')}</Text>
                }
              </TouchableOpacity>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const makeStyles = (theme, compact) => StyleSheet.create({
  card: {
    backgroundColor: theme.dark ? "#2A2250" : "#7B5EA7",
    borderRadius: 20,
    padding: compact ? 16 : 22,
    marginBottom: 14,
    gap: 10,
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.dark ? 0.4 : 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pulseOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(110,255,180,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6EFBB4",
  },
  activeLabel: {
    fontSize: compact ? 14 : 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  timer: {
    fontSize: compact ? 32 : 48,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  startedAt: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
  },
  inactiveLabel: {
    fontSize: compact ? 14 : 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  hint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  typeBtnActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderColor: "rgba(255,255,255,0.6)",
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  typeBtnTextActive: {
    color: "#FFFFFF",
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 2,
  },
  startBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" },
  stopBtn:  { backgroundColor: "#E05252" },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  readOnlyNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
});
