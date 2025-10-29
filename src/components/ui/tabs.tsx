"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = {
  value: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const context = useMemo(() => ({ value, onValueChange }), [value, onValueChange]);
  return (
    <div className={cn("space-y-4", className)}>
      <TabsContext.Provider value={context}>{children}</TabsContext.Provider>
    </div>
  );
}

type TabsListProps = {
  children: ReactNode;
  className?: string;
};

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn("inline-flex rounded-full border border-slate-200 bg-slate-100 p-1", className)}>
      {children}
    </div>
  );
}

type TabsTriggerProps = {
  children: ReactNode;
  value: string;
  className?: string;
};

export function TabsTrigger({ children, value, className }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used within <Tabs>");
  }

  const active = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange?.(value)}
      className={cn(
        "inline-flex min-w-[120px] items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
        className,
      )}
    >
      {children}
    </button>
  );
}

type TabsContentProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsContent must be used within <Tabs>");
  }

  if (context.value !== value) {
    return null;
  }

  return <div className={className}>{children}</div>;
}
