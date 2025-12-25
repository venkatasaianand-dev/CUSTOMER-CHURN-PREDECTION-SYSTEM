import React from "react";

type Variant = "info" | "success" | "warning" | "error";

type Props = {
  variant: Variant;
  title: string;
  message: string;
  className?: string;
  badges?: { label: string; tone?: Variant }[];
};

function getColors(variant: Variant) {
  switch (variant) {
    case "success":
      return {
        badge: "badge badge-success",
        ring: "ring-emerald-200/70 dark:ring-emerald-500/30",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-600 dark:text-emerald-300" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      };
    case "warning":
      return {
        badge: "badge badge-info",
        ring: "ring-amber-200/70 dark:ring-amber-500/30",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 9v4" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r=".7" fill="currentColor" />
            <path d="M10.1 3.7 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3l-7.6-13.3a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      };
    case "error":
      return {
        badge: "badge badge-danger",
        ring: "ring-rose-200/70 dark:ring-rose-500/30",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-600 dark:text-rose-300" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ),
      };
    case "info":
    default:
      return {
        badge: "badge badge-info",
        ring: "ring-primary-200/70 dark:ring-primary-500/30",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-600 dark:text-primary-200" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M10.5 11h1.5v5M12 16h1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      };
  }
}

function badgeClass(tone?: Variant): string {
  if (tone === "success") return "badge badge-success";
  if (tone === "warning") return "badge badge-info";
  if (tone === "error") return "badge badge-danger";
  return "badge badge-info";
}

export default function Alert({ variant, title, message, className = "", badges = [] }: Props) {
  const colors = getColors(variant);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/50 bg-white/70 px-4 py-3 shadow-sm ring-1 ring-inset ${colors.ring} backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/70 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{colors.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
            <span className={colors.badge}>{variant.toUpperCase()}</span>
            {badges.map((b, idx) => (
              <span key={`${b.label}-${idx}`} className={`${badgeClass(b.tone)} badge-animate`}>
                {b.label}
              </span>
            ))}
          </div>
          <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{message}</div>
        </div>
      </div>
    </div>
  );
}
