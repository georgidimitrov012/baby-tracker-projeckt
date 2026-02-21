import React from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useBaby }                from "../../context/BabyContext";
import { useEvents }              from "../../hooks/useEvents";
import { deleteEvent }            from "../../services/eventStore";
import { showConfirm, showAlert } from "../../utils/platform";
import EventItem                  from "../../components/EventItem";

const EDITABLE_TYPES = ["feeding", "sleep"];

export default function History({ navigation }) {
  const { activeBabyId }           = useBaby();
  const { events, loading, error } = useEvents(activeBabyId);

  const handleDelete = async (item) => {
    const confirmed = await showConfirm("Delete Event", `Delete this ${item.type} event?`);
    if (!confirmed) return;
    try {
      await deleteEvent(activeBabyId, item.id);
    } catch (err) {
      showAlert("Error", "Could not delete event. Please try again.");
    }
  };

  const handleEdit = (item) => {
    navigation.navigate("EditEvent", {
      eventId:  item.id,
      type:     item.type,
      amount:   item.amount   ?? null,
      duration: item.duration ?? null,
      time:     item.time instanceof Date ? item.time.toISOString() : new Date(item.time).toISOString(),
    });
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1565c0" /></View>;
  if (error)   return <View style={styles.centered}><Text style={styles.errorText}>Failed to load events. Check your connection.</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventItem
            item={item}
            onDelete={() => handleDelete(item)}
            onEdit={EDITABLE_TYPES.includes(item.type) ? () => handleEdit(item) : null}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No events yet.</Text>}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 16, textAlign: "center", fontWeight: "700", color: "#1a1a2e" },
  list: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorText: { color: "#c62828", fontSize: 15, textAlign: "center" },
  empty: { textAlign: "center", color: "#888", fontSize: 15, marginTop: 40 },
});
