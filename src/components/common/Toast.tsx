import React from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
};

type Props = {
  item: ToastItem;
  onClose: () => void;
};

function tone(type: ToastType): { wrap: string; title: string; msg: string; dot: string } {
  switch (type) {
    case "success":
      return {
        wrap: "border-emerald-200/70 bg-white/85 text-zinc-900 dark:border-emerald-500/30 dark:bg-zinc-900/85 dark:text-zinc-100",
        title: "text-emerald-700 dark:text-emerald-200",
        msg: "text-zinc-700 dark:text-zinc-200",
        dot: "bg-emerald-500",
      };
    case "warning":
      return {
        wrap: "border-amber-200/70 bg-white/85 text-zinc-900 dark:border-amber-500/30 dark:bg-zinc-900/85 dark:text-zinc-100",
        title: "text-amber-700 dark:text-amber-200",
        msg: "text-zinc-700 dark:text-zinc-200",
        dot: "bg-amber-500",
      };
    case "error":
      return {
        wrap: "border-rose-200/70 bg-white/85 text-zinc-900 dark:border-rose-500/30 dark:bg-zinc-900/85 dark:text-zinc-100",
        title: "text-rose-700 dark:text-rose-200",
        msg: "text-zinc-700 dark:text-zinc-200",
        dot: "bg-rose-500",
      };
    case "info":
    default:
      return {
        wrap: "border-primary-200/70 bg-white/85 text-zinc-900 dark:border-primary-500/30 dark:bg-zinc-900/85 dark:text-zinc-100",
        title: "text-primary-700 dark:text-primary-200",
        msg: "text-zinc-700 dark:text-zinc-200",
        dot: "bg-primary-500",
      };
  }
}

export default function Toast({ item, onClose }: Props) {
  const c = tone(item.type);

  return (
    <div className={`card soft-fade border ${c.wrap} p-3`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${c.dot}`} />
        <div className="min-w-0 flex-1">
          {item.title ? <div className={`text-sm font-semibold ${c.title}`}>{item.title}</div> : null}
          <div className={`mt-0.5 text-sm ${c.msg}`}>{item.message}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-full px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Close"
        >
          X
        </button>
      </div>
    </div>
  );
}
