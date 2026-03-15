import { doc, setDoc, getDoc } from "firebase/firestore";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { db } from "./firebase";

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
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn("[notifications] push send failed:", e);
  }
}
