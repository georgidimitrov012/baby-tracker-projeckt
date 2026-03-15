jest.mock("../../src/services/firebase", () => ({ db: {} }));
jest.mock("../../src/utils/permissions", () => ({
  ROLES: { OWNER: "owner", ADMIN: "admin", PARENT: "parent", VIEWER: "viewer" },
}));

const mockAddDoc     = jest.fn(() => Promise.resolve({ id: "invite-id-1" }));
const mockUpdateDoc  = jest.fn(() => Promise.resolve());
const mockDeleteDoc  = jest.fn(() => Promise.resolve());
const mockGetDoc     = jest.fn();
const mockGetDocs    = jest.fn(() => Promise.resolve({ docs: [], empty: true }));
const mockCollection = jest.fn((...args) => ({ _path: args.join("/") }));
const mockDoc        = jest.fn((...args) => ({ _path: args.join("/") }));
const mockQuery      = jest.fn((ref) => ref);
const mockWhere      = jest.fn();
const mockServerTimestamp = jest.fn(() => "SERVER_TS");

const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());
const mockWriteBatch  = jest.fn(() => ({
  update: mockBatchUpdate,
  commit: mockBatchCommit,
}));

jest.mock("firebase/firestore", () => ({
  addDoc:          mockAddDoc,
  updateDoc:       mockUpdateDoc,
  deleteDoc:       mockDeleteDoc,
  getDoc:          mockGetDoc,
  getDocs:         mockGetDocs,
  collection:      mockCollection,
  doc:             mockDoc,
  query:           mockQuery,
  where:           mockWhere,
  serverTimestamp: mockServerTimestamp,
  writeBatch:      mockWriteBatch,
}));

const {
  sendInvite,
  acceptInvite,
  declineInvite,
  cancelInvite,
  getPendingInvites,
  getOutgoingInvites,
  changeMemberRole,
  transferOwnership,
  removeParentFromBaby,
} = require("../../src/services/inviteService");

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDocs.mockResolvedValue({ docs: [], empty: true });
});

describe("sendInvite", () => {
  it("returns 'sent' when no pending invite exists", async () => {
    const result = await sendInvite("baby1", "Luna", "uid1", "Alice", "bob@example.com");
    expect(result).toBe("sent");
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it("returns 'already_pending' when duplicate found", async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [{ id: "existing" }], empty: false });
    const result = await sendInvite("baby1", "Luna", "uid1", "Alice", "bob@example.com");
    expect(result).toBe("already_pending");
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("lowercases the recipient email", async () => {
    await sendInvite("baby1", "Luna", "uid1", "Alice", "BOB@EXAMPLE.COM");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.toEmail).toBe("bob@example.com");
  });

  it("stores correct role on invite doc", async () => {
    await sendInvite("baby1", "Luna", "uid1", "Alice", "bob@example.com", "viewer");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.role).toBe("viewer");
  });

  it("defaults role to parent", async () => {
    await sendInvite("baby1", "Luna", "uid1", "Alice", "bob@example.com");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.role).toBe("parent");
  });

  it("sets status to pending", async () => {
    await sendInvite("baby1", "Luna", "uid1", "Alice", "bob@example.com");
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.status).toBe("pending");
  });

  it("proceeds with send even when duplicate check throws (missing index)", async () => {
    mockGetDocs.mockRejectedValueOnce(new Error("index missing"));
    const result = await sendInvite("baby1", "Luna", "uid1", "Alice", "bob@example.com");
    expect(result).toBe("sent");
  });
});

describe("acceptInvite", () => {
  it("throws when invite not found", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
    await expect(acceptInvite("invite1", "user2")).rejects.toThrow("not found");
  });

  it("throws when invite is not pending", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ status: "accepted", babyId: "baby1", role: "parent" }),
    });
    await expect(acceptInvite("invite1", "user2")).rejects.toThrow("no longer pending");
  });

  it("commits batch with member update and status change", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ status: "pending", babyId: "baby1", role: "parent" }),
    });
    await acceptInvite("invite1", "user2");
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
  });
});

describe("declineInvite", () => {
  it("calls updateDoc with status declined", async () => {
    await declineInvite("invite1");
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.status).toBe("declined");
  });
});

describe("cancelInvite", () => {
  it("calls deleteDoc once", async () => {
    await cancelInvite("invite1");
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

describe("getPendingInvites", () => {
  it("queries with lowercase email and status=pending", async () => {
    await getPendingInvites("Bob@Example.COM");
    expect(mockWhere).toHaveBeenCalledWith("toEmail", "==", "bob@example.com");
    expect(mockWhere).toHaveBeenCalledWith("status", "==", "pending");
  });

  it("returns empty array when no docs", async () => {
    const result = await getPendingInvites("nobody@example.com");
    expect(result).toEqual([]);
  });
});

describe("getOutgoingInvites", () => {
  it("queries by babyId and fromUid", async () => {
    await getOutgoingInvites("baby1", "uid1");
    expect(mockWhere).toHaveBeenCalledWith("babyId",  "==", "baby1");
    expect(mockWhere).toHaveBeenCalledWith("fromUid", "==", "uid1");
  });
});

describe("changeMemberRole", () => {
  it("updates the correct member role field", async () => {
    await changeMemberRole("baby1", "user2", "viewer");
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields["members.user2"]).toBe("viewer");
  });
});

describe("transferOwnership", () => {
  it("commits a batch updating both old and new owner roles", async () => {
    await transferOwnership("baby1", "owner1", "user2");
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    const [, fields] = mockBatchUpdate.mock.calls[0];
    expect(fields["members.user2"]).toBe("owner");
    expect(fields["members.owner1"]).toBe("admin");
  });
});

describe("removeParentFromBaby", () => {
  it("calls updateDoc with members map excluding the removed uid", async () => {
    const currentMembers = { uid1: "owner", uid2: "parent", uid3: "viewer" };
    await removeParentFromBaby("baby1", "uid2", currentMembers);
    const [, fields] = mockUpdateDoc.mock.calls[0];
    expect(fields.members).not.toHaveProperty("uid2");
    expect(fields.members).toHaveProperty("uid1");
    expect(fields.members).toHaveProperty("uid3");
  });
});
