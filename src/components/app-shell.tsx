"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { CommandMenu, type CommandMenuItem } from "@/components/command-menu";
import { ToastProvider } from "@/components/toast-provider";
import { Logo } from "@/components/logo";
import { DashboardIcon, BriefcaseIcon, CalendarIcon, SettingsIcon, UsersIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  userEmail?: string;
};

const NAVIGATION = [
  {
    id: "dashboard",
    href: "/",
    label: "Dashboard",
    description: "KPI, tendances et checklist exports",
    icon: <DashboardIcon className="h-4 w-4" />,
  },
  {
    id: "clients",
    href: "/clients",
    label: "Clients",
    description: "Suivi des chantiers et pipeline par client",
    icon: <BriefcaseIcon className="h-4 w-4" />,
  },
  {
    id: "workers",
    href: "/workers",
    label: "Ouvriers",
    description: "Conformité, documents et équipes",
    icon: <UsersIcon className="h-4 w-4" />,
  },
  {
    id: "timesheets",
    href: "/timesheets",
    label: "Pointage",
    description: "Heures, absences et exports",
    icon: <CalendarIcon className="h-4 w-4" />,
  },
  {
    id: "settings",
    href: "/settings",
    label: "Paramètres",
    description: "Compte, BCE et intégrations",
    icon: <SettingsIcon className="h-4 w-4" />,
  },
];

export function AppShell({ children, userEmail }: AppShellProps) {
  const pathname = usePathname();
  const [commandItems] = useState<CommandMenuItem[]>(() =>
    NAVIGATION.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      description: item.description,
      icon: item.icon,
    })),
  );
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/auth/login";
    });
  };

  return (
    <ToastProvider>
      <CommandMenu items={commandItems} />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.18)_0%,_transparent_65%)]">
        <header className="sticky top-0 z-50 border-b border-white/40 bg-white/75 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3">
            <Link href="/" className="flex items-center gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-500 via-indigo-500 to-indigo-600 text-white shadow-xl shadow-sky-200/60">
                <Logo className="h-10 w-10 text-white" />
              </span>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-semibold text-slate-900">Chronnix</p>
                <p className="text-xs text-slate-500">Pilotage chantiers & RH</p>
              </div>
            </Link>
            <nav className="hidden items-center gap-1 rounded-full bg-white/80 p-1 shadow-inner shadow-slate-200 md:flex">
              {NAVIGATION.map((item) => {
                const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-200/60"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 md:flex">
                <span>{userEmail ?? "Utilisateur"}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleLogout}
                  disabled={isPending}
                >
                  {isPending ? "..." : "Déconnexion"}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-16 pt-6">
          <section className="rounded-[28px] border border-white/60 bg-white/92 shadow-xl shadow-slate-200/40">
            <div className="relative">
              <div className="absolute left-0 right-0 top-0 h-1.5 rounded-t-[28px] bg-gradient-to-r from-sky-300 via-indigo-300 to-sky-300 opacity-60" />
              <div className="relative px-5 pb-8 pt-7">
                <div className="mx-auto flex max-w-6xl flex-col gap-8">
                  {children}
                </div>
              </div>
            </div>
          </section>

          <Separator className="opacity-50" />
          <footer className="flex flex-col gap-2 pb-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Chronnix — Construire ensemble vos chantiers.</span>
            <span>Toujours en bêta · Des fonctionnalités arrivent bientôt</span>
          </footer>
        </main>
      </div>
    </ToastProvider>
  );
}
              <p className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-400 md:block">
                Commandes rapides : ⌘K
              </p>
