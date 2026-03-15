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
import { useEvents }              from "../../hooks/useEvents";
import { useReminders }           from "../../hooks/useReminders";
import RoleBadge                  from "../../components/RoleBadge";
import SleepTimerCard             from "../../components/SleepTimerCard";
import OfflineBanner              from "../../components/OfflineBanner";
import { showConfirm, showAlert } from "../../utils/platform";
import { addEvent }               from "../../services/eventStore";
import { notifyCoParents }        from "../../services/notificationService";

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Good morning ☀️";
  if (h >= 12 && h < 18) return "Good afternoon 🌤";
  if (h >= 18 && h < 22) return "Good evening 🌙";
  return "Night mode 🌛";
}

function timeAgo(date) {
  if (!date) return null;
  const diffMs   = Date.now() - (date instanceof Date ? date.getTime() : date);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

const ACTIVITY_TYPES = [
  { type: "feeding", icon: "🍼", label: "Fed",   color: "#F4845F" },
  { type: "sleep",   icon: "😴", label: "Slept", color: "#7B5EA7" },
  { type: "poop",    icon: "💩", label: "Poop",  color: "#E88C3A" },
  { type: "pee",     icon: "💧", label: "Pee",   color: "#47A67E" },
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
    <View style={styles.activityCard}>
      <Text style={styles.sectionLabel}>Last Activity</Text>
      <View style={styles.activityRow}>
        {items.map(({ type, icon, label, color }) => (
          <View key={type} style={styles.activityItem}>
            <View style={[styles.activityIconBg, { backgroundColor: color + "20" }]}>
              <Text style={styles.activityIcon}>{icon}</Text>
            </View>
            <Text style={styles.activityLabel}>{label}</Text>
            <Text style={styles.activityTime}>{timeAgo(lastByType[type])}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const NAV_CARDS = [
  { screen: "Analytics",     icon: "📊", label: "Analytics",  color: "#E8F6F0", iconColor: "#47A67E" },
  { screen: "History",       icon: "📋", label: "History",    color: "#F0EAFF", iconColor: "#7B5EA7" },
  { screen: "Growth",        icon: "📏", label: "Growth",     color: "#FFF8EC", iconColor: "#E88C3A" },
  { screen: "Milestones",    icon: "🎯", label: "Milestones", color: "#FFF0EB", iconColor: "#F4845F" },
  { screen: "Invites",       icon: "📬", label: "Invites",    color: "#F0EAFF", iconColor: "#7B5EA7" },
  { screen: "ManageMembers", icon: "👥", label: "Members",    color: "#E8F6F0", iconColor: "#47A67E" },
];

export default function Dashboard({ navigation }) {
  const { user }                                    = useAuth();
  const { activeBaby, activeBabyId, loadingBabies } = useBaby();
  const { canWriteEvents }                          = usePermissions();
  const { isActive }                                = useSleepTimer();
  const { events }                                  = useEvents(activeBabyId);
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.displayName ?? "there"}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Text style={styles.headerBtnIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            style={styles.headerBtn}
          >
            {loggingOut
              ? <ActivityIndicator size="small" color="#7B5EA7" />
              : <Text style={styles.headerBtnIcon}>👋</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner />

      {/* Baby card */}
      <TouchableOpacity
        style={[styles.babyCard, !activeBaby && styles.babyCardWarning]}
        onPress={() => navigation.navigate("BabySelector")}
        accessibilityRole="button"
      >
        {loadingBabies ? (
          <ActivityIndicator color="#7B5EA7" />
        ) : (
          <View style={styles.babyCardInner}>
            <Text style={styles.babyCardIcon}>{activeBaby ? "👶" : "⚠️"}</Text>
            <View style={styles.babyCardText}>
              <Text style={styles.babyCardName}>
                {activeBaby ? activeBaby.name : "No baby selected"}
              </Text>
              <Text style={styles.babyCardSub}>
                {activeBaby ? "Tap to switch or manage babies" : "Tap to add a baby"}
              </Text>
            </View>
            <Text style={styles.babyCardChevron}>›</Text>
          </View>
        )}
      </TouchableOpacity>

      <RoleBadge />

      {/* Read-only banner */}
      {!canWriteEvents && activeBaby ? (
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyText}>
            👁 Read-only access — you can view but not log events
          </Text>
        </View>
      ) : null}

      {/* Last activity */}
      {activeBaby ? <LastActivityCard events={events} /> : null}

      {/* Sleep timer */}
      {activeBaby ? <SleepTimerCard compact={true} /> : null}

      {/* Quick log */}
      {canWriteEvents && activeBaby ? (
        <View style={styles.quickLogSection}>
          <Text style={styles.sectionLabel}>Quick Log</Text>
          <View style={styles.quickLogRow}>
            <TouchableOpacity
              style={styles.quickLogBtn}
              onPress={() => navigation.navigate("Feeding")}
              accessibilityRole="button"
              accessibilityLabel="Log feeding"
            >
              <Text style={styles.quickLogEmoji}>🍼</Text>
              <Text style={styles.quickLogText}>Feed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLogBtn}
              onPress={() => handleQuickLog("poop")}
              accessibilityRole="button"
              accessibilityLabel="Quick log poop"
            >
              <Text style={styles.quickLogEmoji}>
                {quickLogSuccess.poop ? "✅" : "💩"}
              </Text>
              <Text style={styles.quickLogText}>Poop</Text>
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
              <Text style={styles.quickLogText}>Pee</Text>
            </TouchableOpacity>

            {!isActive ? (
              <TouchableOpacity
                style={styles.quickLogBtn}
                onPress={() => navigation.navigate("Sleep")}
                accessibilityRole="button"
                accessibilityLabel="Log sleep"
              >
                <Text style={styles.quickLogEmoji}>😴</Text>
                <Text style={styles.quickLogText}>Sleep</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Nav grid */}
      <Text style={styles.sectionLabel}>Explore</Text>
      <View style={styles.grid}>
        {NAV_CARDS.map(({ screen, icon, label, color, iconColor }) => (
          <TouchableOpacity
            key={screen}
            style={[styles.gridCard, { backgroundColor: color }]}
            onPress={() => navigation.navigate(screen)}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={styles.gridIcon}>{icon}</Text>
            <Text style={[styles.gridLabel, { color: iconColor }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#FBF8FF" },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {},
  greeting: { fontSize: 13, color: "#A599BE", fontWeight: "500", marginBottom: 2 },
  userName:  { fontSize: 22, fontWeight: "800", color: "#1C1830" },
  headerRight: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  headerBtnIcon: { fontSize: 18 },

  // Baby card
  babyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  babyCardWarning: { borderWidth: 1.5, borderColor: "#E88C3A" },
  babyCardInner: { flexDirection: "row", alignItems: "center" },
  babyCardIcon: { fontSize: 28, marginRight: 12 },
  babyCardText: { flex: 1 },
  babyCardName: { fontSize: 17, fontWeight: "700", color: "#1C1830" },
  babyCardSub:  { fontSize: 12, color: "#A599BE", marginTop: 2 },
  babyCardChevron: { fontSize: 22, color: "#C4B8D8" },

  // Read-only
  readOnlyBanner: {
    backgroundColor: "#FEF3E8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#E88C3A",
  },
  readOnlyText: { fontSize: 13, color: "#E88C3A", fontWeight: "500" },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A599BE",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Last activity
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  activityItem: { alignItems: "center" },
  activityIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  activityIcon:  { fontSize: 22 },
  activityLabel: { fontSize: 11, color: "#A599BE", fontWeight: "600" },
  activityTime:  { fontSize: 12, color: "#1C1830", fontWeight: "600", marginTop: 1 },

  // Quick log
  quickLogSection: { marginBottom: 18 },
  quickLogRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickLogBtn: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    paddingVertical: 12,
  },
  quickLogEmoji: { fontSize: 28 },
  quickLogText:  { fontSize: 11, color: "#655E80", fontWeight: "600", marginTop: 4 },

  // Nav grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },
  gridCard: {
    width: "47%",
    borderRadius: 18,
    padding: 18,
    minHeight: 90,
    justifyContent: "space-between",
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  gridIcon:  { fontSize: 28 },
  gridLabel: { fontSize: 14, fontWeight: "700", marginTop: 8 },
});
