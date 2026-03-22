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
import { useTheme }   from "../../context/ThemeContext";

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
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const { babies, activeBabyId, setActiveBabyId, addBaby, loadingBabies, babiesError } = useBaby();

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
      <View style={s.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.sectionLabel}>Select Baby</Text>

        {babiesError ? (
          <Text style={[s.empty, { color: "#c62828" }]}>{babiesError}</Text>
        ) : babies.length === 0 ? (
          <Text style={s.empty}>No babies yet — add one below.</Text>
        ) : (
          babies.map((baby) => {
            const isActive = baby.id === activeBabyId;
            const age = computeAge(baby.birthDate);
            return (
              <TouchableOpacity
                key={baby.id}
                style={[s.babyRow, isActive && s.babyRowActive]}
                onPress={() => handleSelect(baby.id)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${baby.name}`}
              >
                {baby.photoURL
                  ? <Image source={{ uri: baby.photoURL }} style={s.babyPhoto} />
                  : <Text style={s.babyIcon}>👶</Text>
                }
                <View style={s.babyInfo}>
                  <Text style={[s.babyName, isActive && s.babyNameActive]}>
                    {baby.name}
                  </Text>
                  {age ? (
                    <Text style={s.babyAge}>{age}</Text>
                  ) : null}
                </View>
                {isActive ? <Text style={s.check}>✓</Text> : null}
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => navigation.navigate("BabyProfile", { babyId: baby.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${baby.name}`}
                >
                  <Text style={s.editBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={[s.sectionLabel, { marginTop: 32 }]}>Add a Baby</Text>

        <TextInput
          style={s.input}
          value={newBabyName}
          onChangeText={setNewBabyName}
          placeholder="Baby's name"
          placeholderTextColor={theme.placeholder}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />

        <TouchableOpacity
          style={[s.btn, adding && s.btnDisabled]}
          onPress={handleAdd}
          disabled={adding}
          accessibilityRole="button"
          accessibilityLabel="Add baby"
        >
          {adding
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Add Baby</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
  container: {
    padding: 24,
    backgroundColor: theme.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 8,
  },
  babyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  babyRowActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
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
    color: theme.text,
  },
  babyNameActive: {
    color: theme.primary,
  },
  babyAge: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2,
  },
  check: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: "700",
    marginRight: 8,
  },
  editBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(123,94,167,0.1)",
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    marginBottom: 14,
  },
  btn: {
    backgroundColor: theme.primary,
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
