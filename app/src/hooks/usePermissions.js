import { useAuth } from "../context/AuthContext";
import { useBaby } from "../context/BabyContext";
import { can, getRole, ROLE_LABELS } from "../utils/permissions";

/**
 * usePermissions — convenience hook for screens.
 *
 * Usage:
 *   const { canWriteEvents, canManageMembers, myRole } = usePermissions();
 *
 * This prevents screens from importing useBaby + useAuth + can.* separately.
 * Centralises the permission check and makes it trivially testable.
 */
export function usePermissions() {
  const { user }      = useAuth();
  const { activeBaby } = useBaby();

  if (!user || !activeBaby) {
    return {
      myRole:           null,
      myRoleLabel:      null,
      canWriteEvents:   false,
      canManageMembers: false,
      canEditBaby:      false,
      canDeleteBaby:    false,
      canTransferOwner: false,
    };
  }

  const myRole = getRole(activeBaby, user.uid);

  return {
    myRole,
    myRoleLabel:      ROLE_LABELS[myRole] ?? myRole,
    canWriteEvents:   can.writeEvents(activeBaby, user.uid),
    canManageMembers: can.manageMembers(activeBaby, user.uid),
    canEditBaby:      can.editBaby(activeBaby, user.uid),
    canDeleteBaby:    can.deleteBaby(activeBaby, user.uid),
    canTransferOwner: can.transferOwner(activeBaby, user.uid),
  };
}
