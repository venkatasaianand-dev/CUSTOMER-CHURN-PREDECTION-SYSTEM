import React, { useEffect, useMemo } from "react";

import useDatasetSummary from "../hooks/useDatasetSummary";
import useModelDetails from "../hooks/useModelDetails";
import { fmtPct, fmtProb, safeText } from "../utils/format";
import type { PredictResponse, TrainResponse } from "../types/api";
import Alert from "./common/Alert";
import MetricCard from "./common/MetricCard";
import TrainedModelDetails from "./common/TrainedModelDetails";

type Props = {
  result: PredictResponse;
  trainingInfo: TrainResponse | null;
  uploadId: string | null;
  onBack: () => void;
  onNewPrediction: () => void;
};

function Badge({ text, tone }: { text: string; tone: "low" | "medium" | "high" }) {
  const cls =
    tone === "high"
      ? "badge badge-danger badge-animate"
      : tone === "medium"
        ? "badge badge-info badge-animate"
        : "badge badge-success badge-animate";
  return <span className={cls}>{text}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function PredictionResults({ result, trainingInfo, uploadId, onBack, onNewPrediction }: Props) {
  const tone = useMemo(() => {
    if (result.risk_level === "High") return "high";
    if (result.risk_level === "Medium") return "medium";
    return "low";
  }, [result.risk_level]);

  const churnText = result.prediction === 1 ? "Churn" : "No Churn";
  const churnTextClass =
    tone === "high"
      ? "text-2xl font-bold text-red-600 dark:text-red-300"
      : tone === "medium"
        ? "text-2xl font-bold text-indigo-700 dark:text-indigo-300"
        : "text-2xl font-bold text-emerald-700 dark:text-emerald-300";

  useEffect(() => {
    if (result?.model_id) {
      try {
        localStorage.setItem("last_model_id", result.model_id);
      } catch {
        // ignore storage failures
      }
    }
  }, [result?.model_id]);

  const modelIdFromStorage = useMemo(() => {
    try {
      return localStorage.getItem("last_model_id");
    } catch {
      return null;
    }
  }, []);

  const effectiveModelId = useMemo(() => {
    return trainingInfo?.model_id || result?.model_id || modelIdFromStorage || null;
  }, [trainingInfo?.model_id, result?.model_id, modelIdFromStorage]);

  const {
    data: fetchedTrainInfo,
    loading: loadingModelDetails,
    error: modelDetailsError,
  } = useModelDetails(effectiveModelId, trainingInfo);

  const trainDetailsToShow = trainingInfo ?? fetchedTrainInfo;

  const topActions = useMemo(() => {
    const list = result.recommended_actions ?? [];
    return list.slice().sort((a, b) => b.priority - a.priority);
  }, [result.recommended_actions]);

  const factors = useMemo(() => {
    const list = result.explanation?.key_factors ?? [];
    return list
      .slice()
      .sort((a, b) => {
        const av = Math.abs(a.contribution ?? 0);
        const bv = Math.abs(b.contribution ?? 0);
        return bv - av;
      });
  }, [result.explanation?.key_factors]);

  const {
    data: datasetSummary,
    loading: loadingDatasetSummary,
    error: datasetSummaryError,
  } = useDatasetSummary(uploadId);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="section-header">
          <div>
            <h2 className="section-title">Prediction Results</h2>
            <p className="section-subtitle">Short, factual outputs grounded in computed model stats.</p>
          </div>

          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              Model ID: <span className="font-mono">{result.model_id}</span>
            </div>
            {trainingInfo?.model_name ? (
              <div>
                Model: <span className="font-semibold">{trainingInfo.model_name}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricCard
            label="Predicted Class"
            value={churnText}
            hint="Binary classification output"
            valueClassName={churnTextClass}
            right={<Badge text={result.risk_level} tone={tone} />}
          />
          <MetricCard
            label="Probability (Churn=1)"
            value={fmtProb(result.probability)}
            hint={`Confidence: ${fmtPct(result.probability)}`}
          />
          <MetricCard
            label="Risk Rule"
            value={
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-success">Low</span>
                <span className="badge badge-info">Medium</span>
                <span className="badge badge-danger">High</span>
              </div>
            }
            valueClassName="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            hint="Low <0.33 | Medium 0.33-0.66 | High >0.66"
          />
        </div>

        <div className="mt-5">
          <Alert
            variant="info"
            title="Explanation"
            message={safeText(result.explanation?.summary, "No explanation available.")}
            badges={[
              { label: "AI", tone: "info" },
              ...(result.explanation?.llm_model
                ? [{ label: result.explanation.llm_model, tone: "success" as const }]
                : []),
            ]}
          />
          {result.explanation?.confidence_note ? (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{result.explanation.confidence_note}</div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="btn btn-ghost">
            Back to Predict
          </button>
          <button type="button" onClick={onNewPrediction} className="btn btn-primary">
            New Prediction
          </button>
        </div>
      </div>

      <Card title="Recommended Actions">
        {topActions.length > 0 ? (
          <div className="space-y-3">
            {topActions.map((a, idx) => (
              <div key={idx} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">{a.action}</div>
                  <span className="chip">Priority {a.priority}</span>
                </div>
                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{a.reason}</div>
                {a.expected_impact ? (
                  <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Expected impact: {a.expected_impact}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Alert variant="warning" title="No actions returned" message="The backend did not return recommended actions for this prediction." />
        )}
      </Card>

      <Card title="Key Factors (if available)">
        {factors.length > 0 ? (
          <div className="space-y-2">
            {factors.map((f, idx) => (
              <div key={idx} className="card p-3">
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">{f.feature}</div>
                {f.direction || Number.isFinite(f.contribution ?? NaN) ? (
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {f.direction ? f.direction : "contribution"}
                    {Number.isFinite(f.contribution ?? NaN) && f.contribution != null
                      ? ` | ${f.contribution.toFixed(4)}`
                      : ""}
                  </div>
                ) : null}
                {f.reasoning ? (
                  <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{f.reasoning}</div>
                ) : (
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">No additional factor details.</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Alert variant="info" title="No key factors" message="This prediction did not include per-feature factor details." />
        )}
      </Card>

      <TrainedModelDetails
        title="Trained Model Details"
        trainInfo={trainDetailsToShow}
        loading={loadingModelDetails}
        error={modelDetailsError}
        modelId={effectiveModelId}
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
              Loaded from saved metadata for this dataset.
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              Upload ID: <span className="font-mono">{uploadId ?? "-"}</span>
            </div>
          </div>
        </div>

        {loadingDatasetSummary ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="waiting-dots" aria-hidden="true" />
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
                Rows: {datasetSummary.stats.rows} | Cols: {datasetSummary.stats.cols} | Missing:{" "}
                {fmtPct(datasetSummary.stats.missing_pct)}
              </div>
              {datasetSummary.stats.class_balance?.length ? (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Class balance:{" "}
                  {datasetSummary.stats.class_balance
                    .map((c) => `${c.label} ${fmtPct(c.pct)}`)
                    .join(" | ")}
                </div>
              ) : null}
              {datasetSummary.stats.top_missing?.length ? (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Top missing:{" "}
                  {datasetSummary.stats.top_missing
                    .map((m) => `${m.column} ${fmtPct(m.null_pct)}`)
                    .join(" | ")}
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
