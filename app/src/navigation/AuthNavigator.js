import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen    from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

const Stack = createNativeStackNavigator();

/**
 * AuthNavigator contains only the unauthenticated screens.
 * It is only rendered when user === null in RootNavigator.
 * Once the user logs in, RootNavigator swaps to AppNavigator automatically.
 */
export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: "#fff" },
        headerTintColor:  "#1a1a2e",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle:     { backgroundColor: "#f8f9fa" },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Sign In" }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Create Account" }}
      />
    </Stack.Navigator>
  );
}
