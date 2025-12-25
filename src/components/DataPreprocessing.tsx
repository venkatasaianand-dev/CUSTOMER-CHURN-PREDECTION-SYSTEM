import React, { useEffect, useMemo, useState } from "react";

import api from "../services/api";
import type { DatasetInfo, PreprocessResponse } from "../types/api";

import Alert from "./common/Alert";
import SelectMenu from "./common/SelectMenu";
import Spinner from "./common/Spinner";

type Props = {
  uploadId: string;
  datasetInfo: DatasetInfo | null;
  onBack: () => void;
  onPreprocessed: (info: PreprocessResponse) => void;
};

function guessDefaultTarget(columns: DatasetInfo["columns"]): string | null {
  const candidates = ["churn", "exited", "target", "label", "class", "y"];
  const names = columns.map((c) => c.name);
  for (const key of candidates) {
    const found = names.find((n) => n.toLowerCase() === key);
    if (found) return found;
  }
  return names.length ? names[names.length - 1] : null;
}

export default function DataPreprocessing({ uploadId, datasetInfo, onBack, onPreprocessed }: Props) {
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns = datasetInfo?.columns ?? [];
  const columnNames = useMemo(() => columns.map((c) => c.name), [columns]);

  useEffect(() => {
    if (!datasetInfo) return;
    const def = guessDefaultTarget(datasetInfo.columns);
    if (def) setTargetColumn(def);
  }, [datasetInfo]);

  useEffect(() => {
    if (!targetColumn) return;
    if (excluded.has(targetColumn)) {
      const next = new Set(excluded);
      next.delete(targetColumn);
      setExcluded(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetColumn]);

  const excludedList = useMemo(() => Array.from(excluded).sort(), [excluded]);

  const featureCount = useMemo(() => {
    if (!targetColumn) return 0;
    return columnNames.filter((c) => c !== targetColumn && !excluded.has(c)).length;
  }, [columnNames, excluded, targetColumn]);

  const validate = (): string | null => {
    if (!datasetInfo) return "Dataset info not available. Please upload again.";
    if (!targetColumn) return "Please select a target column.";
    if (!columnNames.includes(targetColumn)) return "Selected target column is not in dataset.";
    if (featureCount <= 0) return "No feature columns remain. Remove fewer excluded columns.";
    return null;
  };

  const toggleExcluded = (col: string) => {
    setError(null);
    if (col === targetColumn) return;
    const next = new Set(excluded);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setExcluded(next);
  };

  const excludeAllNonTarget = () => {
    if (!targetColumn) return;
    const next = new Set<string>();
    for (const c of columnNames) {
      if (c !== targetColumn) next.add(c);
    }
    setExcluded(next);
  };

  const clearExcluded = () => setExcluded(new Set());

  const handlePreprocess = async () => {
    setError(null);
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setBusy(true);
    try {
      const res = await api.preprocessDataset({
        upload_id: uploadId,
        target_column: targetColumn,
        excluded_columns: excludedList,
      });
      onPreprocessed(res);
    } catch (e: any) {
      setError(e?.message || "Preprocess failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!datasetInfo) {
    return (
      <div className="card p-5">
        <Alert
          variant="error"
          title="Missing dataset"
          message="Dataset details are not available. Please go back and upload again."
        />
        <div className="mt-4">
          <button type="button" onClick={onBack} className="btn btn-ghost">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="section-header">
          <div>
            <h2 className="section-title">Preprocess Dataset</h2>
            <p className="section-subtitle">
              Choose a target column and exclude non-predictive fields before training.
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              Upload ID: <span className="font-mono">{uploadId}</span>
            </div>
            <div>
              Shape: <span className="font-semibold">{datasetInfo.shape?.[0] ?? "?"}</span> rows ·{" "}
              <span className="font-semibold">{datasetInfo.shape?.[1] ?? "?"}</span> cols
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card p-4">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-white">Target Column</label>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              The model will learn to predict this column (binary recommended).
            </p>

            <div className="mt-3">
              <SelectMenu
                value={targetColumn}
                onChange={setTargetColumn}
                options={columnNames}
                placeholder="Select target..."
                disabled={busy}
                className="input-shell"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="chip">Features after exclude: {featureCount}</div>
              <div className="chip">Excluded: {excluded.size}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearExcluded}
                disabled={busy || excluded.size === 0}
                className="btn btn-ghost"
              >
                Clear excluded
              </button>
              <button
                type="button"
                onClick={excludeAllNonTarget}
                disabled={busy || !targetColumn}
                className="btn btn-secondary"
              >
                Exclude all (except target)
              </button>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">Columns</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Click a row to exclude/include (target cannot be excluded).
                </div>
              </div>
            </div>

            <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-zinc-200 shadow-inner dark:border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Nulls</th>
                    <th className="px-3 py-2 font-semibold">Unique</th>
                    <th className="px-3 py-2 font-semibold">Use</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col) => {
                    const isTarget = col.name === targetColumn;
                    const isExcluded = excluded.has(col.name);
                    const useAsFeature = !isTarget && !isExcluded;

                    return (
                      <tr
                        key={col.name}
                        onClick={() => toggleExcluded(col.name)}
                        className={`cursor-pointer border-t border-zinc-100 hover:bg-primary-50/60 dark:border-zinc-800 dark:hover:bg-primary-900/30 ${
                          isTarget ? "opacity-90" : ""
                        }`}
                        title={isTarget ? "Target column (cannot exclude)" : "Click to toggle exclude"}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900 dark:text-white">{col.name}</span>
                            {isTarget && <span className="badge badge-info">TARGET</span>}
                            {isExcluded && !isTarget && <span className="badge badge-danger">EXCLUDED</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">{col.dtype}</td>
                        <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">{col.null_count}</td>
                        <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">{col.unique_count}</td>
                        <td className="px-3 py-2 text-xs">
                          {isTarget ? (
                            <span className="text-primary-600 dark:text-primary-200">Target</span>
                          ) : useAsFeature ? (
                            <span className="text-emerald-600 dark:text-emerald-200">Included</span>
                          ) : (
                            <span className="text-zinc-500 dark:text-zinc-400">Excluded</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Tip: Exclude IDs, names, emails, and other non-predictive identifiers.
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <Alert variant="error" title="Preprocess error" message={error} />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={onBack} disabled={busy} className="btn btn-ghost">
            Back
          </button>

          <button type="button" onClick={handlePreprocess} disabled={busy} className="btn btn-primary">
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                Processing...
              </span>
            ) : (
              "Run Preprocess"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
