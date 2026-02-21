import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { subscribeToEvents, deleteEvent } from "../services/eventStore";

export default function History({ navigation }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToEvents(setEvents);
    return unsubscribe;
  }, []);

  const showOptions = (item) => {
    Alert.alert("Event options", "What do you want to do?", [
      {
        text: "Edit",
        onPress: () => navigation.navigate("EditEvent", { event: item }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEvent(item.id);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => {
      console.log("DELETE", item.id);
      showOptions(item)}}
    >
      {item.type === "sleep" ? (
        <Text>😴 Sleep - {item.duration} min</Text>
      ) : (
        <Text>
          {item.type} {item.amount ? `- ${item.amount} ml` : ""} -{" "}
          {new Date(item.time).toLocaleTimeString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text>No events</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 20, textAlign: "center" },
  item: { marginBottom: 10 },
});
