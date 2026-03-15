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
import { useBaby }                          from "../../context/BabyContext";
import { usePermissions }                   from "../../hooks/usePermissions";
import { updateEvent }                      from "../../services/eventStore";
import { validateAmount, validateDuration } from "../../utils/validation";
import { showAlert }                        from "../../utils/platform";
import FormInput                            from "../../components/FormInput";

export default function EditEvent({ route, navigation }) {
  const { activeBabyId }   = useBaby();
  const { canWriteEvents } = usePermissions();

  const {
    eventId,
    type,
    amount:   initAmount,
    duration: initDuration,
    notes:    initNotes,
  } = route.params;

  const isFeeding = type === "feeding";
  const isSleep   = type === "sleep";
  const hasNumericField = isFeeding || isSleep;

  const label     = isFeeding ? "Amount"   : "Duration";
  const unit      = isFeeding ? "ml"       : "min";
  const icon      = isFeeding ? "🍼"       : isSleep ? "😴" : type === "poop" ? "💩" : "💧";
  const validate  = isFeeding ? validateAmount : validateDuration;

  const [value, setValue]           = useState(
    isFeeding
      ? String(initAmount   ?? "")
      : isSleep
        ? String(initDuration ?? "")
        : ""
  );
  const [fieldError, setFieldError] = useState(null);
  const [notes, setNotes]           = useState(initNotes ?? "");
  const [saving, setSaving]         = useState(false);
  const isSubmitting                = useRef(false);

  const handleSave = async () => {
    if (isSubmitting.current) return;

    if (!canWriteEvents) {
      showAlert("Read only", "You don't have permission to edit events.");
      return;
    }

    if (hasNumericField) {
      const { valid, error } = validate(value);
      if (!valid) {
        setFieldError(error);
        return;
      }
      setFieldError(null);
    }

    isSubmitting.current = true;
    setSaving(true);

    try {
      let fields = { notes: notes.trim() || null };

      if (isFeeding) {
        fields.amount = parseInt(value, 10);
      } else if (isSleep) {
        fields.duration = parseInt(value, 10);
      }

      await updateEvent(activeBabyId, eventId, fields);
      navigation.goBack();
    } catch (e) {
      console.error("[EditEvent] save error:", e);
      showAlert("Error", "Could not save changes. Please try again.");
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
        <Text style={styles.heading}>
          Edit {icon}{" "}
          <Text style={styles.typeLabel}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        </Text>

        {hasNumericField ? (
          <FormInput
            label={label}
            value={value}
            onChangeText={(v) => {
              setValue(v);
              if (fieldError) setFieldError(null);
            }}
            unit={unit}
            error={fieldError}
            autoFocus
            keyboardType="numeric"
            editable={canWriteEvents}
          />
        ) : null}

        <Text style={styles.notesLabel}>Notes (optional)</Text>
        <TextInput
          style={[styles.notesInput, !canWriteEvents && styles.notesInputDisabled]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={3}
          keyboardType="default"
          textAlignVertical="top"
          editable={canWriteEvents}
        />

        <TouchableOpacity
          style={[styles.btn, (saving || !canWriteEvents) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving || !canWriteEvents}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Save Changes</Text>
          }
        </TouchableOpacity>

        {!canWriteEvents ? (
          <Text style={styles.readOnlyNote}>
            You have read-only access and cannot edit events.
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
  },
  heading: {
    fontSize: 20,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  typeLabel: {
    fontWeight: "700",
    color: "#1a1a2e",
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 4,
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
    marginBottom: 16,
    textAlignVertical: "top",
  },
  notesInputDisabled: {
    backgroundColor: "#f5f5f5",
    color: "#aaa",
  },
  btn: {
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  readOnlyNote: {
    textAlign: "center",
    color: "#e65100",
    fontSize: 13,
    marginTop: 16,
  },
});
