import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useBaby }           from "../../context/BabyContext";
import { useTheme }          from "../../context/ThemeContext";
import { useLanguage }       from "../../context/LanguageContext";
import { usePermissions }    from "../../hooks/usePermissions";
import { useMilestones }     from "../../hooks/useMilestones";
import { validateMilestoneTitle } from "../../utils/validation";
import { showAlert, showConfirm } from "../../utils/platform";


function dateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function MilestonesScreen() {
  const { activeBaby, activeBabyId } = useBaby();
  const { theme }                    = useTheme();
  const { t }                        = useLanguage();
  const { canWriteEvents }           = usePermissions();

  const CATEGORIES = [
    { key: "motor",   label: t('categoryMotor')   },
    { key: "social",  label: t('categorySocial')  },
    { key: "feeding", label: t('categoryFeeding') },
    { key: "health",  label: t('categoryHealth')  },
    { key: "other",   label: t('categoryOther')   },
  ];
  const { milestones, loading, error, addItem, removeItem } = useMilestones(activeBabyId);

  const [title, setTitle]       = useState("");
  const [titleError, setTitleError] = useState(null);
  const [category, setCategory] = useState("motor");
  const [dateStr, setDateStr]   = useState(dateKey(new Date()));
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);

  const handleAdd = async () => {
    const { valid, error: err } = validateMilestoneTitle(title);
    if (!valid) { setTitleError(err); return; }
    setTitleError(null);

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      showAlert(t('invalidDate'), t('invalidDateMsg'));
      return;
    }

    setSaving(true);
    try {
      await addItem(title.trim(), date, category, notes);
      setTitle("");
      setNotes("");
      setDateStr(dateKey(new Date()));
    } catch (e) {
      console.error("[Milestones] add error:", e);
      showAlert(t('error'), t('couldNotSaveMilestone'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = await showConfirm(t('deleteMilestone'), t('deleteMilestoneConfirm', { title: item.title }));
    if (!ok) return;
    try {
      await removeItem(item.id);
    } catch (e) {
      showAlert(t('error'), t('couldNotDeleteMilestone'));
    }
  };

  const s = makeStyles(theme);

  if (!activeBaby) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyText}>{t('noBabySelectedShort')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label ?? key;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.title}>{t('milestonesTitle', { name: activeBaby.name })}</Text>

      {/* Add form */}
      {canWriteEvents ? (
        <View style={s.card}>
          <Text style={s.sectionHeader}>{t('addMilestone')}</Text>

          <Text style={s.inputLabel}>{t('milestoneTitle')}</Text>
          <TextInput
            style={[s.input, titleError ? s.inputError : null]}
            value={title}
            onChangeText={(v) => { setTitle(v); setTitleError(null); }}
            placeholder="e.g. First smile"
            placeholderTextColor={theme.placeholder}
            maxLength={100}
          />
          {titleError ? <Text style={s.errorText}>{titleError}</Text> : null}

          <Text style={s.inputLabel}>{t('milestoneCategory')}</Text>
          <View style={s.categoryRow}>
            {CATEGORIES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[s.catBtn, category === key && s.catBtnActive]}
                onPress={() => setCategory(key)}
                accessibilityRole="button"
              >
                <Text style={[s.catBtnText, category === key && s.catBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.inputLabel}>{t('milestoneDate')}</Text>
          <TextInput
            style={s.input}
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.placeholder}
          />

          <Text style={s.inputLabel}>{t('notesOptional')}</Text>
          <TextInput
            style={[s.input, s.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('milestoneDetails')}
            placeholderTextColor={theme.placeholder}
            multiline
          />

          <TouchableOpacity
            style={[s.addBtn, saving && s.addBtnDisabled]}
            onPress={handleAdd}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.addBtnText}>{t('saveMilestone')}</Text>
            }
          </TouchableOpacity>
        </View>
      ) : null}

      {/* List */}
      {milestones.length > 0 ? (
        <View style={s.card}>
          <Text style={s.sectionHeader}>{t('allMilestones')}</Text>
          {milestones.map((item) => (
            <View key={item.id} style={s.milestoneRow}>
              <View style={s.milestoneMeta}>
                <Text style={s.milestoneCategory}>{categoryLabel(item.category)}</Text>
                <Text style={s.milestoneDate}>{formatDate(item.date)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.milestoneTitle}>{item.title}</Text>
                {item.notes ? <Text style={s.milestoneNotes}>{item.notes}</Text> : null}
              </View>
              {canWriteEvents ? (
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={s.deleteBtn}
                  accessibilityRole="button"
                >
                  <Text style={s.deleteBtnText}>{t('delete')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={s.emptyText}>{t('noMilestonesYet')}</Text>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { padding: 16, backgroundColor: theme.background, flexGrow: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: theme.inputText,
    backgroundColor: theme.inputBg,
  },
  inputError: { borderColor: theme.danger },
  notesInput: { height: 70, paddingTop: 10, textAlignVertical: "top" },
  errorText: { fontSize: 12, color: theme.danger, marginTop: 4 },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  catBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  catBtnActive: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  catBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  catBtnTextActive: { color: theme.primaryText },
  addBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 10,
  },
  milestoneMeta: { width: 70 },
  milestoneCategory: { fontSize: 11, color: theme.primaryText, fontWeight: "600" },
  milestoneDate: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  milestoneTitle: { fontSize: 15, fontWeight: "600", color: theme.text },
  milestoneNotes: { fontSize: 12, color: theme.textSecondary, fontStyle: "italic", marginTop: 3 },
  deleteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: theme.dangerLight,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 12, color: theme.danger, fontWeight: "600" },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 16 },
});
