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
import { useAuth }         from "../../context/AuthContext";
import { useBaby }         from "../../context/BabyContext";
import { usePermissions }  from "../../hooks/usePermissions";
import { addEvent }        from "../../services/eventStore";
import { notifyCoParents } from "../../services/notificationService";
import { showAlert }       from "../../utils/platform";
import { useTheme }        from "../../context/ThemeContext";
import { useLanguage }     from "../../context/LanguageContext";

export default function Pee({ navigation }) {
  const { user }                     = useAuth();
  const { activeBabyId, activeBaby } = useBaby();
  const { canWriteEvents }           = usePermissions();
  const { theme }                    = useTheme();
  const { t }                        = useLanguage();
  const s                            = makeStyles(theme);

  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);
  const isSubmitting        = useRef(false);

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

    isSubmitting.current = true;
    setSaving(true);

    try {
      await addEvent(activeBabyId, user.uid, "pee", {
        notes: notes.trim() || null,
      });
      notifyCoParents(activeBaby, user.uid, user.displayName, "pee");
      navigation.goBack();
    } catch (e) {
      console.error("[Pee] save error:", e);
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
        <Text style={s.emoji}>💧</Text>
        <Text style={s.title}>{t('logPeeTitle')}</Text>

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
          accessibilityLabel="Confirm pee"
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>{t('confirmPee')}</Text>
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
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 24,
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
    marginBottom: 24,
    textAlignVertical: "top",
    width: "100%",
    maxWidth: 400,
  },
  btn: {
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  readOnlyNote: {
    textAlign: "center",
    color: theme.warning,
    fontSize: 13,
    marginTop: 24,
  },
});
