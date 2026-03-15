import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth }         from "../../context/AuthContext";
import { useBaby }         from "../../context/BabyContext";
import { usePermissions }  from "../../hooks/usePermissions";
import { addEvent }        from "../../services/eventStore";
import { notifyCoParents } from "../../services/notificationService";
import { showAlert }       from "../../utils/platform";

export default function Poop({ navigation }) {
  const { user }                     = useAuth();
  const { activeBabyId, activeBaby } = useBaby();
  const { canWriteEvents }           = usePermissions();

  const [notes, setNotes]   = useState("");
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
      await addEvent(activeBabyId, user.uid, "poop", {
        notes: notes.trim() || null,
      });
      notifyCoParents(activeBaby, user.uid, user.displayName, "poop");
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.emoji}>💩</Text>
        <Text style={styles.title}>Log a Poop</Text>

        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={3}
          keyboardType="default"
          textAlignVertical="top"
        />

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 24,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#111",
    minHeight: 80,
    marginBottom: 24,
    textAlignVertical: "top",
    width: "100%",
    maxWidth: 400,
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
