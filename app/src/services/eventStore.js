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

function eventsRef(babyId) {
  return collection(db, "babies", babyId, "events");
}

/**
 * Subscribe to all events for a baby, ordered newest first.
 *
 * @param {string}   babyId
 * @param {function} onData
 * @param {function} onError
 * @returns {function} unsubscribe
 */
export function subscribeToEvents(babyId, onData, onError) {
  const q = query(eventsRef(babyId), orderBy("time", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
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
 * loggedBy records which parent logged this event — important for
 * shared parenting where two parents track the same baby.
 *
 * @param {string} babyId
 * @param {string} userId   - who is logging this event
 * @param {string} type
 * @param {object} fields
 * @returns {Promise<string>} new document ID
 */
export async function addEvent(babyId, userId, type, fields = {}) {
  const docRef = await addDoc(eventsRef(babyId), {
    type,
    ...fields,
    loggedBy:  userId,
    time:      serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing event.
 *
 * @param {string} babyId
 * @param {string} eventId
 * @param {object} fields
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
 * Delete an event permanently.
 *
 * @param {string} babyId
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function deleteEvent(babyId, eventId) {
  const ref = doc(db, "babies", babyId, "events", eventId);
  await deleteDoc(ref);
}
