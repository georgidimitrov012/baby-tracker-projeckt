import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";

/**
 * RootNavigator is the single decision point for the entire nav tree.
 *
 * Three states:
 *   loading → show a centered spinner (auth state not yet known)
 *   user    → show AppNavigator (all app screens)
 *   no user → show AuthNavigator (login / register)
 *
 * Because NavigationContainer is in App.js (above this component),
 * both navigators share the same container. Switching between them
 * is seamless and triggers no remount of NavigationContainer.
 *
 * SECURITY: AppNavigator is never rendered when user is null.
 * There is no way to reach a protected screen without a valid session.
 */
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return user ? <AppNavigator /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
});
