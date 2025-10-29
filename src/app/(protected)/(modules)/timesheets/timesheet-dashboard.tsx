"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Hint } from "@/components/hint";
import { useToast } from "@/components/toast-provider";
import { cn, formatCurrency } from "@/lib/utils";
import { PeriodSwitcher } from "@/components/dashboard/period-switcher";
import { subMonths } from "date-fns";
import { ProjectSettingsModal, type ProjectSettings } from "@/components/projects/project-settings-modal";

const STATUS = {
  WORKED: "WORKED" as const,
  ABSENT: "ABSENT" as const,
};
function parseHHMMToHours(value: string): number | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 0) return null;
  const rounded = Math.round(totalMinutes / 15) * 15;
  return rounded / 60;
}

function formatHoursToHHMM(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatHoursHuman(hours: number): string {
  return formatHoursToHHMM(hours);
}

const dayShortFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

function formatDayShortLabel(dayKey: string): string {
  const safeDate = new Date(`${dayKey}T12:00:00`);
  return dayShortFormatter.format(safeDate).replace(/\.$/, "").toLowerCase();
}

type ProjectOption = {
  id: number;
  name: string;
  archived: boolean;
  billingRate: number | null;
  defaultHours: number | null;
  clientName: string | null;
};

type RosterEntry = {
  assigned: boolean;
  worker: {
    id: number;
    firstName: string;
    lastName: string;
    status: string;
    email: string | null;
    payRate: number | null;
    chargesPct: number | null;
    additionalCosts: Array<{
      id: number;
      label: string;
      unit: "HOUR" | "DAY";
      amount: number;
    }>;
  };
  compliance: {
    isCompliant: boolean;
    missing: string[];
  };
};

type RosterTeam = {
  id: number;
  name: string;
  members: Array<{
    workerId: number;
    firstName: string;
    lastName: string;
    status: string;
  }>;
};

type Day = {
  key: string;
  label: string;
  isWeekend: boolean;
};

type Entry = {
  id: number;
  workerId: number;
  date: string;
  hours: number;
  status: "WORKED" | "ABSENT";
  note?: string | null;
};

type Props = {
  projects: ProjectOption[];
  projectId: number;
  month: string;
  roster: RosterEntry[];
  days: Day[];
  entries: Entry[];
  teams: RosterTeam[];
  navigation?:
    | { mode: "global"; fromClient?: string }
    | { mode: "client"; slug: string; onNavigate?: (projectId: number, month: string) => void };
};

type EntryState = {
  hours: number;
  status: "WORKED" | "ABSENT";
  note?: string | null;
};

const exportOptions: Array<{ value: "payroll" | "detail" | "global"; label: string }> = [
  { value: "payroll", label: "Export Paie" },
  { value: "detail", label: "Export Détail" },
  { value: "global", label: "Export Global" },
];

export default function TimesheetDashboard({
  projects,
  projectId,
  month,
  roster,
  days,
  entries,
  teams,
  navigation = { mode: "global" },
}: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [rosterState, setRosterState] = useState(() => roster);
  const [entriesState, setEntriesState] = useState<Record<string, EntryState>>(() => {
    const initial: Record<string, EntryState> = {};
    for (const entry of entries) {
      initial[keyFor(entry.workerId, entry.date)] = {
        hours: entry.hours,
        status: entry.status,
        note: entry.note ?? null,
      };
    }
    return initial;
  });
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"sheet" | "roster" | "totals">("sheet");
  const [rosterQuery, setRosterQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [assigningTeamId, setAssigningTeamId] = useState<number | null>(null);

  const navigate = (nextProjectId: number, nextMonth: string) => {
    if (navigation.mode === "client") {
      if (navigation.onNavigate) {
        navigation.onNavigate(nextProjectId, nextMonth);
        return;
      }
      const params = new URLSearchParams();
      params.set("projectId", String(nextProjectId));
      if (nextMonth) params.set("month", nextMonth);
      params.set("tab", "pointage");
      router.push(`/clients/${navigation.slug}?${params.toString()}`);
      return;
    }
    const params = new URLSearchParams({ month: nextMonth, projectId: String(nextProjectId) });
    if (navigation.fromClient) {
      params.set("fromClient", navigation.fromClient);
      params.set("tab", "pointage");
    }
    router.push(`/timesheets?${params.toString()}`);
  };

  const monthOptions = useMemo(() => generateTimesheetMonthOptions(), []);
  const currentProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projects, projectId]);
  const projectSettings: ProjectSettings | null = currentProject
    ? {
        id: currentProject.id,
        name: currentProject.name,
        clientName: currentProject.clientName,
        billingRate: currentProject.billingRate,
        defaultHours: currentProject.defaultHours,
        archived: currentProject.archived,
      }
    : null;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const assignedRoster = useMemo(
    () => rosterState.filter((slot) => slot.assigned),
    [rosterState],
  );

  const availableRoster = useMemo(
    () => rosterState.filter((slot) => !slot.assigned),
    [rosterState],
  );

  const normalizedRosterQuery = rosterQuery.trim().toLowerCase();

  const filteredRoster = useMemo(() => {
    if (!normalizedRosterQuery) {
      return { assigned: assignedRoster, available: availableRoster };
    }

    return rosterState.reduce(
      (acc, slot) => {
        const fullName = `${slot.worker.firstName} ${slot.worker.lastName}`.toLowerCase();
        if (!fullName.includes(normalizedRosterQuery)) {
          return acc;
        }
        if (slot.assigned) {
          acc.assigned.push(slot);
        } else {
          acc.available.push(slot);
        }
        return acc;
      },
      { assigned: [] as RosterEntry[], available: [] as RosterEntry[] },
    );
  }, [assignedRoster, availableRoster, normalizedRosterQuery, rosterState]);

  const assignableTeams = useMemo(
    () => teams.filter((team) => team.members.length > 0),
    [teams],
  );

const workerTotals = useMemo(() => {
  const totals: Record<number, number> = {};
  for (const slot of assignedRoster) {
    totals[slot.worker.id] = 0;
  }
  for (const [key, entry] of Object.entries(entriesState)) {
    if (entry.status === STATUS.ABSENT || entry.hours <= 0) continue;
    const workerId = Number(key.split(":")[0]);
    totals[workerId] = (totals[workerId] ?? 0) + entry.hours;
  }
  return totals;
}, [entriesState, assignedRoster]);

const workerDayTotals = useMemo(() => {
  const totals: Record<number, number> = {};
  for (const slot of assignedRoster) {
    totals[slot.worker.id] = 0;
  }
  for (const slot of assignedRoster) {
    for (const day of days) {
      const entry = entriesState[keyFor(slot.worker.id, day.key)];
      if (!entry) continue;
      if (entry.status !== STATUS.WORKED) continue;
      if (entry.hours <= 0) continue;
      totals[slot.worker.id] = (totals[slot.worker.id] ?? 0) + 1;
    }
  }
  return totals;
}, [assignedRoster, days, entriesState]);

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of days) {
      totals[day.key] = 0;
    }
    for (const slot of assignedRoster) {
      for (const day of days) {
        const entry = entriesState[keyFor(slot.worker.id, day.key)];
        if (entry && entry.status === STATUS.WORKED) {
          totals[day.key] += entry.hours;
        }
      }
    }
    return totals;
  }, [entriesState, assignedRoster, days]);

  const totalHours = useMemo(
    () => Object.values(workerTotals).reduce((acc, value) => acc + value, 0),
    [workerTotals],
  );
  const averagePerWorker = assignedRoster.length > 0 ? totalHours / assignedRoster.length : 0;

  const handleExport = (kind: "payroll" | "detail" | "global") => {
    const query = new URLSearchParams({
      projectId: String(projectId),
      month,
      kind,
    });
    window.location.href = `/api/timesheets/export?${query.toString()}`;
  };

  const handleProjectChange = (nextId: number) => {
    setActiveTab("sheet");
    navigate(nextId, month);
  };

  const handleMonthChange = (nextMonth: string) => {
    navigate(projectId, nextMonth);
  };

  const toggleAssignment = async (workerId: number, nextAssigned: boolean) => {
    setPendingAssignment(workerId);
    const previous = rosterState.map((slot) => ({ ...slot }));
    setRosterState((prev) =>
      prev.map((slot) =>
        slot.worker.id === workerId ? { ...slot, assigned: nextAssigned } : slot,
      ),
    );

    try {
      if (nextAssigned) {
        const response = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, workerId }),
        });
        if (!response.ok) throw new Error("Assignment failed");
      } else {
        const response = await fetch("/api/assignments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, workerId }),
        });
        if (!response.ok) throw new Error("Unassignment failed");
        setEntriesState((prev) => {
          const copy = { ...prev };
          for (const day of days) {
            delete copy[keyFor(workerId, day.key)];
          }
          return copy;
        });
      }
    } catch (error) {
      console.error(error);
      setRosterState(previous);
      push({
        title: "Échec de la mise à jour",
        description: "Impossible de modifier l'affectation. Veuillez réessayer.",
        variant: "error",
      });
    } finally {
      setPendingAssignment(null);
    }
  };

  const saveEntry = async (
    workerId: number,
    date: string,
    update: CellUpdate,
  ) => {
    const key = keyFor(workerId, date);
    const previous = entriesState;
    const nextState = applyEntryUpdate(previous, key, update);
    setPendingCell(key);
    setEntriesState(nextState);

    try {
      const response = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          projectId,
          workerId,
          date,
          hours: update.hours,
          status: update.status,
        }),
      });
      if (!response.ok) {
        let message = `Entry update failed (${response.status})`;
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        } catch (error) {
          console.warn("Failed to parse error response", error);
        }
        throw new Error(message);
      }
    } catch (error) {
      console.error(error);
      setEntriesState(previous);
      push({
        title: "Erreur de pointage",
        description:
          error instanceof Error ? error.message : "La cellule n'a pas pu être enregistrée.",
        variant: "error",
      });
    } finally {
      setPendingCell(null);
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedTeamId) return;
    const teamId = Number(selectedTeamId);
    const team = teams.find((item) => item.id === teamId);
    if (!team) return;
    setAssigningTeamId(teamId);
    try {
      for (const member of team.members) {
        const alreadyAssigned = rosterState.some(
          (slot) => slot.worker.id === member.workerId && slot.assigned,
        );
        if (alreadyAssigned) continue;
        await toggleAssignment(member.workerId, true);
      }
      push({ title: "Équipe affectée", variant: "success" });
    } catch (error) {
      console.error(error);
      push({
        title: "Erreur",
        description: "Impossible d'affecter l'équipe. Réessayez.",
        variant: "error",
      });
    } finally {
      setAssigningTeamId(null);
      setSelectedTeamId("");
    }
  };

  const assignedCount = assignedRoster.length;
  const nonCompliantCount = assignedRoster.filter((slot) => !slot.compliance.isCompliant).length;
  const billingRate = projectSettings?.billingRate ?? null;
  const invoiceEstimate = useMemo(() => {
    if (billingRate === null || billingRate === undefined) return null;
    return totalHours * billingRate;
  }, [billingRate, totalHours]);
  const { payrollEstimate, workersWithPayRate } = useMemo(() => {
    let total = 0;
    let workersCount = 0;

    for (const slot of assignedRoster) {
      const workerId = slot.worker.id;
      const hours = workerTotals[workerId] ?? 0;
      const daysWorked = workerDayTotals[workerId] ?? 0;

      let workerCost = 0;

      const rate = slot.worker.payRate ?? null;
      if (rate !== null && rate > 0) {
        const charges = slot.worker.chargesPct ?? 0;
        const baseCost = hours * rate;
        workerCost += baseCost * (1 + charges / 100);
        workersCount += 1;
      }

      if (slot.worker.additionalCosts?.length) {
        for (const cost of slot.worker.additionalCosts) {
          const amount = cost.amount;
          if (!amount || Number.isNaN(amount)) continue;
          if (cost.unit === "HOUR") {
            workerCost += amount * hours;
          } else if (cost.unit === "DAY") {
            workerCost += amount * daysWorked;
          }
        }
      }

      total += workerCost;
    }

    return {
      payrollEstimate: total > 0 ? total : null,
      workersWithPayRate: workersCount,
    };
  }, [assignedRoster, workerTotals, workerDayTotals]);
  const workersMissingPayRate = Math.max(assignedCount - workersWithPayRate, 0);
  const marginEstimate = invoiceEstimate !== null && payrollEstimate !== null ? invoiceEstimate - payrollEstimate : null;
  const payrollCoverage =
    invoiceEstimate !== null && payrollEstimate !== null && payrollEstimate > 0 ? invoiceEstimate / payrollEstimate : null;
  const averagePayrollRate = payrollEstimate !== null && totalHours > 0 ? payrollEstimate / totalHours : null;

  const summaryStats = [
    {
      label: "Heures validées",
      value: formatHoursHuman(totalHours),
      helper: assignedCount ? `${assignedCount} ouvriers concernés` : "Aucun ouvrier affecté",
    },
    {
      label: "Facturation estimée",
      value: invoiceEstimate !== null ? formatCurrency(invoiceEstimate) : "—",
      helper:
        billingRate !== null
          ? `Heures × ${formatCurrency(billingRate)} /h`
          : "Définissez le taux de facturation dans Paramètres",
    },
    {
      label: "Masse salariale estimée",
      value: payrollEstimate !== null ? formatCurrency(payrollEstimate) : "—",
      helper:
        assignedCount === 0
          ? "Aucun ouvrier affecté"
          : workersWithPayRate > 0
            ? `${workersWithPayRate}/${assignedCount} ouvriers avec taux${
                workersMissingPayRate > 0 ? ` (${workersMissingPayRate} à compléter)` : ""
              }`
            : "Ajoutez les taux de paie ouvriers",
    },
  ];
  const secondaryStats = [
    {
      label: "Heures moyennes / ouvrier",
      value: assignedCount > 0 ? formatHoursHuman(averagePerWorker) : "—",
      helper: "Total / effectif",
    },
    {
      label: "Coût horaire moyen (estim.)",
      value: averagePayrollRate !== null ? `${formatCurrency(averagePayrollRate)} /h` : "—",
      helper:
        payrollEstimate !== null
          ? "Masse salariale ÷ heures validées"
          : "Renseignez les taux ouvriers",
    },
    {
      label: "Marge estimée",
      value: marginEstimate !== null ? formatCurrency(marginEstimate) : "—",
      helper:
        invoiceEstimate !== null && payrollEstimate !== null
          ? "Facturation - paie"
          : "Ajoutez les taux pour calculer la marge",
    },
    {
      label: "Couverture paie",
      value: payrollCoverage !== null ? `${Math.round(Math.min(payrollCoverage * 100, 999))}%` : "—",
      helper:
        payrollEstimate !== null
          ? "Facturation / paie"
          : "Taux de facturation et paie requis",
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Paramètres du chantier</CardTitle>
              <CardDescription>Choisissez le chantier, ajustez la période et pilotez votre liste du personnel.</CardDescription>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              {projectSettings ? (
                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                  Paramètres
                </Button>
              ) : null}
              <div className="ml-auto">
                <ExportMenu onSelect={handleExport} />
              </div>
            </div>
          </div>
          {projectSettings ? (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Client</p>
                <p className="text-sm font-medium text-slate-800">{projectSettings.clientName ?? "Non défini"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Taux facturation</p>
                <p className="text-sm font-medium text-slate-800">
                  {projectSettings.billingRate !== null ? formatCurrency(projectSettings.billingRate) : "Non défini"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Heures par défaut</p>
                <p className="text-sm font-medium text-slate-800">
                  {projectSettings.defaultHours !== null ? formatHoursHuman(projectSettings.defaultHours) : "Non défini"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Statut</p>
                <p className="text-sm font-medium text-slate-800">
                  {projectSettings.archived ? "Archivé" : "Actif"}
                </p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chantier</p>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-inner">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeProjectByOffset(projects, projectId, -1, handleProjectChange)}
                  disabled={projectIndex(projects, projectId) <= 0}
                  aria-label="Chantier précédent"
                >
                  ‹
                </Button>
                <Select
                  value={String(projectId)}
                  onChange={(event) => handleProjectChange(Number(event.target.value))}
                  className="border-0 bg-transparent text-sm"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.archived ? " (archivé)" : ""}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeProjectByOffset(projects, projectId, 1, handleProjectChange)}
                  disabled={projectIndex(projects, projectId) >= projects.length - 1}
                  aria-label="Chantier suivant"
                >
                  ›
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Période</p>
              <PeriodSwitcher
                mode="month"
                value={month}
                monthOptions={monthOptions}
                quarterOptions={[]}
                onChange={(_, nextValue) => handleMonthChange(nextValue)}
                className="justify-start"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ouvriers affectés</p>
              <p className="text-sm font-semibold text-slate-700">{assignedCount}</p>
              <p className="text-xs text-slate-500">Gérez l&apos;équipe ou ajoutez des renforts.</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conformité</p>
              <p className="text-sm font-semibold text-slate-700">
                {nonCompliantCount > 0 ? `${nonCompliantCount} à vérifier` : "Tout est conforme"}
              </p>
              {nonCompliantCount > 0 ? (
                <p className="text-xs text-amber-600">Ouvrez l&apos;équipe pour consulter les documents manquants.</p>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "sheet" | "roster" | "totals")}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-slate-200 bg-slate-100 p-1">
          <TabsTrigger value="sheet">Pointage</TabsTrigger>
          <TabsTrigger value="roster">Liste du personnel</TabsTrigger>
          <TabsTrigger value="totals">Totaux</TabsTrigger>
        </TabsList>
        <Hint label="Cliquez une cellule pour saisir ou marquer une absence" />

        <TabsContent value="sheet" className="space-y-4">
          <Card className="overflow-hidden min-w-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold text-slate-900">Feuille de temps</CardTitle>
              <CardDescription>
                Complétez les heures jour par jour. Les affectations se gèrent dans l&apos;onglet « Liste du personnel ».
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 min-w-0">
              <div className="w-full min-w-0 overflow-x-auto">
                <Table className="min-w-[760px] text-sm">
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                      <TableHead className="sticky left-0 z-30 w-52 bg-white text-left text-slate-700 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                        Ouvrier
                      </TableHead>
                      {days.map((day) => (
                        <TableHead
                          key={day.key}
                          className={cn(
                            "min-w-[42px] px-0 text-center text-slate-700",
                            day.isWeekend ? "bg-amber-50" : "",
                          )}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5 py-0.5">
                            <span className="text-[9px] font-semibold uppercase tracking-tight text-slate-500">
                              {formatDayShortLabel(day.key)}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-900">{day.label}</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-24 text-right text-slate-700">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedRoster.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={days.length + 2} className="py-10 text-center text-slate-500">
                          Aucun ouvrier affecté à ce chantier pour cette période.
                          <div className="mt-3">
                            <Link
                              href="/workers"
                              className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              Ajouter un ouvrier
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedRoster.map((slot) => (
                        <TableRow key={slot.worker.id} className="hover:bg-transparent">
                          <TableCell className="sticky left-0 z-20 bg-white shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-slate-800">
                                {slot.worker.lastName.toUpperCase()} {slot.worker.firstName}
                              </span>
                              <span className="text-xs text-slate-500">
                                Total : {formatHoursHuman(workerTotals[slot.worker.id] ?? 0)}
                              </span>
                            </div>
                          </TableCell>
                          {days.map((day) => {
                            const key = keyFor(slot.worker.id, day.key);
                            const entry = entriesState[key];
                            return (
                              <TableCell
                                key={key}
                                className={cn(
                                  "min-w-[42px] px-0 text-center",
                                  day.isWeekend ? "bg-amber-50" : "",
                                )}
                              >
                                <TimesheetCell
                                  workerId={slot.worker.id}
                                  date={day.key}
                                  isWeekend={day.isWeekend}
                                  value={entry}
                                  loading={pendingCell === key}
                                  defaultHours={projectSettings?.defaultHours ?? null}
                                  onSubmit={saveEntry}
                                />
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-semibold text-slate-800">
                            {formatHoursHuman(workerTotals[slot.worker.id] ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {assignedRoster.length > 0 ? (
                    <tfoot>
                      <tr className="bg-slate-50 text-sm font-semibold text-slate-600">
                        <td className="sticky left-0 z-20 bg-white px-4 py-3 text-slate-800 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                          Total jour
                        </td>
                        {days.map((day) => (
                          <td key={day.key} className="min-w-[42px] px-0.5 py-3 text-center">
                            {formatHoursHuman(dayTotals[day.key] ?? 0)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">{formatHoursHuman(totalHours)}</td>
                      </tr>
                    </tfoot>
                  ) : null}
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster" className="space-y-4">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold text-slate-900">Liste du personnel & conformité</CardTitle>
              <CardDescription>Gérez les affectations et gardez un œil sur la conformité documentaire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Badge variant={nonCompliantCount > 0 ? "warning" : "success"}>
                    {nonCompliantCount > 0 ? `${nonCompliantCount} contrôle(s) à traiter` : "Équipe conforme"}
                  </Badge>
                  <Hint label="Astuce : affectez vos renforts ici" />
                </div>
                <Input
                  placeholder="Rechercher un ouvrier"
                  value={rosterQuery}
                  onChange={(event) => setRosterQuery(event.target.value)}
                  className="w-full max-w-xs"
                />
              </div>
              {assignableTeams.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Affecter une équipe
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                      value={selectedTeamId}
                      onChange={(event) => setSelectedTeamId(event.target.value)}
                      className="w-full sm:max-w-xs"
                    >
                      <option value="">Sélectionner une équipe</option>
                      {assignableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} · {team.members.length} membre(s)
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!selectedTeamId || assigningTeamId !== null}
                      onClick={handleAssignTeam}
                      className="sm:w-auto"
                    >
                      {assigningTeamId ? "Affectation…" : "Affecter"}
                    </Button>
                  </div>
                </div>
              ) : null}
              <Separator />
              <RosterSection
                title={`Affectés (${assignedRoster.length})`}
                emptyMessage="Aucun ouvrier affecté."
                slots={filteredRoster.assigned}
                onToggle={toggleAssignment}
                pendingId={pendingAssignment}
                actionLabel="Retirer"
                actionVariant="ghost"
                nextAssigned={false}
              />
              <RosterSection
                title="Disponibles"
                emptyMessage="Aucun ouvrier disponible correspondant à la recherche."
                slots={filteredRoster.available}
                onToggle={toggleAssignment}
                pendingId={pendingAssignment}
                actionLabel="Affecter"
                actionVariant="secondary"
                nextAssigned={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="totals">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold text-slate-900">Totaux & indicateurs</CardTitle>
              <CardDescription>Préparez vos exports en vérifiant les totaux clés de la période.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {summaryStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-inner"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.helper}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                {secondaryStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.helper}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Conseil : utilisez « Paramètres » pour configurer vos exports paie, puis relancez la génération depuis l&apos;onglet Pointage.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <ProjectSettingsModal
        open={settingsOpen && Boolean(projectSettings)}
        onClose={() => setSettingsOpen(false)}
        project={projectSettings}
        onSaved={() => {
          push({ title: "Chantier mis à jour", variant: "success" });
          setSettingsOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function keyFor(workerId: number, date: string) {
  return `${workerId}:${date}`;
}

type CellUpdate = {
  status: "WORKED" | "ABSENT";
  hours: number;
};

type CellProps = {
  workerId: number;
  date: string;
  value?: EntryState;
  isWeekend: boolean;
  loading: boolean;
  defaultHours: number | null;
  onSubmit: (workerId: number, date: string, update: CellUpdate) => Promise<void>;
};

function TimesheetCell({ workerId, date, value, isWeekend, loading, defaultHours, onSubmit }: CellProps) {
  const initialHours = value?.hours ?? 0;
  const initialStatus = value?.status === STATUS.WORKED && initialHours > 0 ? STATUS.WORKED : STATUS.ABSENT;
  const [timeValue, setTimeValue] = useState(() =>
    initialStatus === STATUS.WORKED ? formatHoursToHHMM(initialHours) : "00:00",
  );
  const [status, setStatus] = useState<CellUpdate["status"]>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipBlurRef = useRef(false);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const timeValueRef = useRef(timeValue);
  const isMountedRef = useRef(true);
  const dirtyRef = useRef(false);

  const clearAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, []);

  const persist = useCallback(
    async (input?: string) => {
      const baseInput = input ?? timeValueRef.current ?? "00:00";
      const sanitized = baseInput.trim() === "" ? "00:00" : baseInput.trim();
      const parsed = parseHHMMToHours(sanitized);
      if (parsed === null) {
        if (isMountedRef.current) {
          setError("Format HH:MM requis");
        }
        return;
      }

      clearAutoSave();

      const nextStatus = parsed > 0 ? STATUS.WORKED : STATUS.ABSENT;
      const formatted = formatHoursToHHMM(parsed);
      timeValueRef.current = formatted;

      if (isMountedRef.current) {
        setSaving(true);
      }

      try {
        await onSubmit(workerId, date, { status: nextStatus, hours: parsed });
      } catch {
        dirtyRef.current = true;
        if (isMountedRef.current) {
          setError("Enregistrement impossible");
        }
        if (autoSaveTimeoutRef.current === null) {
          autoSaveTimeoutRef.current = window.setTimeout(() => {
            autoSaveTimeoutRef.current = null;
            if (dirtyRef.current) {
              void persist();
            }
          }, 5000);
        }
        return;
      } finally {
        if (isMountedRef.current) {
          setSaving(false);
        }
      }

      dirtyRef.current = false;

      if (!isMountedRef.current) {
        return;
      }

      setStatus(nextStatus);
      setTimeValue(formatted);
      setError(null);
    },
    [clearAutoSave, date, onSubmit, workerId],
  );

  const scheduleAutoSave = useCallback(() => {
    if (!dirtyRef.current) {
      return;
    }
    clearAutoSave();
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      autoSaveTimeoutRef.current = null;
      if (dirtyRef.current) {
        void persist();
      }
    }, 5000);
  }, [clearAutoSave, persist]);

  const flushAutoSave = useCallback(() => {
    if (!dirtyRef.current) {
      clearAutoSave();
      return;
    }
    clearAutoSave();
    void persist();
  }, [clearAutoSave, persist]);

  useEffect(() => {
    const nextStatus = value?.status === STATUS.WORKED && (value?.hours ?? 0) > 0 ? STATUS.WORKED : STATUS.ABSENT;
    const nextInput = nextStatus === STATUS.WORKED ? formatHoursToHHMM(value?.hours ?? 0) : "00:00";
    clearAutoSave();
    dirtyRef.current = false;
    timeValueRef.current = nextInput;
    setTimeValue(nextInput);
    setStatus(nextStatus);
    setError(null);
  }, [value?.hours, value?.status, clearAutoSave]);

  useEffect(() => {
    timeValueRef.current = timeValue;
  }, [timeValue]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushAutoSave();
      }
    };
    const handlePageHide = () => {
      flushAutoSave();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushAutoSave]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      flushAutoSave();
    };
  }, [flushAutoSave]);

  const handleBlur = async () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    if (saving) return;
    clearAutoSave();
    if (!dirtyRef.current) return;
    await persist();
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!dirtyRef.current) return;
      await persist();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      const revertStatus = value?.status === STATUS.WORKED && (value?.hours ?? 0) > 0 ? STATUS.WORKED : STATUS.ABSENT;
      const revertInput = revertStatus === STATUS.WORKED ? formatHoursToHHMM(value?.hours ?? 0) : "00:00";
      setTimeValue(revertInput);
      setStatus(revertStatus);
      setError(null);
      timeValueRef.current = revertInput;
      dirtyRef.current = false;
      clearAutoSave();
    }
  };

  const getDefaultHours = () => {
    const effective = defaultHours !== null ? defaultHours : 7.5;
    return effective > 0 ? effective : 7.5;
  };

  const handleStatusToggle = async () => {
    skipBlurRef.current = true;
    if (status === STATUS.ABSENT) {
      const formatted = formatHoursToHHMM(getDefaultHours());
      setTimeValue(formatted);
      timeValueRef.current = formatted;
      setStatus(STATUS.WORKED);
      dirtyRef.current = true;
      await persist(formatted);
      skipBlurRef.current = false;
      return;
    }

    setTimeValue("00:00");
    timeValueRef.current = "00:00";
    setStatus(STATUS.ABSENT);
    dirtyRef.current = true;
    await persist("00:00");
    skipBlurRef.current = false;
  };

  const cellClasses = cn(
    "flex flex-col gap-0.5 rounded-md border px-0.5 py-1 text-left transition focus-within:ring-2 focus-within:ring-sky-200",
    status === STATUS.WORKED ? "border-emerald-200 bg-[#EAF9E8]" : "border-slate-200 bg-slate-100",
    isWeekend ? "ring-1 ring-amber-200" : "",
    loading ? "pointer-events-none opacity-50" : "hover:border-sky-300",
  );

  const statusButtonClasses = cn(
    "w-full rounded-md px-0.5 py-0.5 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
    status === STATUS.WORKED
      ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25"
      : "bg-slate-100 text-slate-500 hover:bg-slate-200",
  );

  return (
    <div className={cellClasses}>
      <input
        type="time"
        className="h-7 w-full rounded-md border border-slate-300 px-0.5 text-[11px] font-semibold text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none"
        value={timeValue}
        onChange={(event) => {
          const next = event.target.value;
          setTimeValue(next);
          timeValueRef.current = next;
          const parsed = parseHHMMToHours(next);
          setStatus(parsed !== null && parsed > 0 ? STATUS.WORKED : STATUS.ABSENT);
          setError(null);
          dirtyRef.current = true;
          scheduleAutoSave();
        }}
        onBlur={handleBlur}
        onKeyDown={(event) => void handleKeyDown(event)}
        step={900}
        placeholder="00:00"
        disabled={saving}
      />
      <button
        type="button"
        className={statusButtonClasses}
        onMouseDown={() => {
          skipBlurRef.current = true;
        }}
        onClick={() => void handleStatusToggle()}
        disabled={saving}
      >
        {status === STATUS.WORKED ? "Travaillé" : "Absent"}
      </button>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

type RosterSectionProps = {
  title: string;
  emptyMessage: string;
  slots: RosterEntry[];
  onToggle: (workerId: number, nextAssigned: boolean) => Promise<void> | void;
  pendingId: number | null;
  actionLabel: string;
  actionVariant: "ghost" | "secondary";
  nextAssigned: boolean;
};

function RosterSection({
  title,
  emptyMessage,
  slots,
  onToggle,
  pendingId,
  actionLabel,
  actionVariant,
  nextAssigned,
}: RosterSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-400">{slots.length}</span>
      </div>
      {slots.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <WorkerRowCard
              key={`${title}-${slot.worker.id}`}
              slot={slot}
              actionLabel={actionLabel}
              actionVariant={actionVariant}
              onAction={() => onToggle(slot.worker.id, nextAssigned)}
              pending={pendingId === slot.worker.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function generateTimesheetMonthOptions(count = 12): Array<{ value: string; label: string }> {
  const formatter = new Intl.DateTimeFormat("fr-BE", { month: "long", year: "numeric" });
  const base = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = subMonths(base, index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      value,
      label: formatter.format(date),
    };
  });
}

function projectIndex(projects: ProjectOption[], currentId: number) {
  return projects.findIndex((project) => project.id === currentId);
}

function changeProjectByOffset(
  projects: ProjectOption[],
  currentId: number,
  offset: number,
  onSelect: (projectId: number) => void,
) {
  const index = projectIndex(projects, currentId);
  if (index === -1) return;
  const next = projects[index + offset];
  if (!next) return;
  onSelect(next.id);
}


function applyEntryUpdate(
  state: Record<string, EntryState>,
  key: string,
  update: CellUpdate,
): Record<string, EntryState> {
  if (update.status === STATUS.ABSENT || update.hours <= 0) {
    return {
      ...state,
      [key]: {
        hours: 0,
        status: STATUS.ABSENT,
        note: state[key]?.note ?? null,
      },
    };
  }

  return {
    ...state,
    [key]: {
      hours: update.hours,
      status: STATUS.WORKED,
      note: state[key]?.note ?? null,
    },
  };
}


type WorkerRowCardProps = {
  slot: RosterEntry;
  actionLabel: string;
  actionVariant: "ghost" | "secondary";
  onAction: () => void;
  pending: boolean;
};

function WorkerRowCard({ slot, actionLabel, actionVariant, onAction, pending }: WorkerRowCardProps) {
  const fullName = `${slot.worker.lastName.toUpperCase()} ${slot.worker.firstName}`;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">{fullName}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{slot.worker.status}</span>
          {slot.compliance.isCompliant ? (
            <Badge variant="success">Conforme</Badge>
          ) : (
            <Badge variant="warning">{slot.compliance.missing.length} doc(s) manquant(s)</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant={actionVariant} size="sm" onClick={onAction} disabled={pending}>
          {pending ? "…" : actionLabel}
        </Button>
      </div>
    </div>
  );
}

type ExportMenuProps = {
  onSelect: (kind: "payroll" | "detail" | "global") => void;
};

function ExportMenu({ onSelect }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button onClick={() => setOpen((prev) => !prev)} className="gap-2">
        Exporter
        <span className="text-xs">▾</span>
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {exportOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100"
              onClick={() => {
                setOpen(false);
                onSelect(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
