import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboard from '../screens/Dashboard';
import Feeding from "../screens/Feeding";
import Poop from "../screens/Poop";
import Pee from "../screens/Pee";
import Sleep from "../screens/Sleep";
import History from "../screens/History";
import EditEvent from "../screens/EditEvent";



const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="Feeding" component={Feeding} />
      <Stack.Screen name="Poop" component={Poop} />
      <Stack.Screen name="Pee" component={Pee} />
      <Stack.Screen name="Sleep" component={Sleep} />
      <Stack.Screen name="History" component={History} />
      <Stack.Screen name="EditEvent" component={EditEvent} />
    </Stack.Navigator>
  );
}

