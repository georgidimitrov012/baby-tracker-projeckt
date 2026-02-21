import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Create a new baby for a user.
 * The creating user is set as "owner" in the members map.
 * This members map is what security rules check for access.
 *
 * @param {string} userId
 * @param {string} name
 * @param {Date|null} birthDate
 * @returns {Promise<string>} new baby document ID
 */
export async function createBaby(userId, name, birthDate = null) {
  const docRef = await addDoc(collection(db, "babies"), {
    name,
    birthDate: birthDate ?? null,
    photoURL: null,
    createdAt: serverTimestamp(),
    createdBy: userId,
    // members map: { [userId]: "owner" | "parent" }
    // Security rules check: request.auth.uid in resource.data.members
    members: {
      [userId]: "owner",
    },
  });
  return docRef.id;
}

/**
 * Get all babies the current user has access to.
 * Queries babies where the user's ID exists as a key in the members map.
 *
 * @param {string} userId
 * @returns {Promise<Array>} array of baby objects with id
 */
export async function getBabiesForUser(userId) {
  // Firestore supports querying map key existence with:
  // where(`members.${userId}`, "!=", null)
  const q = query(
    collection(db, "babies"),
    where(`members.${userId}`, "!=", null)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    birthDate: d.data().birthDate?.toDate() ?? null,
    createdAt: d.data().createdAt?.toDate() ?? new Date(),
  }));
}

/**
 * Add a parent to an existing baby (shared parenting).
 * Only adds them as "parent" role — not "owner".
 *
 * @param {string} babyId
 * @param {string} newUserId
 * @returns {Promise<void>}
 */
export async function addParentToBaby(babyId, newUserId) {
  const ref = doc(db, "babies", babyId);
  await updateDoc(ref, {
    [`members.${newUserId}`]: "parent",
  });
}
