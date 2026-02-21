import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Dashboard           from "../screens/Dashboard";
import Feeding             from "../screens/Feeding";
import Poop                from "../screens/Poop";
import Pee                 from "../screens/Pee";
import Sleep               from "../screens/Sleep";
import History             from "../screens/History";
import EditEvent           from "../screens/EditEvent";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";

const Stack = createNativeStackNavigator();

/**
 * All app screens live here.
 *
 * To add auth later, create an AuthNavigator and swap it in at the
 * App.js level based on auth state — this file stays unchanged.
 */
export default function RootNavigator() {
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
        name="Dashboard"
        component={Dashboard}
        options={{ title: "Baby Tracker 👶" }}
      />
      <Stack.Screen
        name="Feeding"
        component={Feeding}
        options={{ title: "Log Feeding" }}
      />
      <Stack.Screen
        name="Sleep"
        component={Sleep}
        options={{ title: "Sleep Tracker" }}
      />
      <Stack.Screen
        name="Poop"
        component={Poop}
        options={{ title: "Log Poop" }}
      />
      <Stack.Screen
        name="Pee"
        component={Pee}
        options={{ title: "Log Pee" }}
      />
      <Stack.Screen
        name="History"
        component={History}
        options={{ title: "History" }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEvent}
        options={{ title: "Edit Event" }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacy Policy" }}
      />
    </Stack.Navigator>
  );
}
