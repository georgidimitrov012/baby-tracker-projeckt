import React, { createContext, useContext, useState } from "react";

/**
 * BabyContext holds the currently active baby ID.
 *
 * Defaults to "default" — works as a single-baby app with no auth.
 *
 * To add auth later:
 *   - Replace "default" with the baby's real Firestore document ID
 *   - Add a baby selector that calls setActiveBabyId
 *   - Zero changes needed in any screen or service file
 */
const BabyContext = createContext(null);

export function BabyProvider({ children }) {
  const [activeBabyId, setActiveBabyId] = useState("default");

  return (
    <BabyContext.Provider value={{ activeBabyId, setActiveBabyId }}>
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby() {
  const ctx = useContext(BabyContext);
  if (!ctx) throw new Error("useBaby must be used inside <BabyProvider>");
  return ctx;
}
