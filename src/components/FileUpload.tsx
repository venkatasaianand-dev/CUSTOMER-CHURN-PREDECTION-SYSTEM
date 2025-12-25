import React, { useCallback, useMemo, useRef, useState } from "react";

import api from "../services/api";
import type { DatasetInfo } from "../types/api";

import Alert from "./common/Alert";
import Spinner from "./common/Spinner";

type Props = {
  onUploaded: (info: DatasetInfo) => void;
};

const ACCEPTED_EXTENSIONS = [".csv", ".json"];
const ACCEPTED_MIME = ["text/csv", "application/csv", "application/json", "text/json"];

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function FileUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptAttr = useMemo(() => ACCEPTED_EXTENSIONS.join(","), []);

  const resetSelection = useCallback(() => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const validateFile = useCallback((f: File): string | null => {
    if (!f) return "Please select a file.";
    if (!hasAllowedExtension(f.name)) {
      return `Unsupported file type. Please upload ${ACCEPTED_EXTENSIONS.join(" or ")}.`;
    }
    const maxMbSoft = 50;
    const sizeMb = f.size / (1024 * 1024);
    if (sizeMb > maxMbSoft) {
      return `File is too large (${sizeMb.toFixed(1)} MB). Please upload a file under ${maxMbSoft} MB.`;
    }
    return null;
  }, []);

  const onPickFile = useCallback(
    (f: File | null) => {
      setError(null);
      if (!f) {
        setFile(null);
        return;
      }
      const msg = validateFile(f);
      if (msg) {
        setFile(null);
        setError(msg);
        return;
      }
      setFile(f);
    },
    [validateFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      onPickFile(f);
    },
    [onPickFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer.files?.[0] ?? null;
      onPickFile(f);
    },
    [onPickFile]
  );

  const onBrowse = useCallback(() => {
    setError(null);
    inputRef.current?.click();
  }, []);

  const onUpload = useCallback(async () => {
    setError(null);
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    const msg = validateFile(file);
    if (msg) {
      setError(msg);
      return;
    }

    setBusy(true);
    try {
      const info = await api.uploadDataset(file);
      onUploaded(info);
      resetSelection();
    } catch (e: any) {
      setError(e?.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [file, onUploaded, resetSelection, validateFile]);

  return (
    <div className="space-y-4">
      <div className="card card-ghost p-6">
        <div className="section-header">
          <div>
            <h2 className="section-title">Upload Dataset</h2>
            <p className="section-subtitle">
              Drag and drop your CSV/JSON or browse to select. We will guide you through preprocessing.
            </p>
          </div>
          <div className="chip">Supported: {ACCEPTED_EXTENSIONS.join(", ")}</div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={onDrop}
          className="mt-4 rounded-2xl border-2 border-dashed border-primary-200/60 bg-white/85 p-6 text-center shadow-inner transition hover:border-primary-400 dark:border-primary-700/60 dark:bg-zinc-900/70"
          style={{ background: "var(--surface-1)" }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptAttr}
            className="hidden"
            onChange={onInputChange}
            disabled={busy}
          />

          {!file ? (
            <div className="flex flex-col items-center gap-3 text-zinc-700 dark:text-zinc-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-200/60 bg-primary-50 text-primary-700 shadow-sm dark:border-white/20 dark:bg-white/10 dark:text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-primary-700 dark:text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
                </svg>
              </div>
              <p className="text-sm">Drag & drop your dataset here, or</p>
              <button type="button" onClick={onBrowse} disabled={busy} className="btn btn-primary">
                Browse Files
              </button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Max recommended size: 50MB. We validate file type and size locally.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={resetSelection} disabled={busy} className="btn btn-ghost">
                  Change
                </button>
                <button type="button" onClick={onUpload} disabled={busy} className="btn btn-primary">
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" />
                      Uploading...
                    </span>
                  ) : (
                    "Upload"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4">
            <Alert variant="error" title="Upload error" message={error} />
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-600 dark:text-zinc-400">
        Tip: For best results, ensure the target column is binary (0/1 or Yes/No).
      </div>
    </div>
  );
}
