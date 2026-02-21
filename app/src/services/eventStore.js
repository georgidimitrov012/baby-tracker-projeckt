import { collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

const EVENTS_COLLECTION = "events";

export const addEvent = async (event) => {
  await addDoc(collection(db, EVENTS_COLLECTION), event);
};

export const getEvents = async () => {
  const snapshot = await getDocs(collection(db, EVENTS_COLLECTION));

  return snapshot.docs.map((doc) => ({
           id: doc.id,
           ...doc.data(),
         }));
};

// LIVE EVENTS LISTENER
export const subscribeToEvents = (callback) => {
  const q = query(collection(db, "events"), orderBy("time", "desc"));

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    callback(events);
  });
};

// DELETE
export const deleteEvent = async (id) => {
  await deleteDoc(doc(db, "events", id));
};

