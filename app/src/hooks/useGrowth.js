import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToWeightLogs,
  addWeightLog,
  deleteWeightLog,
} from "../services/growthService";

export function useGrowth(babyId) {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!babyId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToWeightLogs(
      babyId,
      (data) => {
        setLogs(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [babyId]);

  const addLog = async (weight, date, notes) => {
    await addWeightLog(babyId, user.uid, weight, date, notes);
  };

  const removeLog = async (logId) => {
    await deleteWeightLog(babyId, logId);
  };

  return { logs, loading, error, addLog, removeLog };
}
