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
import { useBaby }                                           from "../../context/BabyContext";
import { usePermissions }                                    from "../../hooks/usePermissions";
import { updateEvent }                                       from "../../services/eventStore";
import { validateAmount, validateDuration, validateFeedingDuration } from "../../utils/validation";
import { showAlert }                                         from "../../utils/platform";
import FormInput                                             from "../../components/FormInput";
import { useTheme }                                          from "../../context/ThemeContext";

const SLEEP_TYPE_LABELS = { nap: "💤 Nap", night: "🌙 Night" };
const FEEDING_TYPE_LABELS = { breast: "🤱 Breast", bottle: "🍼 Bottle", formula: "🥛 Formula" };

export default function EditEvent({ route, navigation }) {
  const { activeBabyId }   = useBaby();
  const { canWriteEvents } = usePermissions();
  const { theme }          = useTheme();
  const s                  = makeStyles(theme);

  const {
    eventId,
    type,
    feedingType: initFeedingType,
    sleepType:   initSleepType,
    amount:      initAmount,
    duration:    initDuration,
    notes:       initNotes,
  } = route.params;

  const isFeeding      = type === "feeding";
  const isSleep        = type === "sleep";
  const isBreastFeed   = isFeeding && initFeedingType === "breast";
  const hasNumericField = isFeeding || isSleep;

  const label    = isBreastFeed ? "Duration" : isFeeding ? "Amount" : "Duration";
  const unit     = isBreastFeed ? "min"      : isFeeding ? "ml"     : "min";
  const icon     = isFeeding ? "🍼" : isSleep ? "😴" : type === "poop" ? "💩" : "💧";
  const validate = isBreastFeed ? validateFeedingDuration : isFeeding ? validateAmount : validateDuration;

  const [value, setValue]           = useState(
    isBreastFeed
      ? String(initDuration ?? "")
      : isFeeding
        ? String(initAmount   ?? "")
        : isSleep
          ? String(initDuration ?? "")
          : ""
  );
  const [fieldError, setFieldError] = useState(null);
  const [notes, setNotes]           = useState(initNotes ?? "");
  const [saving, setSaving]         = useState(false);
  const isSubmitting                = useRef(false);

  const handleSave = async () => {
    if (isSubmitting.current) return;

    if (!canWriteEvents) {
      showAlert("Read only", "You don't have permission to edit events.");
      return;
    }

    if (hasNumericField) {
      const { valid, error } = validate(value);
      if (!valid) {
        setFieldError(error);
        return;
      }
      setFieldError(null);
    }

    isSubmitting.current = true;
    setSaving(true);

    try {
      let fields = { notes: notes.trim() || null };

      if (isBreastFeed) {
        fields.duration = parseInt(value, 10);
      } else if (isFeeding) {
        fields.amount = parseInt(value, 10);
      } else if (isSleep) {
        fields.duration = parseInt(value, 10);
      }

      await updateEvent(activeBabyId, eventId, fields);
      navigation.goBack();
    } catch (e) {
      console.error("[EditEvent] save error:", e);
      showAlert("Error", "Could not save changes. Please try again.");
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
        <Text style={s.heading}>
          Edit {icon}{" "}
          <Text style={s.typeLabel}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        </Text>

        {/* Show feeding/sleep type as a read-only badge */}
        {isFeeding && initFeedingType ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>
              {FEEDING_TYPE_LABELS[initFeedingType] ?? initFeedingType}
            </Text>
          </View>
        ) : null}
        {isSleep && initSleepType ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>
              {SLEEP_TYPE_LABELS[initSleepType] ?? initSleepType}
            </Text>
          </View>
        ) : null}

        {hasNumericField ? (
          <FormInput
            label={label}
            value={value}
            onChangeText={(v) => {
              setValue(v);
              if (fieldError) setFieldError(null);
            }}
            unit={unit}
            error={fieldError}
            autoFocus
            keyboardType="numeric"
            editable={canWriteEvents}
          />
        ) : null}

        <Text style={s.notesLabel}>Notes (optional)</Text>
        <TextInput
          style={[s.notesInput, !canWriteEvents && s.notesInputDisabled]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={theme.placeholder}
          multiline
          numberOfLines={3}
          keyboardType="default"
          textAlignVertical="top"
          editable={canWriteEvents}
        />

        <TouchableOpacity
          style={[s.btn, (saving || !canWriteEvents) && s.btnDisabled]}
          onPress={handleSave}
          disabled={saving || !canWriteEvents}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Save Changes</Text>
          }
        </TouchableOpacity>

        {!canWriteEvents ? (
          <Text style={s.readOnlyNote}>
            You have read-only access and cannot edit events.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: theme.background,
  },
  heading: {
    fontSize: 20,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  typeLabel: {
    fontWeight: "700",
    color: theme.text,
  },
  badge: {
    alignSelf: "center",
    backgroundColor: theme.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primary,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: "top",
  },
  notesInputDisabled: {
    backgroundColor: theme.background,
    color: theme.textMuted,
  },
  btn: {
    backgroundColor: theme.success,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  readOnlyNote: {
    textAlign: "center",
    color: theme.warning,
    fontSize: 13,
    marginTop: 16,
  },
});
