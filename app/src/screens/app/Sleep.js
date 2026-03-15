import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import SleepTimerCard from "../../components/SleepTimerCard";
import { useSleepTimer, formatElapsed } from "../../hooks/useSleepTimer";
import { usePermissions } from "../../hooks/usePermissions";
import { useTheme } from "../../context/ThemeContext";

export default function Sleep() {
  const { isActive, elapsedSeconds, startedAt } = useSleepTimer();
  const { canWriteEvents }                       = usePermissions();
  const { theme }                                = useTheme();
  const s                                        = makeStyles(theme);

  const startTimeStr = startedAt
    ? startedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={s.container}
    >
      <Text style={s.title}>Sleep Tracker 😴</Text>

      {/* Main timer card — handles start/stop logic internally */}
      <SleepTimerCard compact={false} />

      {/* Info panel while sleeping */}
      {isActive ? (
        <View style={s.infoCard}>
          <Text style={s.infoRow}>
            🕐 Started at <Text style={s.infoBold}>{startTimeStr}</Text>
          </Text>
          <Text style={s.infoRow}>
            ⏱ Elapsed{" "}
            <Text style={s.infoBold}>{formatElapsed(elapsedSeconds)}</Text>
          </Text>
          <Text style={s.infoNote}>
            You can close the app — the timer is saved in the cloud and will still be correct when you return.
          </Text>
        </View>
      ) : (
        <View style={s.infoCard}>
          <Text style={s.infoNote}>
            {canWriteEvents
              ? "Tap Start Sleep above when your baby falls asleep. The timer is visible to all parents in realtime."
              : "You have read-only access. You can view active sleep sessions but cannot start or stop them."}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 18,
    gap: 10,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  infoRow: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  infoBold: {
    fontWeight: "700",
    color: theme.text,
  },
  infoNote: {
    fontSize: 13,
    color: theme.textMuted,
    lineHeight: 19,
  },
});
