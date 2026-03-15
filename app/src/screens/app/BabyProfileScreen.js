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
import { Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useBaby }          from "../../context/BabyContext";
import { usePermissions }   from "../../hooks/usePermissions";
import { updateBaby }       from "../../services/babyService";
import { db }               from "../../services/firebase";
import { showAlert, showConfirm } from "../../utils/platform";
import FormInput            from "../../components/FormInput";

function formatDateToString(birthDate) {
  if (!birthDate) return "";
  // birthDate may be a Firestore Timestamp or a JS Date
  const d = typeof birthDate.toDate === "function"
    ? birthDate.toDate()
    : birthDate instanceof Date
      ? birthDate
      : null;
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function BabyProfileScreen({ route, navigation }) {
  const { babyId }           = route.params;
  const { babies }           = useBaby();
  const { canEditBaby, canDeleteBaby } = usePermissions();

  const baby = babies.find((b) => b.id === babyId);

  const [name, setName]           = useState(baby?.name ?? "");
  const [birthDate, setBirthDate] = useState(formatDateToString(baby?.birthDate));
  const [weight, setWeight]       = useState(
    baby?.weight != null ? String(baby.weight) : ""
  );
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const isSubmitting              = useRef(false);

  const handleSave = async () => {
    if (isSubmitting.current) return;

    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }
    setNameError(null);

    if (!canEditBaby) {
      showAlert("Permission denied", "You don't have permission to edit this baby's profile.");
      return;
    }

    isSubmitting.current = true;
    setSaving(true);

    try {
      let parsedDate = null;
      if (birthDate.trim()) {
        const d = new Date(birthDate.trim());
        if (isNaN(d.getTime())) {
          showAlert("Invalid date", "Please enter the birth date in YYYY-MM-DD format.");
          return;
        }
        parsedDate = d;
      }

      const fields = {
        name: name.trim(),
        birthDate: parsedDate ? Timestamp.fromDate(parsedDate) : null,
        weight: weight.trim() ? parseFloat(weight) : null,
      };

      await updateBaby(babyId, fields);
      navigation.goBack();
    } catch (e) {
      console.error("[BabyProfile] save error:", e);
      showAlert("Error", "Could not save changes. Please try again.");
    } finally {
      isSubmitting.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteBaby) {
      showAlert("Permission denied", "You don't have permission to delete this baby.");
      return;
    }

    const confirmed = await showConfirm(
      "Delete Baby",
      `Are you sure you want to delete "${baby?.name ?? "this baby"}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "babies", babyId));
      // Navigate back twice: back from BabyProfile → back from BabySelector
      navigation.goBack();
      navigation.goBack();
    } catch (e) {
      console.error("[BabyProfile] delete error:", e);
      showAlert("Error", "Could not delete baby. Please try again.");
      setDeleting(false);
    }
  };

  if (!baby) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Baby not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Baby Profile 👶</Text>

        <FormInput
          label="Name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError(null);
          }}
          placeholder="Baby's name"
          error={nameError}
          editable={canEditBaby}
        />

        <FormInput
          label="Birth Date"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="YYYY-MM-DD"
          editable={canEditBaby}
        />

        <FormInput
          label="Weight"
          value={weight}
          onChangeText={setWeight}
          placeholder="e.g. 3.5"
          unit="kg"
          keyboardType="numeric"
          editable={canEditBaby}
        />

        {canEditBaby ? (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save baby profile"
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        ) : (
          <Text style={styles.readOnlyNote}>
            You have read-only access and cannot edit this profile.
          </Text>
        )}

        {canDeleteBaby ? (
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={handleDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete baby"
          >
            {deleting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.deleteBtnText}>Delete Baby</Text>
            }
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: "#c62828",
    textAlign: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 32,
  },
  saveBtn: {
    backgroundColor: "#1565c0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "#c62828",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnDisabled: { opacity: 0.45 },
  readOnlyNote: {
    textAlign: "center",
    color: "#e65100",
    fontSize: 13,
    marginTop: 16,
  },
});
