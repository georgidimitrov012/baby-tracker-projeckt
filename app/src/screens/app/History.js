import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useBaby }                from "../../context/BabyContext";
import { usePermissions }         from "../../hooks/usePermissions";
import { useEvents }              from "../../hooks/useEvents";
import { useUserDisplayNames }    from "../../hooks/useUserDisplayNames";
import { deleteEvent }            from "../../services/eventStore";
import { showConfirm, showAlert } from "../../utils/platform";
import { useTheme }               from "../../context/ThemeContext";
import { useLanguage }            from "../../context/LanguageContext";
import EventItem                  from "../../components/EventItem";

const EDITABLE_TYPES = ["feeding", "sleep", "poop", "pee"];

export default function History({ navigation }) {
  const { activeBabyId }           = useBaby();
  const { canWriteEvents }         = usePermissions();
  const { events, loading, error } = useEvents(activeBabyId);
  const { theme }                  = useTheme();
  const { t }                      = useLanguage();
  const s                          = makeStyles(theme);

  // Resolve loggedBy UIDs to display names
  const uids = useMemo(
    () => [...new Set(events.map((e) => e.loggedBy).filter(Boolean))],
    [events]
  );
  const { nameMap } = useUserDisplayNames(uids);

  const handleDelete = async (item) => {
    if (!canWriteEvents) {
      showAlert(t('readOnly'), t('noPermissionDelete'));
      return;
    }
    const confirmed = await showConfirm(
      t('deleteEvent'),
      t('deleteEventConfirm', { type: item.type })
    );
    if (!confirmed) return;

    try {
      await deleteEvent(activeBabyId, item.id);
    } catch (e) {
      console.error("[History] delete error:", e);
      showAlert(t('error'), t('couldNotDelete'));
    }
  };

  const handleEdit = (item) => {
    if (!canWriteEvents) {
      showAlert(t('readOnly'), t('noPermissionEdit'));
      return;
    }
    navigation.navigate("EditEvent", {
      eventId:     item.id,
      type:        item.type,
      feedingType: item.feedingType ?? "bottle",
      sleepType:   item.sleepType   ?? "nap",
      amount:      item.amount      ?? null,
      duration:    item.duration    ?? null,
      notes:       item.notes       ?? null,
      time:        item.time instanceof Date
        ? item.time.toISOString()
        : new Date(item.time).toISOString(),
    });
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>
          {t('failedToLoadEvents')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {!canWriteEvents ? (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>{t('readOnlyView')}</Text>
        </View>
      ) : null}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <Text style={s.empty}>{t('noEventsYet')}</Text>
        }
        renderItem={({ item }) => (
          <EventItem
            item={item}
            loggedByName={nameMap[item.loggedBy]}
            onDelete={canWriteEvents ? () => handleDelete(item) : null}
            onEdit={
              canWriteEvents && EDITABLE_TYPES.includes(item.type)
                ? () => handleEdit(item)
                : null
            }
          />
        )}
      />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, backgroundColor: theme.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: theme.background,
  },
  errorText: {
    color: theme.danger,
    fontSize: 15,
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 15,
    marginTop: 48,
  },
  readOnlyBanner: {
    backgroundColor: theme.warningLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  readOnlyText: {
    fontSize: 13,
    color: theme.warning,
    fontWeight: "600",
    textAlign: "center",
  },
});
