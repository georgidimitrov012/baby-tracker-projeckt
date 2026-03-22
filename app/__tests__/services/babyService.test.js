jest.mock("../../src/services/firebase", () => ({ db: {} }));

const mockAddDoc     = jest.fn(() => Promise.resolve({ id: "new-baby-id" }));
const mockUpdateDoc  = jest.fn(() => Promise.resolve());
const mockGetDocs    = jest.fn(() => Promise.resolve({ docs: [] }));
const mockCollection = jest.fn((...args) => ({ _path: args.join("/") }));
const mockDoc        = jest.fn((...args) => ({ _path: args.join("/") }));
const mockQuery      = jest.fn((ref) => ref);
const mockWhere      = jest.fn();
const mockServerTimestamp = jest.fn(() => "SERVER_TS");

jest.mock("firebase/firestore", () => ({
  addDoc:          mockAddDoc,
  updateDoc:       mockUpdateDoc,
  getDocs:         mockGetDocs,
  collection:      mockCollection,
  doc:             mockDoc,
  query:           mockQuery,
  where:           mockWhere,
  serverTimestamp: mockServerTimestamp,
}));

const {
  createBaby,
  getBabiesForUser,
  addParentToBaby,
  updateBaby,
  updateBabySettings,
} = require("../../src/services/babyService");

beforeEach(() => jest.clearAllMocks());

describe("createBaby", () => {
  it("returns the new document ID", async () => {
    const id = await createBaby("user1", "Luna");
    expect(id).toBe("new-baby-id");
  });

  it("sets creator as owner in members map", async () => {
    await createBaby("user1", "Luna");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.members).toEqual({ user1: "owner" });
  });

  it("sets createdBy to userId", async () => {
    await createBaby("user1", "Luna");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.createdBy).toBe("user1");
  });

  it("stores baby name correctly", async () => {
    await createBaby("user1", "Oliver");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.name).toBe("Oliver");
  });

  it("stores birthDate when provided", async () => {
    const bd = new Date("2024-01-01");
    await createBaby("user1", "Luna", bd);
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.birthDate).toBe(bd);
  });

  it("stores null birthDate when not provided", async () => {
    await createBaby("user1", "Luna");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.birthDate).toBeNull();
  });
});

describe("getBabiesForUser", () => {
  it("queries with members.<userId> in all valid roles (including legacy boolean)", async () => {
    await getBabiesForUser("user1");
    const [field, op, values] = mockWhere.mock.calls[0];
    expect(field).toBe("members.user1");
    expect(op).toBe("in");
    expect(values).toContain("owner");
    expect(values).toContain("admin");
    expect(values).toContain("parent");
    expect(values).toContain("viewer");
    expect(values).toContain("pediatrician");
    expect(values).toContain(true); // legacy pre-RBAC boolean
  });

  it("returns empty array when no docs", async () => {
    const result = await getBabiesForUser("user1");
    expect(result).toEqual([]);
  });

  it("maps docs to objects with id", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: "baby1",
          data: () => ({
            name: "Luna",
            birthDate: { toDate: () => new Date("2024-01-01") },
            createdAt: { toDate: () => new Date() },
            members: { user1: "owner" },
          }),
        },
      ],
    });
    const result = await getBabiesForUser("user1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("baby1");
    expect(result[0].name).toBe("Luna");
  });
});

describe("addParentToBaby", () => {
  it("calls updateDoc with correct member field", async () => {
    await addParentToBaby("baby1", "user2");
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields["members.user2"]).toBe("parent");
  });
});

describe("updateBaby", () => {
  it("calls updateDoc with provided fields", async () => {
    await updateBaby("baby1", { name: "NewName", photoURL: "url" });
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.name).toBe("NewName");
    expect(fields.photoURL).toBe("url");
  });
});

describe("updateBabySettings", () => {
  it("uses dot-notation keys for settings", async () => {
    await updateBabySettings("baby1", { reminderEnabled: true, reminderHours: 3 });
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields["settings.reminderEnabled"]).toBe(true);
    expect(fields["settings.reminderHours"]).toBe(3);
  });

  it("handles multiple settings at once", async () => {
    await updateBabySettings("baby1", { a: 1, b: 2, c: 3 });
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(Object.keys(fields)).toHaveLength(3);
  });
});
