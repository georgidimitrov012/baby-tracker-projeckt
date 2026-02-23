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
import { ROLES } from "../utils/permissions";

/**
 * Send an invite with an explicit role assignment.
 * The role is stored on the invite doc and applied to members on accept.
 *
 * @param {string} babyId
 * @param {string} babyName
 * @param {string} senderUid
 * @param {string} senderName
 * @param {string} recipientEmail
 * @param {string} role           - one of ROLES.* (default: "parent")
 * @returns {Promise<"sent" | "already_pending">}
 */
export async function sendInvite(
  babyId,
  babyName,
  senderUid,
  senderName,
  recipientEmail,
  role = ROLES.PARENT
) {
  const email = recipientEmail.trim().toLowerCase();

  // Check for existing pending invite to same baby + email.
  // NOTE: This query requires a composite index in Firestore:
  //   Collection: invites
  //   Fields: babyId (ASC), toEmail (ASC), status (ASC)
  // If you see an index error in the console, click the auto-generated
  // link to create it, wait ~1 min, then try again.
  try {
    const existing = await getDocs(
      query(
        collection(db, "invites"),
        where("babyId",  "==", babyId),
        where("toEmail", "==", email),
        where("status",  "==", "pending")
      )
    );
    if (!existing.empty) return "already_pending";
  } catch (e) {
    // If the composite index doesn't exist yet, skip the duplicate check
    // and proceed — a duplicate invite is harmless, the user can cancel it.
    console.warn("[inviteService] duplicate check failed (index may be missing):", e.message);
  }

  await addDoc(collection(db, "invites"), {
    babyId,
    babyName,
    fromUid:   senderUid,
    fromName:  senderName,
    toEmail:   email,
    role,
    status:    "pending",
    createdAt: serverTimestamp(),
  });

  return "sent";
}

/**
 * Accept an invite — atomically adds member with the invite's role.
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

  const { babyId, role } = inviteSnap.data();

  const batch = writeBatch(db);

  batch.update(doc(db, "babies", babyId), {
    [`members.${acceptingUid}`]: role,
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
 * Get all pending invites for a user's email (their inbox).
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
 * Get all outgoing invites sent by a user for a specific baby (all statuses).
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
 * Cancel a pending invite (owner/admin only).
 *
 * @param {string} inviteId
 * @returns {Promise<void>}
 */
export async function cancelInvite(inviteId) {
  await deleteDoc(doc(db, "invites", inviteId));
}

/**
 * Change a member's role.
 *
 * @param {string} babyId
 * @param {string} targetUid
 * @param {string} newRole
 * @returns {Promise<void>}
 */
export async function changeMemberRole(babyId, targetUid, newRole) {
  await updateDoc(doc(db, "babies", babyId), {
    [`members.${targetUid}`]: newRole,
  });
}

/**
 * Transfer ownership to another member.
 * Promotes target to "owner", demotes current owner to "admin".
 * Both writes are atomic via writeBatch.
 *
 * @param {string} babyId
 * @param {string} currentOwnerUid
 * @param {string} newOwnerUid
 * @returns {Promise<void>}
 */
export async function transferOwnership(babyId, currentOwnerUid, newOwnerUid) {
  const batch = writeBatch(db);

  batch.update(doc(db, "babies", babyId), {
    [`members.${newOwnerUid}`]:     ROLES.OWNER,
    [`members.${currentOwnerUid}`]: ROLES.ADMIN,
  });

  await batch.commit();
}

/**
 * Remove a parent from a baby.
 * Rebuilds the members map without the target uid.
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
