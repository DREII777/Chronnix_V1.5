"use client";

import { createContext, useContext, useEffect, useId, useMemo } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  setOpen?: (next: boolean) => void;
  labelledBy: string;
  describedBy: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

type DialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const labelledBy = useId();
  const describedBy = useId();
  const value = useMemo(
    () => ({ open, setOpen: onOpenChange, labelledBy, describedBy }),
    [open, onOpenChange, labelledBy, describedBy],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

type DialogContentProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
};

export function DialogContent({ children, className, maxWidth = "max-w-2xl" }: DialogContentProps) {
  const context = useRequiredContext("DialogContent");
  const { open, setOpen, labelledBy, describedBy } = context;

  useEffect(() => {
    if (!open) return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen?.(false);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, setOpen]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn("w-full rounded-2xl border border-slate-200 bg-white shadow-2xl", maxWidth, className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

type DialogHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function DialogHeader({ title, description, className }: DialogHeaderProps) {
  const context = useRequiredContext("DialogHeader");
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4", className)}>
      <div>
        <h2 id={context.labelledBy} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {description ? (
          <p id={context.describedBy} className="text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => context.setOpen?.(false)}
        className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end", className)}>{children}</div>;
}

function useRequiredContext(component: string) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used within <Dialog>`);
  }
  return context;
}
