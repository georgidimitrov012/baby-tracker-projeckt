import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuthState } from "../services/authService";

/**
 * AuthContext provides the current Firebase user to the entire app.
 *
 * Three states exist:
 *   loading: true    → onAuthStateChanged hasn't fired yet (show splash)
 *   user: null       → no session → show AuthNavigator (Login/Register)
 *   user: object     → valid session → show AppNavigator
 *
 * Firebase Auth persists sessions automatically across app restarts.
 * onAuthStateChanged fires immediately on mount with the cached user
 * (if any), which is how auto-login works — no extra code needed.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe immediately. Firebase fires with the cached user (if any)
    // within milliseconds, before any network call. This is the auth check.
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
