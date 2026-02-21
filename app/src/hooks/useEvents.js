import { useState, useEffect } from "react";
import { subscribeToEvents } from "../services/eventStore";

/**
 * Owns the Firestore subscription lifecycle for a baby's events.
 * Automatically unsubscribes on unmount or when babyId changes.
 *
 * @param {string} babyId
 * @returns {{ events: Array, loading: boolean, error: Error|null }}
 */
export function useEvents(babyId) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!babyId) return;

    setLoading(true);

    const unsubscribe = subscribeToEvents(
      babyId,
      (data) => {
        setEvents(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [babyId]);

  return { events, loading, error };
}
