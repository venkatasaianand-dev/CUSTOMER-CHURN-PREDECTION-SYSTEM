import React from "react";
import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost hover-rise border border-transparent bg-white/60 px-3 py-2 text-sm text-zinc-800 shadow-sm backdrop-blur dark:bg-white/5 dark:text-zinc-100 dark:border-zinc-700"
      aria-label="Toggle theme"
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        {isDark ? (
          <svg
            className="h-5 w-5 text-amber-300 drop-shadow"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
          </svg>
        ) : (
          <svg
            className="h-5 w-5 text-indigo-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95-7.95-1.4 1.4M6.45 17.55l-1.4 1.4m0-13.9 1.4 1.4m11.1 11.1 1.4 1.4" />
          </svg>
        )}
      </span>
      <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wide">
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}
