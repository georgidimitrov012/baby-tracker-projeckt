import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Returns the Firestore collection ref for a baby's events.
 * Path: babies/{babyId}/events
 *
 * Subcollection (not flat) so that:
 *  - Multiple babies work with zero schema changes
 *  - Security rules are enforced per-baby
 *  - Auth plugs in by writing a real UID as babyId
 */
function eventsRef(babyId) {
  return collection(db, "babies", babyId, "events");
}

/**
 * Subscribe to all events for a baby, ordered newest first (server-side).
 *
 * @param {string}   babyId
 * @param {function} onData  - called with events array on every Firestore change
 * @param {function} onError - called if the subscription errors
 * @returns {function} unsubscribe — call in useEffect cleanup
 */
export function subscribeToEvents(babyId, onData, onError) {
  const q = query(eventsRef(babyId), orderBy("time", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        // Convert Firestore Timestamp → JS Date so screens don't need to
        time: d.data().time?.toDate() ?? new Date(),
      }));
      onData(events);
    },
    (error) => {
      console.error("[eventStore] subscription error:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Add a new event.
 * serverTimestamp() lets Firestore set the authoritative time —
 * avoids client clock skew that breaks orderBy("time").
 *
 * @param {string} babyId
 * @param {string} type   - "feeding" | "sleep" | "poop" | "pee"
 * @param {object} fields - type-specific fields (amount, duration, start, end, etc.)
 * @returns {Promise<string>} new document ID
 */
export async function addEvent(babyId, type, fields = {}) {
  const docRef = await addDoc(eventsRef(babyId), {
    type,
    ...fields,
    time: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing event.
 * Only the provided fields are updated. type and createdAt are never changed.
 *
 * @param {string} babyId
 * @param {string} eventId
 * @param {object} fields - fields to update (e.g. { amount: 120 } or { duration: 45 })
 * @returns {Promise<void>}
 */
export async function updateEvent(babyId, eventId, fields) {
  const ref = doc(db, "babies", babyId, "events", eventId);
  await updateDoc(ref, {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Permanently delete an event.
 *
 * @param {string} babyId
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function deleteEvent(babyId, eventId) {
  const ref = doc(db, "babies", babyId, "events", eventId);
  await deleteDoc(ref);
}
