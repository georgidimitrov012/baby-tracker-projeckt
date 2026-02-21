import { Platform, Alert } from "react-native";

/**
 * Cross-platform alert helpers.
 * Alert.alert() silently fails on web — these wrappers use
 * window.alert / window.confirm as fallbacks.
 */

export function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

/**
 * Returns Promise<boolean>.
 * Native: Alert with Cancel / Confirm buttons.
 * Web:    window.confirm (synchronous, wrapped in Promise).
 */
export function showConfirm(title, message) {
  if (Platform.OS === "web") {
    return Promise.resolve(
      window.confirm(message ? `${title}\n\n${message}` : title)
    );
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel",  style: "cancel",      onPress: () => resolve(false) },
      { text: "Delete",  style: "destructive",  onPress: () => resolve(true)  },
    ]);
  });
}

/**
 * Show an action sheet style alert with Edit / Delete / Cancel.
 * Used by History to replace the Alert-based options menu.
 * On web: falls back to window.confirm for delete, calls onEdit directly.
 */
export function showEventOptions(title, { onEdit, onDelete }) {
  if (Platform.OS === "web") {
    // Web has no native action sheet — use a confirm for delete,
    // and expose edit via the EventItem buttons instead.
    const confirmed = window.confirm(`${title}\n\nDelete this event?`);
    if (confirmed) onDelete();
    return;
  }

  Alert.alert(title, "What do you want to do?", [
    { text: "Edit",   onPress: onEdit },
    { text: "Delete", style: "destructive", onPress: onDelete },
    { text: "Cancel", style: "cancel" },
  ]);
}
