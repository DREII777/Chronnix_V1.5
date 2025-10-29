"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Hint } from "@/components/hint";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { formatDisplayDate } from "@/utils/date";
import { CreateClientModal } from "@/components/clients/create-client-modal";

type ClientCard = {
  name: string;
  slug: string;
  totalProjects: number;
  activeProjects: number;
  totalHours: number;
  totalAmount: number;
  workerCount: number;
  lastActivity: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
};

type Props = {
  clients: ClientCard[];
};

export function ClientDirectory({ clients }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "quiet">("all");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesName = term ? client.name.toLowerCase().includes(term) : true;
      const activeRatio = client.totalProjects === 0 ? 0 : client.activeProjects / client.totalProjects;
      const matchesFilter =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? activeRatio >= 0.5
            : activeRatio < 0.5;
      return matchesName && matchesFilter;
    });
  }, [clients, query, statusFilter]);

  return (
    <div className="space-y-6">
      <CreateClientModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher un client"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full sm:max-w-xs"
          />
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
            {(
              [
                { id: "all" as const, label: "Tous" },
                { id: "active" as const, label: "Actifs" },
                { id: "quiet" as const, label: "Calmes" },
              ]
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStatusFilter(option.id)}
                className={`rounded-full px-3 py-1 transition ${statusFilter === option.id ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-900"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Hint label="Astuce : ouvrez un client pour visualiser sa timeline" />
          <Button onClick={() => setModalOpen(true)}>Nouveau client</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Aucun client ne correspond à la recherche.
            </CardContent>
          </Card>
        ) : (
          filtered.map((client) => <ClientCardItem key={client.slug} client={client} />)
        )}
      </div>
    </div>
  );
}

type CardItemProps = {
  client: ClientCard;
};

function ClientCardItem({ client }: CardItemProps) {
  const lastActivity = client.lastActivity ? formatDisplayDate(new Date(client.lastActivity)) : "Aucune activité";
  const archivedCount = client.totalProjects - client.activeProjects;
  const activityLabel = client.lastActivity ? `Dernière activité · ${lastActivity}` : "À relancer";
  const activityTone = client.lastActivity ? "text-slate-500" : "text-amber-600";
  const hasContact = client.contactName || client.email || client.phone;

  return (
    <Card className="flex h-full flex-col justify-between border-slate-200">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-900">{client.name}</CardTitle>
            <p className={`text-xs ${activityTone}`}>{activityLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
            <Badge variant="secondary" className="rounded-full">
              {client.totalProjects} chantier(s)
            </Badge>
            <span className="text-slate-400">{client.workerCount} ouvriers</span>
          </div>
        </div>
        <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 sm:grid-cols-3">
          <Metric label="Actifs" value={`${client.activeProjects}`} tone="success" />
          <Metric label="Archivés" value={`${archivedCount}`} tone="warning" />
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Charges estimées</p>
            <p className="text-sm font-semibold text-slate-900">{formatCurrency(client.totalAmount)}</p>
            <p className="text-[11px] text-slate-500">{formatNumber(Math.round(client.totalHours))} h cumulées</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasContact ? (
          <div className="grid gap-2 rounded-xl border border-slate-100 bg-white/80 p-3 text-xs text-slate-600 sm:grid-cols-2">
            {client.contactName ? (
              <Detail label="Interlocuteur" value={client.contactName} />
            ) : null}
            {client.email ? <Detail label="Email" value={client.email} /> : null}
            {client.phone ? <Detail label="Téléphone" value={client.phone} /> : null}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Ajoutez les coordonnées du client pour faciliter vos relances.
          </p>
        )}
        <Button asChild variant="outline" className="w-full justify-center">
          <Link href={`/clients/${client.slug}`}>Ouvrir la fiche client</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "default";
}) {
  const variants: Record<"success" | "warning" | "default", string> = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    default: "text-slate-600",
  };
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${variants[tone]}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xs text-slate-700">{value}</p>
    </div>
  );
}
