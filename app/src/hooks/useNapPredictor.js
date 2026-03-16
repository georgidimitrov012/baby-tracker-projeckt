import { useMemo } from "react";

// Age-based wake windows (minutes) — based on published sleep research
const WAKE_WINDOWS = [
  { maxWeeks: 6,   minutes: 50  },  // 0–6 weeks: ~50 min
  { maxWeeks: 12,  minutes: 75  },  // 6–12 weeks: ~75 min
  { maxWeeks: 20,  minutes: 105 },  // 3–5 months: ~1h45
  { maxWeeks: 28,  minutes: 135 },  // 5–7 months: ~2h15
  { maxWeeks: 40,  minutes: 165 },  // 7–10 months: ~2h45
  { maxWeeks: 52,  minutes: 210 },  // 10–12 months: ~3h30
  { maxWeeks: 78,  minutes: 270 },  // 12–18 months: ~4h30
  { maxWeeks: Infinity, minutes: 330 }, // 18+ months: ~5h30
];

function getWakeWindowMinutes(ageWeeks) {
  return (WAKE_WINDOWS.find(w => ageWeeks < w.maxWeeks) ?? WAKE_WINDOWS[WAKE_WINDOWS.length - 1]).minutes;
}

function fmtMins(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Predicts when the next nap should happen based on baby's age (wake windows)
 * and when they last woke up from sleep.
 *
 * @param {Array} events - array of event objects with .type and .time (Date) and .duration (minutes)
 * @param {*} birthDate - Firestore Timestamp or Date or null
 * @returns {{ nextNapIn: number|null, wakeWindowMinutes: number|null, recommendation: string|null, overdue: boolean }}
 */
export function useNapPredictor(events, birthDate) {
  return useMemo(() => {
    const empty = { nextNapIn: null, wakeWindowMinutes: null, recommendation: null, overdue: false };
    if (!birthDate) return empty;

    const bd = birthDate?.toDate ? birthDate.toDate() : new Date(birthDate);
    if (isNaN(bd.getTime())) return empty;

    const ageWeeks = Math.floor((Date.now() - bd.getTime()) / (7 * 86400000));
    if (ageWeeks < 0) return empty;

    const wakeWindowMinutes = getWakeWindowMinutes(ageWeeks);

    // Find the most recent sleep event that has a duration
    const sleepEvents = (events ?? [])
      .filter(e => e.type === "sleep" && (e.duration ?? 0) > 0)
      .sort((a, b) => {
        const ta = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime();
        const tb = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime();
        return ta - tb;
      });

    if (sleepEvents.length === 0) {
      return {
        nextNapIn: null,
        wakeWindowMinutes,
        recommendation: `Wake window ~${fmtMins(wakeWindowMinutes)} at ${ageWeeks}w old`,
        overdue: false,
      };
    }

    const lastSleep = sleepEvents[sleepEvents.length - 1];
    const lastSleepTime = lastSleep.time instanceof Date ? lastSleep.time : new Date(lastSleep.time);
    const wakeTime = new Date(lastSleepTime.getTime() + (lastSleep.duration ?? 0) * 60000);
    const minutesAwake = Math.floor((Date.now() - wakeTime.getTime()) / 60000);

    if (minutesAwake < 0) return empty; // sleep in future, skip

    const minutesUntilNap = wakeWindowMinutes - minutesAwake;

    if (minutesUntilNap <= 0) {
      return {
        nextNapIn: 0,
        wakeWindowMinutes,
        recommendation: "Nap time! Baby may be tired 😴",
        overdue: true,
      };
    }

    return {
      nextNapIn: minutesUntilNap,
      wakeWindowMinutes,
      recommendation: `Next nap in ~${fmtMins(minutesUntilNap)}`,
      overdue: false,
    };
  }, [events, birthDate]);
}
