import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Toast, { ToastItem, ToastType } from "./Toast";

type ToasterAPI = {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

const ToasterContext = createContext<ToasterAPI | null>(null);

export function useToaster(): ToasterAPI | null {
  return useContext(ToasterContext);
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current[id];
    if (t) {
      window.clearTimeout(t);
      delete timersRef.current[id];
    }
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = uid();
      const item: ToastItem = { id, type, title, message };
      setToasts((prev) => [item, ...prev].slice(0, 5));
      const timeout = window.setTimeout(() => remove(id), 3500);
      timersRef.current[id] = timeout;
    },
    [remove]
  );

  const api = useMemo<ToasterAPI>(
    () => ({
      success: (m, t) => push("success", m, t ?? "Success"),
      error: (m, t) => push("error", m, t ?? "Error"),
      info: (m, t) => push("info", m, t ?? "Info"),
      warning: (m, t) => push("warning", m, t ?? "Warning"),
    }),
    [push]
  );

  return (
    <ToasterContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[340px] max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast item={t} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  );
}
