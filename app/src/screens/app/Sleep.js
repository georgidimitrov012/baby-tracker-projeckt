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

export default function Sleep() {
  const { isActive, elapsedSeconds, startedAt } = useSleepTimer();
  const { canWriteEvents }                       = usePermissions();

  const startTimeStr = startedAt
    ? startedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sleep Tracker 😴</Text>

      {/* Main timer card — handles start/stop logic internally */}
      <SleepTimerCard compact={false} />

      {/* Info panel while sleeping */}
      {isActive ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoRow}>
            🕐 Started at <Text style={styles.infoBold}>{startTimeStr}</Text>
          </Text>
          <Text style={styles.infoRow}>
            ⏱ Elapsed{" "}
            <Text style={styles.infoBold}>{formatElapsed(elapsedSeconds)}</Text>
          </Text>
          <Text style={styles.infoNote}>
            You can close the app — the timer is saved in the cloud and will still be correct when you return.
          </Text>
        </View>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.infoNote}>
            {canWriteEvents
              ? "Tap Start Sleep above when your baby falls asleep. The timer is visible to all parents in realtime."
              : "You have read-only access. You can view active sleep sessions but cannot start or stop them."}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    gap: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  infoRow: {
    fontSize: 15,
    color: "#555",
  },
  infoBold: {
    fontWeight: "700",
    color: "#1a1a2e",
  },
  infoNote: {
    fontSize: 13,
    color: "#999",
    lineHeight: 19,
  },
});
