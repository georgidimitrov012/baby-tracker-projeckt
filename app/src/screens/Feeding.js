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
import { useBaby }        from "../context/BabyContext";
import { addEvent }       from "../services/eventStore";
import { validateAmount } from "../utils/validation";
import { showAlert }      from "../utils/platform";
import FormInput          from "../components/FormInput";

export default function Feeding({ navigation }) {
  const { activeBabyId }                  = useBaby();
  const [amount, setAmount]               = useState("");
  const [amountError, setAmountError]     = useState(null);
  const [saving, setSaving]               = useState(false);

  // useRef (not useState) so the guard doesn't trigger a re-render
  const isSubmitting = useRef(false);

  const handleSave = async () => {
    if (isSubmitting.current) return; // block double-tap

    const { valid, error } = validateAmount(amount);
    if (!valid) {
      setAmountError(error);
      return;
    }
    setAmountError(null);

    isSubmitting.current = true;
    setSaving(true);

    try {
      // addEvent(babyId, type, fields) — babyId comes from context
      await addEvent(activeBabyId, "feeding", {
        amount: parseInt(amount, 10),
      });
      navigation.goBack();
    } catch (error) {
      console.error("[Feeding] save error:", error);
      showAlert("Error", error.message);
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
        <Text style={styles.title}>Log Feeding</Text>

        <FormInput
          label="Amount"
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            if (amountError) setAmountError(null);
          }}
          placeholder="Amount (ml)"
          unit="ml"
          error={amountError}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save feeding"
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Save</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "600",
    color: "#1a1a2e",
  },
  btn: {
    backgroundColor: "#1565c0",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
