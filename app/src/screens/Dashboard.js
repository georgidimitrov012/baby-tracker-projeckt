import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

// Centralised button config — add new event types here only
const BUTTONS = [
  { screen: "Feeding", icon: "🍼", label: "Log Feeding", color: "#e3f2fd", text: "#1565c0" },
  { screen: "Poop",    icon: "💩", label: "Log Poop",    color: "#fff8e1", text: "#e65100" },
  { screen: "Pee",     icon: "💧", label: "Log Pee",     color: "#e0f7fa", text: "#00695c" },
  { screen: "Sleep",   icon: "😴", label: "Sleep",       color: "#f3e5f5", text: "#6a1b9a" },
  { screen: "History", icon: "📋", label: "History",     color: "#e8f5e9", text: "#2e7d32" },
];

export default function Dashboard({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Baby Tracker Dashboard</Text>

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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#1a1a2e",
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
