import React, { useState, useEffect, useRef } from "react";
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
import { useAuth }  from "../../context/AuthContext";
import { useBaby }  from "../../context/BabyContext";
import {
  sendInvite,
  getOutgoingInvites,
  cancelInvite,
} from "../../services/inviteService";
import { showAlert, showConfirm } from "../../utils/platform";

export default function InviteParentScreen() {
  const { user }                     = useAuth();
  const { activeBaby, activeBabyId } = useBaby();

  const [email, setEmail]                   = useState("");
  const [emailError, setEmailError]         = useState(null);
  const [sending, setSending]               = useState(false);
  const [invites, setInvites]               = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const isSubmitting                        = useRef(false);

  useEffect(() => {
    if (!activeBabyId || !user) return;
    loadInvites();
  }, [activeBabyId, user]);

  async function loadInvites() {
    setLoadingInvites(true);
    try {
      const result = await getOutgoingInvites(activeBabyId, user.uid);
      setInvites(result);
    } catch (e) {
      console.error("[InviteParent] loadInvites error:", e);
    } finally {
      setLoadingInvites(false);
    }
  }

  function validateEmail(value) {
    if (!value.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address.";
    if (value.trim().toLowerCase() === user.email.toLowerCase()) return "You cannot invite yourself.";
    return null;
  }

  async function handleSend() {
    if (isSubmitting.current) return;

    const error = validateEmail(email);
    if (error) { setEmailError(error); return; }
    setEmailError(null);

    isSubmitting.current = true;
    setSending(true);

    try {
      const result = await sendInvite(
        activeBabyId,
        activeBaby.name,
        user.uid,
        user.displayName ?? user.email,
        email.trim()
      );

      if (result === "already_pending") {
        showAlert("Already invited", `A pending invite already exists for ${email.trim()}.`);
      } else {
        setEmail("");
        showAlert(
          "Invite sent! 📬",
          `${email.trim()} will see it the next time they open the app. If they don't have an account yet, they'll see it after registering.`
        );
        await loadInvites();
      }
    } catch (e) {
      console.error("[InviteParent] sendInvite error:", e);
      showAlert("Error", "Could not send invite. Please try again.");
    } finally {
      isSubmitting.current = false;
      setSending(false);
    }
  }

  async function handleCancel(invite) {
    const confirmed = await showConfirm("Cancel invite", `Cancel invite to ${invite.toEmail}?`);
    if (!confirmed) return;
    try {
      await cancelInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (e) {
      showAlert("Error", "Could not cancel invite.");
    }
  }

  const STATUS_COLOR = {
    pending:  "#f57c00",
    accepted: "#2e7d32",
    declined: "#c62828",
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <Text style={styles.babyLabel}>
          Inviting a parent for{" "}
          <Text style={styles.babyName}>{activeBaby?.name ?? "this baby"}</Text>
        </Text>

        {/* Send invite form */}
        <Text style={styles.sectionLabel}>Send Invite</Text>

        <TextInput
          style={[styles.input, emailError && styles.inputError]}
          value={email}
          onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(null); }}
          placeholder="Parent's email address"
          placeholderTextColor="#bbb"
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <Text style={styles.hint}>
          They'll see the invite when they open the app. Works even if they haven't registered yet.
        </Text>

        <TouchableOpacity
          style={[styles.btn, sending && styles.btnDisabled]}
          onPress={handleSend}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel="Send invite"
        >
          {sending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Send Invite</Text>
          }
        </TouchableOpacity>

        {/* Sent invites */}
        <Text style={[styles.sectionLabel, { marginTop: 36 }]}>Sent Invites</Text>

        {loadingInvites ? (
          <ActivityIndicator color="#1565c0" style={{ marginTop: 16 }} />
        ) : invites.length === 0 ? (
          <Text style={styles.empty}>No invites sent yet.</Text>
        ) : (
          invites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteEmail}>{invite.toEmail}</Text>
                <Text style={[styles.inviteStatus, { color: STATUS_COLOR[invite.status] ?? "#888" }]}>
                  {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                </Text>
              </View>
              {invite.status === "pending" ? (
                <TouchableOpacity
                  onPress={() => handleCancel(invite)}
                  style={styles.cancelBtn}
                  accessibilityLabel="Cancel invite"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingBottom: 48 },
  babyLabel: { fontSize: 15, color: "#666", marginBottom: 28 },
  babyName: { fontWeight: "700", color: "#1a1a2e" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
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
    marginBottom: 6,
  },
  inputError: { borderColor: "#e53935" },
  errorText: { fontSize: 12, color: "#e53935", marginBottom: 8 },
  hint: { fontSize: 13, color: "#999", marginBottom: 16, lineHeight: 18 },
  btn: {
    backgroundColor: "#1565c0",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  empty: { color: "#aaa", fontSize: 14, marginTop: 8 },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  inviteInfo: { flex: 1 },
  inviteEmail: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },
  inviteStatus: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  cancelBtn: {
    backgroundColor: "#ffebee",
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelText: { fontSize: 12, color: "#c62828", fontWeight: "600" },
});
