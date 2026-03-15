import {
  getRole,
  hasRole,
  can,
  ROLES,
} from "../src/utils/permissions";

const makeBaby = (members) => ({ members });

describe("getRole", () => {
  it("returns role for a member", () => {
    const baby = makeBaby({ uid1: "owner" });
    expect(getRole(baby, "uid1")).toBe("owner");
  });
  it("returns null for non-member", () => {
    const baby = makeBaby({ uid1: "owner" });
    expect(getRole(baby, "uid2")).toBeNull();
  });
  it("returns null for null baby", () => {
    expect(getRole(null, "uid1")).toBeNull();
  });
});

describe("hasRole", () => {
  it("returns true if user has one of the given roles", () => {
    const baby = makeBaby({ u: "admin" });
    expect(hasRole(baby, "u", ["owner", "admin"])).toBe(true);
  });
  it("returns false if user does not have any of the given roles", () => {
    const baby = makeBaby({ u: "viewer" });
    expect(hasRole(baby, "u", ["owner", "admin"])).toBe(false);
  });
});

describe("can.writeEvents", () => {
  it("is true for owner", () => {
    expect(can.writeEvents(makeBaby({ u: "owner" }), "u")).toBe(true);
  });
  it("is true for admin", () => {
    expect(can.writeEvents(makeBaby({ u: "admin" }), "u")).toBe(true);
  });
  it("is true for parent", () => {
    expect(can.writeEvents(makeBaby({ u: "parent" }), "u")).toBe(true);
  });
  it("is false for viewer", () => {
    expect(can.writeEvents(makeBaby({ u: "viewer" }), "u")).toBe(false);
  });
  it("is false for pediatrician", () => {
    expect(can.writeEvents(makeBaby({ u: "pediatrician" }), "u")).toBe(false);
  });
});

describe("can.manageMembers", () => {
  it("is true for owner", () => {
    expect(can.manageMembers(makeBaby({ u: "owner" }), "u")).toBe(true);
  });
  it("is true for admin", () => {
    expect(can.manageMembers(makeBaby({ u: "admin" }), "u")).toBe(true);
  });
  it("is false for parent", () => {
    expect(can.manageMembers(makeBaby({ u: "parent" }), "u")).toBe(false);
  });
  it("is false for viewer", () => {
    expect(can.manageMembers(makeBaby({ u: "viewer" }), "u")).toBe(false);
  });
});

describe("can.changeRole", () => {
  it("owner can change parent role", () => {
    const baby = makeBaby({ owner: "owner", target: "parent" });
    expect(can.changeRole(baby, "owner", "target")).toBe(true);
  });
  it("owner cannot change themselves", () => {
    const baby = makeBaby({ owner: "owner" });
    expect(can.changeRole(baby, "owner", "owner")).toBe(false);
  });
  it("admin can change parent", () => {
    const baby = makeBaby({ admin: "admin", target: "parent" });
    expect(can.changeRole(baby, "admin", "target")).toBe(true);
  });
  it("admin cannot change owner", () => {
    const baby = makeBaby({ admin: "admin", owner: "owner" });
    expect(can.changeRole(baby, "admin", "owner")).toBe(false);
  });
  it("admin cannot change another admin", () => {
    const baby = makeBaby({ admin1: "admin", admin2: "admin" });
    expect(can.changeRole(baby, "admin1", "admin2")).toBe(false);
  });
  it("parent cannot change anyone", () => {
    const baby = makeBaby({ parent: "parent", viewer: "viewer" });
    expect(can.changeRole(baby, "parent", "viewer")).toBe(false);
  });
});
