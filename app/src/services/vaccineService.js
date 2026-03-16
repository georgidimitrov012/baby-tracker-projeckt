import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

// Standard UK vaccination schedule (age in months)
export const DEFAULT_VACCINE_SCHEDULE = [
  { name: "6-in-1 (DTaP/IPV/Hib/HepB)", ageMonths: 2, notes: "1st dose" },
  { name: "Rotavirus", ageMonths: 2, notes: "1st dose (oral)" },
  { name: "MenB", ageMonths: 2, notes: "1st dose" },
  { name: "6-in-1 (DTaP/IPV/Hib/HepB)", ageMonths: 3, notes: "2nd dose" },
  { name: "Rotavirus", ageMonths: 3, notes: "2nd dose (oral)" },
  { name: "6-in-1 (DTaP/IPV/Hib/HepB)", ageMonths: 4, notes: "3rd dose" },
  { name: "MenB", ageMonths: 4, notes: "2nd dose" },
  { name: "Hib/MenC", ageMonths: 12, notes: "Booster" },
  { name: "MMR (measles, mumps, rubella)", ageMonths: 12, notes: "1st dose" },
  { name: "PCV (pneumococcal)", ageMonths: 12, notes: "Booster" },
  { name: "MenB", ageMonths: 12, notes: "Booster" },
  { name: "MMR (measles, mumps, rubella)", ageMonths: 40, notes: "2nd dose (pre-school)" },
  { name: "4-in-1 pre-school booster (DTaP/IPV)", ageMonths: 40, notes: "Pre-school booster" },
];

export async function getVaccines(babyId) {
  const snap = await getDocs(query(collection(db, "babies", babyId, "vaccines"), orderBy("scheduledDate", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data(), scheduledDate: d.data().scheduledDate?.toDate?.() ?? null, completedDate: d.data().completedDate?.toDate?.() ?? null }));
}

export async function addVaccine(babyId, { name, scheduledDate, notes = "", isCompleted = false, completedDate = null }) {
  return addDoc(collection(db, "babies", babyId, "vaccines"), {
    name, notes, isCompleted,
    scheduledDate: scheduledDate ? Timestamp.fromDate(new Date(scheduledDate)) : null,
    completedDate: completedDate ? Timestamp.fromDate(new Date(completedDate)) : null,
    createdAt: Timestamp.now(),
  });
}

export async function updateVaccine(babyId, vaccineId, data) {
  const ref = doc(db, "babies", babyId, "vaccines", vaccineId);
  const update = { ...data };
  if (data.scheduledDate) update.scheduledDate = Timestamp.fromDate(new Date(data.scheduledDate));
  if (data.completedDate) update.completedDate = Timestamp.fromDate(new Date(data.completedDate));
  return updateDoc(ref, update);
}

export async function deleteVaccine(babyId, vaccineId) {
  return deleteDoc(doc(db, "babies", babyId, "vaccines", vaccineId));
}

export async function seedDefaultVaccines(babyId, birthDate) {
  const existing = await getVaccines(babyId);
  if (existing.length > 0) return; // don't seed if already has vaccines
  const bd = birthDate?.toDate ? birthDate.toDate() : new Date(birthDate);
  const promises = DEFAULT_VACCINE_SCHEDULE.map(v => {
    const scheduledDate = new Date(bd);
    scheduledDate.setMonth(scheduledDate.getMonth() + v.ageMonths);
    return addVaccine(babyId, { name: v.name, scheduledDate, notes: v.notes });
  });
  return Promise.all(promises);
}
