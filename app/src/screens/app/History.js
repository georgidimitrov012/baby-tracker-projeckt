import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useBaby }                from "../../context/BabyContext";
import { usePermissions }         from "../../hooks/usePermissions";
import { useEvents }              from "../../hooks/useEvents";
import { deleteEvent }            from "../../services/eventStore";
import { showConfirm, showAlert } from "../../utils/platform";
import EventItem                  from "../../components/EventItem";

// Only these event types have editable fields
const EDITABLE_TYPES = ["feeding", "sleep"];

export default function History({ navigation }) {
  const { activeBabyId }           = useBaby();
  const { canWriteEvents }         = usePermissions();
  const { events, loading, error } = useEvents(activeBabyId);

  const handleDelete = async (item) => {
    if (!canWriteEvents) {
      showAlert("Read only", "You don't have permission to delete events.");
      return;
    }
    const confirmed = await showConfirm(
      "Delete Event",
      `Delete this ${item.type} event?`
    );
    if (!confirmed) return;

    try {
      await deleteEvent(activeBabyId, item.id);
    } catch (e) {
      console.error("[History] delete error:", e);
      showAlert("Error", "Could not delete event. Please try again.");
    }
  };

  const handleEdit = (item) => {
    if (!canWriteEvents) {
      showAlert("Read only", "You don't have permission to edit events.");
      return;
    }
    navigation.navigate("EditEvent", {
      eventId:  item.id,
      type:     item.type,
      amount:   item.amount   ?? null,
      duration: item.duration ?? null,
      time:     item.time instanceof Date
        ? item.time.toISOString()
        : new Date(item.time).toISOString(),
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Failed to load events. Check your connection.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!canWriteEvents ? (
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyText}>👁 Read-only view</Text>
        </View>
      ) : null}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No events logged yet.</Text>
        }
        renderItem={({ item }) => (
          <EventItem
            item={item}
            onDelete={canWriteEvents ? () => handleDelete(item) : null}
            onEdit={
              canWriteEvents && EDITABLE_TYPES.includes(item.type)
                ? () => handleEdit(item)
                : null
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    color: "#c62828",
    fontSize: 15,
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: "#aaa",
    fontSize: 15,
    marginTop: 48,
  },
  readOnlyBanner: {
    backgroundColor: "#fff3e0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ffe0b2",
  },
  readOnlyText: {
    fontSize: 13,
    color: "#e65100",
    fontWeight: "600",
    textAlign: "center",
  },
});
