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

export default function Sleep({ navigation }) {
  const { activeBabyId } = useBaby();

  // Your original timer logic — preserved exactly
  const [start, setStart]   = useState(null);
  const [saving, setSaving] = useState(false);
  const isSubmitting        = useRef(false);

  const handleStart = () => {
    setStart(new Date());
  };

  const handleStop = async () => {
    if (!start) return;
    if (isSubmitting.current) return; // block double-tap

    const end      = new Date();
    const duration = Math.round((end - start) / 60000);

    isSubmitting.current = true;
    setSaving(true);

    try {
      // addEvent(babyId, type, fields) — babyId comes from context
      // `time` is set to serverTimestamp() inside addEvent automatically
      await addEvent(activeBabyId, "sleep", {
        start:    start.toISOString(),
        end:      end.toISOString(),
        duration,
      });
      navigation.goBack();
    } catch (e) {
      console.error("[Sleep] save error:", e);
      showAlert("Error", e.message);
    } finally {
      isSubmitting.current = false;
      setSaving(false);
    }
  };

  // Show elapsed time while timer is running
  const elapsedLabel = start
    ? `Started at ${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sleep Tracker</Text>

      {elapsedLabel ? (
        <Text style={styles.elapsed}>{elapsedLabel}</Text>
      ) : null}

      {!start ? (
        <TouchableOpacity
          style={[styles.btn, styles.startBtn]}
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel="Start sleep timer"
        >
          <Text style={styles.btnText}>▶  Start Sleep</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.btn, styles.stopBtn, saving && styles.btnDisabled]}
          onPress={handleStop}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Stop sleep timer and save"
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>⏹  Stop &amp; Save</Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 20,
  },
  elapsed: {
    fontSize: 15,
    textAlign: "center",
    color: "#6a1b9a",
    marginBottom: 28,
  },
  btn: {
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  startBtn: {
    backgroundColor: "#6a1b9a",
  },
  stopBtn: {
    backgroundColor: "#c62828",
  },
  btnDisabled: { opacity: 0.55 },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
