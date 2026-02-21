import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/context/AuthContext";
import { BabyProvider } from "./src/context/BabyContext";
import RootNavigator from "./src/navigation/RootNavigator";

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
