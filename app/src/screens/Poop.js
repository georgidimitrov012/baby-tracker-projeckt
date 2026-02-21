import React from "react";
import { View, Button, Alert } from "react-native";
import { addEvent } from "../services/eventStore";

export default function Poop({ navigation }) {
  const handleSave = async () => {
    try {
      await addEvent({
        type: "poop",
        time: new Date().toISOString(),
      });

      Alert.alert("Poop saved 💩");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Button title="Confirm Poop" onPress={handleSave} />
    </View>
  );
}
