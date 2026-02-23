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
import {
  can,
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
} from "../../utils/permissions";
import { showAlert, showConfirm } from "../../utils/platform";

export default function InviteParentScreen() {
  const { user }                     = useAuth();
  const { activeBaby, activeBabyId } = useBaby();

  const [email, setEmail]                   = useState("");
  const [emailError, setEmailError]         = useState(null);
  const [selectedRole, setSelectedRole]     = useState(ROLES.PARENT);
  const [sending, setSending]               = useState(false);
  const [invites, setInvites]               = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const isSubmitting                        = useRef(false);

  // The roles this user is allowed to assign
  const invitableRoles = can.invitableRoles(activeBaby, user.uid);

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

  function validateEmail(v) {
    if (!v.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Enter a valid email address.";
    if (v.trim().toLowerCase() === user.email.toLowerCase()) return "You cannot invite yourself.";
    return null;
  }

  async function handleSend() {
    if (isSubmitting.current) return;
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }
    setEmailError(null);

    isSubmitting.current = true;
    setSending(true);
    try {
      const result = await sendInvite(
        activeBabyId,
        activeBaby.name,
        user.uid,
        user.displayName ?? user.email,
        email.trim(),
        selectedRole
      );

      if (result === "already_pending") {
        showAlert("Already invited", `A pending invite already exists for ${email.trim()}.`);
      } else {
        setEmail("");
        showAlert(
          "Invite sent! 📬",
          `${email.trim()} will be invited as ${ROLE_LABELS[selectedRole]}.`
        );
        await loadInvites();
      }
    } catch (e) {
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
          Inviting someone to{" "}
          <Text style={styles.babyName}>{activeBaby?.name ?? "this baby"}</Text>
        </Text>

        {/* Email input */}
        <Text style={styles.sectionLabel}>Email Address</Text>
        <TextInput
          style={[styles.input, emailError && styles.inputError]}
          value={email}
          onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(null); }}
          placeholder="Their email address"
          placeholderTextColor="#bbb"
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        {/* Role picker */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Assign Role</Text>
        {invitableRoles.map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.roleOption, selectedRole === role && styles.roleOptionActive]}
            onPress={() => setSelectedRole(role)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedRole === role }}
          >
            <View style={styles.roleOptionLeft}>
              <Text style={[styles.roleOptionName, selectedRole === role && styles.roleOptionNameActive]}>
                {ROLE_LABELS[role]}
              </Text>
              <Text style={styles.roleOptionDesc}>{ROLE_DESCRIPTIONS[role]}</Text>
            </View>
            <View style={[styles.radioOuter, selectedRole === role && styles.radioOuterActive]}>
              {selectedRole === role ? <View style={styles.radioInner} /> : null}
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.hint}>
          Works even if they don't have an account yet — they'll see the invite after registering with this email.
        </Text>

        <TouchableOpacity
          style={[styles.btn, sending && styles.btnDisabled]}
          onPress={handleSend}
          disabled={sending}
          accessibilityRole="button"
        >
          {sending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>
                Send Invite as {ROLE_LABELS[selectedRole]}
              </Text>
          }
        </TouchableOpacity>

        {/* Sent invites */}
        <Text style={[styles.sectionLabel, { marginTop: 36 }]}>Sent Invites</Text>
        {loadingInvites ? (
          <ActivityIndicator color="#1565c0" style={{ marginTop: 12 }} />
        ) : invites.length === 0 ? (
          <Text style={styles.empty}>No invites sent yet.</Text>
        ) : (
          invites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteEmail}>{invite.toEmail}</Text>
                <Text style={styles.inviteRole}>
                  {ROLE_LABELS[invite.role] ?? invite.role}
                  {" · "}
                  <Text style={{ color: STATUS_COLOR[invite.status] ?? "#888" }}>
                    {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                  </Text>
                </Text>
              </View>
              {invite.status === "pending" ? (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(invite)}
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
  babyLabel: { fontSize: 15, color: "#666", marginBottom: 24 },
  babyName: { fontWeight: "700", color: "#1a1a2e" },
  sectionLabel: {
    fontSize: 12, fontWeight: "700", color: "#888",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  input: {
    height: 48, borderWidth: 1, borderColor: "#ddd", borderRadius: 10,
    paddingHorizontal: 14, fontSize: 15, backgroundColor: "#fff", color: "#111", marginBottom: 4,
  },
  inputError: { borderColor: "#e53935" },
  errorText: { fontSize: 12, color: "#e53935", marginBottom: 8 },
  roleOption: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#f8f9fa",
    borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 2, borderColor: "transparent",
  },
  roleOptionActive: { borderColor: "#1565c0", backgroundColor: "#e3f2fd" },
  roleOptionLeft: { flex: 1 },
  roleOptionName: { fontSize: 15, fontWeight: "600", color: "#1a1a2e" },
  roleOptionNameActive: { color: "#1565c0" },
  roleOptionDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: "#ccc", alignItems: "center", justifyContent: "center",
  },
  radioOuterActive: { borderColor: "#1565c0" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1565c0" },
  hint: { fontSize: 13, color: "#999", marginTop: 12, marginBottom: 16, lineHeight: 18 },
  btn: {
    backgroundColor: "#1565c0", borderRadius: 12, padding: 14, alignItems: "center",
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  empty: { color: "#aaa", fontSize: 14, marginTop: 4 },
  inviteRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  inviteInfo: { flex: 1 },
  inviteEmail: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },
  inviteRole: { fontSize: 12, color: "#888", marginTop: 2 },
  cancelBtn: { backgroundColor: "#ffebee", borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12 },
  cancelText: { fontSize: 12, color: "#c62828", fontWeight: "600" },
});
