import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { BabyProvider } from "./src/context/BabyContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <BabyProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </BabyProvider>
  );
}
