import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import type { TrainResponse } from "../types/api";

type State = {
  data: TrainResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function cacheKey(modelId: string) {
  return `model_details_${modelId}`;
}

function tryReadCached(modelId: string): TrainResponse | null {
  const raw = safeGet(cacheKey(modelId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Minimal shape check
    if (parsed && typeof parsed === "object" && typeof parsed.model_id === "string") {
      return parsed as TrainResponse;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCached(modelId: string, data: TrainResponse) {
  safeSet(cacheKey(modelId), JSON.stringify(data));
}

/**
 * useModelDetails
 * - Prefer in-memory TrainResponse passed as `initial`
 * - If missing (e.g., refresh), fetch by modelId from backend
 * - Cache the fetched TrainResponse in localStorage to avoid repeated fetches
 */
export default function useModelDetails(modelId: string | null, initial?: TrainResponse | null): State {
  const [data, setData] = useState<TrainResponse | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveModelId = useMemo(() => {
    return (initial?.model_id || modelId || null) as string | null;
  }, [initial?.model_id, modelId]);

  const fetchDetails = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getModelDetails(id);
        setData(res);
        writeCached(id, res);
      } catch (e: any) {
        const msg = e?.message || "Failed to fetch model details.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!effectiveModelId) return;
    await fetchDetails(effectiveModelId);
  }, [effectiveModelId, fetchDetails]);

  // Keep data synced with initial when provided
  useEffect(() => {
    if (initial) {
      setData(initial);
      setError(null);
      setLoading(false);
      // cache it for refresh cases
      writeCached(initial.model_id, initial);
    }
  }, [initial]);

  // On mount / when model id changes: if we don't have initial, try cache then fetch
  useEffect(() => {
    if (!effectiveModelId) return;

    // If initial exists, no need to fetch
    if (initial?.model_id === effectiveModelId) return;

    // If we already have matching data, don't refetch
    if (data?.model_id === effectiveModelId) return;

    // Try cache first
    const cached = tryReadCached(effectiveModelId);
    if (cached) {
      setData(cached);
      // still do a background refresh? For now, no (keeps it fast/deterministic)
      return;
    }

    // Otherwise fetch
    fetchDetails(effectiveModelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveModelId]);

  return { data, loading, error, refresh };
}
