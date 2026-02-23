import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InviteParentScreen  from "../screens/app/InviteParentScreen";
import InvitesScreen       from "../screens/app/InvitesScreen";
import ManageMembersScreen from "../screens/app/ManageMembersScreen";
import Dashboard           from "../screens/app/Dashboard";
import Feeding             from "../screens/app/Feeding";
import Sleep               from "../screens/app/Sleep";
import Poop                from "../screens/app/Poop";
import Pee                 from "../screens/app/Pee";
import History             from "../screens/app/History";
import EditEvent           from "../screens/app/EditEvent";
import BabySelector        from "../screens/app/BabySelector";
import PrivacyPolicyScreen from "../screens/legal/PrivacyPolicyScreen";
import AnalyticsScreen     from "../screens/app/AnalyticsScreen";

const Stack = createNativeStackNavigator();

/**
 * AppNavigator contains all screens that require authentication.
 * It is only rendered when user !== null in RootNavigator.
 */
export default function AppNavigator() {
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
        name="BabySelector"
        component={BabySelector}
        options={{ title: "My Babies" }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
          name="InviteParent"
          component={InviteParentScreen}
          options={{ title: "Invite Parent" }}
        />
        <Stack.Screen
          name="Invites"
          component={InvitesScreen}
          options={{ title: "Pending Invites" }}
        />
        <Stack.Screen
          name="ManageMembers"
          component={ManageMembersScreen}
          options={{ title: "Manage Members" }}
        />
        <Stack.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{ title: "Analytics" }}
          />
    </Stack.Navigator>
  );
}
