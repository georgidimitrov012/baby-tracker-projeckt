jest.mock("../../src/services/firebase", () => ({ db: {} }));

const mockUpdateDoc  = jest.fn(() => Promise.resolve());
const mockAddDoc     = jest.fn(() => Promise.resolve({ id: "sleep-event-id" }));
const mockCollection = jest.fn((...path) => ({ _path: path.join("/") }));
const mockDoc        = jest.fn((...path) => ({ _path: path.join("/") }));
const mockServerTimestamp = jest.fn(() => "SERVER_TS");

jest.mock("firebase/firestore", () => ({
  doc:             mockDoc,
  updateDoc:       mockUpdateDoc,
  addDoc:          mockAddDoc,
  collection:      mockCollection,
  serverTimestamp: mockServerTimestamp,
}));

const { startSleep, stopSleep } = require("../../src/services/sleepService");

beforeEach(() => jest.clearAllMocks());

describe("startSleep", () => {
  it("calls updateDoc with activeSleepStart and activeSleepStartedBy", async () => {
    await startSleep("baby1", "user1");
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.activeSleepStart).toBe("SERVER_TS");
    expect(fields.activeSleepStartedBy).toBe("user1");
  });

  it("defaults sleepType to nap", async () => {
    await startSleep("baby1", "user1");
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.activeSleepType).toBe("nap");
  });

  it("stores provided sleepType", async () => {
    await startSleep("baby1", "user1", "night");
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.activeSleepType).toBe("night");
  });

  it("targets the correct baby document", async () => {
    await startSleep("baby99", "user1");
    expect(mockDoc).toHaveBeenCalledWith({}, "babies", "baby99");
  });
});

describe("stopSleep", () => {
  it("calls addDoc to save the sleep event", async () => {
    const startTime = new Date(Date.now() - 3600000); // 1h ago
    await stopSleep("baby1", "user1", startTime);
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it("saves event with type=sleep", async () => {
    const startTime = new Date(Date.now() - 1800000);
    await stopSleep("baby1", "user1", startTime);
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.type).toBe("sleep");
  });

  it("computes duration in minutes (min 1)", async () => {
    const startTime = new Date(Date.now() - 3600000); // exactly 1h
    await stopSleep("baby1", "user1", startTime);
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.duration).toBeGreaterThanOrEqual(1);
    expect(fields.duration).toBeCloseTo(60, 0);
  });

  it("stores the provided sleepType on the event", async () => {
    const startTime = new Date(Date.now() - 1800000);
    await stopSleep("baby1", "user1", startTime, "night");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.sleepType).toBe("night");
  });

  it("stores loggedBy userId", async () => {
    await stopSleep("baby1", "user42", new Date(Date.now() - 60000));
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.loggedBy).toBe("user42");
  });

  it("clears active session fields after saving event", async () => {
    await stopSleep("baby1", "user1", new Date(Date.now() - 60000));
    // updateDoc called to clear active session
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.activeSleepStart).toBeNull();
    expect(fields.activeSleepStartedBy).toBeNull();
    expect(fields.activeSleepType).toBeNull();
  });

  it("uses serverTimestamp for createdAt and updatedAt", async () => {
    await stopSleep("baby1", "user1", new Date(Date.now() - 60000));
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.createdAt).toBe("SERVER_TS");
    expect(fields.updatedAt).toBe("SERVER_TS");
  });
});
