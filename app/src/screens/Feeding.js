import React, { useState } from "react";
import { View, Text, Button, TextInput, StyleSheet, Alert } from "react-native";
import { addEvent } from "../services/eventStore";

export default function Feeding({ navigation }) {
  const [amount, setAmount] = useState("");

  const handleSave = async () => {
    try {
      if (!amount) {
        Alert.alert("Enter amount");
        return;
      }

      await addEvent({
        type: "feeding",
        amount,
        time: new Date().toISOString(),
      });

      Alert.alert("Saved to cloud!");
      navigation.goBack();
    } catch (error) {
      console.log("SAVE ERROR:", error);
      Alert.alert("Error", error.message);
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Feeding</Text>

      <TextInput
        placeholder="Amount (ml)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={styles.input}
      />

      <Button title="Save" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 20, marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
});
