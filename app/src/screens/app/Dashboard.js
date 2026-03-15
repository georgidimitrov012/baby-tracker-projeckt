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
import { useTheme }               from "../../context/ThemeContext";
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
  const { theme } = useTheme();
  const s = makeStyles(theme);

  if (!events || events.length === 0) return null;

  const lastByType = {};
  for (const ev of events) {
    if (!lastByType[ev.type]) lastByType[ev.type] = ev.time;
  }

  const items = ACTIVITY_TYPES.filter(({ type }) => lastByType[type]);
  if (items.length === 0) return null;

  return (
    <View style={s.activityCard}>
      <Text style={s.sectionLabel}>Last Activity</Text>
      <View style={s.activityRow}>
        {items.map(({ type, icon, label, color }) => (
          <View key={type} style={s.activityItem}>
            <View style={[s.activityIconBg, { backgroundColor: color + "20" }]}>
              <Text style={s.activityIcon}>{icon}</Text>
            </View>
            <Text style={s.activityLabel}>{label}</Text>
            <Text style={s.activityTime}>{timeAgo(lastByType[type])}</Text>
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

// Dark-mode-friendly card colors for NAV_CARDS
const NAV_CARDS_DARK = [
  { screen: "Analytics",     icon: "📊", label: "Analytics",  color: "#1A2E26", iconColor: "#6BC99A" },
  { screen: "History",       icon: "📋", label: "History",    color: "#2A2250", iconColor: "#9B7ED0" },
  { screen: "Growth",        icon: "📏", label: "Growth",     color: "#2A1E10", iconColor: "#F5A660" },
  { screen: "Milestones",    icon: "🎯", label: "Milestones", color: "#2A1810", iconColor: "#F4845F" },
  { screen: "Invites",       icon: "📬", label: "Invites",    color: "#2A2250", iconColor: "#9B7ED0" },
  { screen: "ManageMembers", icon: "👥", label: "Members",    color: "#1A2E26", iconColor: "#6BC99A" },
];

export default function Dashboard({ navigation }) {
  const { user }                                    = useAuth();
  const { activeBaby, activeBabyId, loadingBabies } = useBaby();
  const { canWriteEvents }                          = usePermissions();
  const { isActive }                                = useSleepTimer();
  const { events }                                  = useEvents(activeBabyId);
  const { theme, isDark }                           = useTheme();
  useReminders(events, activeBaby);

  const s = makeStyles(theme);
  const navCards = isDark ? NAV_CARDS_DARK : NAV_CARDS;

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
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.userName}>{user?.displayName ?? "there"}</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            style={s.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Text style={s.headerBtnIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            style={s.headerBtn}
          >
            {loggingOut
              ? <ActivityIndicator size="small" color={theme.primary} />
              : <Text style={s.headerBtnIcon}>👋</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner />

      {/* Baby card */}
      <TouchableOpacity
        style={[s.babyCard, !activeBaby && s.babyCardWarning]}
        onPress={() => navigation.navigate("BabySelector")}
        accessibilityRole="button"
      >
        {loadingBabies ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <View style={s.babyCardInner}>
            <Text style={s.babyCardIcon}>{activeBaby ? "👶" : "⚠️"}</Text>
            <View style={s.babyCardText}>
              <Text style={s.babyCardName}>
                {activeBaby ? activeBaby.name : "No baby selected"}
              </Text>
              <Text style={s.babyCardSub}>
                {activeBaby ? "Tap to switch or manage babies" : "Tap to add a baby"}
              </Text>
            </View>
            <Text style={s.babyCardChevron}>›</Text>
          </View>
        )}
      </TouchableOpacity>

      <RoleBadge />

      {/* Read-only banner */}
      {!canWriteEvents && activeBaby ? (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>
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
        <View style={s.quickLogSection}>
          <Text style={s.sectionLabel}>Quick Log</Text>
          <View style={s.quickLogRow}>
            <TouchableOpacity
              style={s.quickLogBtn}
              onPress={() => navigation.navigate("Feeding")}
              accessibilityRole="button"
              accessibilityLabel="Log feeding"
            >
              <Text style={s.quickLogEmoji}>🍼</Text>
              <Text style={s.quickLogText}>Feed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickLogBtn}
              onPress={() => handleQuickLog("poop")}
              accessibilityRole="button"
              accessibilityLabel="Quick log poop"
            >
              <Text style={s.quickLogEmoji}>
                {quickLogSuccess.poop ? "✅" : "💩"}
              </Text>
              <Text style={s.quickLogText}>Poop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickLogBtn}
              onPress={() => handleQuickLog("pee")}
              accessibilityRole="button"
              accessibilityLabel="Quick log pee"
            >
              <Text style={s.quickLogEmoji}>
                {quickLogSuccess.pee ? "✅" : "💧"}
              </Text>
              <Text style={s.quickLogText}>Pee</Text>
            </TouchableOpacity>

            {!isActive ? (
              <TouchableOpacity
                style={s.quickLogBtn}
                onPress={() => navigation.navigate("Sleep")}
                accessibilityRole="button"
                accessibilityLabel="Log sleep"
              >
                <Text style={s.quickLogEmoji}>😴</Text>
                <Text style={s.quickLogText}>Sleep</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Nav grid */}
      <Text style={s.sectionLabel}>Explore</Text>
      <View style={s.grid}>
        {navCards.map(({ screen, icon, label, color, iconColor }) => (
          <TouchableOpacity
            key={screen}
            style={[s.gridCard, { backgroundColor: color }]}
            onPress={() => navigation.navigate(screen)}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={s.gridIcon}>{icon}</Text>
            <Text style={[s.gridLabel, { color: iconColor }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {},
  greeting: { fontSize: 13, color: theme.textMuted, fontWeight: "500", marginBottom: 2 },
  userName:  { fontSize: 22, fontWeight: "800", color: theme.text },
  headerRight: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  headerBtnIcon: { fontSize: 18 },

  babyCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  babyCardWarning: { borderWidth: 1.5, borderColor: theme.warning },
  babyCardInner: { flexDirection: "row", alignItems: "center" },
  babyCardIcon: { fontSize: 28, marginRight: 12 },
  babyCardText: { flex: 1 },
  babyCardName: { fontSize: 17, fontWeight: "700", color: theme.text },
  babyCardSub:  { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  babyCardChevron: { fontSize: 22, color: theme.textMuted },

  readOnlyBanner: {
    backgroundColor: theme.warningLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.warning,
  },
  readOnlyText: { fontSize: 13, color: theme.warning, fontWeight: "500" },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },

  activityCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  activityRow: { flexDirection: "row", justifyContent: "space-around" },
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
  activityLabel: { fontSize: 11, color: theme.textMuted, fontWeight: "600" },
  activityTime:  { fontSize: 12, color: theme.text, fontWeight: "600", marginTop: 1 },

  quickLogSection: { marginBottom: 18 },
  quickLogRow: { flexDirection: "row", gap: 12 },
  quickLogBtn: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: theme.card,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    paddingVertical: 12,
  },
  quickLogEmoji: { fontSize: 28 },
  quickLogText:  { fontSize: 11, color: theme.textSecondary, fontWeight: "600", marginTop: 4 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
  gridCard: {
    width: "47%",
    borderRadius: 18,
    padding: 18,
    minHeight: 90,
    justifyContent: "space-between",
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  gridIcon:  { fontSize: 28 },
  gridLabel: { fontSize: 14, fontWeight: "700", marginTop: 8 },
});
