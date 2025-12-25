import React, { useMemo } from "react";

type Props = {
  value: number;
  showLabel?: boolean;
  className?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ProgressBar({ value, showLabel = true, className = "" }: Props) {
  const pct = useMemo(() => {
    const n = typeof value === "number" ? value : Number(value);
    return clamp(Number.isFinite(n) ? n : 0, 0, 100);
  }, [value]);
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-200">
          Progress
        </div>
        {showLabel ? (
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            {Math.round(pct)}%
          </div>
        ) : null}
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
        <div
          className="progress-shimmer relative h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
          aria-label="Progress"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
