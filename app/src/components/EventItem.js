import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme }    from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

function getEventMeta(t) {
  return {
    feeding: { icon: "🍼", label: t('feeding'), bg: "#FFF0EB", dot: "#F4845F" },
    sleep:   { icon: "😴", label: t('sleep'),   bg: "#F0EAFF", dot: "#7B5EA7" },
    poop:    { icon: "💩", label: t('poopLabel'), bg: "#FFF8EC", dot: "#E88C3A" },
    pee:     { icon: "💧", label: t('peeLabel'), bg: "#E8F6F4", dot: "#47A67E" },
  };
}

function formatDetail(item, t) {
  if (item.type === "feeding") {
    if (item.feedingType === "breast") return `${t('breastLabel')} · ${item.duration ?? "?"} min`;
    const typeLabel = item.feedingType === "formula" ? t('formulaLabel') : t('bottleLabel');
    return `${typeLabel} · ${item.amount ?? "?"} ml`;
  }
  if (item.type === "sleep") {
    const typeLabel = item.sleepType === "night" ? t('nightType') : t('napType');
    return `${typeLabel} · ${item.duration ?? "?"} min`;
  }
  return null;
}

function formatTime(time) {
  const d = time instanceof Date ? time : new Date(time);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function EventItem({ item, onEdit, onDelete, loggedByName }) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const s = makeStyles(theme);

  const EVENT_META = getEventMeta(t);
  const meta   = EVENT_META[item.type] ?? { icon: "❓", label: item.type, bg: "#F5F5F5", dot: "#999" };
  const detail = formatDetail(item, t);

  return (
    <View style={[s.container, { backgroundColor: meta.bg }]}>
      <View style={[s.dotBar, { backgroundColor: meta.dot }]} />

      <View style={s.iconWrap}>
        <Text style={s.icon}>{meta.icon}</Text>
      </View>

      <View style={s.info}>
        <Text style={s.type}>{meta.label}</Text>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
        <Text style={s.time}>{formatTime(item.time)}</Text>
        {item.notes ? <Text style={s.notes}>"{item.notes}"</Text> : null}
        {loggedByName ? <Text style={s.loggedBy}>{t('by')} {loggedByName}</Text> : null}
      </View>

      {(onEdit || onDelete) ? (
        <View style={s.actions}>
          {onEdit ? (
            <TouchableOpacity
              onPress={onEdit}
              style={s.editBtn}
              accessibilityLabel={`Edit ${meta.label} event`}
            >
              <Text style={s.editText}>✏️</Text>
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity
              onPress={onDelete}
              style={s.deleteBtn}
              accessibilityLabel={`Delete ${meta.label} event`}
            >
              <Text style={s.deleteText}>🗑</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  dotBar: {
    width: 4,
    alignSelf: "stretch",
  },
  iconWrap: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  icon: { fontSize: 24 },
  info: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
  },
  type: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
  },
  detail: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 3,
  },
  notes: {
    fontSize: 12,
    color: theme.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
  },
  loggedBy: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    paddingRight: 12,
    gap: 6,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(123,94,167,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(224,82,82,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  editText: { fontSize: 15 },
  deleteText: { fontSize: 15 },
});
