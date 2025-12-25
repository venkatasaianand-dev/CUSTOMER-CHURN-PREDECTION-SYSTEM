import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "ui-theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const applyThemeToDom = (next: Theme) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", next);
  }
};

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    applyThemeToDom(stored);
    return stored;
  }

  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const initial = prefersDark ? "dark" : "light";
  applyThemeToDom(initial);
  return initial;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyThemeToDom(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, [setTheme]);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) return; // user preference wins
      setTheme(e.matches ? "dark" : "light");
    };

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggle,
      setTheme,
    }),
    [setTheme, theme, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
