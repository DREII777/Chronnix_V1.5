"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Hint } from "@/components/hint";
import { CreateWorkerModal } from "@/components/workers/create-worker-modal";
import type { TeamInfo } from "@/components/workers/team-manager";

const TeamManager = dynamic(
  () => import("@/components/workers/team-manager").then((mod) => mod.TeamManager),
  {
    ssr: false,
    loading: () => (
      <div className="py-6 text-sm text-slate-500">Chargement des équipes…</div>
    ),
  },
);

const STATUS_LABELS: Record<string, string> = {
  SALARIE: "Salarié",
  INDEPENDANT: "Indépendant",
  ASSOCIE: "Associé",
};

type WorkerRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  includeInExport: boolean;
  assignments: Array<{ projectId: number; projectName: string }>;
  teams: Array<{ teamId: number; teamName: string; role: string }>;
  compliance: {
    isCompliant: boolean;
    missing: string[];
  };
  nationalId: string | null;
  vatNumber: string | null;
};

type TeamOption = TeamInfo;

type Filters = {
  search: string;
  teamId: number | null;
  compliant?: boolean;
};

type Props = {
  filters: Filters;
  workers: WorkerRow[];
  teams: TeamOption[];
};

export default function WorkersDirectory({ filters, workers, teams }: Props) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");
  const [teamFilter, setTeamFilter] = useState<number | "all">(filters.teamId ?? "all");
  const [complianceOnly, setComplianceOnly] = useState<boolean>(filters.compliant ?? false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamsPanelOpen, setTeamsPanelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const tableParentRef = useRef<HTMLDivElement | null>(null);

  const deferredSearch = useDeferredValue(searchDraft);
  const deferredTeam = useDeferredValue(teamFilter);
  const deferredCompliance = useDeferredValue(complianceOnly);

  useEffect(() => {
    setSearchDraft(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (deferredSearch) params.set("search", deferredSearch);
    if (deferredTeam !== "all") params.set("teamId", String(deferredTeam));
    if (deferredCompliance) params.set("compliant", "true");

    const url = `/workers${params.toString() ? `?${params.toString()}` : ""}`;
    startTransition(() => {
      router.push(url);
    });
  }, [deferredSearch, deferredTeam, deferredCompliance, router]);

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      if (deferredTeam !== "all") {
        const belongsToTeam = worker.teams.some((team) => team.teamId === deferredTeam);
        if (!belongsToTeam) return false;
      }
      if (deferredCompliance && !worker.compliance.isCompliant) {
        return false;
      }
      if (deferredSearch) {
        const term = deferredSearch.toLowerCase();
        const matches =
          worker.firstName.toLowerCase().includes(term) ||
          worker.lastName.toLowerCase().includes(term) ||
          (worker.email?.toLowerCase().includes(term) ?? false);
        if (!matches) return false;
      }
      return true;
    });
  }, [workers, deferredTeam, deferredCompliance, deferredSearch]);

  const workerVirtualizer = useVirtualizer({
    count: filteredWorkers.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });
  const virtualRows = workerVirtualizer.getVirtualItems();
  const workersHeight = workerVirtualizer.getTotalSize();

  return (
    <div className="space-y-6">
      <CreateWorkerModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      <Card>
        <CardHeader>
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold text-slate-900">Filtrer les effectifs</CardTitle>
            <Hint label="Astuce : combinez équipe + conformité" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-wrap gap-3">
            <Input
              placeholder="Rechercher un ouvrier"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="w-full md:max-w-xs"
            />
            <Select
              value={teamFilter === "all" ? "all" : String(teamFilter)}
              onChange={(event) =>
                setTeamFilter(event.target.value === "all" ? "all" : Number(event.target.value))
              }
              className="w-full md:w-48"
            >
              <option value="all">Toutes les équipes</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
              {[
                { id: false as const, label: "Tous" },
                { id: true as const, label: "Conformes" },
              ].map((option) => (
                <button
                  key={String(option.id)}
                  type="button"
                  onClick={() => setComplianceOnly(option.id)}
                  className={`rounded-full px-3 py-1 transition ${complianceOnly === option.id ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-900"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>Nouvel ouvrier</Button>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Équipes</h2>
            <p className="text-xs text-slate-500">Créez et organisez vos équipes en un clic.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTeamsPanelOpen((prev) => !prev)}
            className="border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {teamsPanelOpen ? "Masquer" : "Afficher"}
          </Button>
        </div>
        {teamsPanelOpen ? (
          <div className="mt-3">
            <TeamManager
              teams={teams}
              workers={workers.map((worker) => ({
                id: worker.id,
                firstName: worker.firstName,
                lastName: worker.lastName,
                status: worker.status,
              }))}
            />
          </div>
        ) : null}
      </div>

      <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold text-slate-900">
          {filteredWorkers.length} ouvrier(s)
        </CardTitle>
        {isPending ? (
          <Badge variant="secondary" className="text-xs">
            Mise à jour…
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div ref={tableParentRef} className="max-h-[520px] overflow-y-auto">
            <Table className="min-w-[960px] text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Ouvrier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Identifiants</TableHead>
                  <TableHead className="text-center">Conformité</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody
                style={{ position: "relative", height: filteredWorkers.length ? workersHeight : "auto" }}
              >
                {filteredWorkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      Aucun ouvrier ne correspond à la recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  virtualRows.map((virtualRow) => {
                    const worker = filteredWorkers[virtualRow.index];
                    if (!worker) return null;
                    return (
                      <TableRow
                        key={worker.id}
                        className="hover:bg-slate-50"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <TableCell className="min-w-[220px]">
                          <div className="flex items-start gap-3">
                            <Avatar
                              className="h-9 w-9"
                              initials={`${worker.firstName.charAt(0)}${worker.lastName.charAt(0)}`}
                            />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {worker.lastName.toUpperCase()} {worker.firstName}
                              </p>
                              <p className="text-xs text-slate-500">{STATUS_LABELS[worker.status] ?? worker.status}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="space-y-1 text-sm text-slate-600">
                          {worker.email && <div>{worker.email}</div>}
                          {worker.phone && <div>{worker.phone}</div>}
                        </TableCell>
                        <TableCell className="space-y-1 text-sm text-slate-600">
                          {worker.nationalId ? (
                            <p className="font-medium text-slate-700">
                              <span className="text-xs uppercase text-slate-400">NN :</span> {worker.nationalId}
                            </p>
                          ) : (
                            <span className="text-slate-400">NN manquant</span>
                          )}
                          {worker.status === "INDEPENDANT" && worker.vatNumber ? (
                            <p className="font-medium text-slate-700">
                              <span className="text-xs uppercase text-slate-400">TVA :</span> {worker.vatNumber}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={worker.compliance.isCompliant ? "success" : "warning"}>
                            {worker.compliance.isCompliant
                              ? "Conforme"
                              : `${worker.compliance.missing.length} manquant(s)`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline" className="rounded-xl px-3">
                            <Link href={`/workers/${worker.id}`}>Profil</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
  );
}
