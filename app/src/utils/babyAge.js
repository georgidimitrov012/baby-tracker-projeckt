/**
 * Returns a human-readable age string for a baby.
 *
 * Phases:
 *  < 16 weeks  → "Xw Yd old"   (weeks + days, most relevant for newborns)
 *  ≥ 16 weeks  → "Xmo Yw old"  (calendar months + whole weeks remainder)
 *
 * Uses actual calendar-month arithmetic (not 30.44-day approximation)
 * to avoid off-by-one errors near month boundaries.
 *
 * @param {import("firebase/firestore").Timestamp | Date | string | null} birthDate
 * @returns {string | null}
 */
export function getBabyAge(birthDate) {
  if (!birthDate) return null;

  const bd = birthDate?.toDate ? birthDate.toDate() : new Date(birthDate);
  if (isNaN(bd.getTime())) return null;

  const now = new Date();
  const totalDays = Math.floor((now.getTime() - bd.getTime()) / 86400000);
  if (totalDays < 0) return null;

  const weeks = Math.floor(totalDays / 7);
  const days  = totalDays % 7;

  // Under 16 weeks: show weeks + days (most meaningful for newborns)
  if (weeks < 16) {
    if (days === 0) return `${weeks}w old`;
    return `${weeks}w ${days}d old`;
  }

  // 16+ weeks: calculate whole calendar months from the actual date
  let months =
    (now.getFullYear() - bd.getFullYear()) * 12 +
    (now.getMonth() - bd.getMonth());

  // If we haven't reached the birth day-of-month yet this month, step back one
  if (now.getDate() < bd.getDate()) months--;
  if (months < 0) months = 0;

  // Find the date exactly `months` full calendar months after birth
  const afterMonths = new Date(bd);
  afterMonths.setMonth(afterMonths.getMonth() + months);

  // Remaining days since that date → convert to whole weeks
  const remainingDays  = Math.floor((now.getTime() - afterMonths.getTime()) / 86400000);
  const remainingWeeks = Math.floor(remainingDays / 7);

  if (remainingWeeks > 0) return `${months}mo ${remainingWeeks}w old`;
  return `${months}mo old`;
}
