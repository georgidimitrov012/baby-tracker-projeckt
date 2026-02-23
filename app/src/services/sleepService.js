import {
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * ACTIVE SLEEP SESSION — DATA MODEL DECISION
 * ─────────────────────────────────────────────────────────────
 *
 * We store the active session as fields directly on the baby doc:
 *
 *   babies/{babyId}
 *     activeSleepStart: Timestamp | null
 *     activeSleepStartedBy: userId | null
 *
 * WHY NOT a subcollection or separate collection?
 *
 *   ✓ The baby doc is already subscribed to in BabyContext via onSnapshot.
 *     Both parents see the timer update in realtime with ZERO extra reads.
 *
 *   ✓ Only ONE active session per baby is enforced structurally —
 *     there's only one field, not a collection that could accumulate duplicates.
 *
 *   ✓ App reload / close → reopen: the timer is always correct because
 *     we subtract Date.now() from activeSleepStart, not from a local variable.
 *
 *   ✓ Offline: Firestore caches the baby doc locally. The timer keeps
 *     counting correctly because the start time is a fixed timestamp.
 *     When connectivity returns, the stop write syncs automatically.
 *
 * WHY NOT status="active" on an event doc?
 *   Querying for active events requires an extra Firestore read every time.
 *   Storing on the baby doc gives us realtime updates for free via the
 *   existing BabyContext subscription.
 */

/**
 * Start an active sleep session for a baby.
 * Sets activeSleepStart and activeSleepStartedBy on the baby doc.
 *
 * @param {string} babyId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function startSleep(babyId, userId) {
  await updateDoc(doc(db, "babies", babyId), {
    activeSleepStart:     serverTimestamp(),
    activeSleepStartedBy: userId,
  });
}

/**
 * Stop the active sleep session and save a completed sleep event.
 *
 * @param {string} babyId
 * @param {string} userId
 * @param {Date}   startTime   - the activeSleepStart value from the baby doc
 * @returns {Promise<void>}
 */
export async function stopSleep(babyId, userId, startTime) {
  const endTime  = new Date();
  const duration = Math.max(1, Math.round((endTime - startTime) / 60000)); // minutes, min 1

  // Save completed event
  await addDoc(collection(db, "babies", babyId, "events"), {
    type:      "sleep",
    time:      startTime,
    start:     startTime.toISOString(),
    end:       endTime.toISOString(),
    duration,
    loggedBy:  userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Clear the active session fields
  await updateDoc(doc(db, "babies", babyId), {
    activeSleepStart:     null,
    activeSleepStartedBy: null,
  });
}
