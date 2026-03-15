import { useState, useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Resolves an array of user UIDs to display names.
 * Results are cached within the hook lifetime.
 */
export function useUserDisplayNames(uids) {
  const [nameMap, setNameMap] = useState({});
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef({});

  useEffect(() => {
    if (!uids || uids.length === 0) return;

    const missing = uids.filter((uid) => uid && !(uid in cacheRef.current));
    if (missing.length === 0) return;

    setLoading(true);

    Promise.all(
      missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          const name = snap.data()?.displayName ?? uid.slice(0, 8);
          cacheRef.current[uid] = name;
          return [uid, name];
        } catch {
          cacheRef.current[uid] = uid.slice(0, 8);
          return [uid, uid.slice(0, 8)];
        }
      })
    ).then((pairs) => {
      const newEntries = Object.fromEntries(pairs);
      setNameMap((prev) => ({ ...prev, ...cacheRef.current }));
      setLoading(false);
    });
  }, [uids?.join(",")]);

  return { nameMap, loading };
}
