import { useState, useEffect } from "react";
import { loadGameData } from "../services/dataLoader";

export function useGameData<T>(gameId: string | undefined, dataset: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
       setLoading(false);
       return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    loadGameData<T>(gameId, dataset)
      .then((jsonData) => {
        if (isMounted) {
          setData(jsonData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load data");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [gameId, dataset]);

  return { data, loading, error };
}
