import React, { useMemo } from "react";

import { fmtPct } from "../../utils/format";
import type { FeatureImportance, TrainResponse } from "../../types/api";
import Alert from "./Alert";
import FeatureImportanceList from "./FeatureImportanceList";
import MetricCard from "./MetricCard";
import Spinner from "./Spinner";

type Props = {
  title?: string;
  trainInfo: TrainResponse | null;
  loading?: boolean;
  error?: string | null;
  modelId?: string | null;
  maxFeatures?: number;
};

function normalizeImportance(list: FeatureImportance[]): FeatureImportance[] {
  const cleaned = (list ?? []).filter((x) => Number.isFinite(x.importance) && x.importance >= 0);
  const sum = cleaned.reduce((acc, x) => acc + x.importance, 0);
  if (!cleaned.length || sum <= 0) return [];

  return cleaned
    .map((x) => ({
      feature: x.feature,
      importance: (x.importance / sum) * 100,
    }))
    .sort((a, b) => b.importance - a.importance);
}

export default function TrainedModelDetails({
  title = "Trained Model Details",
  trainInfo,
  loading = false,
  error = null,
  modelId = null,
  maxFeatures = 10,
}: Props) {
  const metrics = trainInfo?.metrics ?? null;

  const importancePct = useMemo(() => normalizeImportance(trainInfo?.feature_importance ?? []), [trainInfo]);
  const top = useMemo(() => importancePct.slice(0, maxFeatures), [importancePct, maxFeatures]);
  const topFeature = top[0];
  const bestMetric = useMemo(() => {
    if (!metrics) return null;
    return [
      { label: "Accuracy", value: metrics.accuracy?.value ?? 0 },
      { label: "Precision", value: metrics.precision?.value ?? 0 },
      { label: "Recall", value: metrics.recall?.value ?? 0 },
      { label: "F1", value: metrics.f1?.value ?? 0 },
    ].sort((a, b) => b.value - a.value)[0];
  }, [metrics]);

  const hasMetrics = !!metrics;
  const hasTrainInfo = !!trainInfo;

  return (
    <div className="card p-5">
      <div className="section-header">
        <div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Accuracy, Precision, Recall, F1 Score, and Top Feature Importance.
          </div>
        </div>

        <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            Model ID: <span className="font-mono">{trainInfo?.model_id ?? modelId ?? "-"}</span>
          </div>
          {trainInfo?.model_name ? (
            <div>
              Model: <span className="font-semibold">{trainInfo.model_name}</span>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Spinner size="sm" />
          Loading model details...
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <Alert variant="error" title="Unable to load model details" message={error} />
        </div>
      ) : null}

      {!loading && !error && !hasTrainInfo ? (
        <div className="mt-4">
          <Alert
            variant="info"
            title="No model details available"
            message="Train the model to see evaluation metrics and feature importance. If you refreshed, ensure the backend provides a model-details endpoint."
          />
        </div>
      ) : null}

      {!loading && !error && hasTrainInfo && !hasMetrics ? (
        <div className="mt-4">
          <Alert variant="info" title="Metrics not available" message="This model run did not include metrics output." />
        </div>
      ) : null}

      {!loading && !error && hasMetrics ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Accuracy"
              value={metrics?.accuracy?.display ?? fmtPct(metrics?.accuracy?.value ?? 0)}
              hint="Overall correct predictions"
            />
            <MetricCard
              label="Precision"
              value={metrics?.precision?.display ?? fmtPct(metrics?.precision?.value ?? 0)}
              hint="How many predicted churn are truly churn"
            />
            <MetricCard
              label="Recall"
              value={metrics?.recall?.display ?? fmtPct(metrics?.recall?.value ?? 0)}
              hint="How many actual churn were found"
            />
            <MetricCard
              label="F1 Score"
              value={metrics?.f1?.display ?? fmtPct(metrics?.f1?.value ?? 0)}
              hint="Balance of precision & recall"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="card h-fit p-4">
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">Model Summary</div>
                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <div className="flex flex-col gap-1">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Model ID:</span>{" "}
                      <span className="font-mono">{trainInfo?.model_id}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Model:</span>{" "}
                      <span className="font-medium">{trainInfo?.model_name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Target:</span>{" "}
                      <span className="font-medium">{trainInfo?.target_column}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Features:</span>{" "}
                      <span className="font-medium">{trainInfo?.feature_columns?.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                {trainInfo?.notes?.length ? (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Notes</div>
                    <ul className="mt-1 space-y-1 list-disc pl-5 text-xs text-zinc-600 dark:text-zinc-400">
                      {trainInfo.notes.map((n, idx) => (
                        <li key={idx}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

            </div>

            <div className="card p-4">
              <div className="section-header">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">Top Feature Importance</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Ranked features with relative contribution (%).
                  </div>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Showing top {Math.min(maxFeatures, top.length)}
                </div>
              </div>

              <div className="mt-3">
                {top.length === 0 ? (
                  <Alert
                    variant="warning"
                    title="Feature importance not available"
                    message="This model run did not return usable feature importance values."
                  />
                ) : (
                  <FeatureImportanceList items={top} maxItems={maxFeatures} />
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
