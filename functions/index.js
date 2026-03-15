const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Triggered when a new event (feeding, poop, pee) is created.
 * Sends push notifications to all co-parents who have an Expo push token.
 *
 * Security benefit over client-side: the server has admin access to read
 * all user tokens without exposing them to the requesting client.
 */
exports.onEventCreated = functions.firestore
  .document("babies/{babyId}/events/{eventId}")
  .onCreate(async (snap, context) => {
    const event = snap.data();
    const { babyId } = context.params;

    try {
      const babySnap = await admin.firestore().doc(`babies/${babyId}`).get();
      if (!babySnap.exists) return null;
      const baby = babySnap.data();

      const actorUid    = event.loggedBy;
      const memberUids  = Object.keys(baby.members ?? {}).filter(uid => uid !== actorUid);
      if (!memberUids.length) return null;

      // Fetch actor display name
      let actorName = "Someone";
      try {
        const actorSnap = await admin.firestore().doc(`users/${actorUid}`).get();
        actorName = actorSnap.data()?.displayName ?? "Someone";
      } catch (_) {}

      // Collect push tokens for co-parents
      const tokens = [];
      await Promise.all(
        memberUids.map(async uid => {
          try {
            const userSnap = await admin.firestore().doc(`users/${uid}`).get();
            const token = userSnap.data()?.expoPushToken;
            if (token) tokens.push(token);
          } catch (_) {}
        })
      );

      if (!tokens.length) return null;

      const label = buildLabel(event);
      const messages = tokens.map(to => ({
        to,
        title: "Baby Tracker 👶",
        body: `${actorName} ${label} for ${baby.name}`,
        sound: "default",
      }));

      await sendPushNotifications(messages);
      return null;
    } catch (err) {
      console.error("[onEventCreated] error:", err);
      return null;
    }
  });

function buildLabel(event) {
  switch (event.type) {
    case "feeding":
      if (event.feedingType === "breast") return `logged a breast feeding (${event.duration ?? 0}min)`;
      return `logged a feeding (${event.amount ?? 0}ml)`;
    case "poop":   return "logged a poop 💩";
    case "pee":    return "logged a pee 💧";
    case "sleep":  return event.sleepType === "night" ? "logged a night sleep 🌙" : "logged a nap 💤";
    default:       return "logged an event";
  }
}

async function sendPushNotifications(messages) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  return response.json();
}

// Export for unit testing
exports._buildLabel = buildLabel;
exports._sendPushNotifications = sendPushNotifications;
