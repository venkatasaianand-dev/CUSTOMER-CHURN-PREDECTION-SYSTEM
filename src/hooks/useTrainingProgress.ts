import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "idle" | "running" | "complete" | "error";

type Options = {
  completeMs?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * UI-only training progress hook.
 * - Smooth progress 0 -> cap while running
 * - Smooth finish -> 100 on completion
 * - Reset/Fail controls
 *
 * If backend progress becomes available, feed it via setProgressExternal.
 */
export default function useTrainingProgress(options?: Options) {
  const completeMs = clamp(options?.completeMs ?? 600, 100, 5000);

  const [mode, setMode] = useState<Mode>("idle");
  const [progress, setProgress] = useState<number>(0);

  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stop();
    setMode("idle");
    setProgress(0);
  }, [stop]);

  const start = useCallback(() => {
    stop();
    setMode("running");
    setProgress(0);
  }, [stop]);

  const fail = useCallback(
    (freezeAt?: number) => {
      stop();
      setMode("error");
      if (freezeAt !== undefined && Number.isFinite(freezeAt)) {
        setProgress(clamp(freezeAt, 0, 100));
      }
    },
    [stop]
  );

  const complete = useCallback(() => {
    stop();
    setMode("complete");

    const from = clamp(progress, 0, 100);
    const to = 100;

    const startTime = performance.now();
    const animate = (ts: number) => {
      const t = clamp((ts - startTime) / completeMs, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setProgress(clamp(next, 0, 100));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [completeMs, progress, stop]);

  const setProgressExternal = useCallback((pct: number) => {
    setProgress(clamp(pct, 0, 100));
  }, []);

  useEffect(() => () => stop(), [stop]);

  const statusText = (() => {
    if (mode === "running") return `Training in progress... (${Math.min(99, Math.floor(progress))}%)`;
    if (mode === "complete") return "Training complete!";
    if (mode === "error") return "Training failed. Please retry.";
    return "Ready to train the model.";
  })();

  return {
    mode,
    progress: clamp(progress, 0, 100),
    statusText,
    start,
    complete,
    fail,
    reset,
    setProgressExternal,
  };
}
