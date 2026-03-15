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
import { registerUser } from "../../services/authService";
import { useBaby }      from "../../context/BabyContext";

export default function RegisterScreen({ navigation }) {
  const { addBaby } = useBaby();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [babyName, setBabyName]       = useState("");
  const [addingBaby, setAddingBaby]   = useState(false); // toggle
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const isSubmitting                  = useRef(false);

  const handleRegister = async () => {
    if (isSubmitting.current) return;
    setError(null);

    // Validate account fields
    if (!displayName.trim()) { setError("Please enter your name."); return; }
    if (!email.trim())       { setError("Please enter your email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    // Only validate baby name if the user chose to add one
    if (addingBaby && !babyName.trim()) {
      setError("Please enter your baby's name, or uncheck 'Add a baby'.");
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    try {
      // 1. Create Firebase Auth account + Firestore user doc
      await registerUser(email.trim(), password, displayName.trim());

      // 2. Optionally create the first baby
      if (addingBaby && babyName.trim()) {
        await addBaby(babyName.trim());
      }

      // RootNavigator detects user change and navigates to AppNavigator.
      // If no baby was added, Dashboard shows the "No baby" pill prompting
      // the user to add one or wait for an invite.
    } catch (e) {
      console.error("[Register] error:", e);
      setError(friendlyError(e.code));
    } finally {
      isSubmitting.current = false;
      setLoading(false);
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>👶</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.tagline}>Start tracking from day one 💜</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>

          {/* Account fields */}
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Sarah"
            placeholderTextColor="#C4B8D8"
            autoComplete="name"
            returnKeyType="next"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#C4B8D8"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#C4B8D8"
            secureTextEntry
            returnKeyType={addingBaby ? "next" : "done"}
            onSubmitEditing={addingBaby ? undefined : handleRegister}
          />

          {/* ── Optional baby section ──────────────────────── */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => {
              setAddingBaby((v) => !v);
              setError(null);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: addingBaby }}
          >
            <View style={[styles.checkbox, addingBaby && styles.checkboxChecked]}>
              {addingBaby ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <View style={styles.toggleTextBlock}>
              <Text style={styles.toggleLabel}>Add a baby now</Text>
              <Text style={styles.toggleSub}>
                Skip if you were invited by another parent or are a pediatrician
              </Text>
            </View>
          </TouchableOpacity>

          {addingBaby ? (
            <View style={styles.babySection}>
              <Text style={styles.label}>Baby's Name</Text>
              <TextInput
                style={styles.input}
                value={babyName}
                onChangeText={setBabyName}
                placeholder="e.g. Emma"
                placeholderTextColor="#C4B8D8"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                autoFocus={false}
              />
            </View>
          ) : (
            <View style={styles.skipNote}>
              <Text style={styles.skipNoteText}>
                💡 You can add a baby later from the Dashboard, or accept an invite from another parent.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Create account"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>
            Already have an account?{" "}
            <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function friendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Registration failed. Please try again.";
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FBF8FF" },
  container: { flexGrow: 1, justifyContent: "center", padding: 28 },
  hero: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#1C1830", marginBottom: 6 },
  tagline: { fontSize: 15, color: "#A599BE", fontWeight: "500" },
  errorBanner: {
    backgroundColor: "#FDECEC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#E05252",
  },
  errorText: { color: "#E05252", fontSize: 14, fontWeight: "500" },
  form: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#655E80",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "#EDE6FA",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: "#F7F4FE",
    color: "#1C1830",
    marginBottom: 16,
  },

  // Toggle row
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingVertical: 4,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#EDE6FA",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "#F7F4FE",
  },
  checkboxChecked: { backgroundColor: "#7B5EA7", borderColor: "#7B5EA7" },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  toggleTextBlock: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: "#1C1830" },
  toggleSub: { fontSize: 12, color: "#A599BE", marginTop: 2 },

  // Baby section (shown when toggle is on)
  babySection: {
    backgroundColor: "#F0EAFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },

  // Skip note (shown when toggle is off)
  skipNote: {
    backgroundColor: "#E8F6F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  skipNoteText: { fontSize: 13, color: "#47A67E", lineHeight: 20 },

  // Submit
  btn: {
    backgroundColor: "#F4845F",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#F4845F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.55, shadowOpacity: 0 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  link: { alignItems: "center", padding: 8 },
  linkText: { fontSize: 14, color: "#A599BE" },
  linkBold: { color: "#7B5EA7", fontWeight: "700" },
});
