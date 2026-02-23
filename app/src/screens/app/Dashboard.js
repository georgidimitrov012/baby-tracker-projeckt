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
import { showConfirm, showAlert } from "../../utils/platform";

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
  { screen: "Invites",       icon: "📬", label: "Invites",        color: "#fce4ec", text: "#880e4f" },
  { screen: "ManageMembers", icon: "👥", label: "Manage Members", color: "#ede7f6", text: "#4527a0" },
];

export default function Dashboard({ navigation }) {
  const { user }                      = useAuth();
  const { activeBaby, loadingBabies } = useBaby();
  const { canWriteEvents }            = usePermissions();
  const { isActive }                  = useSleepTimer();

  const [loggingOut, setLoggingOut]   = useState(false);
  const isLoggingOut                  = useRef(false);

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
  buttons: { gap: 12 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 18 },
  cardIcon: { fontSize: 26, marginRight: 14 },
  cardLabel: { fontSize: 17, fontWeight: "600" },
});
