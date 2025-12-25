import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import type { TrainingSummaryResponse } from "../types/api";

type State = {
  data: TrainingSummaryResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export default function useModelSummary(modelId: string | null): State {
  const [data, setData] = useState<TrainingSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getModelSummary(id);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load model summary.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!modelId) return;
    await fetchSummary(modelId);
  }, [fetchSummary, modelId]);

  useEffect(() => {
    if (!modelId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    fetchSummary(modelId);
  }, [fetchSummary, modelId]);

  return { data, loading, error, refresh };
}
