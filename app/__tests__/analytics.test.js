// Mock all firebase and react-native deps before importing
jest.mock("../src/services/firebase", () => ({ db: {}, auth: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  Timestamp: { fromDate: jest.fn((d) => d) },
}));
jest.mock("../src/context/BabyContext", () => ({
  useBaby: () => ({ activeBabyId: null }),
}));

import { computeInsights, fmtMinutes, fmtTime } from "../src/hooks/useAnalytics";

function makeEvent(type, minutesAgo, extra = {}) {
  return {
    id: Math.random().toString(),
    type,
    time: new Date(Date.now() - minutesAgo * 60000),
    ...extra,
  };
}

describe("computeInsights", () => {
  it("returns null values for empty events", () => {
    const insights = computeInsights([]);
    expect(insights.avgFeedingGapMin).toBeNull();
    expect(insights.avgSleepOnsetAfterFeedingMin).toBeNull();
    expect(insights.sleepTrendPercent).toBeNull();
  });

  it("computes avgFeedingGapMin with 3+ feedings", () => {
    const events = [
      makeEvent("feeding", 300),  // 5h ago
      makeEvent("feeding", 180),  // 3h ago
      makeEvent("feeding", 60),   // 1h ago
    ];
    const insights = computeInsights(events);
    expect(insights.avgFeedingGapMin).toBeGreaterThan(0);
    expect(typeof insights.avgFeedingGapMin).toBe("number");
  });

  it("returns null avgFeedingGapMin for < 3 feedings", () => {
    const events = [makeEvent("feeding", 120), makeEvent("feeding", 60)];
    const insights = computeInsights(events);
    expect(insights.avgFeedingGapMin).toBeNull();
  });

  it("identifies upward sleep trend", () => {
    const now = Date.now();
    const events = [];
    // Last 7 days: high sleep (8 sessions x 120min = 960min)
    for (let i = 1; i <= 7; i++) {
      events.push({
        id: `r${i}`,
        type: "sleep",
        duration: 120,
        time: new Date(now - i * 86400000 * 0.9),
      });
    }
    // 7-14 days ago: low sleep (8 sessions x 60min = 480min)
    for (let i = 8; i <= 14; i++) {
      events.push({
        id: `p${i}`,
        type: "sleep",
        duration: 60,
        time: new Date(now - i * 86400000 * 0.9),
      });
    }
    const insights = computeInsights(events);
    expect(insights.sleepTrendDirection).toBe("up");
    expect(insights.sleepTrendPercent).toBeGreaterThan(0);
  });
});

describe("fmtMinutes", () => {
  it("returns — for 0 or null", () => {
    expect(fmtMinutes(0)).toBe("—");
    expect(fmtMinutes(null)).toBe("—");
  });
  it("formats minutes only", () => {
    expect(fmtMinutes(45)).toBe("45m");
  });
  it("formats hours only", () => {
    expect(fmtMinutes(120)).toBe("2h");
  });
  it("formats hours and minutes", () => {
    expect(fmtMinutes(90)).toBe("1h 30m");
  });
});

describe("fmtTime", () => {
  it("returns — for null", () => {
    expect(fmtTime(null)).toBe("—");
  });
  it("returns a string for valid date", () => {
    const result = fmtTime(new Date());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
