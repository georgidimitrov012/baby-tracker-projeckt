import { doc, setDoc, getDoc } from "firebase/firestore";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebase";

const FEEDING_REMINDER_KEY = "feeding_reminder_notification_id";

// Register for push notifications and store the Expo push token in Firestore
export async function registerForPushNotifications(userId) {
  if (Platform.OS === "web") return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: "717b6f71-410c-4beb-8d21-eb39e0dcde85",
    });
    await setDoc(doc(db, "users", userId), { expoPushToken: token }, { merge: true });
    return token;
  } catch (e) {
    console.warn("[notifications] token error:", e);
    return null;
  }
}

// Send push notifications to all co-parents when an event is logged
export async function notifyCoParents(baby, actorUid, actorName, eventType, fields = {}) {
  const memberUids = Object.keys(baby?.members ?? {}).filter(uid => uid !== actorUid);
  if (!memberUids.length) return;
  const tokens = [];
  for (const uid of memberUids) {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const token = snap.data()?.expoPushToken;
      if (token) tokens.push(token);
    } catch (_) {}
  }
  if (!tokens.length) return;
  const label = {
    feeding: `logged a feeding${fields.amount ? ` (${fields.amount} ml)` : ""}`,
    poop: "logged a poop",
    pee: "logged a pee",
    sleep: "started sleep tracking",
  }[eventType] ?? "logged an event";
  const messages = tokens.map(to => ({
    to,
    title: "Baby Tracker 👶",
    body: `${actorName ?? "Someone"} ${label} for ${baby.name}`,
    sound: "default",
  }));
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {  // eslint-disable-line no-restricted-syntax
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn("[notifications] push send failed:", e);
  }
}

// ─── Feeding Reminders ───────────────────────────────────────────────────────

/**
 * Cancel any existing scheduled feeding reminder.
 */
export async function cancelFeedingReminder() {
  if (Platform.OS === "web") return;
  try {
    const id = await AsyncStorage.getItem(FEEDING_REMINDER_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(FEEDING_REMINDER_KEY);
    }
  } catch (e) {
    console.warn("[notifications] cancel reminder error:", e);
  }
}

/**
 * Schedule a local feeding reminder.
 * @param {number} intervalHours - hours until the reminder fires (default 3)
 * @param {string} babyName
 */
export async function scheduleFeedingReminder(intervalHours = 3, babyName = "your baby") {
  if (Platform.OS === "web") return;
  try {
    await cancelFeedingReminder();
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Baby Tracker 👶",
        body: `Time to feed ${babyName}! It's been ${intervalHours}h since the last feeding.`,
        sound: "default",
      },
      trigger: {
        seconds: Math.round(intervalHours * 3600),
      },
    });
    await AsyncStorage.setItem(FEEDING_REMINDER_KEY, id);
  } catch (e) {
    console.warn("[notifications] schedule reminder error:", e);
  }
}

/**
 * Call after a feeding is logged to reset the reminder timer.
 */
export async function rescheduleAfterFeeding(intervalHours = 3, babyName = "your baby") {
  await scheduleFeedingReminder(intervalHours, babyName);
}

// ─── Daily Digest ─────────────────────────────────────────────────────────────

const DAILY_DIGEST_KEY = "daily_digest_notification_id";

/**
 * Schedule a daily 8am digest notification.
 * Safe to call multiple times — cancels the previous one first.
 */
export async function scheduleDailyDigest(babyName = "your baby") {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const existingId = await AsyncStorage.getItem(DAILY_DIGEST_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Good morning! 🌅",
        body: `See how ${babyName} did overnight. Open to check last night's summary.`,
        sound: "default",
      },
      trigger: { hour: 8, minute: 0, repeats: true },
    });
    await AsyncStorage.setItem(DAILY_DIGEST_KEY, id);
  } catch (e) {
    console.warn("[notifications] daily digest error:", e);
  }
}

/**
 * Cancel the daily digest notification.
 */
export async function cancelDailyDigest() {
  if (Platform.OS === "web") return;
  try {
    const id = await AsyncStorage.getItem(DAILY_DIGEST_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(DAILY_DIGEST_KEY);
    }
  } catch (e) {
    console.warn("[notifications] cancel daily digest error:", e);
  }
}
