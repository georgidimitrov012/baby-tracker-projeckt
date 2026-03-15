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
import { useAuth }             from "../../context/AuthContext";
import { useBaby }             from "../../context/BabyContext";
import { usePermissions }      from "../../hooks/usePermissions";
import { addEvent }            from "../../services/eventStore";
import { notifyCoParents, rescheduleAfterFeeding } from "../../services/notificationService";
import { validateAmount, validateFeedingDuration } from "../../utils/validation";
import { showAlert }           from "../../utils/platform";
import FormInput               from "../../components/FormInput";

const FEEDING_TYPES = [
  { key: "bottle",  label: "🍼 Bottle"  },
  { key: "formula", label: "🥛 Formula" },
  { key: "breast",  label: "🤱 Breast"  },
];

export default function Feeding({ navigation }) {
  const { user }                      = useAuth();
  const { activeBabyId, activeBaby }  = useBaby();
  const { canWriteEvents }            = usePermissions();

  const [feedingType, setFeedingType] = useState("bottle");
  const [amount, setAmount]           = useState("");
  const [amountError, setAmountError] = useState(null);
  const [duration, setDuration]       = useState("");
  const [durationError, setDurationError] = useState(null);
  const [notes, setNotes]             = useState("");
  const [saving, setSaving]           = useState(false);
  const isSubmitting                  = useRef(false);

  const isBreast = feedingType === "breast";

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

    if (isBreast) {
      const { valid, error } = validateFeedingDuration(duration);
      if (!valid) { setDurationError(error); return; }
      setDurationError(null);
    } else {
      const { valid, error } = validateAmount(amount);
      if (!valid) { setAmountError(error); return; }
      setAmountError(null);
    }

    isSubmitting.current = true;
    setSaving(true);

    try {
      const fields = {
        feedingType,
        notes: notes.trim() || null,
      };

      if (isBreast) {
        fields.duration = parseInt(duration, 10);
      } else {
        fields.amount = parseInt(amount, 10);
      }

      await addEvent(activeBabyId, user.uid, "feeding", fields);

      const reminderHours = activeBaby?.settings?.feedingReminderHours ?? 3;
      rescheduleAfterFeeding(reminderHours, activeBaby?.name ?? "your baby");

      const notifyFields = isBreast
        ? { feedingType, duration: fields.duration }
        : { feedingType, amount: fields.amount };
      notifyCoParents(activeBaby, user.uid, user.displayName, "feeding", notifyFields);

      navigation.goBack();
    } catch (e) {
      console.error("[Feeding] save error:", e);
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
        <Text style={styles.title}>Log Feeding 🍼</Text>

        {/* Feeding type picker */}
        <Text style={styles.typeLabel}>Type</Text>
        <View style={styles.typeRow}>
          {FEEDING_TYPES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.typeBtn, feedingType === key && styles.typeBtnActive]}
              onPress={() => {
                setFeedingType(key);
                setAmountError(null);
                setDurationError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Text style={[styles.typeBtnText, feedingType === key && styles.typeBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isBreast ? (
          <FormInput
            label="Duration"
            value={duration}
            onChangeText={(v) => {
              setDuration(v);
              if (durationError) setDurationError(null);
            }}
            placeholder="Duration in minutes"
            unit="min"
            error={durationError}
            autoFocus
            keyboardType="numeric"
          />
        ) : (
          <FormInput
            label="Amount"
            value={amount}
            onChangeText={(v) => {
              setAmount(v);
              if (amountError) setAmountError(null);
            }}
            placeholder="Amount in ml"
            unit="ml"
            error={amountError}
            autoFocus
            keyboardType="numeric"
          />
        )}

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
          accessibilityLabel="Save feeding"
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Save</Text>
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
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 24,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeBtnActive: {
    backgroundColor: "#e3f2fd",
    borderColor: "#1565c0",
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  typeBtnTextActive: {
    color: "#1565c0",
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
  btn: {
    backgroundColor: "#1565c0",
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
