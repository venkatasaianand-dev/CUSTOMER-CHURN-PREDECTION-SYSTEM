import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import type { DatasetSummaryResponse } from "../types/api";

type State = {
  data: DatasetSummaryResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export default function useDatasetSummary(uploadId: string | null): State {
  const [data, setData] = useState<DatasetSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDatasetSummary(id);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load dataset summary.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!uploadId) return;
    await fetchSummary(uploadId);
  }, [fetchSummary, uploadId]);

  useEffect(() => {
    if (!uploadId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    fetchSummary(uploadId);
  }, [fetchSummary, uploadId]);

  return { data, loading, error, refresh };
}
