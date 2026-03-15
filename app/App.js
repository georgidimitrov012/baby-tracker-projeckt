import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { AuthProvider } from "./src/context/AuthContext";
import { BabyProvider } from "./src/context/BabyContext";
import RootNavigator from "./src/navigation/RootNavigator";

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
 */
export default function App() {
  return (
    <AuthProvider>
      <BabyProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </BabyProvider>
    </AuthProvider>
  );
}
