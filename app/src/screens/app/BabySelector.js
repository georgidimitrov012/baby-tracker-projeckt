import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useBaby }    from "../../context/BabyContext";
import { showAlert }  from "../../utils/platform";

function computeAge(birthDate) {
  // birthDate is a Firestore Timestamp — call .toDate() on it
  const bd = birthDate && typeof birthDate.toDate === "function"
    ? birthDate.toDate()
    : birthDate instanceof Date
      ? birthDate
      : null;

  if (!bd) return null;

  const now = new Date();
  const diffMs = now - bd;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} old`;
  }

  const diffMonths = Math.floor(diffDays / 30.44);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} old`;
  }

  const years = Math.floor(diffMonths / 12);
  const months = diffMonths % 12;
  if (months === 0) {
    return `${years} year${years === 1 ? "" : "s"} old`;
  }
  return `${years} year${years === 1 ? "" : "s"}, ${months} month${months === 1 ? "" : "s"} old`;
}

export default function BabySelector({ navigation }) {
  const { babies, activeBabyId, setActiveBabyId, addBaby, loadingBabies } = useBaby();

  const [newBabyName, setNewBabyName] = useState("");
  const [adding, setAdding]           = useState(false);
  const isSubmitting                  = useRef(false);

  const handleSelect = (babyId) => {
    setActiveBabyId(babyId);
    navigation.goBack();
  };

  const handleAdd = async () => {
    if (isSubmitting.current) return;
    if (!newBabyName.trim()) {
      showAlert("Name required", "Please enter a name for the baby.");
      return;
    }

    isSubmitting.current = true;
    setAdding(true);

    try {
      await addBaby(newBabyName.trim());
      setNewBabyName("");
      navigation.goBack();
    } catch (e) {
      console.error("[BabySelector] addBaby error:", e);
      showAlert("Error", "Could not add baby. Please try again.");
    } finally {
      isSubmitting.current = false;
      setAdding(false);
    }
  };

  if (loadingBabies) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Select Baby</Text>

        {babies.length === 0 ? (
          <Text style={styles.empty}>No babies yet — add one below.</Text>
        ) : (
          babies.map((baby) => {
            const isActive = baby.id === activeBabyId;
            const age = computeAge(baby.birthDate);
            return (
              <TouchableOpacity
                key={baby.id}
                style={[styles.babyRow, isActive && styles.babyRowActive]}
                onPress={() => handleSelect(baby.id)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${baby.name}`}
              >
                {baby.photoURL
                  ? <Image source={{ uri: baby.photoURL }} style={styles.babyPhoto} />
                  : <Text style={styles.babyIcon}>👶</Text>
                }
                <View style={styles.babyInfo}>
                  <Text style={[styles.babyName, isActive && styles.babyNameActive]}>
                    {baby.name}
                  </Text>
                  {age ? (
                    <Text style={styles.babyAge}>{age}</Text>
                  ) : null}
                </View>
                {isActive ? <Text style={styles.check}>✓</Text> : null}
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => navigation.navigate("BabyProfile", { babyId: baby.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${baby.name}`}
                >
                  <Text style={styles.editBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>Add a Baby</Text>

        <TextInput
          style={styles.input}
          value={newBabyName}
          onChangeText={setNewBabyName}
          placeholder="Baby's name"
          placeholderTextColor="#bbb"
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />

        <TouchableOpacity
          style={[styles.btn, adding && styles.btnDisabled]}
          onPress={handleAdd}
          disabled={adding}
          accessibilityRole="button"
          accessibilityLabel="Add baby"
        >
          {adding
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Add Baby</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 8,
  },
  babyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  babyRowActive: {
    borderColor: "#1565c0",
    backgroundColor: "#e3f2fd",
  },
  babyIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  babyPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  babyInfo: {
    flex: 1,
  },
  babyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  babyNameActive: {
    color: "#1565c0",
  },
  babyAge: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  check: {
    fontSize: 16,
    color: "#1565c0",
    fontWeight: "700",
    marginRight: 8,
  },
  editBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(21,101,192,0.1)",
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    color: "#1565c0",
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#111",
    marginBottom: 14,
  },
  btn: {
    backgroundColor: "#1565c0",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.55 },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
