/**
 * Unit tests for the onEventCreated Cloud Function.
 * Mocks firebase-admin and fetch — no emulator required.
 */

// Mock firebase-admin before requiring the module
const mockGet  = jest.fn();
const mockDoc  = jest.fn(() => ({ get: mockGet }));
const mockFirestore = jest.fn(() => ({ doc: mockDoc }));

jest.mock("firebase-admin", () => ({
  apps: [true], // prevent initializeApp
  initializeApp: jest.fn(),
  firestore: mockFirestore,
}));
jest.mock("firebase-functions", () => ({
  firestore: {
    document: jest.fn(() => ({
      onCreate: jest.fn((handler) => handler),
    })),
  },
}));

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
);

const { _buildLabel, _sendPushNotifications } = require("../index");

beforeEach(() => jest.clearAllMocks());

// ── buildLabel ─────────────────────────────────────────────────────────────

describe("buildLabel", () => {
  it("bottle feeding includes amount", () => {
    expect(_buildLabel({ type: "feeding", feedingType: "bottle", amount: 150 }))
      .toContain("150ml");
  });

  it("formula feeding includes amount", () => {
    expect(_buildLabel({ type: "feeding", feedingType: "formula", amount: 100 }))
      .toContain("100ml");
  });

  it("breast feeding includes duration", () => {
    expect(_buildLabel({ type: "feeding", feedingType: "breast", duration: 20 }))
      .toContain("20min");
  });

  it("poop event has correct label", () => {
    expect(_buildLabel({ type: "poop" })).toContain("poop");
  });

  it("pee event has correct label", () => {
    expect(_buildLabel({ type: "pee" })).toContain("pee");
  });

  it("nap sleep has nap label", () => {
    expect(_buildLabel({ type: "sleep", sleepType: "nap" })).toContain("nap");
  });

  it("night sleep has night label", () => {
    expect(_buildLabel({ type: "sleep", sleepType: "night" })).toContain("night");
  });

  it("unknown event type falls back to generic label", () => {
    expect(_buildLabel({ type: "unknown" })).toContain("event");
  });
});

// ── sendPushNotifications ──────────────────────────────────────────────────

describe("sendPushNotifications", () => {
  it("calls Expo push API with correct method and headers", async () => {
    const messages = [{ to: "ExponentPushToken[abc]", title: "Test", body: "Hello" }];
    await _sendPushNotifications(messages);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://exp.host/--/api/v2/push/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("sends all messages in one batch", async () => {
    const messages = [
      { to: "token1", title: "T", body: "B1" },
      { to: "token2", title: "T", body: "B2" },
    ];
    await _sendPushNotifications(messages);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toHaveLength(2);
  });
});
