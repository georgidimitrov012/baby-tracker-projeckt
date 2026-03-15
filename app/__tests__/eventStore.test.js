// Set up firebase mocks before importing the module under test
jest.mock("../src/services/firebase", () => ({ db: {} }));

const mockAddDoc    = jest.fn(() => Promise.resolve({ id: "new-event-id" }));
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockCollection = jest.fn((db, ...path) => ({ _path: path.join("/") }));
const mockDoc       = jest.fn((db, ...path) => ({ _path: path.join("/") }));
const mockOnSnapshot = jest.fn(() => jest.fn());
const mockOrderBy   = jest.fn();
const mockQuery     = jest.fn((ref) => ref);
const mockServerTimestamp = jest.fn(() => "SERVER_TIMESTAMP");

jest.mock("firebase/firestore", () => ({
  addDoc:          mockAddDoc,
  updateDoc:       mockUpdateDoc,
  deleteDoc:       mockDeleteDoc,
  collection:      mockCollection,
  doc:             mockDoc,
  onSnapshot:      mockOnSnapshot,
  orderBy:         mockOrderBy,
  query:           mockQuery,
  serverTimestamp: mockServerTimestamp,
}));

const { addEvent, updateEvent, deleteEvent } = require("../src/services/eventStore");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("addEvent", () => {
  it("calls addDoc with correct type and loggedBy", async () => {
    await addEvent("baby1", "user1", "feeding", { amount: 120 });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.type).toBe("feeding");
    expect(fields.loggedBy).toBe("user1");
    expect(fields.amount).toBe(120);
  });

  it("includes serverTimestamp fields", async () => {
    await addEvent("baby1", "user1", "poop");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.time).toBe("SERVER_TIMESTAMP");
    expect(fields.createdAt).toBe("SERVER_TIMESTAMP");
    expect(fields.updatedAt).toBe("SERVER_TIMESTAMP");
  });

  it("returns the new document ID", async () => {
    const id = await addEvent("baby1", "user1", "pee");
    expect(id).toBe("new-event-id");
  });
});

describe("updateEvent", () => {
  it("calls updateDoc with correct fields", async () => {
    await updateEvent("baby1", "event1", { amount: 200, notes: "updated" });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.amount).toBe(200);
    expect(fields.notes).toBe("updated");
  });

  it("merges updatedAt serverTimestamp", async () => {
    await updateEvent("baby1", "event1", { notes: "hi" });
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.updatedAt).toBe("SERVER_TIMESTAMP");
  });
});

describe("deleteEvent", () => {
  it("calls deleteDoc once", async () => {
    await deleteEvent("baby1", "event1");
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
