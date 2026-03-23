import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme }          from "../../context/ThemeContext";
import { useBaby }           from "../../context/BabyContext";
import { useLanguage }       from "../../context/LanguageContext";
import { usePermissions }    from "../../hooks/usePermissions";
import DatePickerInput       from "../../components/DatePickerInput";
import {
  getVaccines,
  addVaccine,
  updateVaccine,
  deleteVaccine,
  seedDefaultVaccines,
} from "../../services/vaccineService";
import { showAlert, showConfirm } from "../../utils/platform";

function formatDate(date) {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function isOverdue(vaccine) {
  return (
    vaccine.scheduledDate &&
    vaccine.scheduledDate < new Date() &&
    !vaccine.isCompleted
  );
}

export default function VaccineScreen() {
  const { theme }                        = useTheme();
  const { activeBaby, activeBabyId }     = useBaby();
  const { t }                            = useLanguage();
  const { canEditBaby }                  = usePermissions();

  const [vaccines, setVaccines]          = useState([]);
  const [loading, setLoading]            = useState(true);
  const [seeding, setSeeding]            = useState(false);
  const [modalVisible, setModalVisible]  = useState(false);

  // Add-vaccine form state
  const [formName, setFormName]          = useState("");
  const [formDate, setFormDate]          = useState("");
  const [formNotes, setFormNotes]        = useState("");
  const [formSaving, setFormSaving]      = useState(false);

  const s = makeStyles(theme);

  // ── Load vaccines ────────────────────────────────────────────────────────────
  const loadVaccines = async () => {
    if (!activeBabyId) return;
    setLoading(true);
    try {
      const data = await getVaccines(activeBabyId);
      setVaccines(data);
    } catch (e) {
      console.error("[VaccineScreen] load error:", e);
      showAlert(t('error'), t('couldNotLoadVaccines'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVaccines();
  }, [activeBabyId]);

  // ── Seed default schedule ────────────────────────────────────────────────────
  const handleSeed = async () => {
    if (!activeBabyId || !activeBaby?.birthDate) {
      showAlert(t('missingBirthDate'), t('missingBirthDateMsg'));
      return;
    }
    setSeeding(true);
    try {
      await seedDefaultVaccines(activeBabyId, activeBaby.birthDate);
      await loadVaccines();
    } catch (e) {
      console.error("[VaccineScreen] seed error:", e);
      showAlert(t('error'), t('couldNotSeedSchedule'));
    } finally {
      setSeeding(false);
    }
  };

  // ── Mark vaccine as done ─────────────────────────────────────────────────────
  const handleMarkDone = async (vaccine) => {
    try {
      await updateVaccine(activeBabyId, vaccine.id, {
        isCompleted: true,
        completedDate: new Date(),
      });
      await loadVaccines();
    } catch (e) {
      console.error("[VaccineScreen] mark done error:", e);
      showAlert(t('error'), t('couldNotUpdateVaccine'));
    }
  };

  // ── Delete vaccine ───────────────────────────────────────────────────────────
  const handleDelete = async (vaccine) => {
    const ok = await showConfirm(t('deleteVaccine'), t('deleteVaccineConfirm', { name: vaccine.name }));
    if (!ok) return;
    try {
      await deleteVaccine(activeBabyId, vaccine.id);
      setVaccines((prev) => prev.filter((v) => v.id !== vaccine.id));
    } catch (e) {
      console.error("[VaccineScreen] delete error:", e);
      showAlert(t('error'), t('couldNotDeleteVaccine'));
    }
  };

  // ── Add vaccine ──────────────────────────────────────────────────────────────
  const handleAddVaccine = async () => {
    if (!formName.trim()) {
      showAlert(t('vaccineNameRequired'), t('enterVaccineName'));
      return;
    }
    let scheduledDate = null;
    if (formDate.trim()) {
      const parsed = new Date(formDate.trim());
      if (isNaN(parsed.getTime())) {
        showAlert(t('invalidDate'), t('invalidDateMsg'));
        return;
      }
      scheduledDate = parsed;
    }
    setFormSaving(true);
    try {
      await addVaccine(activeBabyId, {
        name: formName.trim(),
        scheduledDate,
        notes: formNotes.trim(),
      });
      setFormName("");
      setFormDate("");
      setFormNotes("");
      setModalVisible(false);
      await loadVaccines();
    } catch (e) {
      console.error("[VaccineScreen] add error:", e);
      showAlert(t('error'), t('couldNotAddVaccine'));
    } finally {
      setFormSaving(false);
    }
  };

  // ── Guard: no baby ───────────────────────────────────────────────────────────
  if (!activeBaby) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyText}>{t('noBabySelectedShort')}</Text>
      </View>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // ── Split into sections ───────────────────────────────────────────────────────
  const upcoming  = vaccines.filter((v) => !v.isCompleted).sort((a, b) => {
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return a.scheduledDate - b.scheduledDate;
  });
  const completed = vaccines.filter((v) => v.isCompleted);

  // ── Render vaccine row ────────────────────────────────────────────────────────
  const renderVaccineRow = (vaccine) => {
    const overdue = isOverdue(vaccine);
    const rowBg   = vaccine.isCompleted
      ? theme.successLight
      : overdue
      ? theme.warningLight
      : theme.card;

    const circleStyle = vaccine.isCompleted
      ? [s.circle, s.circleCompleted]
      : overdue
      ? [s.circle, s.circleOverdue]
      : [s.circle, s.circleFuture];

    return (
      <View key={vaccine.id} style={[s.vaccineRow, { backgroundColor: rowBg }]}>
        {/* Status circle */}
        <View style={circleStyle} />

        {/* Info */}
        <View style={s.vaccineInfo}>
          <Text style={s.vaccineName}>{vaccine.name}</Text>
          <Text style={s.vaccineDate}>{formatDate(vaccine.scheduledDate)}</Text>
          {vaccine.notes ? (
            <Text style={s.vaccineNotes}>{vaccine.notes}</Text>
          ) : null}
          {vaccine.isCompleted && vaccine.completedDate ? (
            <Text style={s.completedLabel}>{t('doneDate', { date: formatDate(vaccine.completedDate) })}</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={s.vaccineActions}>
          {!vaccine.isCompleted && canEditBaby ? (
            <TouchableOpacity
              style={s.markDoneBtn}
              onPress={() => handleMarkDone(vaccine)}
              accessibilityRole="button"
            >
              <Text style={s.markDoneBtnText}>{t('markDone')}</Text>
            </TouchableOpacity>
          ) : null}
          {canEditBaby ? (
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => handleDelete(vaccine)}
              accessibilityRole="button"
            >
              <Text style={s.deleteBtnText}>{t('delete')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView contentContainerStyle={s.container}>
        {/* Page header */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>{t('vaccinesTitle', { name: activeBaby.name })}</Text>
          {canEditBaby ? (
            <TouchableOpacity
              style={s.addVaccineBtn}
              onPress={() => setModalVisible(true)}
              accessibilityRole="button"
            >
              <Text style={s.addVaccineBtnText}>{t('addVaccineBtn')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Seed default schedule */}
        {vaccines.length === 0 && canEditBaby ? (
          <View style={s.seedCard}>
            <Text style={s.seedTitle}>{t('noVaccinesYet')}</Text>
            <Text style={s.seedDesc}>
              {t('seedDefaultDesc', { name: activeBaby.name })}
            </Text>
            <TouchableOpacity
              style={[s.seedBtn, seeding && s.seedBtnDisabled]}
              onPress={handleSeed}
              disabled={seeding}
              accessibilityRole="button"
            >
              {seeding
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.seedBtnText}>{t('seedBtn')}</Text>
              }
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Empty state (no vaccines, no edit permission) */}
        {vaccines.length === 0 && !canEditBaby ? (
          <Text style={s.emptyText}>{t('noVaccinesNoEdit')}</Text>
        ) : null}

        {/* Upcoming section */}
        {upcoming.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionHeader}>{t('upcoming')}</Text>
            {upcoming.map(renderVaccineRow)}
          </View>
        ) : null}

        {/* Completed section */}
        {completed.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionHeader}>{t('completed')}</Text>
            {completed.map(renderVaccineRow)}
          </View>
        ) : null}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Add Vaccine Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('addVaccineModalTitle')}</Text>

            <Text style={s.inputLabel}>{t('vaccineNameField')}</Text>
            <TextInput
              style={s.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="e.g. MMR"
              placeholderTextColor={theme.placeholder}
              maxLength={100}
            />

            <Text style={s.inputLabel}>{t('scheduledDateField')}</Text>
            <DatePickerInput
              value={formDate || null}
              onChange={setFormDate}
              placeholder={t('vaccineTapToChooseDate')}
            />

            <Text style={s.inputLabel}>{t('notesOptional')}</Text>
            <TextInput
              style={[s.input, s.notesInput]}
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder="e.g. 1st dose"
              placeholderTextColor={theme.placeholder}
              multiline
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={s.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, formSaving && s.saveBtnDisabled]}
                onPress={handleAddVaccine}
                disabled={formSaving}
                accessibilityRole="button"
              >
                {formSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnText}>{t('save')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.background,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
    padding: 32,
  },

  // Page header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.text,
    flex: 1,
  },
  addVaccineBtn: {
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addVaccineBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // Seed card
  seedCard: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  seedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 6,
  },
  seedDesc: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 18,
  },
  seedBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    minWidth: 200,
  },
  seedBtnDisabled: { opacity: 0.45 },
  seedBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Sections
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },

  // Vaccine row
  vaccineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  circle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 2,
    flexShrink: 0,
  },
  circleCompleted: {
    backgroundColor: theme.success,
  },
  circleOverdue: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: theme.warning,
  },
  circleFuture: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: theme.border,
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 2,
  },
  vaccineDate: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  vaccineNotes: {
    fontSize: 12,
    color: theme.textMuted,
    fontStyle: "italic",
  },
  completedLabel: {
    fontSize: 11,
    color: theme.success,
    fontWeight: "600",
    marginTop: 3,
  },
  vaccineActions: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  markDoneBtn: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  markDoneBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: theme.dangerLight,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 12,
    color: theme.danger,
    fontWeight: "600",
  },

  // Empty
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    elevation: 8,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 16,
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
  notesInput: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
