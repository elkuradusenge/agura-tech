/** Toasts, driven by the socket and by explicit actions. */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "../lib/utils";

type ToastTone = "success" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastValue {
  push: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 6000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-panel px-4 py-3 shadow-e2 animate-fade-up",
                toast.tone === "success" && "bg-success text-canvas",
                toast.tone === "warning" && "bg-warning text-canvas",
                toast.tone === "info" && "bg-ink-heading text-canvas",
              )}
            >
              <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                type="button"
                aria-label="close"
                className="press rounded-pill p-1 hover:opacity-80"
                onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (value === null) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
