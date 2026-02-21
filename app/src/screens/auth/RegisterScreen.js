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
  const { addBaby }         = useBaby();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [babyName, setBabyName]       = useState("");
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const isSubmitting                  = useRef(false);

  const handleRegister = async () => {
    if (isSubmitting.current) return;
    setError(null);

    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!babyName.trim()) {
      setError("Please enter your baby's name.");
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    try {
      // 1. Create Firebase Auth account + Firestore user doc
      await registerUser(email.trim(), password, displayName.trim());

      // 2. Create the first baby — BabyContext.addBaby reads the user
      //    from AuthContext, which has already updated by now.
      //    We use a small delay to ensure AuthContext has the new user.
      //    In practice onAuthStateChanged fires synchronously before
      //    registerUser resolves, so this is usually instant.
      await addBaby(babyName.trim());

      // RootNavigator detects user change and navigates to AppNavigator.
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
      >
        <Text style={styles.logo}>👶</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.sub}>Track your baby from day one</Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Sarah"
            placeholderTextColor="#bbb"
            autoComplete="name"
            returnKeyType="next"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#bbb"
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
            placeholderTextColor="#bbb"
            secureTextEntry
            returnKeyType="next"
          />

          <Text style={styles.sectionHeading}>Your Baby</Text>

          <Text style={styles.label}>Baby's Name</Text>
          <TextInput
            style={styles.input}
            value={babyName}
            onChangeText={setBabyName}
            placeholder="e.g. Emma"
            placeholderTextColor="#bbb"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
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
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
  },
  logo: {
    fontSize: 56,
    textAlign: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    marginBottom: 32,
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    textAlign: "center",
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
    marginTop: 8,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
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
    marginBottom: 16,
  },
  btn: {
    backgroundColor: "#1565c0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  link: {
    alignItems: "center",
    padding: 8,
  },
  linkText: {
    fontSize: 14,
    color: "#888",
  },
  linkBold: {
    color: "#1565c0",
    fontWeight: "600",
  },
});
