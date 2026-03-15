/**
 * Feeding Flow Integration Tests
 * ──────────────────────────────────────────────────────────────────────────
 * Tests: validation → computeInsights → CSV export pipeline.
 * Uses require() throughout to avoid import-hoisting / TDZ issues.
 */

// Mock firebase and expo deps
jest.mock("../../src/services/firebase", () => ({ db: {}, auth: {} }));
jest.mock("../../src/context/BabyContext", () => ({
  useBaby: () => ({ activeBabyId: null }),
}));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  where:      jest.fn(),
  orderBy:    jest.fn(),
  getDocs:    jest.fn(() => Promise.resolve({ docs: [] })),
  Timestamp:  { fromDate: jest.fn((d) => d) },
}));
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///documents/",
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { UTF8: "utf8" },
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync:       jest.fn(() => Promise.resolve()),
}));

const { computeInsights } = require("../../src/hooks/useAnalytics");
const { validateAmount, validateFeedingDuration } = require("../../src/utils/validation");
const { eventsToCsv } = require("../../src/utils/csvExport");

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFeeding(minutesAgo, type = "bottle", amount = 120, duration = null) {
  return {
    id: `f${Math.random()}`,
    type: "feeding",
    feedingType: type,
    time: new Date(Date.now() - minutesAgo * 60000),
    amount,
    duration,
    notes: null,
    loggedBy: "user1",
  };
}

// ── Bottle feeding validation ──────────────────────────────────────────────

describe("Bottle feeding — validation", () => {
  it("accepts valid bottle amount", () => {
    expect(validateAmount("180").valid).toBe(true);
  });
  it("rejects 0 amount", () => {
    expect(validateAmount("0").valid).toBe(false);
  });
  it("rejects non-numeric amount", () => {
    expect(validateAmount("abc").valid).toBe(false);
  });
  it("rejects amount > 2000", () => {
    expect(validateAmount("2001").valid).toBe(false);
  });
  it("accepts boundary amount 2000", () => {
    expect(validateAmount("2000").valid).toBe(true);
  });
});

// ── Breast feeding validation ──────────────────────────────────────────────

describe("Breast feeding — validation", () => {
  it("accepts valid breast feeding duration", () => {
    expect(validateFeedingDuration("20").valid).toBe(true);
  });
  it("rejects 0 duration", () => {
    expect(validateFeedingDuration("0").valid).toBe(false);
  });
  it("rejects duration > 120", () => {
    expect(validateFeedingDuration("121").valid).toBe(false);
  });
  it("accepts boundary 120", () => {
    expect(validateFeedingDuration("120").valid).toBe(true);
  });
});

// ── Analytics pipeline after logging feedings ─────────────────────────────

describe("Feeding analytics pipeline", () => {
  it("computes avgFeedingGapMin after 3+ bottle feedings", () => {
    const events = [
      makeFeeding(360, "bottle"),
      makeFeeding(240, "bottle"),
      makeFeeding(120, "bottle"),
    ];
    const { avgFeedingGapMin } = computeInsights(events);
    expect(avgFeedingGapMin).toBe(120);
  });

  it("does not confuse breast and bottle events in gap computation", () => {
    const events = [
      makeFeeding(360, "breast", null, 15),
      makeFeeding(240, "breast", null, 15),
      makeFeeding(120, "bottle", 150),
    ];
    const { avgFeedingGapMin } = computeInsights(events);
    expect(avgFeedingGapMin).toBeGreaterThan(0);
  });

  it("returns null gap when all feedings are older than 7 days", () => {
    const old = [
      makeFeeding(8 * 24 * 60, "bottle"),
      makeFeeding(9 * 24 * 60, "bottle"),
      makeFeeding(10 * 24 * 60, "bottle"),
    ];
    const { avgFeedingGapMin } = computeInsights(old);
    expect(avgFeedingGapMin).toBeNull();
  });
});

// ── CSV export after logging feedings ─────────────────────────────────────

describe("Feeding CSV export", () => {
  const events = [
    makeFeeding(120, "bottle", 150),
    makeFeeding(240, "breast", null, 20),
  ];

  it("includes feeding type column", () => {
    const csv = eventsToCsv(events);
    expect(csv).toContain("bottle");
    expect(csv).toContain("breast");
  });

  it("bottle row has amount value", () => {
    const csv = eventsToCsv([makeFeeding(60, "bottle", 180)]);
    expect(csv).toContain("180");
  });

  it("breast row has duration value", () => {
    const csv = eventsToCsv([makeFeeding(60, "breast", null, 25)]);
    expect(csv).toContain("25");
  });

  it("resolves loggedBy to display name", () => {
    const csv = eventsToCsv(events, { user1: "Alice" });
    expect(csv).toContain("Alice");
  });

  it("produces correct number of rows", () => {
    const csv = eventsToCsv(events);
    expect(csv.split("\n")).toHaveLength(events.length + 1);
  });
});
