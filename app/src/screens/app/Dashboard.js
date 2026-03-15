import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useAuth }                from "../../context/AuthContext";
import { useBaby }                from "../../context/BabyContext";
import { logoutUser }             from "../../services/authService";
import { usePermissions }         from "../../hooks/usePermissions";
import { useSleepTimer }          from "../../hooks/useSleepTimer";
import RoleBadge                  from "../../components/RoleBadge";
import SleepTimerCard             from "../../components/SleepTimerCard";
import OfflineBanner              from "../../components/OfflineBanner";
import { showConfirm, showAlert } from "../../utils/platform";
import { addEvent }               from "../../services/eventStore";
import { notifyCoParents }        from "../../services/notificationService";
import { useEvents }              from "../../hooks/useEvents";
import { useReminders }           from "../../hooks/useReminders";

// Event-logging buttons — only shown when user can write
const WRITE_BUTTONS = [
  { screen: "Feeding", icon: "🍼", label: "Log Feeding", color: "#e3f2fd", text: "#1565c0" },
  { screen: "Poop",    icon: "💩", label: "Log Poop",    color: "#fff8e1", text: "#e65100" },
  { screen: "Pee",     icon: "💧", label: "Log Pee",     color: "#e0f7fa", text: "#00695c" },
];

// Always visible buttons
const READ_BUTTONS = [
  { screen: "Analytics",     icon: "📊", label: "Analytics",      color: "#e8f5e9", text: "#2e7d32" },
  { screen: "History",       icon: "📋", label: "History",        color: "#fafafa", text: "#444"    },
  { screen: "Growth",        icon: "📏", label: "Growth",         color: "#e8eaf6", text: "#3949ab" },
  { screen: "Milestones",    icon: "🎯", label: "Milestones",     color: "#fce4ec", text: "#880e4f" },
  { screen: "Invites",       icon: "📬", label: "Invites",        color: "#fff3e0", text: "#e65100" },
  { screen: "ManageMembers", icon: "👥", label: "Manage Members", color: "#ede7f6", text: "#4527a0" },
];

function timeAgo(date) {
  if (!date) return null;
  const diffMs = Date.now() - (date instanceof Date ? date.getTime() : date);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

const ACTIVITY_TYPES = [
  { type: "feeding", icon: "🍼", label: "Fed"   },
  { type: "sleep",   icon: "😴", label: "Slept" },
  { type: "poop",    icon: "💩", label: "Poop"  },
  { type: "pee",     icon: "💧", label: "Pee"   },
];

function LastActivityCard({ events }) {
  if (!events || events.length === 0) return null;

  const lastByType = {};
  for (const ev of events) {
    if (!lastByType[ev.type]) lastByType[ev.type] = ev.time;
  }

  const items = ACTIVITY_TYPES.filter(({ type }) => lastByType[type]);
  if (items.length === 0) return null;

  return (
    <View style={lastStyles.card}>
      <Text style={lastStyles.header}>Last Activity</Text>
      <View style={lastStyles.row}>
        {items.map(({ type, icon, label }) => (
          <View key={type} style={lastStyles.item}>
            <Text style={lastStyles.icon}>{icon}</Text>
            <Text style={lastStyles.label}>{label}</Text>
            <Text style={lastStyles.time}>{timeAgo(lastByType[type])}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const lastStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  header: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  item: { alignItems: "center" },
  icon: { fontSize: 22, marginBottom: 3 },
  label: { fontSize: 11, color: "#888", fontWeight: "600" },
  time: { fontSize: 12, color: "#444", fontWeight: "500", marginTop: 1 },
});

export default function Dashboard({ navigation }) {
  const { user }                              = useAuth();
  const { activeBaby, activeBabyId, loadingBabies } = useBaby();
  const { canWriteEvents }                    = usePermissions();
  const { isActive }                          = useSleepTimer();
  const { events }                            = useEvents(activeBabyId);
  useReminders(events, activeBaby);

  const [loggingOut, setLoggingOut]           = useState(false);
  const isLoggingOut                          = useRef(false);

  const [quickLogSuccess, setQuickLogSuccess] = useState({ poop: false, pee: false });
  const quickLogInFlight                      = useRef({ poop: false, pee: false });

  const handleLogout = async () => {
    const confirmed = await showConfirm("Sign Out", "Are you sure you want to sign out?");
    if (!confirmed || isLoggingOut.current) return;
    isLoggingOut.current = true;
    setLoggingOut(true);
    try {
      await logoutUser();
    } catch (e) {
      showAlert("Error", "Could not sign out. Please try again.");
      isLoggingOut.current = false;
      setLoggingOut(false);
    }
  };

  const handleQuickLog = async (type) => {
    if (quickLogInFlight.current[type]) return;
    if (!activeBabyId || !canWriteEvents) return;

    quickLogInFlight.current[type] = true;

    try {
      await addEvent(activeBabyId, user.uid, type);
      notifyCoParents(activeBaby, user.uid, user.displayName, type);
      setQuickLogSuccess((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setQuickLogSuccess((prev) => ({ ...prev, [type]: false }));
        quickLogInFlight.current[type] = false;
      }, 1500);
    } catch (e) {
      console.error(`[Dashboard] quick log ${type} error:`, e);
      quickLogInFlight.current[type] = false;
      showAlert("Error", "Could not log event. Please try again.");
    }
  };

  const buttons = canWriteEvents
    ? [...WRITE_BUTTONS, ...READ_BUTTONS]
    : READ_BUTTONS;

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.displayName ?? "there"} 👋</Text>
          <Text style={styles.sub}>What happened?</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Text style={styles.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            style={styles.logoutBtn}
          >
            {loggingOut
              ? <ActivityIndicator size="small" color="#888" />
              : <Text style={styles.logoutText}>Sign out</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner />

      {/* Baby selector pill */}
      <TouchableOpacity
        style={[styles.babyPill, !activeBaby && styles.babyPillWarning]}
        onPress={() => navigation.navigate("BabySelector")}
      >
        {loadingBabies ? (
          <ActivityIndicator size="small" color="#1565c0" />
        ) : (
          <>
            <Text style={styles.babyPillIcon}>{activeBaby ? "👶" : "⚠️"}</Text>
            <Text style={styles.babyPillName}>
              {activeBaby ? activeBaby.name : "No baby — tap to add one"}
            </Text>
            <Text style={styles.babyPillChevron}>›</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Role badge */}
      <RoleBadge />

      {/* Last activity summary */}
      {activeBaby ? <LastActivityCard events={events} /> : null}

      {/* Read-only banner */}
      {!canWriteEvents && activeBaby ? (
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyText}>
            👁 You have read-only access. You can view data but cannot log events.
          </Text>
        </View>
      ) : null}

      {/* Sleep timer — compact version on dashboard */}
      {activeBaby ? <SleepTimerCard compact={true} /> : null}

      {/* Quick Log section */}
      {canWriteEvents && activeBaby ? (
        <View style={styles.quickLogSection}>
          <Text style={styles.quickLogTitle}>Quick Log</Text>
          <View style={styles.quickLogRow}>
            <TouchableOpacity
              style={styles.quickLogBtn}
              onPress={() => handleQuickLog("poop")}
              accessibilityRole="button"
              accessibilityLabel="Quick log poop"
            >
              <Text style={styles.quickLogEmoji}>
                {quickLogSuccess.poop ? "✅" : "💩"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLogBtn}
              onPress={() => handleQuickLog("pee")}
              accessibilityRole="button"
              accessibilityLabel="Quick log pee"
            >
              <Text style={styles.quickLogEmoji}>
                {quickLogSuccess.pee ? "✅" : "💧"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Action grid */}
      <View style={styles.buttons}>
        {/* Sleep button gets special treatment — skip if timer is active */}
        {canWriteEvents && !isActive ? (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: "#f3e5f5" }]}
            onPress={() => navigation.navigate("Sleep")}
            accessibilityRole="button"
          >
            <Text style={styles.cardIcon}>😴</Text>
            <Text style={[styles.cardLabel, { color: "#6a1b9a" }]}>Sleep</Text>
          </TouchableOpacity>
        ) : null}

        {buttons.map(({ screen, icon, label, color, text }) => (
          <TouchableOpacity
            key={screen}
            style={[styles.card, { backgroundColor: color }]}
            onPress={() => navigation.navigate(screen)}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={styles.cardIcon}>{icon}</Text>
            <Text style={[styles.cardLabel, { color: text }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  greeting: { fontSize: 20, fontWeight: "700", color: "#1a1a2e" },
  sub: { fontSize: 14, color: "#888", marginTop: 2 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontSize: 18 },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  logoutText: { fontSize: 13, color: "#666", fontWeight: "600" },
  babyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  babyPillWarning: { backgroundColor: "#fff3e0" },
  babyPillIcon: { fontSize: 16, marginRight: 6 },
  babyPillName: { fontSize: 15, fontWeight: "600", color: "#1565c0", marginRight: 4 },
  babyPillChevron: { fontSize: 18, color: "#1565c0" },
  readOnlyBanner: {
    backgroundColor: "#fff8e1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  readOnlyText: { fontSize: 13, color: "#e65100", fontWeight: "500" },
  quickLogSection: {
    marginBottom: 16,
  },
  quickLogTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickLogRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickLogBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickLogEmoji: {
    fontSize: 32,
  },
  buttons: { gap: 12 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 18 },
  cardIcon: { fontSize: 26, marginRight: 14 },
  cardLabel: { fontSize: 17, fontWeight: "600" },
});
