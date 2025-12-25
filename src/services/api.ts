import { http } from "./http";
import { apiUrl } from "../config/env";
import type {
  DatasetInfo,
  PreprocessRequest,
  PreprocessResponse,
  TrainRequest,
  TrainResponse,
  SchemaResponse,
  PredictRequest,
  PredictResponse,
  MessageResponse,
  DatasetSummaryResponse,
  TrainingSummaryResponse,
} from "../types/api";

/**
 * Note on "refresh" fallback for model details:
 * Your current backend APIs (as used earlier) include:
 *  - POST /models/train  -> returns TrainResponse with metrics + feature importance
 *  - GET  /models/schema/{model_id}
 *
 * Some backends also expose a "model details" endpoint. Since different project
 * versions may name it differently, we implement a safe multi-try strategy:
 *  1) GET /models/details/{model_id}
 *  2) GET /models/{model_id}
 *  3) GET /models/metadata/{model_id}
 *
 * The first endpoint that succeeds will be used.
 * If none exist, the caller will receive an error message.
 */

async function tryGetTrainResponse(path: string): Promise<TrainResponse> {
  return await http.request<TrainResponse>({
    method: "GET",
    path,
  });
}

const api = {
  // ---------- Datasets ----------
  async uploadDataset(file: File): Promise<DatasetInfo> {
    const form = new FormData();
    form.append("file", file);

    return await http.request<DatasetInfo>({
      method: "POST",
      path: "/datasets/upload",
      rawBody: true,
      body: form,
    });
  },

  async preprocessDataset(payload: PreprocessRequest): Promise<PreprocessResponse> {
    return await http.request<PreprocessResponse>({
      method: "POST",
      path: "/datasets/preprocess",
      body: payload,
    });
  },

  async getDatasetSummary(uploadId: string): Promise<DatasetSummaryResponse> {
    return await http.request<DatasetSummaryResponse>({
      method: "GET",
      path: `/datasets/summary/${encodeURIComponent(uploadId)}`,
    });
  },

  // ---------- Models ----------
  async trainModel(payload: TrainRequest): Promise<TrainResponse> {
    return await http.request<TrainResponse>({
      method: "POST",
      path: "/models/train",
      body: payload,
    });
  },

  async trainModelStream(
    payload: TrainRequest,
    onProgress?: (pct: number, message?: string) => void
  ): Promise<TrainResponse> {
    console.info("[train] starting stream", { upload_id: payload.upload_id });
    const res = await fetch(apiUrl("/models/train/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      console.error("[train] stream init failed", { status: res.status, body: txt });
      throw new Error(txt || "Failed to start training stream.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new Promise<TrainResponse>((resolve, reject) => {
      let settled = false;

      const safeResolve = (data: TrainResponse) => {
        if (settled) return;
        settled = true;
        resolve(data);
      };

      const safeReject = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      const pump = (): void => {
        reader
          .read()
          .then(({ value, done }) => {
            if (done) {
              safeReject(new Error("Training stream ended unexpectedly."));
              return;
            }

            buffer += decoder.decode(value, { stream: true });

            let idx = buffer.indexOf("\n\n");
            while (idx >= 0) {
              const raw = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 2);

              if (raw) {
                const lines = raw.split(/\r?\n/);
                let event = "message";
                const dataLines: string[] = [];

                for (const line of lines) {
                  if (line.startsWith("event:")) event = line.slice(6).trim();
                  else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
                }

                const dataStr = dataLines.join("\n");
                const data = dataStr ? JSON.parse(dataStr) : null;

                if (event === "progress" && data && typeof data.pct === "number") {
                  onProgress?.(data.pct, data.message);
                  console.debug("[train] progress", { pct: data.pct, message: data.message });
                } else if (event === "complete" && data) {
                  console.info("[train] stream complete");
                  safeResolve(data as TrainResponse);
                  return;
                } else if (event === "error" && data) {
                  console.error("[train] stream error", data);
                  safeReject(new Error(data.message || "Training failed."));
                  return;
                }
              }

              idx = buffer.indexOf("\n\n");
            }

            pump();
          })
          .catch((err) => safeReject(err));
      };

      pump();
    });
  },

  async getModelSchema(modelId: string): Promise<SchemaResponse> {
    return await http.request<SchemaResponse>({
      method: "GET",
      path: `/models/schema/${encodeURIComponent(modelId)}`,
    });
  },

  /**
   * Fetch model training details (metrics + feature importance) by model_id.
   * Used for Results-page refresh fallback when in-memory state is lost.
   */
  async getModelDetails(modelId: string): Promise<TrainResponse> {
    const id = encodeURIComponent(modelId);

    const candidates = [
      `/models/details/${id}`,
      `/models/${id}`,
      `/models/metadata/${id}`,
    ];

    let lastErr: any = null;

    for (const path of candidates) {
      try {
        return await tryGetTrainResponse(path);
      } catch (e: any) {
        lastErr = e;
        // Try next candidate
      }
    }

    const msg =
      lastErr?.message ||
      "Model details endpoint not available on backend. Add an endpoint like GET /models/details/{model_id}.";
    throw new Error(msg);
  },

  async getModelSummary(modelId: string): Promise<TrainingSummaryResponse> {
    return await http.request<TrainingSummaryResponse>({
      method: "GET",
      path: `/models/summary/${encodeURIComponent(modelId)}`,
    });
  },

  async predict(payload: PredictRequest): Promise<PredictResponse> {
    return await http.request<PredictResponse>({
      method: "POST",
      path: "/models/predict",
      body: payload,
    });
  },

  async predictStream(
    payload: PredictRequest,
    onProgress?: (pct: number, message?: string) => void
  ): Promise<PredictResponse> {
    console.info("[predict] starting stream", { model_id: payload.model_id });
    const res = await fetch(apiUrl("/models/predict/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      console.error("[predict] stream init failed", { status: res.status, body: txt });
      throw new Error(txt || "Failed to start prediction stream.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new Promise<PredictResponse>((resolve, reject) => {
      let settled = false;

      const safeResolve = (data: PredictResponse) => {
        if (settled) return;
        settled = true;
        resolve(data);
      };

      const safeReject = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      const pump = (): void => {
        reader
          .read()
          .then(({ value, done }) => {
            if (done) {
              safeReject(new Error("Prediction stream ended unexpectedly."));
              return;
            }

            buffer += decoder.decode(value, { stream: true });

            let idx = buffer.indexOf("\n\n");
            while (idx >= 0) {
              const raw = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 2);

              if (raw) {
                const lines = raw.split(/\r?\n/);
                let event = "message";
                const dataLines: string[] = [];

                for (const line of lines) {
                  if (line.startsWith("event:")) event = line.slice(6).trim();
                  else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
                }

                const dataStr = dataLines.join("\n");
                const data = dataStr ? JSON.parse(dataStr) : null;

                if (event === "progress" && data && typeof data.pct === "number") {
                  onProgress?.(data.pct, data.message);
                  console.debug("[predict] progress", { pct: data.pct, message: data.message });
                } else if (event === "complete" && data) {
                  console.info("[predict] stream complete");
                  safeResolve(data as PredictResponse);
                  return;
                } else if (event === "error" && data) {
                  console.error("[predict] stream error", data);
                  safeReject(new Error(data.message || "Prediction failed."));
                  return;
                }
              }

              idx = buffer.indexOf("\n\n");
            }

            pump();
          })
          .catch((err) => safeReject(err));
      };

      pump();
    });
  },

  // ---------- Admin ----------
  async resetRuntimeState(includeModels: boolean): Promise<MessageResponse> {
    return await http.request<MessageResponse>({
      method: "POST",
      path: "/admin/reset",
      query: { include_models: includeModels ? "true" : "false" },
    });
  },

  // ---------- Root/Health ----------
  async health(): Promise<{ status: "ok"; environment: string; version: string }> {
    return await http.request<{ status: "ok"; environment: string; version: string }>({
      method: "GET",
      path: "/health",
    });
  },
};

export default api;
