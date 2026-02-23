/**
 * RBAC PERMISSION SYSTEM
 * ─────────────────────────────────────────────────────────────────
 *
 * ROLE HIERARCHY (highest to lowest):
 *   owner > admin > parent > viewer > pediatrician
 *
 * Roles are stored as strings in babies/{babyId}.members map:
 *   members: { [userId]: "owner" | "admin" | "parent" | "viewer" | "pediatrician" }
 *
 * WHY STRINGS, NOT PERMISSION OBJECTS?
 *   Firestore security rules can compare strings natively.
 *   Permission objects would require Cloud Functions to evaluate.
 *   Strings keep rules readable and auditable.
 *
 * WHY NOT CUSTOM CLAIMS?
 *   Custom claims are ideal for app-wide roles (e.g. "isAdmin").
 *   For per-baby roles, you'd need claims like { babies: { babyId: "owner" } }
 *   which hits the 1000-byte claim limit quickly with many babies.
 *   Firestore membership is the correct solution for per-resource roles.
 *
 * WHY IS PEDIATRICIAN A SEPARATE ROLE (not just "viewer")?
 *   In future, pediatricians may get access to aggregated stats endpoints,
 *   export features, or analytics dashboards that viewers don't see.
 *   Keeping them distinct now means zero schema changes later.
 *   Security rules can also audit pediatrician reads separately.
 *
 * ─────────────────────────────────────────────────────────────────
 * PERMISSION MATRIX
 * ─────────────────────────────────────────────────────────────────
 *
 *  Action                    │ owner │ admin │ parent │ viewer │ pediatrician
 * ───────────────────────────┼───────┼───────┼────────┼────────┼─────────────
 *  Read events               │  ✓    │  ✓    │  ✓     │  ✓     │  ✓
 *  Create events             │  ✓    │  ✓    │  ✓     │  ✗     │  ✗
 *  Edit events               │  ✓    │  ✓    │  ✓     │  ✗     │  ✗
 *  Delete events             │  ✓    │  ✓    │  ✓     │  ✗     │  ✗
 *  View analytics            │  ✓    │  ✓    │  ✓     │  ✓     │  ✓
 *  Update baby profile       │  ✓    │  ✓    │  ✗     │  ✗     │  ✗
 *  Delete baby               │  ✓    │  ✗    │  ✗     │  ✗     │  ✗
 *  Invite members            │  ✓    │  ✓    │  ✗     │  ✗     │  ✗
 *  Change member roles       │  ✓    │  ✓*   │  ✗     │  ✗     │  ✗
 *  Remove members            │  ✓    │  ✓*   │  ✗     │  ✗     │  ✗
 *  Transfer ownership        │  ✓    │  ✗    │  ✗     │  ✗     │  ✗
 *
 *  * admin cannot touch owner accounts or create new owners
 */

// All valid roles in the system
export const ROLES = {
  OWNER:         "owner",
  ADMIN:         "admin",
  PARENT:        "parent",
  VIEWER:        "viewer",
  PEDIATRICIAN:  "pediatrician",
};

// Roles that can write events
export const EVENT_WRITE_ROLES = [ROLES.OWNER, ROLES.ADMIN, ROLES.PARENT];

// Roles that can manage members (invite, change role, remove)
export const MEMBER_MANAGE_ROLES = [ROLES.OWNER, ROLES.ADMIN];

// Roles that can update the baby profile document
export const BABY_EDIT_ROLES = [ROLES.OWNER, ROLES.ADMIN];

// Human-readable labels for the UI
export const ROLE_LABELS = {
  [ROLES.OWNER]:        "Owner",
  [ROLES.ADMIN]:        "Admin",
  [ROLES.PARENT]:       "Parent",
  [ROLES.VIEWER]:       "Viewer",
  [ROLES.PEDIATRICIAN]: "Pediatrician",
};

// Descriptions shown in the invite role picker
export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]:        "Full access except deleting the baby",
  [ROLES.PARENT]:       "Can add, edit, and delete events",
  [ROLES.VIEWER]:       "Can view events and history, read-only",
  [ROLES.PEDIATRICIAN]: "Read-only access to events and analytics",
};

// Roles an owner can assign when inviting
export const INVITABLE_ROLES_OWNER = [
  ROLES.ADMIN,
  ROLES.PARENT,
  ROLES.VIEWER,
  ROLES.PEDIATRICIAN,
];

// Roles an admin can assign when inviting (cannot create owners or other admins)
export const INVITABLE_ROLES_ADMIN = [
  ROLES.PARENT,
  ROLES.VIEWER,
  ROLES.PEDIATRICIAN,
];

/**
 * Get the current user's role for a specific baby.
 *
 * @param {object} baby  - baby document from BabyContext (includes members map)
 * @param {string} uid   - current user's uid
 * @returns {string|null} role or null if not a member
 */
export function getRole(baby, uid) {
  return baby?.members?.[uid] ?? null;
}

/**
 * Check if a user has one of the specified roles for a baby.
 *
 * @param {object} baby
 * @param {string} uid
 * @param {string[]} roles
 * @returns {boolean}
 */
export function hasRole(baby, uid, roles) {
  return roles.includes(getRole(baby, uid));
}

// Convenience permission checks — use these in screens, not raw role strings

export const can = {
  writeEvents:    (baby, uid) => hasRole(baby, uid, EVENT_WRITE_ROLES),
  manageMembers:  (baby, uid) => hasRole(baby, uid, MEMBER_MANAGE_ROLES),
  editBaby:       (baby, uid) => hasRole(baby, uid, BABY_EDIT_ROLES),
  deleteBaby:     (baby, uid) => getRole(baby, uid) === ROLES.OWNER,
  transferOwner:  (baby, uid) => getRole(baby, uid) === ROLES.OWNER,

  /**
   * Can the actor change the target's role?
   * Owner can change anyone except themselves (use transferOwner for that).
   * Admin can change parent/viewer/pediatrician only.
   */
  changeRole: (baby, actorUid, targetUid) => {
    const actorRole  = getRole(baby, actorUid);
    const targetRole = getRole(baby, targetUid);
    if (actorRole === ROLES.OWNER) return targetUid !== actorUid;
    if (actorRole === ROLES.ADMIN) {
      return targetRole !== ROLES.OWNER && targetRole !== ROLES.ADMIN && targetUid !== actorUid;
    }
    return false;
  },

  /**
   * Can the actor remove the target?
   * Same rules as changeRole.
   */
  removeMember: (baby, actorUid, targetUid) => {
    return can.changeRole(baby, actorUid, targetUid);
  },

  /**
   * Which roles can the actor assign when inviting?
   */
  invitableRoles: (baby, uid) => {
    const role = getRole(baby, uid);
    if (role === ROLES.OWNER) return INVITABLE_ROLES_OWNER;
    if (role === ROLES.ADMIN) return INVITABLE_ROLES_ADMIN;
    return [];
  },
};
