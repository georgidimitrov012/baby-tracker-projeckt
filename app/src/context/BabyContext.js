import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db }        from "../services/firebase";
import { useAuth }   from "./AuthContext";

/**
 * BabyContext
 *
 * IMPORTANT CHANGE FROM ORIGINAL:
 * We now use onSnapshot (realtime subscription) instead of getDocs (one-shot).
 *
 * WHY THIS MATTERS FOR SLEEP TIMER:
 * When Parent A starts a sleep session, Firestore updates
 * babies/{babyId}.activeSleepStart. Parent B (on a different device)
 * needs to see this change immediately — the live timer must start
 * on their screen without a manual refresh.
 *
 * onSnapshot fires automatically whenever the baby document changes,
 * so both parents always have the current activeSleepStart value.
 */

const BabyContext = createContext(null);

export function BabyProvider({ children }) {
  const { user }          = useAuth();

  const [babies, setBabies]           = useState([]);
  const [activeBabyId, setActiveBabyId] = useState(null);
  const [loadingBabies, setLoadingBabies] = useState(true);

  // Keep a ref to the unsubscribe function so we can clean up
  const unsubRef = useRef(null);

  useEffect(() => {
    // Clean up previous subscription
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!user) {
      setBabies([]);
      setActiveBabyId(null);
      setLoadingBabies(false);
      return;
    }

    setLoadingBabies(true);

    // Subscribe to all babies where this user is a member.
    // This query fires again whenever ANY of the matched baby documents
    // change — including activeSleepStart updates.
    const q = query(
      collection(db, "babies"),
      where(`members.${user.uid}`, "!=", null)
    );

    unsubRef.current = onSnapshot(
      q,
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => {
          const data = d.data();

          // Repair old boolean members map (pre-RBAC migration)
          const memberRole = data.members?.[user.uid];
          if (memberRole === true) {
            console.warn("[BabyContext] Found boolean member role, needs repair:", d.id);
          }

          return {
            id:        d.id,
            ...data,
            // Timestamps stay as Firestore Timestamp objects so
            // useSleepTimer can call .toDate() on activeSleepStart
            createdAt: data.createdAt ?? null,
            birthDate: data.birthDate ?? null,
          };
        });

        setBabies(loaded);

        // Auto-select first baby if none selected or previous selection gone
        setActiveBabyId((prev) => {
          const stillExists = loaded.some((b) => b.id === prev);
          if (stillExists) return prev;
          return loaded.length > 0 ? loaded[0].id : null;
        });

        setLoadingBabies(false);
      },
      (error) => {
        console.error("[BabyContext] loadBabies error:", error);
        setLoadingBabies(false);
      }
    );

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [user?.uid]);

  const activeBaby = babies.find((b) => b.id === activeBabyId) ?? null;

  // refreshBabies is a no-op now (onSnapshot handles updates automatically)
  // Kept for compatibility with InvitesScreen which calls it after accepting
  const refreshBabies = async () => {
    // onSnapshot will fire automatically — nothing to do here
    // Small delay so callers can await it without errors
    return new Promise((resolve) => setTimeout(resolve, 300));
  };

  return (
    <BabyContext.Provider
      value={{
        babies,
        activeBabyId,
        activeBaby,
        setActiveBabyId,
        loadingBabies,
        refreshBabies,
      }}
    >
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby() {
  const ctx = useContext(BabyContext);
  if (!ctx) throw new Error("useBaby must be used inside BabyProvider");
  return ctx;
}
