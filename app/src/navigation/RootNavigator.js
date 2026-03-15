import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth }        from "../context/AuthContext";
import AuthNavigator      from "./AuthNavigator";
import AppNavigator       from "./AppNavigator";
import OnboardingScreen   from "../screens/app/OnboardingScreen";

/**
 * RootNavigator is the single decision point for the entire nav tree.
 *
 * Four states:
 *   loading / checkingOnboarding → show a centered spinner
 *   no user                      → show AuthNavigator (login / register)
 *   user + onboarding not done   → show OnboardingScreen (once per user)
 *   user + onboarding done       → show AppNavigator (all app screens)
 *
 * Onboarding completion is persisted in AsyncStorage under the key
 * `@onboarding_<uid>` so it survives app restarts but is per-user.
 *
 * SECURITY: AppNavigator is never rendered when user is null.
 * There is no way to reach a protected screen without a valid session.
 */
export default function RootNavigator() {
  const { user, loading } = useAuth();
  const [onboardingDone,      setOnboardingDone]      = useState(true);
  const [checkingOnboarding,  setCheckingOnboarding]  = useState(false);

  useEffect(() => {
    if (!user) {
      setOnboardingDone(true);
      setCheckingOnboarding(false);
      return;
    }
    let cancelled = false;
    setCheckingOnboarding(true);
    AsyncStorage.getItem(`@onboarding_${user.uid}`)
      .then((val) => {
        if (!cancelled) setOnboardingDone(val === "done");
      })
      .catch(() => {
        if (!cancelled) setOnboardingDone(true);
      })
      .finally(() => {
        if (!cancelled) setCheckingOnboarding(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  if (loading || checkingOnboarding) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  if (!user) return <AuthNavigator />;

  if (!onboardingDone) {
    return (
      <OnboardingScreen
        onComplete={async () => {
          await AsyncStorage.setItem(`@onboarding_${user.uid}`, "done");
          setOnboardingDone(true);
        }}
      />
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
});
