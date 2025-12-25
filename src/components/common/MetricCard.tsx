import React from "react";

type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  right?: React.ReactNode;
  className?: string;
  valueClassName?: string;
};

export default function MetricCard({
  label,
  value,
  hint,
  right,
  className = "",
  valueClassName = "text-2xl font-bold text-zinc-900 dark:text-white",
}: Props) {
  return (
    <div className={`card overflow-hidden p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-200">
            {label}
          </div>
          <div className={`mt-1 ${valueClassName}`}>{value}</div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {hint ? <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{hint}</div> : null}
    </div>
  );
}
