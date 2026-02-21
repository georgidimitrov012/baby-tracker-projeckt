import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useAuth }   from "../../context/AuthContext";
import { useBaby }   from "../../context/BabyContext";
import { logoutUser } from "../../services/authService";
import { showConfirm, showAlert } from "../../utils/platform";

const BUTTONS = [
  { screen: "Feeding", icon: "🍼", label: "Log Feeding", color: "#e3f2fd", text: "#1565c0" },
  { screen: "Poop",    icon: "💩", label: "Log Poop",    color: "#fff8e1", text: "#e65100" },
  { screen: "Pee",     icon: "💧", label: "Log Pee",     color: "#e0f7fa", text: "#00695c" },
  { screen: "Sleep",   icon: "😴", label: "Sleep",       color: "#f3e5f5", text: "#6a1b9a" },
  { screen: "History", icon: "📋", label: "History",     color: "#e8f5e9", text: "#2e7d32" },
];

export default function Dashboard({ navigation }) {
  const { user }                    = useAuth();
  const { activeBaby, loadingBabies } = useBaby();
  const [loggingOut, setLoggingOut] = useState(false);
  const isLoggingOut                = useRef(false);

  const handleLogout = async () => {
    const confirmed = await showConfirm("Sign Out", "Are you sure you want to sign out?");
    if (!confirmed) return;
    if (isLoggingOut.current) return;

    isLoggingOut.current = true;
    setLoggingOut(true);

    try {
      await logoutUser();
      // RootNavigator detects user = null and navigates to AuthNavigator automatically
    } catch (e) {
      console.error("[Dashboard] logout error:", e);
      showAlert("Error", "Could not sign out. Please try again.");
      isLoggingOut.current = false;
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Header row: greeting + logout */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.displayName ?? "there"} 👋
          </Text>
          <Text style={styles.sub}>What happened?</Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          style={styles.logoutBtn}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          {loggingOut
            ? <ActivityIndicator size="small" color="#888" />
            : <Text style={styles.logoutText}>Sign out</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Active baby indicator + switcher */}
      <TouchableOpacity
        style={styles.babyPill}
        onPress={() => navigation.navigate("BabySelector")}
        accessibilityRole="button"
        accessibilityLabel="Switch baby"
      >
        {loadingBabies ? (
          <ActivityIndicator size="small" color="#1565c0" />
        ) : (
          <>
            <Text style={styles.babyPillIcon}>👶</Text>
            <Text style={styles.babyPillName}>
              {activeBaby ? activeBaby.name : "Add a baby"}
            </Text>
            <Text style={styles.babyPillChevron}>›</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.buttons}>
        {BUTTONS.map(({ screen, icon, label, color, text }) => (
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
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  sub: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  babyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  babyPillIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  babyPillName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1565c0",
    marginRight: 4,
  },
  babyPillChevron: {
    fontSize: 18,
    color: "#1565c0",
    fontWeight: "300",
  },
  buttons: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 18,
  },
  cardIcon: {
    fontSize: 26,
    marginRight: 14,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: "600",
  },
});
