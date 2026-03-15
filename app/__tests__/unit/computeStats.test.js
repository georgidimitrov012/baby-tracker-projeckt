// Mock firebase deps before importing
jest.mock("../../src/services/firebase", () => ({ db: {}, auth: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  Timestamp: { fromDate: jest.fn((d) => d) },
}));
jest.mock("../../src/context/BabyContext", () => ({
  useBaby: () => ({ activeBabyId: null }),
}));

// computeStats is NOT exported directly from useAnalytics, so we test
// its output via computeInsights and the stats shape returned.
// We also directly test the exported helpers.
import { computeInsights, fmtMinutes, fmtTime } from "../../src/hooks/useAnalytics";

// ── Helpers ────────────────────────────────────────────────────────────────
function makeFeeding(minutesAgo, extra = {}) {
  return {
    id: `f${Math.random()}`,
    type: "feeding",
    feedingType: "bottle",
    time: new Date(Date.now() - minutesAgo * 60000),
    amount: 120,
    duration: null,
    ...extra,
  };
}

function makeSleep(minutesAgo, duration, extra = {}) {
  return {
    id: `s${Math.random()}`,
    type: "sleep",
    sleepType: "nap",
    time: new Date(Date.now() - minutesAgo * 60000),
    duration,
    ...extra,
  };
}

// ── computeInsights ────────────────────────────────────────────────────────

describe("computeInsights — feeding gap", () => {
  it("returns null with 0 feedings", () => {
    expect(computeInsights([]).avgFeedingGapMin).toBeNull();
  });

  it("returns null with exactly 2 feedings (need ≥ 3)", () => {
    const events = [makeFeeding(200), makeFeeding(100)];
    expect(computeInsights(events).avgFeedingGapMin).toBeNull();
  });

  it("computes gap with 3 evenly-spaced feedings", () => {
    // 300, 180, 60 minutes ago — gaps are 120 and 120 → avg 120
    const events = [makeFeeding(300), makeFeeding(180), makeFeeding(60)];
    const { avgFeedingGapMin } = computeInsights(events);
    expect(avgFeedingGapMin).toBe(120);
  });

  it("computes correct average for uneven gaps", () => {
    // 240, 120, 60 ago → gaps: 120, 60 → avg 90
    const events = [makeFeeding(240), makeFeeding(120), makeFeeding(60)];
    const { avgFeedingGapMin } = computeInsights(events);
    expect(avgFeedingGapMin).toBe(90);
  });

  it("ignores events older than 7 days", () => {
    const old = makeFeeding(8 * 24 * 60); // 8 days ago
    const events = [old, makeFeeding(300), makeFeeding(180), makeFeeding(60)];
    const { avgFeedingGapMin } = computeInsights(events);
    // old event excluded → only 3 recent feedings → gap is computed
    expect(avgFeedingGapMin).toBe(120);
  });
});

describe("computeInsights — sleep onset", () => {
  it("returns null when < 2 sleep events", () => {
    const events = [makeFeeding(120), makeSleep(60, 90)];
    expect(computeInsights(events).avgSleepOnsetAfterFeedingMin).toBeNull();
  });

  it("computes onset when there are sufficient events", () => {
    const events = [
      makeFeeding(300),
      makeSleep(270, 60),  // 30 min after feeding
      makeFeeding(180),
      makeSleep(150, 60),  // 30 min after feeding
      makeFeeding(60),
      makeSleep(30, 60),   // 30 min after feeding
    ];
    const { avgSleepOnsetAfterFeedingMin } = computeInsights(events);
    expect(avgSleepOnsetAfterFeedingMin).toBe(30);
  });
});

describe("computeInsights — sleep trend", () => {
  it("returns null trend when no previous week data", () => {
    const events = [makeSleep(60, 120)];
    expect(computeInsights(events).sleepTrendPercent).toBeNull();
  });

  it("identifies stable trend (within ±5%)", () => {
    const now = Date.now();
    const events = [];
    // Recent 7 days: 10 naps × 60min
    for (let i = 1; i <= 7; i++) {
      events.push({ ...makeSleep(0, 60), time: new Date(now - i * 86400000 * 0.9) });
    }
    // Previous 7 days: 10 naps × 60min (same)
    for (let i = 8; i <= 14; i++) {
      events.push({ ...makeSleep(0, 60), time: new Date(now - i * 86400000 * 0.9) });
    }
    const { sleepTrendDirection } = computeInsights(events);
    expect(sleepTrendDirection).toBe("stable");
  });

  it("identifies upward trend (>5%)", () => {
    const now = Date.now();
    const events = [];
    for (let i = 1; i <= 7; i++) {
      events.push({ ...makeSleep(0, 120), time: new Date(now - i * 86400000 * 0.9) });
    }
    for (let i = 8; i <= 14; i++) {
      events.push({ ...makeSleep(0, 60), time: new Date(now - i * 86400000 * 0.9) });
    }
    const { sleepTrendDirection, sleepTrendPercent } = computeInsights(events);
    expect(sleepTrendDirection).toBe("up");
    expect(sleepTrendPercent).toBeGreaterThan(5);
  });

  it("identifies downward trend (<-5%)", () => {
    const now = Date.now();
    const events = [];
    for (let i = 1; i <= 7; i++) {
      events.push({ ...makeSleep(0, 60), time: new Date(now - i * 86400000 * 0.9) });
    }
    for (let i = 8; i <= 14; i++) {
      events.push({ ...makeSleep(0, 120), time: new Date(now - i * 86400000 * 0.9) });
    }
    const { sleepTrendDirection, sleepTrendPercent } = computeInsights(events);
    expect(sleepTrendDirection).toBe("down");
    expect(sleepTrendPercent).toBeLessThan(-5);
  });
});

// ── fmtMinutes ─────────────────────────────────────────────────────────────

describe("fmtMinutes", () => {
  it("returns — for 0", () => expect(fmtMinutes(0)).toBe("—"));
  it("returns — for null", () => expect(fmtMinutes(null)).toBe("—"));
  it("returns — for undefined", () => expect(fmtMinutes(undefined)).toBe("—"));
  it("formats < 60 as Xm", () => expect(fmtMinutes(45)).toBe("45m"));
  it("formats exact hours as Xh", () => expect(fmtMinutes(120)).toBe("2h"));
  it("formats mixed as Xh Ym", () => expect(fmtMinutes(90)).toBe("1h 30m"));
  it("formats 1 minute", () => expect(fmtMinutes(1)).toBe("1m"));
  it("formats 60 minutes as 1h", () => expect(fmtMinutes(60)).toBe("1h"));
});

// ── fmtTime ────────────────────────────────────────────────────────────────

describe("fmtTime", () => {
  it("returns — for null", () => expect(fmtTime(null)).toBe("—"));
  it("returns — for undefined", () => expect(fmtTime(undefined)).toBe("—"));
  it("returns a string for a valid Date", () => {
    expect(typeof fmtTime(new Date())).toBe("string");
  });
  it("result is non-empty for a valid Date", () => {
    expect(fmtTime(new Date()).length).toBeGreaterThan(0);
  });
});
