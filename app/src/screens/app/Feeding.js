import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth }          from "../../context/AuthContext";
import { useBaby }          from "../../context/BabyContext";
import { usePermissions }   from "../../hooks/usePermissions";
import { addEvent }         from "../../services/eventStore";
import { validateAmount }   from "../../utils/validation";
import { showAlert }        from "../../utils/platform";
import FormInput            from "../../components/FormInput";

export default function Feeding({ navigation }) {
  const { user }                      = useAuth();
  const { activeBabyId }              = useBaby();
  const { canWriteEvents }            = usePermissions();

  const [amount, setAmount]           = useState("");
  const [amountError, setAmountError] = useState(null);
  const [saving, setSaving]           = useState(false);
  const isSubmitting                  = useRef(false);

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

    const { valid, error } = validateAmount(amount);
    if (!valid) {
      setAmountError(error);
      return;
    }
    setAmountError(null);

    isSubmitting.current = true;
    setSaving(true);

    try {
      await addEvent(activeBabyId, user.uid, "feeding", {
        amount: parseInt(amount, 10),
      });
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
    marginBottom: 32,
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
