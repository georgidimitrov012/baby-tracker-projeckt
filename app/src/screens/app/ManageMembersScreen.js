import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useAuth }  from "../../context/AuthContext";
import { useBaby }  from "../../context/BabyContext";
import {
  removeParentFromBaby,
  changeMemberRole,
  transferOwnership,
} from "../../services/inviteService";
import {
  can,
  getRole,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLES,
  INVITABLE_ROLES_OWNER,
  INVITABLE_ROLES_ADMIN,
} from "../../utils/permissions";
import { showConfirm, showAlert } from "../../utils/platform";

export default function ManageMembersScreen({ navigation }) {
  const { user }                                    = useAuth();
  const { activeBaby, activeBabyId, refreshBabies } = useBaby();

  const [acting, setActing]           = useState(null); // uid being acted on
  const [changingRole, setChangingRole] = useState(null); // uid whose role picker is open

  if (!activeBaby) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No baby selected.</Text>
      </View>
    );
  }

  const myRole  = getRole(activeBaby, user.uid);
  const members = Object.entries(activeBaby.members ?? {});

  async function handleRemove(uid) {
    if (!can.removeMember(activeBaby, user.uid, uid)) {
      showAlert("Not permitted", "You don't have permission to remove this member.");
      return;
    }
    const confirmed = await showConfirm("Remove member", "Remove this person's access to the baby?");
    if (!confirmed) return;

    setActing(uid);
    try {
      await removeParentFromBaby(activeBabyId, uid, activeBaby.members);
      await refreshBabies();
    } catch (e) {
      showAlert("Error", "Could not remove member. Please try again.");
    } finally {
      setActing(null);
    }
  }

  async function handleRoleChange(targetUid, newRole) {
    if (!can.changeRole(activeBaby, user.uid, targetUid)) {
      showAlert("Not permitted", "You don't have permission to change this role.");
      return;
    }

    setChangingRole(null);
    setActing(targetUid);
    try {
      await changeMemberRole(activeBabyId, targetUid, newRole);
      await refreshBabies();
    } catch (e) {
      showAlert("Error", "Could not change role. Please try again.");
    } finally {
      setActing(null);
    }
  }

  async function handleTransferOwnership(targetUid) {
    const confirmed = await showConfirm(
      "Transfer Ownership",
      "This will make them the owner and demote you to Admin. This cannot be undone easily. Are you sure?"
    );
    if (!confirmed) return;

    setActing(targetUid);
    try {
      await transferOwnership(activeBabyId, user.uid, targetUid);
      await refreshBabies();
      showAlert("Done", "Ownership transferred successfully.");
    } catch (e) {
      showAlert("Error", "Could not transfer ownership. Please try again.");
    } finally {
      setActing(null);
    }
  }

  // Roles the current user can assign to others
  const assignableRoles = myRole === ROLES.OWNER
    ? INVITABLE_ROLES_OWNER
    : myRole === ROLES.ADMIN
      ? INVITABLE_ROLES_ADMIN
      : [];

  const ROLE_COLORS = {
    [ROLES.OWNER]:        { bg: "#e3f2fd", text: "#1565c0" },
    [ROLES.ADMIN]:        { bg: "#fce4ec", text: "#880e4f" },
    [ROLES.PARENT]:       { bg: "#e8f5e9", text: "#2e7d32" },
    [ROLES.VIEWER]:       { bg: "#fff3e0", text: "#e65100" },
    [ROLES.PEDIATRICIAN]: { bg: "#ede7f6", text: "#4527a0" },
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.babyTitle}>
        Members of <Text style={styles.babyName}>{activeBaby.name}</Text>
      </Text>
      <Text style={styles.myRoleText}>
        Your role: <Text style={styles.myRoleBold}>{ROLE_LABELS[myRole]}</Text>
      </Text>

      {members.map(([uid, role]) => {
        const isYou      = uid === user.uid;
        const isActing   = acting === uid;
        const showPicker = changingRole === uid;
        const colors     = ROLE_COLORS[role] ?? { bg: "#eee", text: "#333" };
        const canChange  = can.changeRole(activeBaby, user.uid, uid);
        const canRemove  = can.removeMember(activeBaby, user.uid, uid);

        return (
          <View key={uid} style={styles.card}>
            {/* Member row */}
            <View style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {isYou ? "You" : `User ${uid.slice(0, 10)}…`}
                </Text>
                <View style={[styles.rolePill, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.rolePillText, { color: colors.text }]}>
                    {ROLE_LABELS[role]}
                  </Text>
                </View>
              </View>

              {isActing ? (
                <ActivityIndicator size="small" color="#1565c0" />
              ) : (
                <View style={styles.actions}>
                  {canChange && !isYou ? (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => setChangingRole(showPicker ? null : uid)}
                    >
                      <Text style={styles.actionBtnText}>
                        {showPicker ? "Cancel" : "Change Role"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {canRemove && !isYou ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.removeBtn]}
                      onPress={() => handleRemove(uid)}
                    >
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>

            {/* Role picker — shown inline when "Change Role" is tapped */}
            {showPicker ? (
              <View style={styles.rolePicker}>
                <Text style={styles.rolePickerLabel}>Assign role:</Text>
                {assignableRoles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOption,
                      role === r && styles.roleOptionActive,
                    ]}
                    onPress={() => handleRoleChange(uid, r)}
                  >
                    <View style={styles.roleOptionLeft}>
                      <Text style={styles.roleOptionName}>{ROLE_LABELS[r]}</Text>
                      <Text style={styles.roleOptionDesc}>{ROLE_DESCRIPTIONS[r]}</Text>
                    </View>
                    {role === r ? <Text style={styles.roleOptionCheck}>✓</Text> : null}
                  </TouchableOpacity>
                ))}

                {/* Transfer ownership — owner only, to non-owners */}
                {myRole === ROLES.OWNER && role !== ROLES.OWNER ? (
                  <TouchableOpacity
                    style={[styles.roleOption, styles.transferOption]}
                    onPress={() => handleTransferOwnership(uid)}
                  >
                    <View style={styles.roleOptionLeft}>
                      <Text style={[styles.roleOptionName, { color: "#c62828" }]}>
                        Transfer Ownership
                      </Text>
                      <Text style={styles.roleOptionDesc}>
                        Make them the owner. You become Admin.
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {/* Invite button — only owner/admin */}
      {can.manageMembers(activeBaby, user.uid) ? (
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => navigation.navigate("InviteParent")}
          accessibilityRole="button"
        >
          <Text style={styles.inviteBtnText}>+ Invite a Parent</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 15 },
  babyTitle: { fontSize: 16, color: "#666", marginBottom: 4 },
  babyName: { fontWeight: "700", color: "#1a1a2e" },
  myRoleText: { fontSize: 13, color: "#999", marginBottom: 20 },
  myRoleBold: { fontWeight: "700", color: "#555" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  memberRow: { flexDirection: "row", alignItems: "center" },
  memberInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  memberName: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },
  rolePill: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  rolePillText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    backgroundColor: "#e3f2fd",
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionBtnText: { fontSize: 12, color: "#1565c0", fontWeight: "600" },
  removeBtn: { backgroundColor: "#ffebee" },
  removeBtnText: { fontSize: 12, color: "#c62828", fontWeight: "600" },
  rolePicker: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  rolePickerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#f8f9fa",
  },
  roleOptionActive: { backgroundColor: "#e3f2fd" },
  roleOptionLeft: { flex: 1 },
  roleOptionName: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },
  roleOptionDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  roleOptionCheck: { fontSize: 16, color: "#1565c0", fontWeight: "700" },
  transferOption: { backgroundColor: "#ffebee", marginTop: 4 },
  inviteBtn: {
    backgroundColor: "#1565c0",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  inviteBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
