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
import { loginUser } from "../../services/authService";

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const isSubmitting            = useRef(false);

  const handleLogin = async () => {
    if (isSubmitting.current) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    try {
      await loginUser(email.trim(), password);
      // No navigation needed — RootNavigator detects user change and
      // automatically swaps to AppNavigator.
    } catch (e) {
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.tagline}>Caring made simpler 💜</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
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
            placeholder="••••••••"
            placeholderTextColor="#C4B8D8"
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>
            Don't have an account?{" "}
            <Text style={styles.linkBold}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Convert Firebase error codes into readable messages.
 * Never expose raw Firebase error messages to users.
 */
function friendlyError(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Sign in failed. Please try again.";
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FBF8FF" },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
  },
  hero: {
    alignItems: "center",
    marginBottom: 36,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1C1830",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: "#A599BE",
    fontWeight: "500",
  },
  errorBanner: {
    backgroundColor: "#FDECEC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#E05252",
  },
  errorText: {
    color: "#E05252",
    fontSize: 14,
    fontWeight: "500",
  },
  form: { marginBottom: 22 },
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
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  link: { alignItems: "center", padding: 8 },
  linkText: { fontSize: 14, color: "#A599BE" },
  linkBold: { color: "#7B5EA7", fontWeight: "700" },
});
