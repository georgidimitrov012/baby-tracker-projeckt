import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function EditEvent({ route, navigation }) {
  const { event } = route.params;
  const [amount, setAmount] = useState(event.amount || "");

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "events", event.id), {
        amount,
      });

      Alert.alert("Updated!");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Edit {event.type}</Text>

      {event.amount !== undefined && (
        <TextInput
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          style={{
            borderWidth: 1,
            padding: 10,
            marginVertical: 20,
          }}
        />
      )}

      <Button title="Save changes" onPress={handleSave} />
    </View>
  );
}
