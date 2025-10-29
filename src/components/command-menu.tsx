"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type CommandMenuItem = {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  section?: string;
  description?: string;
  shortcut?: string;
};

type CommandMenuProps = {
  items: CommandMenuItem[];
};

export function CommandMenu({ items }: CommandMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");
      if ((event.key === "k" && (isMac ? event.metaKey : event.ctrlKey)) || (event.key === "f" && event.metaKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    const handleOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("command-menu:open", handleOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("command-menu:open", handleOpen as EventListener);
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      const haystack = `${item.label} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [items, query]);

  const sections = useMemo(() => {
    const map = new Map<string, CommandMenuItem[]>();
    for (const item of filtered) {
      const key = item.section ?? "Navigation";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleNavigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent className="max-w-2xl overflow-hidden border-0 bg-white/95 shadow-2xl">
        <DialogHeader
          title="Commandes rapides"
          description="Naviguez dans Chronnix ou lancez une action (`⌘K` pour ouvrir, `Esc` pour fermer)."
          className="border-0 px-6 py-5"
        />
        <DialogBody className="border-t border-slate-100 px-0 py-0">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="relative">
              <Input
                autoFocus
                placeholder="Rechercher un module ou une action..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 rounded-xl border-slate-200 pl-10 text-base"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌘</span>
            </div>
          </div>
          <ScrollArea className="max-h-[420px]">
            {sections.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-slate-500">
                Aucun résultat ne correspond à « {query} »
              </p>
            ) : (
              <div className="py-2">
                {sections.map(([section, sectionItems]) => (
                  <div key={section} className="px-2 py-1">
                    <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {section}
                    </p>
                    <div className="space-y-1">
                      {sectionItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavigate(item.href)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-600 transition",
                            "hover:bg-sky-50 hover:text-slate-900",
                          )}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-sky-100 group-hover:text-sky-700">
                            {item.icon ?? <span className="text-base">•</span>}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-slate-900 group-hover:text-slate-900">
                              {item.label}
                            </span>
                            {item.description ? (
                              <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                            ) : null}
                          </span>
                          {item.shortcut ? (
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium tracking-wider text-slate-500">
                              {item.shortcut}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export type { CommandMenuItem };
