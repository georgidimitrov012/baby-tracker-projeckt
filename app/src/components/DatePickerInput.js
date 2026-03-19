import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function toDateString(d) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplay(str) {
  const d = parseDate(str);
  if (!d) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });
}

/**
 * DatePickerInput
 *
 * A tappable date input that opens an inline calendar modal.
 * Replaces free-text YYYY-MM-DD inputs throughout the app.
 *
 * Props:
 *   value        {string|null}  selected date as "YYYY-MM-DD"
 *   onChange     {function}     called with "YYYY-MM-DD" when user confirms
 *   placeholder  {string}       shown when no date selected
 *   disabled     {bool}         disables the picker
 *   minDate      {Date|null}    optional minimum selectable date
 *   maxDate      {Date|null}    optional maximum selectable date
 */
export default function DatePickerInput({
  value,
  onChange,
  placeholder = "Select a date",
  disabled = false,
  minDate = null,
  maxDate = null,
}) {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [visible, setVisible]     = useState(false);
  const [viewYear, setViewYear]   = useState(() => {
    const d = parseDate(value) ?? today;
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseDate(value) ?? today;
    return d.getMonth();
  });
  const [pending, setPending]     = useState(() => parseDate(value));

  const openPicker = () => {
    if (disabled) return;
    const d = parseDate(value) ?? today;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setPending(parseDate(value));
    setVisible(true);
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayPress = (day) => {
    if (!day) return;
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (minDate && d < minDate) return;
    if (maxDate && d > maxDate) return;
    setPending(d);
  };

  const handleConfirm = () => {
    if (pending) onChange(toDateString(pending));
    setVisible(false);
  };

  // Build the 6-row calendar grid for the current view month
  const calendarWeeks = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [viewYear, viewMonth]);

  const isSelected = (day) => {
    if (!day || !pending) return false;
    return (
      pending.getFullYear() === viewYear &&
      pending.getMonth()    === viewMonth &&
      pending.getDate()     === day
    );
  };

  const isToday = (day) => {
    if (!day) return false;
    return (
      today.getFullYear() === viewYear &&
      today.getMonth()    === viewMonth &&
      today.getDate()     === day
    );
  };

  const isDisabledDay = (day) => {
    if (!day) return true;
    const d = new Date(viewYear, viewMonth, day);
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const displayText = formatDisplay(value);

  return (
    <>
      {/* Tappable input row */}
      <TouchableOpacity
        style={[s.inputRow, disabled && s.inputRowDisabled]}
        onPress={openPicker}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={displayText ?? placeholder}
      >
        <Text style={s.calIcon}>📅</Text>
        <Text style={[s.inputText, !displayText && s.placeholderText]}>
          {displayText ?? placeholder}
        </Text>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>

      {/* Calendar modal */}
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          {/* Prevent taps inside card from closing */}
          <TouchableOpacity activeOpacity={1} style={s.card}>

            {/* Month / year navigation */}
            <View style={s.navRow}>
              <TouchableOpacity style={s.navBtn} onPress={goToPrevMonth} accessibilityRole="button">
                <Text style={s.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={s.monthYearLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity style={s.navBtn} onPress={goToNextMonth} accessibilityRole="button">
                <Text style={s.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={s.weekRow}>
              {DAY_HEADERS.map(d => (
                <Text key={d} style={s.dayHeader}>{d}</Text>
              ))}
            </View>

            {/* Calendar weeks */}
            {calendarWeeks.map((week, wi) => (
              <View key={wi} style={s.weekRow}>
                {week.map((day, di) => {
                  const sel      = isSelected(day);
                  const tod      = isToday(day);
                  const disabled = isDisabledDay(day);
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        s.dayCell,
                        sel && { backgroundColor: theme.primary },
                        tod && !sel && { borderWidth: 2, borderColor: theme.accent },
                      ]}
                      onPress={() => handleDayPress(day)}
                      disabled={disabled}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        s.dayText,
                        sel       && s.dayTextSelected,
                        tod && !sel && { color: theme.accent, fontWeight: "700" },
                        disabled  && s.dayTextDisabled,
                      ]}>
                        {day ?? ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Today shortcut */}
            <TouchableOpacity
              style={s.todayBtn}
              onPress={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setPending(today);
              }}
            >
              <Text style={s.todayBtnText}>Today</Text>
            </TouchableOpacity>

            {/* Confirm / Cancel */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setVisible(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, !pending && s.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={!pending}
              >
                <Text style={s.confirmBtnText}>Select</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  // Input row
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.inputBg,
    gap: 10,
  },
  inputRowDisabled: { opacity: 0.45 },
  calIcon:        { fontSize: 18 },
  inputText:      { flex: 1, fontSize: 15, color: theme.inputText, fontWeight: "500" },
  placeholderText:{ color: theme.placeholder },
  chevron:        { fontSize: 20, color: theme.textMuted },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // Calendar card
  card: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 340,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },

  // Navigation row
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText:     { fontSize: 22, color: theme.primary, fontWeight: "700", lineHeight: 26 },
  monthYearLabel: { fontSize: 16, fontWeight: "800", color: theme.text },

  // Week rows
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 2,
  },
  dayHeader: {
    width: 36,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    paddingBottom: 6,
  },

  // Day cells
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 1,
  },
  dayText:         { fontSize: 14, color: theme.text, textAlign: "center" },
  dayTextSelected: { color: "#fff", fontWeight: "700" },
  dayTextDisabled: { color: theme.border },

  // Today shortcut
  todayBtn: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: theme.accentLight,
  },
  todayBtnText: { fontSize: 13, color: theme.accent, fontWeight: "700" },

  // Action row
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: theme.border,
  },
  cancelBtnText:   { fontSize: 15, fontWeight: "600", color: theme.textSecondary },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: theme.primary,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText:  { fontSize: 15, fontWeight: "700", color: "#fff" },
});
