import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

export default function Dashboard({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Baby Tracker Dashboard</Text>

      <View style={styles.buttons}>
        <Button title="Log Feeding" onPress={() => navigation.navigate("Feeding")} />
        <Button title="Log Poop" onPress={() => navigation.navigate("Poop")} />
        <Button title="Log Pee" onPress={() => navigation.navigate("Pee")} />
        <Button title="Sleep" onPress={() => navigation.navigate("Sleep")} />
        <Button title="History" onPress={() => navigation.navigate("History")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  buttons: {
    gap: 10,
  },
});
