import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        📵 You are offline — changes will sync when reconnected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#fff3e0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ffe0b2",
  },
  text: {
    fontSize: 13,
    color: "#e65100",
    textAlign: "center",
    fontWeight: "500",
  },
});
