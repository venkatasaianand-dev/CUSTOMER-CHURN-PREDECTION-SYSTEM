import React, { useEffect, useMemo, useState } from "react";

import api from "../services/api";
import type { PredictResponse, SchemaField, SchemaResponse, TrainResponse } from "../types/api";

import Alert from "./common/Alert";
import SelectMenu from "./common/SelectMenu";
import ProgressBar from "./common/ProgressBar";
import Spinner from "./common/Spinner";

type Props = {
  modelId: string;
  schemaInfo: SchemaResponse | null;
  trainingInfo: TrainResponse | null;
  onBack: () => void;
  onPredicted: (result: PredictResponse) => void;
  onPredictStart?: () => void;
  onPredictError?: (message: string) => void;
  predicting?: boolean;
};

type FormState = Record<string, any>;
type FieldErrorMap = Record<string, string>;

function normalizeBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function coerceValue(field: SchemaField, raw: any): any {
  if (raw === "" || raw === null || raw === undefined) return raw;
  if (field.dtype === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (field.dtype === "boolean") return normalizeBool(raw);
  return String(raw);
}

function validateFields(fields: SchemaField[], state: FormState): FieldErrorMap {
  const errors: FieldErrorMap = {};
  for (const f of fields) {
    const v = state[f.name];

    if (f.required) {
      const empty = v === undefined || v === null || (typeof v === "string" && v.trim() === "");
      if (empty) {
        errors[f.name] = "Required";
        continue;
      }
    }

    if (f.dtype === "number" && v !== undefined && v !== null && v !== "") {
      const n = Number(v);
      if (!Number.isFinite(n)) errors[f.name] = "Must be a number";
    }

    if (f.allowed_values && f.allowed_values.length > 0 && v !== undefined && v !== null && v !== "") {
      const s = String(v);
      if (!f.allowed_values.includes(s)) {
        errors[f.name] = "Invalid value";
      }
    }
  }
  return errors;
}

export default function PredictionForm({
  modelId,
  schemaInfo,
  trainingInfo,
  onBack,
  onPredicted,
  onPredictStart,
  onPredictError,
  predicting,
}: Props) {
  const fields = useMemo(() => schemaInfo?.fields ?? [], [schemaInfo]);

  const [form, setForm] = useState<FormState>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const busy = predicting ?? localBusy;
  const missingSchema = !schemaInfo || fields.length === 0;

  useEffect(() => {
    if (!fields.length) return;
    const next: FormState = {};
    for (const f of fields) {
      if (f.example !== undefined && f.example !== null && f.example !== "") next[f.name] = f.example;
      else if (f.dtype === "number") next[f.name] = "";
      else if (f.dtype === "boolean") next[f.name] = false;
      else next[f.name] = "";
    }
    setForm(next);
    setFieldErrors({});
    setError(null);
  }, [fields]);

  const setField = (name: string, value: any) => {
    setError(null);
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    setProgress(0);
    setProgressMessage(null);

    if (missingSchema) {
      const msg = "Model schema is not available yet. Please wait or go back and try again.";
      setError(msg);
      onPredictError?.(msg);
      return;
    }

    const errs = validateFields(fields, form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const msg = "Please fix the highlighted fields.";
      setError(msg);
      return;
    }

    const input_data: Record<string, any> = {};
    for (const f of fields) {
      input_data[f.name] = coerceValue(f, form[f.name]);
    }

    onPredictStart?.();
    if (predicting === undefined) setLocalBusy(true);

    try {
      const res = await api.predictStream(
        {
          model_id: modelId,
          input_data,
        },
        (pct, message) => {
          setProgress(Math.max(0, Math.min(100, Math.round(pct))));
          if (message) setProgressMessage(message);
        }
      );
      onPredicted(res);
    } catch (e: any) {
      const msg = e?.message || "Prediction failed. Please try again.";
      setError(msg);
      onPredictError?.(msg);
    } finally {
      if (predicting === undefined) setLocalBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="section-header">
          <div>
            <h2 className="section-title">Make Predictions</h2>
            <p className="section-subtitle">Fill feature values and run a prediction for churn risk.</p>
          </div>

          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              Model ID: <span className="font-mono">{modelId}</span>
            </div>
            {trainingInfo?.model_name ? (
              <div>
                Model: <span className="font-semibold">{trainingInfo.model_name}</span>
              </div>
            ) : null}
          </div>
        </div>

        {missingSchema ? (
          <div className="mt-5">
            <Alert
              variant="info"
              title="Loading schema"
              message="The prediction form schema is loading. If it doesn't appear, go back and re-open the Predict step."
            />
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {fields.map((f) => {
                const err = fieldErrors[f.name];
                const value = form[f.name];

                const inputClass = `input-shell ${err ? "border-rose-400 dark:border-rose-500" : ""}`;

                return (
                  <div key={f.name} className="card p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {f.name}
                        {f.required ? <span className="text-rose-500"> *</span> : null}
                      </label>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-200">
                        {f.dtype}
                      </span>
                    </div>

                    {f.description ? (
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{f.description}</div>
                    ) : null}

                    {f.allowed_values && f.allowed_values.length > 0 ? (
                      <div className="mt-3">
                        <SelectMenu
                          value={value ?? ""}
                          onChange={(next) => setField(f.name, next)}
                          options={f.allowed_values}
                          placeholder="Select..."
                          disabled={busy}
                          className={`${inputClass}`}
                        />
                      </div>
                    ) : f.dtype === "boolean" ? (
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                        <input
                          type="checkbox"
                          checked={!!value}
                          onChange={(e) => setField(f.name, e.target.checked)}
                          disabled={busy}
                          className="h-4 w-4 accent-primary-500"
                        />
                        {value ? "True" : "False"}
                      </label>
                    ) : (
                      <input
                        type={f.dtype === "number" ? "number" : "text"}
                        value={value ?? ""}
                        onChange={(e) => setField(f.name, e.target.value)}
                        disabled={busy}
                        className={`${inputClass} mt-3 w-full bg-transparent`}
                        placeholder={f.example !== undefined && f.example !== null ? String(f.example) : ""}
                      />
                    )}

                    {err ? <div className="mt-2 text-xs text-rose-600 dark:text-rose-400">{err}</div> : null}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-4">
                <Alert variant="error" title="Prediction error" message={error} />
              </div>
            )}

            {busy && (
              <div className="mt-4 rounded-2xl border border-primary-100/80 bg-gradient-to-r from-primary-50/70 to-white p-4 shadow-inner dark:border-primary-800/60 dark:from-primary-950/50 dark:to-zinc-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">Prediction Progress</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" />
                      Running
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={progress} />
                </div>
                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {`Prediction in progress (${Math.min(99, Math.max(0, Math.floor(progress)))}%)`}
                </div>
                {progressMessage ? (
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {progressMessage}
                    <span className="waiting-dots" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" onClick={onBack} disabled={busy} className="btn btn-ghost">
                Back
              </button>

              <button type="button" onClick={handleSubmit} disabled={busy || missingSchema} className="btn btn-primary">
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" />
                    Predicting...
                  </span>
                ) : (
                  "Predict"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
