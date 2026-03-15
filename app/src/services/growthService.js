import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

function weightLogsRef(babyId) {
  return collection(db, "babies", babyId, "weightLogs");
}

export async function addWeightLog(babyId, userId, weight, date, notes = null) {
  const docRef = await addDoc(weightLogsRef(babyId), {
    weight,
    date: date instanceof Date ? date : new Date(date),
    notes: notes?.trim() || null,
    loggedBy: userId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeToWeightLogs(babyId, onData, onError) {
  const q = query(weightLogsRef(babyId), orderBy("date", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const logs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate?.() ?? new Date(d.data().date),
      }));
      onData(logs);
    },
    (err) => {
      console.error("[growthService] subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function deleteWeightLog(babyId, logId) {
  await deleteDoc(doc(db, "babies", babyId, "weightLogs", logId));
}
