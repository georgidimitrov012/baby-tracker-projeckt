import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToMilestones,
  addMilestone,
  deleteMilestone,
} from "../services/milestoneService";

export function useMilestones(babyId) {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!babyId) {
      setMilestones([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToMilestones(
      babyId,
      (data) => {
        setMilestones(data);
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

  const addItem = async (title, date, category, notes) => {
    await addMilestone(babyId, user.uid, title, date, category, notes);
  };

  const removeItem = async (milestoneId) => {
    await deleteMilestone(babyId, milestoneId);
  };

  return { milestones, loading, error, addItem, removeItem };
}
