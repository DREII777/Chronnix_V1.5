"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "info" | "success" | "warning" | "error";

type Toast = {
  id: number;
  title: string;
  description?: string | null;
  variant?: ToastVariant;
  timeout?: number;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: "border-sky-200 bg-white/95 text-slate-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      counter.current += 1;
      const id = counter.current;
      const timeout = toast.timeout ?? 6000;
      setToasts((current) => [...current, { ...toast, id }]);
      if (timeout > 0) {
        window.setTimeout(() => remove(id), timeout);
      }
    },
    [remove],
  );

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      push({
        title: "Erreur application",
        description: event.message ?? "Une erreur inattendue est survenue.",
        variant: "error",
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "Erreur");
      push({
        title: "Promesse rejetée",
        description: reason,
        variant: "warning",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [push]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[70] flex items-end justify-center gap-3 px-4 sm:justify-end">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto overflow-hidden rounded-xl border px-4 py-3 shadow-xl transition",
                VARIANT_STYLES[toast.variant ?? "info"],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm leading-snug text-slate-600">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-full bg-white/60 px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
                  onClick={() => remove(toast.id)}
                >
                  OK
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return context;
}
