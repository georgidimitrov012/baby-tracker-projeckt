import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useBaby }   from "../context/BabyContext";
import { addEvent }  from "../services/eventStore";
import { showAlert } from "../utils/platform";

export default function Pee({ navigation }) {
  const { activeBabyId } = useBaby();
  const [saving, setSaving] = useState(false);
  const isSubmitting        = useRef(false);

  const handleSave = async () => {
    if (isSubmitting.current) return;

    isSubmitting.current = true;
    setSaving(true);

    try {
      // addEvent(babyId, type) — no extra fields needed for pee
      await addEvent(activeBabyId, "pee");
      navigation.goBack();
    } catch (e) {
      console.error("[Pee] save error:", e);
      showAlert("Error", e.message);
    } finally {
      isSubmitting.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💧</Text>
      <Text style={styles.title}>Log a pee</Text>
      <Text style={styles.sub}>Tap the button to record the time.</Text>

      <TouchableOpacity
        style={[styles.btn, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Confirm pee"
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Confirm Pee 💧</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: "#777",
    marginBottom: 36,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#00695c",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.55 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
