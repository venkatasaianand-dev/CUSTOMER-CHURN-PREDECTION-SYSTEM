import React from "react";

type StepStatus = "complete" | "current" | "upcoming";

export type StepItem = {
  key: string;
  label: string;
  status: StepStatus;
  onClick?: () => void;
  disabled?: boolean;
};

export default function Stepper({ steps }: { steps: StepItem[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const base =
          step.status === "complete"
            ? "bg-primary-100 text-primary-800 border border-primary-200 shadow-sm dark:bg-primary-100/90 dark:text-primary-900 dark:border-primary-200/80"
            : step.status === "current"
              ? "bg-white text-zinc-900 border-2 border-primary-400 shadow-sm dark:bg-zinc-950 dark:text-zinc-100 dark:border-primary-500/80"
            : "bg-white text-zinc-600 border border-zinc-200 dark:bg-zinc-900/90 dark:text-zinc-100 dark:border-zinc-700";

        return (
          <div key={step.key} className="flex items-center gap-3">
            <button
              type="button"
              disabled={step.disabled}
              onClick={step.onClick}
              className={`relative inline-flex items-center gap-3 rounded-full px-4 py-2 transition-all ${base} ${step.disabled ? "opacity-60 cursor-not-allowed" : "hover:translate-y-[-1px]"}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  step.status === "complete"
                    ? "bg-primary-500 text-white"
                    : step.status === "current"
                    ? "bg-primary-100 text-primary-800 dark:bg-primary-700 dark:text-white"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                }`}
              >
                {idx + 1}
              </span>
              <span className="text-sm font-semibold">{step.label}</span>
            </button>
            {!isLast ? (
              <div className="hidden sm:block h-[1px] w-12 bg-gradient-to-r from-primary-300 via-zinc-200 to-transparent dark:from-primary-600 dark:via-zinc-700" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
