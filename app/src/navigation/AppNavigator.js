import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme }    from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
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
  const { t }     = useLanguage();

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
        options={{ title: t('navTitleDashboard') }}
      />
      <Stack.Screen
        name="Feeding"
        component={Feeding}
        options={{ title: t('navTitleFeeding') }}
      />
      <Stack.Screen
        name="Sleep"
        component={Sleep}
        options={{ title: t('navTitleSleep') }}
      />
      <Stack.Screen
        name="Poop"
        component={Poop}
        options={{ title: t('navTitlePoop') }}
      />
      <Stack.Screen
        name="Pee"
        component={Pee}
        options={{ title: t('navTitlePee') }}
      />
      <Stack.Screen
        name="History"
        component={History}
        options={{ title: t('navTitleHistory') }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEvent}
        options={{ title: t('navTitleEditEvent') }}
      />
      <Stack.Screen
        name="BabySelector"
        component={BabySelector}
        options={{ title: t('navTitleBabySelector') }}
      />
      <Stack.Screen
        name="BabyProfile"
        component={BabyProfileScreen}
        options={{ title: t('navTitleBabyProfile') }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: t('navTitlePrivacyPolicy') }}
      />
      <Stack.Screen
        name="InviteParent"
        component={InviteParentScreen}
        options={{ title: t('navTitleInviteParent') }}
      />
      <Stack.Screen
        name="Invites"
        component={InvitesScreen}
        options={{ title: t('navTitleInvites') }}
      />
      <Stack.Screen
        name="ManageMembers"
        component={ManageMembersScreen}
        options={{ title: t('navTitleManageMembers') }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: t('navTitleAnalytics') }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('navTitleSettings') }}
      />
      <Stack.Screen
        name="Growth"
        component={GrowthScreen}
        options={{ title: t('navTitleGrowth') }}
      />
      <Stack.Screen
        name="Milestones"
        component={MilestonesScreen}
        options={{ title: t('navTitleMilestones') }}
      />
      <Stack.Screen name="Vaccines" component={VaccineScreen} options={{ title: t('navTitleVaccines') }} />
    </Stack.Navigator>
  );
}
