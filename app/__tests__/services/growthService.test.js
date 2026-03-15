jest.mock("../../src/services/firebase", () => ({ db: {} }));

const mockAddDoc     = jest.fn(() => Promise.resolve({ id: "log-id-1" }));
const mockDeleteDoc  = jest.fn(() => Promise.resolve());
const mockOnSnapshot = jest.fn(() => jest.fn()); // returns unsubscribe fn
const mockCollection = jest.fn((...args) => ({ _path: args.join("/") }));
const mockDoc        = jest.fn((...args) => ({ _path: args.join("/") }));
const mockQuery      = jest.fn((ref) => ref);
const mockOrderBy    = jest.fn();
const mockServerTimestamp = jest.fn(() => "SERVER_TS");

jest.mock("firebase/firestore", () => ({
  addDoc:          mockAddDoc,
  deleteDoc:       mockDeleteDoc,
  onSnapshot:      mockOnSnapshot,
  collection:      mockCollection,
  doc:             mockDoc,
  query:           mockQuery,
  orderBy:         mockOrderBy,
  serverTimestamp: mockServerTimestamp,
}));

const { addWeightLog, subscribeToWeightLogs, deleteWeightLog } =
  require("../../src/services/growthService");

beforeEach(() => jest.clearAllMocks());

describe("addWeightLog", () => {
  it("returns the new document ID", async () => {
    const id = await addWeightLog("baby1", "user1", 5.2, new Date());
    expect(id).toBe("log-id-1");
  });

  it("stores weight and loggedBy", async () => {
    await addWeightLog("baby1", "user1", 5.2, new Date());
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.weight).toBe(5.2);
    expect(fields.loggedBy).toBe("user1");
  });

  it("converts string date to Date object", async () => {
    await addWeightLog("baby1", "user1", 5.0, "2024-03-15");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.date).toBeInstanceOf(Date);
  });

  it("passes Date object through unchanged", async () => {
    const d = new Date("2024-03-15");
    await addWeightLog("baby1", "user1", 5.0, d);
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.date).toBe(d);
  });

  it("stores notes when provided", async () => {
    await addWeightLog("baby1", "user1", 5.0, new Date(), "healthy");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.notes).toBe("healthy");
  });

  it("stores null notes when not provided", async () => {
    await addWeightLog("baby1", "user1", 5.0, new Date());
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.notes).toBeNull();
  });

  it("uses serverTimestamp for createdAt", async () => {
    await addWeightLog("baby1", "user1", 5.0, new Date());
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.createdAt).toBe("SERVER_TS");
  });
});

describe("subscribeToWeightLogs", () => {
  it("returns an unsubscribe function", () => {
    const unsub = subscribeToWeightLogs("baby1", jest.fn());
    expect(typeof unsub).toBe("function");
  });

  it("calls onSnapshot with a query ordered by date asc", () => {
    subscribeToWeightLogs("baby1", jest.fn());
    expect(mockOrderBy).toHaveBeenCalledWith("date", "asc");
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it("invokes onData callback with mapped logs", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce((q, successCb) => {
      successCb({
        docs: [
          {
            id: "log1",
            data: () => ({
              weight: 5.5,
              date: { toDate: () => new Date("2024-03-01") },
              notes: null,
              loggedBy: "user1",
            }),
          },
        ],
      });
      return jest.fn();
    });
    subscribeToWeightLogs("baby1", onData);
    expect(onData).toHaveBeenCalledTimes(1);
    const [logs] = onData.mock.calls[0];
    expect(logs[0].id).toBe("log1");
    expect(logs[0].weight).toBe(5.5);
  });
});

describe("deleteWeightLog", () => {
  it("calls deleteDoc once", async () => {
    await deleteWeightLog("baby1", "log1");
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
