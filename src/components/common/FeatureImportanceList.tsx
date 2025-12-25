import React, { useMemo } from "react";

type Item = {
  feature: string;
  importance: number;
};

type Props = {
  items: Item[];
  maxItems?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function FeatureImportanceList({ items, maxItems = 10 }: Props) {
  const list = useMemo(() => items.slice(0, maxItems), [items, maxItems]);
  const isScrollable = list.length > 3;
  const max = useMemo(() => {
    const m = list.reduce((acc, x) => Math.max(acc, x.importance), 0);
    return m > 0 ? m : 1;
  }, [list]);

  return (
    <div
      className={
        isScrollable ? "scrollbar-modern max-h-64 space-y-3 overflow-y-auto pr-1" : "space-y-3"
      }
    >
      {list.map((it, idx) => {
        const pct = clamp(it.importance, 0, 100);
        const rel = clamp((pct / max) * 100, 0, 100);

        return (
          <div
            key={it.feature}
            className="card overflow-hidden border border-white/60 p-3 dark:border-zinc-800/70"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 dark:bg-zinc-800 dark:text-white dark:ring-white/10">
                  {idx + 1}
                </span>
                <span className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                  {it.feature}
                </span>
              </div>
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-100">
                {pct.toFixed(1)}%
              </div>
            </div>

            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
              <div
                className="progress-shimmer relative h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 transition-[width] duration-500 ease-out"
                style={{ width: `${rel}%` }}
                aria-label={`${it.feature} importance`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
