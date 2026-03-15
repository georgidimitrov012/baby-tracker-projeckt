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

function milestonesRef(babyId) {
  return collection(db, "babies", babyId, "milestones");
}

export async function addMilestone(babyId, userId, title, date, category, notes = null) {
  const docRef = await addDoc(milestonesRef(babyId), {
    title: title.trim(),
    date: date instanceof Date ? date : new Date(date),
    category,
    notes: notes?.trim() || null,
    loggedBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeToMilestones(babyId, onData, onError) {
  const q = query(milestonesRef(babyId), orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const milestones = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate?.() ?? new Date(d.data().date),
      }));
      onData(milestones);
    },
    (err) => {
      console.error("[milestoneService] subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function deleteMilestone(babyId, milestoneId) {
  await deleteDoc(doc(db, "babies", babyId, "milestones", milestoneId));
}
