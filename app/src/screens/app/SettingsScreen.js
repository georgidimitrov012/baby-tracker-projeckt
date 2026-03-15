import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useBaby }                  from "../../context/BabyContext";
import { useTheme }                 from "../../context/ThemeContext";
import { usePermissions }           from "../../hooks/usePermissions";
import { updateBabySettings }       from "../../services/babyService";
import { cancelFeedingReminder, scheduleFeedingReminder } from "../../services/notificationService";
import { showAlert }                from "../../utils/platform";

export default function SettingsScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { activeBaby, activeBabyId }   = useBaby();
  const { canEditBaby }                = usePermissions();

  const defaultHours = activeBaby?.settings?.feedingReminderHours ?? 3;
  const [reminderHours, setReminderHours] = useState(String(defaultHours));
  const [reminderEnabled, setReminderEnabled] = useState(
    activeBaby?.settings?.feedingReminderEnabled !== false
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReminderHours(String(activeBaby?.settings?.feedingReminderHours ?? 3));
    setReminderEnabled(activeBaby?.settings?.feedingReminderEnabled !== false);
  }, [activeBaby?.settings]);

  const handleSaveReminder = async () => {
    const hours = parseFloat(reminderHours);
    if (isNaN(hours) || hours < 0.5 || hours > 12) {
      showAlert("Invalid value", "Please enter a number between 0.5 and 12 hours.");
      return;
    }
    if (!canEditBaby) {
      showAlert("Permission denied", "You need admin or owner access to change baby settings.");
      return;
    }
    setSaving(true);
    try {
      await updateBabySettings(activeBabyId, {
        feedingReminderHours:   hours,
        feedingReminderEnabled: reminderEnabled,
      });
      if (reminderEnabled) {
        await scheduleFeedingReminder(hours, activeBaby?.name ?? "your baby");
      } else {
        await cancelFeedingReminder();
      }
      showAlert("Saved", "Feeding reminder settings updated.");
    } catch (e) {
      console.error("[Settings] save error:", e);
      showAlert("Error", "Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const s = makeStyles(theme);

  return (
    <ScrollView contentContainerStyle={s.container}>

      {/* ── Appearance ─────────────────────────────────── */}
      <Text style={s.sectionHeader}>Appearance</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View>
            <Text style={s.settingLabel}>Dark Mode</Text>
            <Text style={s.settingHint}>Easier on the eyes at night</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#ddd", true: theme.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ── Feeding Reminders ──────────────────────────── */}
      <Text style={s.sectionHeader}>Feeding Reminders</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingLabel}>Enable reminder</Text>
            <Text style={s.settingHint}>
              Get notified when it's time for the next feeding
            </Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: "#ddd", true: theme.primary }}
            thumbColor="#fff"
          />
        </View>

        {reminderEnabled ? (
          <View style={s.reminderRow}>
            <Text style={s.settingLabel}>Remind after</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.hoursInput}
                value={reminderHours}
                onChangeText={setReminderHours}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={theme.textMuted}
              />
              <Text style={s.hoursUnit}>hours</Text>
            </View>
            <Text style={s.settingHint}>Default: 3 hours (range: 0.5–12)</Text>
          </View>
        ) : null}

        {!activeBaby ? (
          <Text style={s.nobabyNote}>No baby selected — select a baby to save settings.</Text>
        ) : null}

        <TouchableOpacity
          style={[s.saveBtn, (!activeBaby || saving) && s.saveBtnDisabled]}
          onPress={handleSaveReminder}
          disabled={!activeBaby || saving}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save Reminder Settings"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Legal ─────────────────────────────────────── */}
      <Text style={s.sectionHeader}>Legal</Text>
      <View style={s.card}>
        <TouchableOpacity
          style={s.linkRow}
          onPress={() => navigation.navigate("PrivacyPolicy")}
          accessibilityRole="button"
        >
          <Text style={s.linkText}>Privacy Policy</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.background,
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 4,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
  },
  settingHint: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2,
  },
  reminderRow: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  hoursInput: {
    width: 64,
    height: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    color: theme.inputText,
    backgroundColor: theme.inputBg,
    textAlign: "center",
  },
  hoursUnit: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  nobabyNote: {
    fontSize: 12,
    color: theme.warning,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkText: {
    fontSize: 15,
    color: theme.primary,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 20,
    color: theme.textMuted,
  },
});
