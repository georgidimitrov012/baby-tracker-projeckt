/**
 * Sleep Flow Integration Tests
 * ──────────────────────────────────────────────────────────────────────────
 * Tests sleep start/stop service + analytics for nap vs night sleep.
 * Uses require() throughout to avoid import-hoisting / TDZ issues.
 */
jest.mock("../../src/services/firebase", () => ({ db: {}, auth: {} }));
jest.mock("../../src/context/BabyContext", () => ({
  useBaby: () => ({ activeBabyId: null }),
}));

const mockUpdateDoc      = jest.fn(() => Promise.resolve());
const mockAddDoc         = jest.fn(() => Promise.resolve({ id: "sleep-id" }));
const mockCollection     = jest.fn((...args) => ({ _path: args.join("/") }));
const mockDoc            = jest.fn((...args) => ({ _path: args.join("/") }));
const mockServerTimestamp = jest.fn(() => "SERVER_TS");
const mockGetDocs        = jest.fn(() => Promise.resolve({ docs: [] }));
const mockOnSnapshot     = jest.fn(() => jest.fn());
const mockOrderBy        = jest.fn();
const mockQuery          = jest.fn((ref) => ref);
const mockWhere          = jest.fn();
const mockTimestamp      = { fromDate: jest.fn((d) => d) };

jest.mock("firebase/firestore", () => ({
  doc:             mockDoc,
  updateDoc:       mockUpdateDoc,
  addDoc:          mockAddDoc,
  collection:      mockCollection,
  serverTimestamp: mockServerTimestamp,
  getDocs:         mockGetDocs,
  onSnapshot:      mockOnSnapshot,
  orderBy:         mockOrderBy,
  query:           mockQuery,
  where:           mockWhere,
  Timestamp:       mockTimestamp,
}));

const { startSleep, stopSleep } = require("../../src/services/sleepService");
const { computeInsights } = require("../../src/hooks/useAnalytics");

beforeEach(() => jest.clearAllMocks());

function makeSleep(minutesAgo, duration, sleepType = "nap") {
  return {
    id: `s${Math.random()}`,
    type: "sleep",
    sleepType,
    time: new Date(Date.now() - minutesAgo * 60000),
    duration,
  };
}

// ── startSleep / stopSleep interaction ─────────────────────────────────────

describe("Sleep session lifecycle", () => {
  it("startSleep marks baby as actively sleeping", async () => {
    await startSleep("baby1", "user1", "nap");
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.activeSleepStart).toBe("SERVER_TS");
    expect(fields.activeSleepType).toBe("nap");
  });

  it("stopSleep saves event with correct sleepType", async () => {
    const startTime = new Date(Date.now() - 30 * 60000);
    await stopSleep("baby1", "user1", startTime, "night");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.sleepType).toBe("night");
    expect(fields.type).toBe("sleep");
  });

  it("stopSleep clears active session fields", async () => {
    const startTime = new Date(Date.now() - 30 * 60000);
    await stopSleep("baby1", "user1", startTime, "nap");
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.activeSleepStart).toBeNull();
    expect(fields.activeSleepType).toBeNull();
  });

  it("duration is at least 1 minute for very short sessions", async () => {
    const startTime = new Date(); // just now
    await stopSleep("baby1", "user1", startTime, "nap");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.duration).toBeGreaterThanOrEqual(1);
  });
});

// ── Nap vs Night analytics ─────────────────────────────────────────────────

describe("Nap vs Night sleep insights", () => {
  it("upward trend includes nap sleep data", () => {
    const now = Date.now();
    const events = [];
    for (let i = 1; i <= 7; i++) {
      events.push({ ...makeSleep(0, 120, "nap"), time: new Date(now - i * 86400000 * 0.9) });
    }
    for (let i = 8; i <= 14; i++) {
      events.push({ ...makeSleep(0, 60, "nap"), time: new Date(now - i * 86400000 * 0.9) });
    }
    const { sleepTrendDirection } = computeInsights(events);
    expect(sleepTrendDirection).toBe("up");
  });

  it("night sleep contributes to trend calculation", () => {
    const now = Date.now();
    const events = [];
    for (let i = 1; i <= 7; i++) {
      events.push({ ...makeSleep(0, 480, "night"), time: new Date(now - i * 86400000 * 0.9) });
    }
    for (let i = 8; i <= 14; i++) {
      events.push({ ...makeSleep(0, 240, "night"), time: new Date(now - i * 86400000 * 0.9) });
    }
    const { sleepTrendDirection, sleepTrendPercent } = computeInsights(events);
    expect(sleepTrendDirection).toBe("up");
    expect(sleepTrendPercent).toBeGreaterThan(0);
  });

  it("stable trend when totals are equal across weeks", () => {
    const now = Date.now();
    const events = [];
    for (let i = 1; i <= 14; i++) {
      events.push({ ...makeSleep(0, 60, "nap"), time: new Date(now - i * 86400000 * 0.9) });
    }
    const { sleepTrendDirection } = computeInsights(events);
    expect(sleepTrendDirection).toBe("stable");
  });
});

// ── Sleep onset insight ───────────────────────────────────────────────────

describe("Sleep onset after feeding", () => {
  it("returns null when < 2 sleep events", () => {
    const events = [
      { id: "f1", type: "feeding", time: new Date(Date.now() - 120 * 60000), feedingType: "bottle" },
      makeSleep(90, 60, "nap"),
    ];
    expect(computeInsights(events).avgSleepOnsetAfterFeedingMin).toBeNull();
  });

  it("computes correct onset with regular pattern", () => {
    const events = [
      { id: "f1", type: "feeding", time: new Date(Date.now() - 300 * 60000), feedingType: "bottle" },
      { ...makeSleep(0, 60, "nap"), time: new Date(Date.now() - 270 * 60000) },
      { id: "f2", type: "feeding", time: new Date(Date.now() - 180 * 60000), feedingType: "bottle" },
      { ...makeSleep(0, 60, "nap"), time: new Date(Date.now() - 150 * 60000) },
      { id: "f3", type: "feeding", time: new Date(Date.now() - 60 * 60000), feedingType: "bottle" },
      { ...makeSleep(0, 60, "nap"), time: new Date(Date.now() - 30 * 60000) },
    ];
    const { avgSleepOnsetAfterFeedingMin } = computeInsights(events);
    expect(avgSleepOnsetAfterFeedingMin).toBe(30);
  });
});
