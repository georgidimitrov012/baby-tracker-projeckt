import { useState, useEffect } from "react";
import { subscribeToEvents } from "../services/eventStore";

export function useEvents(babyId) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!babyId) { setLoading(false); return; }
    setLoading(true);
    const unsubscribe = subscribeToEvents(
      babyId,
      (data) => { setEvents(data); setLoading(false); setError(null); },
      (err)  => { setError(err);   setLoading(false); }
    );
    return () => unsubscribe();
  }, [babyId]);

  return { events, loading, error };
}
