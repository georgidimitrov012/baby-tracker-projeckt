import { useState, useEffect, useRef } from "react";
import { useBaby }          from "../context/BabyContext";
import { useAuth }          from "../context/AuthContext";
import { usePermissions }   from "./usePermissions";
import { startSleep, stopSleep } from "../services/sleepService";
import { showAlert }        from "../utils/platform";

/**
 * useSleepTimer
 *
 * Drives the live sleep timer UI across all screens.
 * Reads activeSleepStart from the baby doc (via BabyContext onSnapshot),
 * so both parents see the same timer in realtime automatically.
 *
 * Returns:
 *   isActive        {boolean}  - true when a sleep session is running
 *   elapsedSeconds  {number}   - seconds since sleep started
 *   startedAt       {Date|null}- when sleep started (for display)
 *   starting        {boolean}  - true while start write is in flight
 *   stopping        {boolean}  - true while stop write is in flight
 *   handleStart     {function}
 *   handleStop      {function}
 */
export function useSleepTimer() {
  const { user }                                  = useAuth();
  const { activeBaby, activeBabyId }              = useBaby();
  const { canWriteEvents }                        = usePermissions();

  const [elapsedSeconds, setElapsedSeconds]       = useState(0);
  const [starting, setStarting]                   = useState(false);
  const [stopping, setStopping]                   = useState(false);
  const intervalRef                               = useRef(null);
  const isSubmitting                              = useRef(false);

  // activeSleepStart comes from Firestore via BabyContext onSnapshot.
  // It is a Firestore Timestamp — convert to JS Date.
  const rawStart    = activeBaby?.activeSleepStart;
  const startedAt   = rawStart?.toDate ? rawStart.toDate() : null;
  const isActive    = !!startedAt;

  // Tick every second while a session is active
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!isActive) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    };
    tick(); // immediate first tick
    intervalRef.current = setInterval(tick, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isActive, startedAt?.getTime()]);

  const handleStart = async () => {
    if (isSubmitting.current || !canWriteEvents) return;
    if (!activeBabyId) {
      showAlert("No baby selected", "Please select a baby first.");
      return;
    }
    isSubmitting.current = true;
    setStarting(true);
    try {
      await startSleep(activeBabyId, user.uid);
      // BabyContext onSnapshot will update activeSleepStart automatically
    } catch (e) {
      console.error("[useSleepTimer] start error:", e);
      showAlert("Error", "Could not start sleep timer. Please try again.");
    } finally {
      isSubmitting.current = false;
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (isSubmitting.current || !startedAt || !canWriteEvents) return;
    isSubmitting.current = true;
    setStopping(true);
    try {
      await stopSleep(activeBabyId, user.uid, startedAt);
      // BabyContext onSnapshot will clear activeSleepStart automatically
    } catch (e) {
      console.error("[useSleepTimer] stop error:", e);
      showAlert("Error", "Could not stop sleep timer. Please try again.");
    } finally {
      isSubmitting.current = false;
      setStopping(false);
    }
  };

  return {
    isActive,
    elapsedSeconds,
    startedAt,
    starting,
    stopping,
    handleStart,
    handleStop,
  };
}

/**
 * Format elapsed seconds as HH:MM:SS or MM:SS
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
