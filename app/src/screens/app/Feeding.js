import React, { useState, useRef } from "react";
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
import { useAuth }             from "../../context/AuthContext";
import { useBaby }             from "../../context/BabyContext";
import { usePermissions }      from "../../hooks/usePermissions";
import { addEvent }            from "../../services/eventStore";
import { notifyCoParents, rescheduleAfterFeeding } from "../../services/notificationService";
import { validateAmount, validateFeedingDuration } from "../../utils/validation";
import { showAlert }           from "../../utils/platform";
import FormInput               from "../../components/FormInput";
import { useTheme }            from "../../context/ThemeContext";
import { useLanguage }         from "../../context/LanguageContext";

export default function Feeding({ navigation }) {
  const { user }                      = useAuth();
  const { activeBabyId, activeBaby }  = useBaby();
  const { canWriteEvents }            = usePermissions();
  const { theme }                     = useTheme();
  const { t }                         = useLanguage();
  const s                             = makeStyles(theme);

  const FEEDING_TYPES = [
    { key: "bottle",  label: t('bottleLabel')  },
    { key: "formula", label: t('formulaLabel') },
    { key: "breast",  label: t('breastLabel')  },
  ];

  const [feedingType, setFeedingType] = useState("bottle");
  const [amount, setAmount]           = useState("");
  const [amountError, setAmountError] = useState(null);
  const [duration, setDuration]       = useState("");
  const [durationError, setDurationError] = useState(null);
  const [notes, setNotes]             = useState("");
  const [saving, setSaving]           = useState(false);
  const isSubmitting                  = useRef(false);

  const isBreast = feedingType === "breast";

  const handleSave = async () => {
    if (isSubmitting.current) return;

    if (!activeBabyId) {
      showAlert(t('noBabySelectedAlert'), t('noBabySelectedMsg'));
      return;
    }

    if (!canWriteEvents) {
      showAlert(t('readOnly'), t('noPermissionLog'));
      return;
    }

    if (isBreast) {
      const { valid, error } = validateFeedingDuration(duration);
      if (!valid) { setDurationError(error); return; }
      setDurationError(null);
    } else {
      const { valid, error } = validateAmount(amount);
      if (!valid) { setAmountError(error); return; }
      setAmountError(null);
    }

    isSubmitting.current = true;
    setSaving(true);

    try {
      const fields = {
        feedingType,
        notes: notes.trim() || null,
      };

      if (isBreast) {
        fields.duration = parseInt(duration, 10);
      } else {
        fields.amount = parseInt(amount, 10);
      }

      await addEvent(activeBabyId, user.uid, "feeding", fields);

      const reminderHours = activeBaby?.settings?.feedingReminderHours ?? 3;
      rescheduleAfterFeeding(reminderHours, activeBaby?.name ?? "your baby");

      const notifyFields = isBreast
        ? { feedingType, duration: fields.duration }
        : { feedingType, amount: fields.amount };
      notifyCoParents(activeBaby, user.uid, user.displayName, "feeding", notifyFields);

      navigation.goBack();
    } catch (e) {
      console.error("[Feeding] save error:", e);
      showAlert(t('error'), t('couldNotSave'));
    } finally {
      isSubmitting.current = false;
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>{t('logFeedingTitle')}</Text>

        {/* Feeding type picker */}
        <Text style={s.typeLabel}>{t('feedingType')}</Text>
        <View style={s.typeRow}>
          {FEEDING_TYPES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.typeBtn, feedingType === key && s.typeBtnActive]}
              onPress={() => {
                setFeedingType(key);
                setAmountError(null);
                setDurationError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Text style={[s.typeBtnText, feedingType === key && s.typeBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isBreast ? (
          <FormInput
            label={t('duration')}
            value={duration}
            onChangeText={(v) => {
              setDuration(v);
              if (durationError) setDurationError(null);
            }}
            placeholder={t('durationInMinutes')}
            unit="min"
            error={durationError}
            autoFocus
            keyboardType="numeric"
          />
        ) : (
          <FormInput
            label={t('amount')}
            value={amount}
            onChangeText={(v) => {
              setAmount(v);
              if (amountError) setAmountError(null);
            }}
            placeholder={t('amountInMl')}
            unit="ml"
            error={amountError}
            autoFocus
            keyboardType="numeric"
          />
        )}

        <TextInput
          style={s.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('notesOptional')}
          placeholderTextColor={theme.placeholder}
          multiline
          numberOfLines={3}
          keyboardType="default"
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[s.btn, (saving || !canWriteEvents) && s.btnDisabled]}
          onPress={handleSave}
          disabled={saving || !canWriteEvents}
          accessibilityRole="button"
          accessibilityLabel="Save feeding"
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>{t('save')}</Text>
          }
        </TouchableOpacity>

        {!canWriteEvents ? (
          <Text style={s.readOnlyNote}>
            {t('readOnlyCannotLog')}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.text,
    textAlign: "center",
    marginBottom: 28,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.inputBg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeBtnActive: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textMuted,
  },
  typeBtnTextActive: {
    color: theme.primary,
  },
  notesInput: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    minHeight: 90,
    marginBottom: 18,
    textAlignVertical: "top",
  },
  btn: {
    backgroundColor: theme.accent,
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  readOnlyNote: {
    textAlign: "center",
    color: theme.warning,
    fontSize: 13,
    marginTop: 16,
  },
});
