import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useBaby }                          from "../../context/BabyContext";
import { updateEvent }                      from "../../services/eventStore";
import { validateAmount, validateDuration } from "../../utils/validation";
import { showAlert }                        from "../../utils/platform";
import FormInput                            from "../../components/FormInput";

export default function EditEvent({ route, navigation }) {
  const { activeBabyId } = useBaby();
  const { eventId, type, amount: initAmount, duration: initDuration } = route.params;

  const [value, setValue]           = useState(type === "feeding" ? String(initAmount ?? "") : String(initDuration ?? ""));
  const [fieldError, setFieldError] = useState(null);
  const [saving, setSaving]         = useState(false);
  const isSubmitting                = useRef(false);

  const label    = type === "feeding" ? "Amount"   : "Duration";
  const unit     = type === "feeding" ? "ml"       : "min";
  const typeIcon = type === "feeding" ? "🍼"       : "😴";
  const validate = type === "feeding" ? validateAmount : validateDuration;

  const handleSave = async () => {
    if (isSubmitting.current) return;
    const { valid, error } = validate(value);
    if (!valid) { setFieldError(error); return; }
    setFieldError(null);
    isSubmitting.current = true;
    setSaving(true);
    try {
      const fields = type === "feeding" ? { amount: parseInt(value, 10) } : { duration: parseInt(value, 10) };
      await updateEvent(activeBabyId, eventId, fields);
      navigation.goBack();
    } catch (e) {
      showAlert("Error", e.message);
    } finally {
      isSubmitting.current = false;
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Edit {typeIcon} <Text style={styles.typeLabel}>{type}</Text></Text>
        <FormInput
          label={label} value={value}
          onChangeText={(v) => { setValue(v); if (fieldError) setFieldError(null); }}
          unit={unit} error={fieldError} autoFocus
        />
        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 20, justifyContent: "center" },
  heading: { fontSize: 18, color: "#555", marginBottom: 28, textAlign: "center" },
  typeLabel: { fontWeight: "700", color: "#1a1a2e", textTransform: "capitalize" },
  btn: { backgroundColor: "#2e7d32", borderRadius: 10, padding: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
