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
  Image,
} from "react-native";
import { Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useBaby }          from "../../context/BabyContext";
import { usePermissions }   from "../../hooks/usePermissions";
import { useLanguage }      from "../../context/LanguageContext";
import { updateBaby }       from "../../services/babyService";
import { db }               from "../../services/firebase";
import { uploadBabyPhoto }  from "../../services/storageService";
import { pickAndEncodePhoto } from "../../utils/imageUpload";
import { showAlert, showConfirm } from "../../utils/platform";
import FormInput            from "../../components/FormInput";
import DatePickerInput      from "../../components/DatePickerInput";

function formatDateToString(birthDate) {
  if (!birthDate) return "";
  const d = typeof birthDate.toDate === "function"
    ? birthDate.toDate()
    : birthDate instanceof Date
      ? birthDate
      : null;
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function BabyProfileScreen({ route, navigation }) {
  const { babyId }           = route.params;
  const { babies }           = useBaby();
  const { canEditBaby, canDeleteBaby } = usePermissions();
  const { t }                = useLanguage();

  const baby = babies.find((b) => b.id === babyId);

  const [name, setName]           = useState(baby?.name ?? "");
  const [birthDate, setBirthDate] = useState(formatDateToString(baby?.birthDate));
  const [weight, setWeight]       = useState(
    baby?.weight != null ? String(baby.weight) : ""
  );
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const isSubmitting              = useRef(false);

  const handleSave = async () => {
    if (isSubmitting.current) return;

    if (!name.trim()) {
      setNameError(t('nameIsRequired'));
      return;
    }
    setNameError(null);

    if (!canEditBaby) {
      showAlert(t('readOnly'), t('permissionDeniedEdit'));
      return;
    }

    isSubmitting.current = true;
    setSaving(true);

    try {
      let parsedDate = null;
      if (birthDate.trim()) {
        const d = new Date(birthDate.trim());
        if (isNaN(d.getTime())) {
          showAlert(t('invalidDate'), t('invalidDateMsg'));
          return;
        }
        parsedDate = d;
      }

      const fields = {
        name: name.trim(),
        birthDate: parsedDate ? Timestamp.fromDate(parsedDate) : null,
        weight: weight.trim() ? parseFloat(weight) : null,
      };

      await updateBaby(babyId, fields);
      navigation.goBack();
    } catch (e) {
      console.error("[BabyProfile] save error:", e);
      showAlert(t('error'), t('couldNotSaveProfile'));
    } finally {
      isSubmitting.current = false;
      setSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    if (!canEditBaby) {
      showAlert(t('readOnly'), t('permissionDeniedChangePhoto'));
      return;
    }
    setUploadingPhoto(true);
    try {
      const result = await pickAndEncodePhoto();
      if (result.cancelled) return;
      if (result.error) { showAlert(t('error'), result.error); return; }
      const url = await uploadBabyPhoto(babyId, result.base64);
      await updateBaby(babyId, { photoURL: url });
    } catch (e) {
      console.error("[BabyProfile] photo upload error:", e);
      showAlert(t('error'), t('couldNotUploadPhoto'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteBaby) {
      showAlert(t('readOnly'), t('permissionDeniedDelete'));
      return;
    }

    const confirmed = await showConfirm(
      t('deleteBaby'),
      t('deleteBabyConfirm', { name: baby?.name ?? "this baby" })
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "babies", babyId));
      navigation.goBack();
      navigation.goBack();
    } catch (e) {
      console.error("[BabyProfile] delete error:", e);
      showAlert(t('error'), t('couldNotDeleteBaby'));
      setDeleting(false);
    }
  };

  if (!baby) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('babyNotFound')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo */}
        <View style={styles.photoSection}>
          {baby.photoURL ? (
            <Image source={{ uri: baby.photoURL }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>👶</Text>
            </View>
          )}
          {canEditBaby ? (
            <TouchableOpacity
              style={[styles.photoBtn, uploadingPhoto && styles.btnDisabled]}
              onPress={handleChangePhoto}
              disabled={uploadingPhoto}
              accessibilityRole="button"
            >
              {uploadingPhoto
                ? <ActivityIndicator size="small" color="#1565c0" />
                : <Text style={styles.photoBtnText}>{t('changePhoto')}</Text>
              }
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.title}>{t('babyProfileTitle')}</Text>

        <FormInput
          label={t('nameField')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError(null);
          }}
          placeholder="Baby's name"
          error={nameError}
          editable={canEditBaby}
        />

        <Text style={styles.fieldLabel}>{t('birthDateField')}</Text>
        <DatePickerInput
          value={birthDate || null}
          onChange={setBirthDate}
          placeholder={t('tapChooseBirthDate')}
          disabled={!canEditBaby}
          maxDate={new Date()}
        />

        <FormInput
          label={t('weightField')}
          value={weight}
          onChangeText={setWeight}
          placeholder="e.g. 3.5"
          unit="kg"
          keyboardType="numeric"
          editable={canEditBaby}
        />

        {canEditBaby ? (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save baby profile"
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
            }
          </TouchableOpacity>
        ) : (
          <Text style={styles.readOnlyNote}>
            {t('readOnlyCannotEditProfile')}
          </Text>
        )}

        {/* Growth chart shortcut */}
        <TouchableOpacity
          style={styles.growthBtn}
          onPress={() => navigation.navigate("Growth", { babyId })}
          accessibilityRole="button"
        >
          <Text style={styles.growthBtnText}>{t('viewGrowthChart')}</Text>
        </TouchableOpacity>

        {canDeleteBaby ? (
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={handleDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete baby"
          >
            {deleting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.deleteBtnText}>{t('deleteThisBaby')}</Text>
            }
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: "#c62828",
    textAlign: "center",
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#e3f2fd",
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e3f2fd",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmoji: { fontSize: 46 },
  photoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#e3f2fd",
    borderRadius: 20,
  },
  photoBtnText: { fontSize: 13, color: "#1565c0", fontWeight: "600" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 24,
  },
  saveBtn: {
    backgroundColor: "#1565c0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  growthBtn: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  growthBtnText: { fontSize: 15, color: "#2e7d32", fontWeight: "600" },
  deleteBtn: {
    backgroundColor: "#c62828",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#655E80",
    marginBottom: 6,
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.45 },
  readOnlyNote: {
    textAlign: "center",
    color: "#e65100",
    fontSize: 13,
    marginTop: 16,
  },
});
