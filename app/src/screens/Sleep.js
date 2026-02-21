import React, { useState } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { addEvent } from "../services/eventStore";

export default function Sleep({ navigation }) {
  const [start, setStart] = useState(null);

  const handleStart = () => {
    setStart(new Date());
  };

  const handleStop = async () => {
    if (!start) return;

    const end = new Date();
    const duration = Math.round((end - start) / 60000);

    try {
      await addEvent({
        type: "sleep",
        start: start.toISOString(),
        end: end.toISOString(),
        duration,
        time: start.toISOString(),
      });

      Alert.alert(`Sleep saved (${duration} min)`);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sleep Tracker</Text>

      {!start ? (
        <Button title="Start Sleep" onPress={handleStart} />
      ) : (
        <Button title="Stop Sleep" onPress={handleStop} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 22, textAlign: "center", marginBottom: 20 },
});
