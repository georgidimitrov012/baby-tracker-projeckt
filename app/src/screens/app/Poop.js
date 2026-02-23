import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useAuth }        from "../../context/AuthContext";
import { useBaby }        from "../../context/BabyContext";
import { usePermissions } from "../../hooks/usePermissions";
import { addEvent }       from "../../services/eventStore";
import { showAlert }      from "../../utils/platform";

export default function Poop({ navigation }) {
  const { user }           = useAuth();
  const { activeBabyId }   = useBaby();
  const { canWriteEvents } = usePermissions();

  const [saving, setSaving] = useState(false);
  const isSubmitting        = useRef(false);

  const handleSave = async () => {
    if (isSubmitting.current) return;

    if (!activeBabyId) {
      showAlert("No baby selected", "Please add or select a baby from the Dashboard first.");
      return;
    }

    if (!canWriteEvents) {
      showAlert("Read only", "You don't have permission to log events.");
      return;
    }

    isSubmitting.current = true;
    setSaving(true);

    try {
      await addEvent(activeBabyId, user.uid, "poop");
      navigation.goBack();
    } catch (e) {
      console.error("[Poop] save error:", e);
      showAlert("Error", "Could not save. Please try again.");
    } finally {
      isSubmitting.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💩</Text>
      <Text style={styles.title}>Log a Poop</Text>
      <Text style={styles.sub}>Tap below to record the time.</Text>

      <TouchableOpacity
        style={[styles.btn, (saving || !canWriteEvents) && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving || !canWriteEvents}
        accessibilityRole="button"
        accessibilityLabel="Confirm poop"
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Confirm 💩</Text>
        }
      </TouchableOpacity>

      {!canWriteEvents ? (
        <Text style={styles.readOnlyNote}>
          You have read-only access and cannot log events.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: "#888",
    marginBottom: 40,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#e65100",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  readOnlyNote: {
    textAlign: "center",
    color: "#e65100",
    fontSize: 13,
    marginTop: 24,
  },
});
