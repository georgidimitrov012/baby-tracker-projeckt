import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { AuthProvider }    from "./src/context/AuthContext";
import { BabyProvider }    from "./src/context/BabyContext";
import { ThemeProvider }   from "./src/context/ThemeContext";
import RootNavigator       from "./src/navigation/RootNavigator";
import ErrorBoundary       from "./src/components/ErrorBoundary";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Provider order matters:
 *   AuthProvider must wrap BabyProvider because BabyProvider
 *   reads from AuthContext (needs the current user to load babies).
 *   ThemeProvider can wrap everything since it has no external deps.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BabyProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </BabyProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
