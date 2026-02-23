import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useBaby } from "../context/BabyContext";

/**
 * ANALYTICS ARCHITECTURE DECISION
 * ─────────────────────────────────────────────────────────────
 *
 * APPROACH: Client-side computation from a bounded query.
 *
 * We query the last 30 days of events once (not a realtime subscription)
 * and compute all statistics in JavaScript via useMemo.
 *
 * WHY NOT precomputed Firestore aggregates?
 *   At thousands of events, client-side computation of 30 days of data
 *   is instantaneous (< 5ms). Firestore aggregates add write complexity
 *   (Cloud Functions, extra documents) with no meaningful benefit until
 *   you have tens of thousands of events per baby — which takes years.
 *   Add aggregates later when you actually hit that scale.
 *
 * WHY NOT realtime subscription (onSnapshot)?
 *   Analytics data doesn't need to update every second. A one-time
 *   getDocs() with a manual refresh is sufficient and cheaper.
 *
 * PERFORMANCE:
 *   - Query is bounded to 30 days — never full collection scan
 *   - Results are memoized — no recalculation on re-render
 *   - Refresh only on tab focus or manual pull-to-refresh
 */

/**
 * @param {string|null} babyId
 * @param {number} days - how many days back to fetch (default 30)
 */
export function useAnalytics(babyId, days = 30) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!babyId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    fetchEvents();
  }, [babyId, days]);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const snap = await getDocs(
        query(
          collection(db, "babies", babyId, "events"),
          where("time", ">=", Timestamp.fromDate(since)),
          orderBy("time", "asc")
        )
      );

      setEvents(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id:       d.id,
            ...data,
            // Normalise time to JS Date regardless of storage type
            time: data.time?.toDate
              ? data.time.toDate()
              : new Date(data.time),
          };
        })
      );
    } catch (e) {
      console.error("[useAnalytics] fetch error:", e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  // ── Computed stats — recalculated only when events changes ──
  const stats = useMemo(() => computeStats(events, days), [events, days]);

  return { stats, loading, error, refresh: fetchEvents };
}

// ─────────────────────────────────────────────────────────────
// PURE COMPUTATION — no hooks, easy to unit-test
// ─────────────────────────────────────────────────────────────

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function computeStats(events, days) {
  const now      = new Date();
  const oneDayMs = 86400000;

  // Split by type
  const feedings = events.filter((e) => e.type === "feeding");
  const sleeps   = events.filter((e) => e.type === "sleep" && e.duration > 0);
  const poops    = events.filter((e) => e.type === "poop");
  const pees     = events.filter((e) => e.type === "pee");

  // ── Last 24h ─────────────────────────────────────────────
  const since24h   = new Date(now - oneDayMs);
  const last24Feeds = feedings.filter((e) => e.time >= since24h);
  const last24Sleep = sleeps.filter((e) => e.time >= since24h);

  const last24FeedTotal = last24Feeds.reduce((s, e) => s + (e.amount ?? 0), 0);
  const last24SleepTotal = last24Sleep.reduce((s, e) => s + (e.duration ?? 0), 0);

  // ── Today ─────────────────────────────────────────────────
  const todayStart  = startOfDay(now);
  const todayFeeds  = feedings.filter((e) => e.time >= todayStart);
  const todaySleeps = sleeps.filter((e) => e.time >= todayStart);
  const todayPoops  = poops.filter((e) => e.time >= todayStart);
  const todayPees   = pees.filter((e) => e.time >= todayStart);

  const todayFeedTotal  = todayFeeds.reduce((s, e) => s + (e.amount ?? 0), 0);
  const todaySleepTotal = todaySleeps.reduce((s, e) => s + (e.duration ?? 0), 0);

  // ── 7-day daily breakdown (for bar charts) ────────────────
  const last7Days  = buildDailyBuckets(7);
  const last30Days = buildDailyBuckets(days);

  feedings.forEach((e) => {
    const key = dateKey(e.time);
    if (last7Days[key])  last7Days[key].feedingMl  += e.amount ?? 0;
    if (last30Days[key]) last30Days[key].feedingMl  += e.amount ?? 0;
  });
  sleeps.forEach((e) => {
    const key = dateKey(e.time);
    if (last7Days[key])  last7Days[key].sleepMin  += e.duration ?? 0;
    if (last30Days[key]) last30Days[key].sleepMin  += e.duration ?? 0;
  });
  poops.forEach((e) => {
    const key = dateKey(e.time);
    if (last7Days[key])  last7Days[key].poopCount  += 1;
    if (last30Days[key]) last30Days[key].poopCount  += 1;
  });
  pees.forEach((e) => {
    const key = dateKey(e.time);
    if (last7Days[key])  last7Days[key].peeCount  += 1;
    if (last30Days[key]) last30Days[key].peeCount  += 1;
  });

  const week  = Object.values(last7Days);
  const month = Object.values(last30Days);

  // ── Sleep stats ───────────────────────────────────────────
  const allSleepDurations = sleeps.map((e) => e.duration ?? 0);
  const avgSleep = allSleepDurations.length
    ? Math.round(allSleepDurations.reduce((a, b) => a + b, 0) / allSleepDurations.length)
    : 0;
  const longestSleep = allSleepDurations.length
    ? Math.max(...allSleepDurations)
    : 0;

  // ── Feeding stats ─────────────────────────────────────────
  const feedingAmounts = feedings.map((e) => e.amount ?? 0);
  const avgFeeding = feedingAmounts.length
    ? Math.round(feedingAmounts.reduce((a, b) => a + b, 0) / feedingAmounts.length)
    : 0;

  // ── Last event of each type ───────────────────────────────
  const lastFeeding = feedings.length ? feedings[feedings.length - 1] : null;
  const lastSleep   = sleeps.length   ? sleeps[sleeps.length - 1]     : null;

  return {
    // Today
    todayFeedTotal,
    todayFeedCount:  todayFeeds.length,
    todaySleepTotal,
    todaySleepCount: todaySleeps.length,
    todayPoopCount:  todayPoops.length,
    todayPeeCount:   todayPees.length,

    // Last 24h
    last24FeedTotal,
    last24FeedCount: last24Feeds.length,
    last24SleepTotal,

    // Sleep
    avgSleep,
    longestSleep,
    lastSleep,

    // Feeding
    avgFeeding,
    lastFeeding,

    // Charts data — arrays ordered oldest → newest
    week,   // 7 items
    month,  // 30 items
  };
}

function buildDailyBuckets(days) {
  const buckets = {};
  for (let i = days - 1; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = dateKey(d);
    buckets[key] = {
      date:       d,
      label:      d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      shortLabel: d.toLocaleDateString(undefined, { day: "numeric" }),
      feedingMl:  0,
      sleepMin:   0,
      poopCount:  0,
      peeCount:   0,
    };
  }
  return buckets;
}

/** Format minutes as "Xh Ym" */
export function fmtMinutes(min) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format a Date as "HH:MM" */
export function fmtTime(date) {
  if (!date) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
