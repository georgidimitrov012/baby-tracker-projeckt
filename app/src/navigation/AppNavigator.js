import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";
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
import BabyProfileScreen   from "../screens/app/BabyProfileScreen";
import PrivacyPolicyScreen from "../screens/legal/PrivacyPolicyScreen";
import AnalyticsScreen     from "../screens/app/AnalyticsScreen";
import SettingsScreen      from "../screens/app/SettingsScreen";
import GrowthScreen        from "../screens/app/GrowthScreen";
import MilestonesScreen    from "../screens/app/MilestonesScreen";
import VaccineScreen       from "../screens/app/VaccineScreen";

const Stack = createNativeStackNavigator();

/**
 * AppNavigator contains all screens that require authentication.
 * It is only rendered when user !== null in RootNavigator.
 */
export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:         { backgroundColor: theme.headerBg },
        headerTintColor:     theme.primary,
        headerTitleStyle:    { fontWeight: "700", color: theme.headerText, fontSize: 18 },
        headerShadowVisible: false,
        contentStyle:        { backgroundColor: theme.background },
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
        name="BabyProfile"
        component={BabyProfileScreen}
        options={{ title: "Baby Profile" }}
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
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
      <Stack.Screen
        name="Growth"
        component={GrowthScreen}
        options={{ title: "Growth" }}
      />
      <Stack.Screen
        name="Milestones"
        component={MilestonesScreen}
        options={{ title: "Milestones" }}
      />
      <Stack.Screen name="Vaccines" component={VaccineScreen} options={{ title: "Vaccines 💉" }} />
    </Stack.Navigator>
  );
}
