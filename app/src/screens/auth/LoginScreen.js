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
import { useTheme } from "../../context/ThemeContext";

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const s = makeStyles(theme);

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
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.tagline}>Caring made simpler 💜</Text>
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.form}>
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
            placeholder="••••••••"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={s.link}
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="button"
        >
          <Text style={s.linkText}>
            Don't have an account?{" "}
            <Text style={s.linkBold}>Create one</Text>
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

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
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
    color: theme.text,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: theme.textMuted,
    fontWeight: "500",
  },
  errorBanner: {
    backgroundColor: theme.dangerLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: theme.danger,
  },
  errorText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  form: { marginBottom: 22 },
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
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  link: { alignItems: "center", padding: 8 },
  linkText: { fontSize: 14, color: theme.textMuted },
  linkBold: { color: theme.primary, fontWeight: "700" },
});
