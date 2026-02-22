import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Send an invite from Parent A to an email address.
 * Prevents duplicate pending invites to the same email + baby.
 *
 * @param {string} babyId
 * @param {string} babyName
 * @param {string} senderUid
 * @param {string} senderName
 * @param {string} recipientEmail
 * @returns {Promise<"sent" | "already_pending">}
 */
export async function sendInvite(babyId, babyName, senderUid, senderName, recipientEmail) {
  const email = recipientEmail.trim().toLowerCase();

  // Block duplicate pending invites for the same baby+email
  const existing = await getDocs(
    query(
      collection(db, "invites"),
      where("babyId",  "==", babyId),
      where("toEmail", "==", email),
      where("status",  "==", "pending")
    )
  );
  if (!existing.empty) return "already_pending";

  await addDoc(collection(db, "invites"), {
    babyId,
    babyName,
    fromUid:   senderUid,
    fromName:  senderName,
    toEmail:   email,
    status:    "pending",
    createdAt: serverTimestamp(),
  });

  return "sent";
}

/**
 * Accept an invite using a writeBatch — both writes are atomic.
 * If either fails, neither applies.
 *
 * Write 1: babies/{babyId}.members[uid] = "parent"
 * Write 2: invites/{inviteId}.status    = "accepted"
 *
 * @param {string} inviteId
 * @param {string} acceptingUid
 * @returns {Promise<void>}
 */
export async function acceptInvite(inviteId, acceptingUid) {
  const inviteRef  = doc(db, "invites", inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error("Invite not found.");
  if (inviteSnap.data().status !== "pending") throw new Error("Invite is no longer pending.");

  const { babyId } = inviteSnap.data();

  const batch = writeBatch(db);

  batch.update(doc(db, "babies", babyId), {
    [`members.${acceptingUid}`]: "parent",
  });

  batch.update(inviteRef, {
    status:     "accepted",
    acceptedAt: serverTimestamp(),
    acceptedBy: acceptingUid,
  });

  await batch.commit();
}

/**
 * Decline an invite.
 *
 * @param {string} inviteId
 * @returns {Promise<void>}
 */
export async function declineInvite(inviteId) {
  await updateDoc(doc(db, "invites", inviteId), {
    status:     "declined",
    declinedAt: serverTimestamp(),
  });
}

/**
 * Get all pending invites for a user (their inbox).
 *
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function getPendingInvites(email) {
  const snap = await getDocs(
    query(
      collection(db, "invites"),
      where("toEmail", "==", email.toLowerCase()),
      where("status",  "==", "pending")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all invites sent by a user for a specific baby (all statuses).
 *
 * @param {string} babyId
 * @param {string} senderUid
 * @returns {Promise<Array>}
 */
export async function getOutgoingInvites(babyId, senderUid) {
  const snap = await getDocs(
    query(
      collection(db, "invites"),
      where("babyId",  "==", babyId),
      where("fromUid", "==", senderUid)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cancel a pending invite (owner deletes it).
 *
 * @param {string} inviteId
 * @returns {Promise<void>}
 */
export async function cancelInvite(inviteId) {
  await deleteDoc(doc(db, "invites", inviteId));
}

/**
 * Remove a parent from a baby.
 * Rebuilds the members map without the target uid.
 * Only the owner can do this — enforced by security rules.
 *
 * @param {string} babyId
 * @param {string} targetUid
 * @param {object} currentMembers
 * @returns {Promise<void>}
 */
export async function removeParentFromBaby(babyId, targetUid, currentMembers) {
  const updated = { ...currentMembers };
  delete updated[targetUid];
  await updateDoc(doc(db, "babies", babyId), { members: updated });
}
