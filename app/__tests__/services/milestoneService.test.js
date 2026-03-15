jest.mock("../../src/services/firebase", () => ({ db: {} }));

const mockAddDoc     = jest.fn(() => Promise.resolve({ id: "milestone-id-1" }));
const mockDeleteDoc  = jest.fn(() => Promise.resolve());
const mockOnSnapshot = jest.fn(() => jest.fn());
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

const { addMilestone, subscribeToMilestones, deleteMilestone } =
  require("../../src/services/milestoneService");

beforeEach(() => jest.clearAllMocks());

describe("addMilestone", () => {
  it("returns the new document ID", async () => {
    const id = await addMilestone("baby1", "user1", "First smile", new Date(), "social");
    expect(id).toBe("milestone-id-1");
  });

  it("trims whitespace from title", async () => {
    await addMilestone("baby1", "user1", "  First smile  ", new Date(), "social");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.title).toBe("First smile");
  });

  it("stores category correctly", async () => {
    await addMilestone("baby1", "user1", "Rolling over", new Date(), "motor");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.category).toBe("motor");
  });

  it("stores loggedBy userId", async () => {
    await addMilestone("baby1", "user42", "First word", new Date(), "language");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.loggedBy).toBe("user42");
  });

  it("converts string date to Date object", async () => {
    await addMilestone("baby1", "user1", "First word", "2024-06-01", "language");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.date).toBeInstanceOf(Date);
  });

  it("stores notes when provided", async () => {
    await addMilestone("baby1", "user1", "First step", new Date(), "motor", "so exciting!");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.notes).toBe("so exciting!");
  });

  it("stores null notes when omitted", async () => {
    await addMilestone("baby1", "user1", "First step", new Date(), "motor");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.notes).toBeNull();
  });

  it("uses serverTimestamp for createdAt and updatedAt", async () => {
    await addMilestone("baby1", "user1", "First smile", new Date(), "social");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.createdAt).toBe("SERVER_TS");
    expect(fields.updatedAt).toBe("SERVER_TS");
  });
});

describe("subscribeToMilestones", () => {
  it("returns an unsubscribe function", () => {
    const unsub = subscribeToMilestones("baby1", jest.fn());
    expect(typeof unsub).toBe("function");
  });

  it("orders by date descending", () => {
    subscribeToMilestones("baby1", jest.fn());
    expect(mockOrderBy).toHaveBeenCalledWith("date", "desc");
  });

  it("maps docs and calls onData", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce((q, successCb) => {
      successCb({
        docs: [
          {
            id: "m1",
            data: () => ({
              title: "First smile",
              category: "social",
              date: { toDate: () => new Date("2024-04-01") },
              notes: null,
              loggedBy: "user1",
            }),
          },
        ],
      });
      return jest.fn();
    });
    subscribeToMilestones("baby1", onData);
    expect(onData).toHaveBeenCalledTimes(1);
    const [milestones] = onData.mock.calls[0];
    expect(milestones[0].id).toBe("m1");
    expect(milestones[0].title).toBe("First smile");
  });
});

describe("deleteMilestone", () => {
  it("calls deleteDoc once", async () => {
    await deleteMilestone("baby1", "m1");
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
