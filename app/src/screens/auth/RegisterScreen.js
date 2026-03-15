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
import { useTheme }     from "../../context/ThemeContext";

export default function RegisterScreen({ navigation }) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
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
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Text style={s.logo}>👶</Text>
          <Text style={s.title}>Create your account</Text>
          <Text style={s.tagline}>Start tracking from day one 💜</Text>
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.form}>

          {/* Account fields */}
          <Text style={s.label}>Your Name</Text>
          <TextInput
            style={s.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Sarah"
            placeholderTextColor={theme.placeholder}
            autoComplete="name"
            returnKeyType="next"
          />

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            returnKeyType={addingBaby ? "next" : "done"}
            onSubmitEditing={addingBaby ? undefined : handleRegister}
          />

          {/* ── Optional baby section ──────────────────────── */}
          <TouchableOpacity
            style={s.toggleRow}
            onPress={() => {
              setAddingBaby((v) => !v);
              setError(null);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: addingBaby }}
          >
            <View style={[s.checkbox, addingBaby && s.checkboxChecked]}>
              {addingBaby ? <Text style={s.checkmark}>✓</Text> : null}
            </View>
            <View style={s.toggleTextBlock}>
              <Text style={s.toggleLabel}>Add a baby now</Text>
              <Text style={s.toggleSub}>
                Skip if you were invited by another parent or are a pediatrician
              </Text>
            </View>
          </TouchableOpacity>

          {addingBaby ? (
            <View style={s.babySection}>
              <Text style={s.label}>Baby's Name</Text>
              <TextInput
                style={s.input}
                value={babyName}
                onChangeText={setBabyName}
                placeholder="e.g. Emma"
                placeholderTextColor={theme.placeholder}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                autoFocus={false}
              />
            </View>
          ) : (
            <View style={s.skipNote}>
              <Text style={s.skipNoteText}>
                💡 You can add a baby later from the Dashboard, or accept an invite from another parent.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Create account"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={s.link}
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="button"
        >
          <Text style={s.linkText}>
            Already have an account?{" "}
            <Text style={s.linkBold}>Sign in</Text>
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

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
  container: { flexGrow: 1, justifyContent: "center", padding: 28 },
  hero: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "800", color: theme.text, marginBottom: 6 },
  tagline: { fontSize: 15, color: theme.textMuted, fontWeight: "500" },
  errorBanner: {
    backgroundColor: theme.dangerLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: theme.danger,
  },
  errorText: { color: theme.danger, fontSize: 14, fontWeight: "500" },
  form: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
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
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: theme.inputBg,
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  toggleTextBlock: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: theme.text },
  toggleSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  // Baby section (shown when toggle is on)
  babySection: {
    backgroundColor: theme.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },

  // Skip note (shown when toggle is off)
  skipNote: {
    backgroundColor: theme.successLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  skipNoteText: { fontSize: 13, color: theme.success, lineHeight: 20 },

  // Submit
  btn: {
    backgroundColor: theme.accent,
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.55, shadowOpacity: 0 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  link: { alignItems: "center", padding: 8 },
  linkText: { fontSize: 14, color: theme.textMuted },
  linkBold: { color: theme.primary, fontWeight: "700" },
});
