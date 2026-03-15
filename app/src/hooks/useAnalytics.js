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
  const stats    = useMemo(() => computeStats(events, days), [events, days]);
  const insights = useMemo(() => computeInsights(events), [events]);

  return { stats, insights, events, loading, error, refresh: fetchEvents };
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
  const naps     = sleeps.filter((e) => e.sleepType !== "night");
  const nights   = sleeps.filter((e) => e.sleepType === "night");
  const poops    = events.filter((e) => e.type === "poop");
  const pees     = events.filter((e) => e.type === "pee");

  // Feeding sub-types
  const breastFeedings = feedings.filter((e) => e.feedingType === "breast");
  const bottleFeedings = feedings.filter((e) => e.feedingType !== "breast");

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
  const todayNapTotal   = todaySleeps.filter((e) => e.sleepType !== "night").reduce((s, e) => s + (e.duration ?? 0), 0);
  const todayNightTotal = todaySleeps.filter((e) => e.sleepType === "night").reduce((s, e) => s + (e.duration ?? 0), 0);
  const todayBreastMin  = todayFeeds.filter((e) => e.feedingType === "breast").reduce((s, e) => s + (e.duration ?? 0), 0);
  const todayBottleMl   = todayFeeds.filter((e) => e.feedingType !== "breast").reduce((s, e) => s + (e.amount ?? 0), 0);

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
  const napDurations   = naps.map((e) => e.duration ?? 0);
  const nightDurations = nights.map((e) => e.duration ?? 0);
  const avgNapDuration   = napDurations.length
    ? Math.round(napDurations.reduce((a, b) => a + b, 0) / napDurations.length)
    : 0;
  const avgNightDuration = nightDurations.length
    ? Math.round(nightDurations.reduce((a, b) => a + b, 0) / nightDurations.length)
    : 0;

  // ── Feeding stats ─────────────────────────────────────────
  const feedingAmounts = bottleFeedings.map((e) => e.amount ?? 0);
  const avgFeeding = feedingAmounts.length
    ? Math.round(feedingAmounts.reduce((a, b) => a + b, 0) / feedingAmounts.length)
    : 0;
  const avgBreastDuration = breastFeedings.length
    ? Math.round(breastFeedings.reduce((s, e) => s + (e.duration ?? 0), 0) / breastFeedings.length)
    : 0;

  // ── Last event of each type ───────────────────────────────
  const lastFeeding = feedings.length ? feedings[feedings.length - 1] : null;
  const lastSleep   = sleeps.length   ? sleeps[sleeps.length - 1]     : null;

  return {
    // Today
    todayFeedTotal,
    todayFeedCount:   todayFeeds.length,
    todaySleepTotal,
    todaySleepCount:  todaySleeps.length,
    todayPoopCount:   todayPoops.length,
    todayPeeCount:    todayPees.length,
    todayNapTotal,
    todayNightTotal,
    todayBreastMin,
    todayBottleMl,

    // Last 24h
    last24FeedTotal,
    last24FeedCount: last24Feeds.length,
    last24SleepTotal,

    // Sleep
    avgSleep,
    longestSleep,
    avgNapDuration,
    avgNightDuration,
    lastSleep,

    // Feeding
    avgFeeding,
    avgBreastDuration,
    lastFeeding,

    // Charts data — arrays ordered oldest → newest
    week,   // 7 items
    month,  // 30 items
  };
}

// ─────────────────────────────────────────────────────────────
// PATTERN INSIGHTS — pure computation, no hooks
// ─────────────────────────────────────────────────────────────

export function computeInsights(events) {
  const now     = new Date();
  const sevenDaysAgo     = new Date(now - 7 * 86400000);
  const fourteenDaysAgo  = new Date(now - 14 * 86400000);

  const recent  = events.filter((e) => e.time >= sevenDaysAgo);
  const prev    = events.filter((e) => e.time >= fourteenDaysAgo && e.time < sevenDaysAgo);

  const recentFeedings = recent.filter((e) => e.type === "feeding").sort((a, b) => a.time - b.time);
  const recentSleeps   = recent.filter((e) => e.type === "sleep" && e.duration > 0);

  // 1. Average gap between feedings
  let avgFeedingGapMin = null;
  if (recentFeedings.length >= 3) {
    const gaps = [];
    for (let i = 1; i < recentFeedings.length; i++) {
      gaps.push((recentFeedings[i].time - recentFeedings[i - 1].time) / 60000);
    }
    avgFeedingGapMin = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  }

  // 2. Average sleep onset after last feeding
  let avgSleepOnsetAfterFeedingMin = null;
  if (recentSleeps.length >= 2 && recentFeedings.length >= 2) {
    const onsets = [];
    for (const sleep of recentSleeps) {
      const prevFeed = [...recentFeedings].reverse().find((f) => f.time < sleep.time);
      if (prevFeed) {
        const onset = (sleep.time - prevFeed.time) / 60000;
        if (onset > 0 && onset < 300) onsets.push(onset); // cap at 5h to avoid outliers
      }
    }
    if (onsets.length >= 2) {
      avgSleepOnsetAfterFeedingMin = Math.round(onsets.reduce((a, b) => a + b, 0) / onsets.length);
    }
  }

  // 3. Weekly sleep trend
  let sleepTrendPercent = null;
  let sleepTrendDirection = "stable";
  const recentSleepTotal = recentSleeps.reduce((s, e) => s + (e.duration ?? 0), 0);
  const prevSleeps       = prev.filter((e) => e.type === "sleep" && e.duration > 0);
  const prevSleepTotal   = prevSleeps.reduce((s, e) => s + (e.duration ?? 0), 0);
  if (prevSleepTotal > 0) {
    sleepTrendPercent = Math.round(((recentSleepTotal - prevSleepTotal) / prevSleepTotal) * 100);
    if (sleepTrendPercent > 5) sleepTrendDirection = "up";
    else if (sleepTrendPercent < -5) sleepTrendDirection = "down";
  }

  return {
    avgFeedingGapMin,
    avgSleepOnsetAfterFeedingMin,
    sleepTrendPercent,
    sleepTrendDirection,
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
