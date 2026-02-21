import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { getBabiesForUser, createBaby } from "../services/babyService";
import { useAuth } from "./AuthContext";

/**
 * BabyContext manages:
 *   - The list of babies belonging to the current user
 *   - Which baby is currently active (being tracked)
 *
 * When the user logs in, their babies are loaded from Firestore.
 * When they log out (user becomes null), everything resets.
 *
 * Multi-baby: user switches active baby via setActiveBabyId.
 * All screens read activeBabyId from this context — zero changes needed there.
 */
const BabyContext = createContext(null);

export function BabyProvider({ children }) {
  const { user } = useAuth();

  const [babies, setBabies]           = useState([]);
  const [activeBabyId, setActiveBabyId] = useState(null);
  const [loadingBabies, setLoadingBabies] = useState(false);

  // Reload babies whenever the user changes (login / logout)
  const loadBabies = useCallback(async () => {
    if (!user) {
      setBabies([]);
      setActiveBabyId(null);
      return;
    }

    setLoadingBabies(true);
    try {
      const result = await getBabiesForUser(user.uid);
      setBabies(result);

      // Auto-select the first baby, or keep existing selection if still valid
      if (result.length > 0) {
        setActiveBabyId((prev) => {
          const stillValid = result.some((b) => b.id === prev);
          return stillValid ? prev : result[0].id;
        });
      } else {
        setActiveBabyId(null);
      }
    } catch (err) {
      console.error("[BabyContext] loadBabies error:", err);
    } finally {
      setLoadingBabies(false);
    }
  }, [user]);

  useEffect(() => {
    loadBabies();
  }, [loadBabies]);

  /**
   * Create a new baby and add it to the list.
   * After creation, switch to the new baby automatically.
   */
  const addBaby = useCallback(async (name, birthDate = null) => {
    if (!user) return;
    const newId = await createBaby(user.uid, name, birthDate);
    await loadBabies(); // refresh the list
    setActiveBabyId(newId);
    return newId;
  }, [user, loadBabies]);

  const activeBaby = babies.find((b) => b.id === activeBabyId) ?? null;

  return (
    <BabyContext.Provider value={{
      babies,
      activeBabyId,
      activeBaby,
      setActiveBabyId,
      addBaby,
      loadingBabies,
      refreshBabies: loadBabies,
    }}>
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby() {
  const ctx = useContext(BabyContext);
  if (!ctx) throw new Error("useBaby must be used inside <BabyProvider>");
  return ctx;
}
