import React, { useMemo } from "react";

import useDatasetSummary from "../hooks/useDatasetSummary";
import { fmtPct, safeText } from "../utils/format";
import type { PreprocessResponse, TrainResponse } from "../types/api";
import Alert from "./common/Alert";
import ProgressBar from "./common/ProgressBar";
import Spinner from "./common/Spinner";
import TrainedModelDetails from "./common/TrainedModelDetails";

type AsyncState = "idle" | "running" | "success" | "error";

type Props = {
  uploadId: string;
  preprocessInfo: PreprocessResponse;
  onBack: () => void;
  onNext: () => void;
  onStartTraining: () => void;
  trainingState: AsyncState;
  trainingError: string | null;
  trainingProgress: number;
  trainingProgressMessage?: string | null;
  trainInfo: TrainResponse | null;
};

function statusText(state: AsyncState, progress: number): string {
  if (state === "running") return `Training in progress (${Math.min(99, Math.max(0, Math.floor(progress)))}%)`;
  if (state === "success") return "Training complete!";
  if (state === "error") return "Training failed. Fix the issue and retry.";
  return "Ready to train the model.";
}

export default function ModelTraining({
  uploadId,
  preprocessInfo,
  onBack,
  onNext,
  onStartTraining,
  trainingState,
  trainingError,
  trainingProgress,
  trainingProgressMessage,
  trainInfo,
}: Props) {
  const featureCount = preprocessInfo.feature_columns?.length ?? 0;
  const target = preprocessInfo.target_column;
  const summaryUploadId = trainInfo?.model_id ? uploadId : null;
  const {
    data: datasetSummary,
    loading: loadingDatasetSummary,
    error: datasetSummaryError,
  } = useDatasetSummary(summaryUploadId);

  const canTrain = useMemo(() => {
    if (!uploadId || !target || featureCount <= 0) return false;
    return trainingState !== "running";
  }, [uploadId, target, featureCount, trainingState]);

  const canGoNext = useMemo(() => trainingState === "success" && !!trainInfo?.model_id, [trainInfo, trainingState]);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="section-header">
          <div>
            <h2 className="section-title">Model Training</h2>
            <p className="section-subtitle">
              Train the model and review evaluation metrics before moving to Predictions.
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              Upload ID: <span className="font-mono">{uploadId}</span>
            </div>
            <div>
              Target: <span className="font-semibold">{target}</span>
            </div>
            <div>
              Features: <span className="font-semibold">{featureCount}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="card card-ghost p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-200">
              Dataset
            </div>
            <div className="mt-2 text-lg font-bold text-zinc-900 dark:text-white">{featureCount} features</div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Target column: {target}</p>
          </div>
          <div className="card card-ghost p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-200">
              Status
            </div>
            <div className="mt-2 text-lg font-bold text-zinc-900 dark:text-white capitalize">{trainingState}</div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {trainingState === "running" ? "Hold tight, we are crunching numbers." : statusText(trainingState, trainingProgress)}
            </p>
          </div>
          <div className="card card-ghost p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-200">
              Model
            </div>
            <div className="mt-2 text-lg font-bold text-zinc-900 dark:text-white">
              {trainInfo?.model_id ? "XGBoost" : "Pending"}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {trainInfo?.model_id ? "Ready for predictions" : "Train to generate model"}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-primary-100/80 bg-gradient-to-r from-primary-50/70 to-white p-5 shadow-inner dark:border-primary-800/60 dark:from-primary-950/50 dark:to-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">Training Progress</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              {trainingState === "running" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" />
                  Running
                </span>
              ) : trainingState === "success" ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">Complete</span>
              ) : trainingState === "error" ? (
                <span className="font-semibold text-rose-600 dark:text-rose-300">Error</span>
              ) : (
                <span>Idle</span>
              )}
            </div>
          </div>

          <div className="mt-3">
            <ProgressBar value={trainingProgress} />
          </div>

          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {statusText(trainingState, trainingProgress)}
          </div>
          {trainingState === "running" && trainingProgress < 100 && trainingProgressMessage ? (
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {trainingProgressMessage}
              <span className="waiting-dots" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        {trainingError ? (
          <div className="mt-4">
            <Alert variant="error" title="Training error" message={trainingError} />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} disabled={trainingState === "running"} className="btn btn-ghost">
            Back
          </button>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onStartTraining} disabled={!canTrain} className="btn btn-primary">
              {trainingState === "running" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" />
                  Training...
                </span>
              ) : (
                "Train Model"
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext || trainingState === "running"}
              className="btn btn-secondary"
              title={!canGoNext ? "Train the model first" : "Go to Predict"}
            >
              Next: Predict
            </button>
          </div>
        </div>
      </div>

      <TrainedModelDetails
        title="Trained Model Details"
        trainInfo={trainInfo}
        loading={false}
        error={null}
        modelId={trainInfo?.model_id ?? null}
      />

      <div className="card p-5">
        <div className="section-header">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">Dataset Summary (LLM)</div>
              <span className="badge badge-info badge-animate">AI</span>
              {datasetSummary?.llm_model ? (
                <span className="badge badge-success badge-animate">{datasetSummary.llm_model}</span>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Generated from computed stats with deterministic fallbacks.
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              Upload ID: <span className="font-mono">{uploadId}</span>
            </div>
          </div>
        </div>

        {loadingDatasetSummary ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Spinner size="sm" />
            Loading dataset summary...
          </div>
        ) : null}

        {datasetSummaryError ? (
          <div className="mt-4">
            <Alert variant="warning" title="Dataset summary unavailable" message={datasetSummaryError} />
          </div>
        ) : null}

        {!loadingDatasetSummary && !datasetSummaryError && !datasetSummary ? (
          <div className="mt-4">
            <Alert
              variant="info"
              title="No dataset summary available"
              message="Train the model to generate the dataset summary. This section loads the saved summary from metadata."
            />
          </div>
        ) : null}

        {!loadingDatasetSummary && !datasetSummaryError && datasetSummary ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="card h-fit p-4">
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">Overview</div>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                {safeText(datasetSummary.summary)}
              </p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                {safeText(datasetSummary.explanation)}
              </p>
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Rows: {datasetSummary.stats.rows} · Cols: {datasetSummary.stats.cols} · Missing:{" "}
                {fmtPct(datasetSummary.stats.missing_pct)}
              </div>
              {datasetSummary.stats.class_balance?.length ? (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Class balance:{" "}
                  {datasetSummary.stats.class_balance
                    .map((c) => `${c.label} ${fmtPct(c.pct)}`)
                    .join(" · ")}
                </div>
              ) : null}
              {datasetSummary.stats.top_missing?.length ? (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Top missing:{" "}
                  {datasetSummary.stats.top_missing
                    .map((m) => `${m.column} ${fmtPct(m.null_pct)}`)
                    .join(" · ")}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="card h-fit p-4">
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">Patterns</div>
                {datasetSummary.patterns?.length ? (
                  <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {datasetSummary.patterns.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">No strong patterns detected.</div>
                )}
              </div>

              <div className="card h-fit p-4">
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">Risks & Limitations</div>
                {datasetSummary.risks?.length ? (
                  <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {datasetSummary.risks.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">No major risks flagged.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
