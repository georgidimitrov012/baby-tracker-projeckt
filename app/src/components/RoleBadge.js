import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { usePermissions } from "../hooks/usePermissions";

const ROLE_STYLE = {
  owner:        { bg: "#e3f2fd", text: "#1565c0" },
  admin:        { bg: "#fce4ec", text: "#880e4f" },
  parent:       { bg: "#e8f5e9", text: "#2e7d32" },
  viewer:       { bg: "#fff3e0", text: "#e65100" },
  pediatrician: { bg: "#ede7f6", text: "#4527a0" },
};

/**
 * Displays the current user's role for the active baby.
 * Shows a warning if the role is missing (broken members map).
 *
 * Usage: <RoleBadge />
 */
export default function RoleBadge() {
  const { myRole, myRoleLabel } = usePermissions();

  if (!myRole) {
    return (
      <View style={[styles.badge, { backgroundColor: "#ffebee" }]}>
        <Text style={[styles.text, { color: "#c62828" }]}>
          ⚠️ No role — check Firebase members map
        </Text>
      </View>
    );
  }

  const colors = ROLE_STYLE[myRole] ?? { bg: "#eee", text: "#333" };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        Your role: {myRoleLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius:      20,
    paddingVertical:   6,
    paddingHorizontal: 14,
    alignSelf:         "flex-start",
    marginBottom:      12,
  },
  text: {
    fontSize:   13,
    fontWeight: "700",
  },
});
