import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const EVENT_META = {
  feeding: { icon: "🍼", label: "Feeding", color: "#e3f2fd" },
  sleep:   { icon: "😴", label: "Sleep",   color: "#f3e5f5" },
  poop:    { icon: "💩", label: "Poop",    color: "#fff8e1" },
  pee:     { icon: "💧", label: "Pee",     color: "#e0f7fa" },
};

function formatDetail(item) {
  if (item.type === "feeding") return `${item.amount} ml`;
  if (item.type === "sleep")   return `${item.duration} min`;
  return null;
}

function formatTime(time) {
  const d = time instanceof Date ? time : new Date(time);
  return d.toLocaleString(undefined, {
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

/**
 * Single row in the History list.
 *
 * Uses visible Edit / Delete buttons rather than LongPress because
 * LongPress is unreliable on web. Buttons work on all platforms.
 *
 * Pass onEdit=null to hide the Edit button (used for poop and pee
 * which have no editable fields).
 */
export default function EventItem({ item, onEdit, onDelete }) {
  const meta   = EVENT_META[item.type] ?? { icon: "❓", label: item.type, color: "#f5f5f5" };
  const detail = formatDetail(item);

  return (
    <View style={[styles.container, { backgroundColor: meta.color }]}>
      <View style={styles.left}>
        <Text style={styles.icon}>{meta.icon}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.type}>{meta.label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        <Text style={styles.time}>{formatTime(item.time)}</Text>
      </View>

      <View style={styles.actions}>
        {onEdit ? (
          <TouchableOpacity
            onPress={onEdit}
            style={[styles.btn, styles.editBtn]}
            accessibilityLabel={`Edit ${meta.label} event`}
          >
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={onDelete}
          style={[styles.btn, styles.deleteBtn]}
          accessibilityLabel={`Delete ${meta.label} event`}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  left: {
    width: 36,
    alignItems: "center",
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  type: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  detail: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },
  actions: {
    flexDirection: "row",
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 7,
    marginLeft: 6,
  },
  editBtn: {
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  deleteBtn: {
    backgroundColor: "rgba(229,57,53,0.12)",
  },
  editText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1565c0",
  },
  deleteText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c62828",
  },
});
