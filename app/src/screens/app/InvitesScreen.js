import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useAuth }  from "../../context/AuthContext";
import { useBaby }  from "../../context/BabyContext";
import {
  getPendingInvites,
  acceptInvite,
  declineInvite,
} from "../../services/inviteService";
import { showAlert } from "../../utils/platform";

export default function InvitesScreen() {
  const { user }          = useAuth();
  const { refreshBabies } = useBaby();

  const [invites, setInvites]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [actingOn, setActingOn] = useState(null); // inviteId currently being processed

  const loadInvites = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const result = await getPendingInvites(user.email);
      setInvites(result);
    } catch (e) {
      console.error("[InvitesScreen] load error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  async function handleAccept(invite) {
    setActingOn(invite.id);
    try {
      await acceptInvite(invite.id, user.uid);

      // Refresh BabyContext so the new baby appears in the selector immediately
      await refreshBabies();

      setInvites((prev) => prev.filter((i) => i.id !== invite.id));

      showAlert(
        "You're in! 🎉",
        `You now have full access to ${invite.babyName}. Switch to them from the Dashboard.`
      );
    } catch (e) {
      console.error("[InvitesScreen] accept error:", e);
      showAlert("Error", "Could not accept invite. Please try again.");
    } finally {
      setActingOn(null);
    }
  }

  async function handleDecline(invite) {
    setActingOn(invite.id);
    try {
      await declineInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (e) {
      showAlert("Error", "Could not decline invite. Please try again.");
    } finally {
      setActingOn(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invites}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInvites} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📬</Text>
            <Text style={styles.emptyTitle}>No pending invites</Text>
            <Text style={styles.emptySub}>
              When another parent invites you to track their baby, it will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActing = actingOn === item.id;
          return (
            <View style={styles.card}>
              <Text style={styles.cardIcon}>👶</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.babyName}>{item.babyName}</Text>
                <Text style={styles.fromText}>
                  From <Text style={styles.fromName}>{item.fromName}</Text>
                </Text>
              </View>

              {isActing ? (
                <ActivityIndicator color="#1565c0" />
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAccept(item)}
                    accessibilityLabel="Accept invite"
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => handleDecline(item)}
                    accessibilityLabel="Decline invite"
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#444", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardIcon: { fontSize: 28, marginRight: 14 },
  cardInfo: { flex: 1 },
  babyName: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  fromText: { fontSize: 13, color: "#888", marginTop: 3 },
  fromName: { fontWeight: "600", color: "#555" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  acceptBtn: { backgroundColor: "#e8f5e9" },
  declineBtn: { backgroundColor: "#ffebee" },
  acceptText: { fontSize: 13, fontWeight: "700", color: "#2e7d32" },
  declineText: { fontSize: 13, fontWeight: "700", color: "#c62828" },
});
