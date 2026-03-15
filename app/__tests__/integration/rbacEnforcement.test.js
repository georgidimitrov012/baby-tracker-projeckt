/**
 * RBAC Enforcement Tests
 * ──────────────────────────────────────────────────────────────────────────
 * Tests the permissions utility directly — no Firebase calls needed.
 */

import {
  ROLES,
  getRole,
  hasRole,
  can,
  INVITABLE_ROLES_OWNER,
  INVITABLE_ROLES_ADMIN,
} from "../../src/utils/permissions";

function babyWith(role) {
  return { members: { u: role } };
}

// ── ROLES constants ────────────────────────────────────────────────────────

describe("ROLES constants", () => {
  it("defines owner",        () => expect(ROLES.OWNER).toBe("owner"));
  it("defines admin",        () => expect(ROLES.ADMIN).toBe("admin"));
  it("defines parent",       () => expect(ROLES.PARENT).toBe("parent"));
  it("defines viewer",       () => expect(ROLES.VIEWER).toBe("viewer"));
  it("defines pediatrician", () => expect(ROLES.PEDIATRICIAN).toBe("pediatrician"));
});

// ── getRole ────────────────────────────────────────────────────────────────

describe("getRole", () => {
  const baby = { members: { uid1: "owner", uid2: "parent", uid3: "viewer" } };

  it("returns the correct role for a member", () => {
    expect(getRole(baby, "uid1")).toBe("owner");
    expect(getRole(baby, "uid2")).toBe("parent");
    expect(getRole(baby, "uid3")).toBe("viewer");
  });
  it("returns null for an unknown uid",  () => expect(getRole(baby, "nobody")).toBeNull());
  it("returns null when baby is null",   () => expect(getRole(null, "uid1")).toBeNull());
  it("returns null when uid is null",    () => expect(getRole(baby, null)).toBeNull());
  it("returns null when members is missing", () => expect(getRole({}, "uid1")).toBeNull());
});

// ── hasRole ────────────────────────────────────────────────────────────────

describe("hasRole", () => {
  const baby = { members: { uid1: "owner", uid2: "admin", uid3: "parent" } };

  it("returns true when user has one of the specified roles", () => {
    expect(hasRole(baby, "uid1", ["owner", "admin"])).toBe(true);
  });
  it("returns false when user does not have any of the specified roles", () => {
    expect(hasRole(baby, "uid3", ["owner", "admin"])).toBe(false);
  });
  it("returns false for unknown uid", () => {
    expect(hasRole(baby, "nobody", ["viewer"])).toBe(false);
  });
});

// ── can.writeEvents ────────────────────────────────────────────────────────

describe("can.writeEvents", () => {
  it("owner can write events",         () => expect(can.writeEvents(babyWith("owner"), "u")).toBe(true));
  it("admin can write events",         () => expect(can.writeEvents(babyWith("admin"), "u")).toBe(true));
  it("parent can write events",        () => expect(can.writeEvents(babyWith("parent"), "u")).toBe(true));
  it("viewer CANNOT write events",     () => expect(can.writeEvents(babyWith("viewer"), "u")).toBe(false));
  it("pediatrician CANNOT write events", () => expect(can.writeEvents(babyWith("pediatrician"), "u")).toBe(false));
  it("non-member CANNOT write events", () => expect(can.writeEvents(babyWith("owner"), "other")).toBe(false));
});

// ── can.editBaby ───────────────────────────────────────────────────────────

describe("can.editBaby", () => {
  it("owner can edit baby profile",    () => expect(can.editBaby(babyWith("owner"), "u")).toBe(true));
  it("admin can edit baby profile",    () => expect(can.editBaby(babyWith("admin"), "u")).toBe(true));
  it("parent CANNOT edit baby profile", () => expect(can.editBaby(babyWith("parent"), "u")).toBe(false));
  it("viewer CANNOT edit baby profile", () => expect(can.editBaby(babyWith("viewer"), "u")).toBe(false));
});

// ── can.deleteBaby ─────────────────────────────────────────────────────────

describe("can.deleteBaby", () => {
  it("owner can delete baby",         () => expect(can.deleteBaby(babyWith("owner"), "u")).toBe(true));
  it("admin CANNOT delete baby",      () => expect(can.deleteBaby(babyWith("admin"), "u")).toBe(false));
  it("parent CANNOT delete baby",     () => expect(can.deleteBaby(babyWith("parent"), "u")).toBe(false));
  it("viewer CANNOT delete baby",     () => expect(can.deleteBaby(babyWith("viewer"), "u")).toBe(false));
});

// ── can.manageMembers ──────────────────────────────────────────────────────

describe("can.manageMembers", () => {
  it("owner can manage members",       () => expect(can.manageMembers(babyWith("owner"), "u")).toBe(true));
  it("admin can manage members",       () => expect(can.manageMembers(babyWith("admin"), "u")).toBe(true));
  it("parent CANNOT manage members",   () => expect(can.manageMembers(babyWith("parent"), "u")).toBe(false));
  it("viewer CANNOT manage members",   () => expect(can.manageMembers(babyWith("viewer"), "u")).toBe(false));
});

// ── can.transferOwner ──────────────────────────────────────────────────────

describe("can.transferOwner", () => {
  it("owner can transfer ownership",   () => expect(can.transferOwner(babyWith("owner"), "u")).toBe(true));
  it("admin CANNOT transfer ownership", () => expect(can.transferOwner(babyWith("admin"), "u")).toBe(false));
  it("parent CANNOT transfer ownership", () => expect(can.transferOwner(babyWith("parent"), "u")).toBe(false));
});

// ── can.changeRole ─────────────────────────────────────────────────────────

describe("can.changeRole", () => {
  const baby = {
    members: {
      owner1: "owner",
      admin1: "admin",
      parent1: "parent",
      viewer1: "viewer",
    },
  };

  it("owner can change parent role",      () => expect(can.changeRole(baby, "owner1", "parent1")).toBe(true));
  it("owner can change admin role",       () => expect(can.changeRole(baby, "owner1", "admin1")).toBe(true));
  it("owner CANNOT change own role",      () => expect(can.changeRole(baby, "owner1", "owner1")).toBe(false));
  it("admin can change parent role",      () => expect(can.changeRole(baby, "admin1", "parent1")).toBe(true));
  it("admin can change viewer role",      () => expect(can.changeRole(baby, "admin1", "viewer1")).toBe(true));
  it("admin CANNOT change owner role",    () => expect(can.changeRole(baby, "admin1", "owner1")).toBe(false));
  it("admin CANNOT change own role",      () => expect(can.changeRole(baby, "admin1", "admin1")).toBe(false));
  it("parent CANNOT change any role",     () => expect(can.changeRole(baby, "parent1", "viewer1")).toBe(false));
});

// ── can.invitableRoles ─────────────────────────────────────────────────────

describe("can.invitableRoles", () => {
  it("owner can invite admin, parent, viewer, pediatrician", () => {
    const roles = can.invitableRoles(babyWith("owner"), "u");
    expect(roles).toEqual(INVITABLE_ROLES_OWNER);
    expect(roles).toContain("admin");
  });

  it("admin can invite parent, viewer, pediatrician — but NOT admin", () => {
    const roles = can.invitableRoles(babyWith("admin"), "u");
    expect(roles).toEqual(INVITABLE_ROLES_ADMIN);
    expect(roles).not.toContain("admin");
    expect(roles).not.toContain("owner");
  });

  it("parent gets empty invitable roles", () => {
    const roles = can.invitableRoles(babyWith("parent"), "u");
    expect(roles).toHaveLength(0);
  });

  it("viewer gets empty invitable roles", () => {
    const roles = can.invitableRoles(babyWith("viewer"), "u");
    expect(roles).toHaveLength(0);
  });
});
