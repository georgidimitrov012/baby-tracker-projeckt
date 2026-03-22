import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// Bulgarian National Immunization Calendar (Национален имунизационен календар на РБ)
// Source: Наредба № 15 за имунизациите в Република България
export const DEFAULT_VACCINE_SCHEDULE = [
  // At birth
  { name: "БЦЖ (BCG) — Туберкулоза", ageMonths: 0, notes: "При раждане — в рамките на 24 ч." },
  { name: "Хепатит Б (HepB)", ageMonths: 0, notes: "1-ва доза — при раждане" },

  // 1 month
  { name: "Хепатит Б (HepB)", ageMonths: 1, notes: "2-ра доза" },

  // 2 months
  { name: "Хексавалентна ваксина (DTaP-IPV-Hib-HepB)", ageMonths: 2, notes: "1-ва доза" },
  { name: "Пневмококова ваксина PCV13", ageMonths: 2, notes: "1-ва доза" },

  // 3 months
  { name: "Хексавалентна ваксина (DTaP-IPV-Hib-HepB)", ageMonths: 3, notes: "2-ра доза" },

  // 4 months
  { name: "Хексавалентна ваксина (DTaP-IPV-Hib-HepB)", ageMonths: 4, notes: "3-та доза" },
  { name: "Пневмококова ваксина PCV13", ageMonths: 4, notes: "2-ра доза" },

  // 11 months
  { name: "Пневмококова ваксина PCV13", ageMonths: 11, notes: "Реваксинация (бустер)" },

  // 12 months
  { name: "MMR (Морбили, Паротит, Рубеола)", ageMonths: 12, notes: "1-ва доза" },

  // 13 months
  { name: "Хексавалентна ваксина (DTaP-IPV-Hib-HepB)", ageMonths: 13, notes: "Реваксинация (4-та доза)" },

  // 6 years (72 months)
  { name: "DTaP-IPV (Тетравалентна)", ageMonths: 72, notes: "1-ви бустер — предучилищна възраст" },
  { name: "MMR (Морбили, Паротит, Рубеола)", ageMonths: 72, notes: "2-ра доза" },
];

export async function getVaccines(babyId) {
  const snap = await getDocs(collection(db, "babies", babyId, "vaccines"));
  const list = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    scheduledDate: d.data().scheduledDate?.toDate?.() ?? null,
    completedDate: d.data().completedDate?.toDate?.() ?? null,
  }));
  // Sort client-side: nulls last, then ascending by date
  return list.sort((a, b) => {
    if (!a.scheduledDate && !b.scheduledDate) return 0;
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return a.scheduledDate.getTime() - b.scheduledDate.getTime();
  });
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
  if ("scheduledDate" in data) {
    update.scheduledDate = data.scheduledDate
      ? Timestamp.fromDate(data.scheduledDate instanceof Date ? data.scheduledDate : new Date(data.scheduledDate))
      : null;
  }
  if ("completedDate" in data) {
    update.completedDate = data.completedDate
      ? Timestamp.fromDate(data.completedDate instanceof Date ? data.completedDate : new Date(data.completedDate))
      : null;
  }
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
