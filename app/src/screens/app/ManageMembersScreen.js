import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useAuth }  from "../../context/AuthContext";
import { useBaby }  from "../../context/BabyContext";
import { removeParentFromBaby } from "../../services/inviteService";
import { showConfirm, showAlert } from "../../utils/platform";

export default function ManageMembersScreen({ navigation }) {
  const { user }                                    = useAuth();
  const { activeBaby, activeBabyId, refreshBabies } = useBaby();
  const [removing, setRemoving]                     = useState(null);

  if (!activeBaby) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No baby selected.</Text>
      </View>
    );
  }

  const members = Object.entries(activeBaby.members ?? {});
  const isOwner = activeBaby.members?.[user.uid] === "owner";

  async function handleRemove(uid) {
    if (uid === user.uid) {
      showAlert("Cannot remove yourself", "You are the owner. Transfer ownership to another parent first.");
      return;
    }
    const confirmed = await showConfirm("Remove parent", "Remove this parent's access to the baby?");
    if (!confirmed) return;

    setRemoving(uid);
    try {
      await removeParentFromBaby(activeBabyId, uid, activeBaby.members);
      await refreshBabies();
    } catch (e) {
      showAlert("Error", "Could not remove parent. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.babyTitle}>
        Members of <Text style={styles.babyName}>{activeBaby.name}</Text>
      </Text>

      <FlatList
        data={members}
        keyExtractor={([uid]) => uid}
        contentContainerStyle={styles.list}
        renderItem={({ item: [uid, role] }) => {
          const isYou      = uid === user.uid;
          const isRemoving = removing === uid;

          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.memberUid}>
                  {isYou ? "You" : `${uid.slice(0, 14)}...`}
                </Text>
                <View style={[styles.rolePill, role === "owner" ? styles.ownerPill : styles.parentPill]}>
                  <Text style={[styles.roleText, role === "owner" ? styles.ownerText : styles.parentText]}>
                    {role}
                  </Text>
                </View>
              </View>

              {isOwner && !isYou ? (
                isRemoving ? (
                  <ActivityIndicator size="small" color="#c62828" />
                ) : (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemove(uid)}
                    accessibilityLabel="Remove parent"
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                )
              ) : null}
            </View>
          );
        }}
      />

      {isOwner ? (
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => navigation.navigate("InviteParent")}
          accessibilityRole="button"
          accessibilityLabel="Invite another parent"
        >
          <Text style={styles.inviteBtnText}>+ Invite Another Parent</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 15 },
  babyTitle: { fontSize: 16, color: "#666", marginBottom: 20 },
  babyName: { fontWeight: "700", color: "#1a1a2e" },
  list: { paddingBottom: 32 },
  row: {
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
  rowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  memberUid: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },
  rolePill: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  ownerPill: { backgroundColor: "#e3f2fd" },
  parentPill: { backgroundColor: "#e8f5e9" },
  roleText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  ownerText: { color: "#1565c0" },
  parentText: { color: "#2e7d32" },
  removeBtn: {
    backgroundColor: "#ffebee",
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeText: { fontSize: 12, color: "#c62828", fontWeight: "600" },
  inviteBtn: {
    backgroundColor: "#1565c0",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  inviteBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
