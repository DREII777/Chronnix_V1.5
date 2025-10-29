import Link from "next/link";
import TimesheetDashboard from "@/app/(protected)/(modules)/timesheets/timesheet-dashboard";
import { PageHeader } from "@/components/page-header";
import { CreateProjectEmptyState } from "@/components/timesheets/create-project-empty";
import { listProjects } from "@/data/projects";
import { getTimesheetData } from "@/data/timesheets";
import { requireUser } from "@/lib/auth";
import { getMonthDays } from "@/utils/date";
export const dynamic = "force-dynamic";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; projectId?: string; fromClient?: string }>;
}) {
  const user = await requireUser();
  const accountId = user.accountId;

  const params = (searchParams ? await searchParams : undefined) ?? {};
  const projects = await listProjects(accountId);
  const selectedProjectId = params.projectId ? Number(params.projectId) : projects[0]?.id;
  const month = params.month ?? getCurrentMonth();
  const fromClient = params.fromClient ?? null;

  if (!selectedProjectId) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Pointage"
          description="Affectez vos équipes, collectez les heures quotidiennes et exportez vos rapports en quelques clics."
        />
        <CreateProjectEmptyState />
      </div>
    );
  }

  const timesheet = await getTimesheetData(accountId, { projectId: selectedProjectId, month });
  const days = getMonthDays(month).map((day) => ({
    key: day.key,
    label: day.label,
    isWeekend: day.isWeekend,
  }));

  const entries = timesheet.entries.map((entry) => ({
    id: entry.id,
    workerId: entry.workerId,
    date: entry.date.toISOString().slice(0, 10),
    hours: Number(entry.hours),
    status: entry.status as "WORKED" | "ABSENT",
    note: entry.note,
  }));

  const roster = timesheet.roster.map((slot) => ({
    assigned: slot.assigned,
    worker: {
      id: slot.worker.id,
      firstName: slot.worker.firstName,
      lastName: slot.worker.lastName,
      status: slot.worker.status,
      email: slot.worker.email,
      payRate:
        slot.worker.payRate !== null && slot.worker.payRate !== undefined
          ? Number(slot.worker.payRate)
          : null,
      chargesPct:
        slot.worker.chargesPct !== null && slot.worker.chargesPct !== undefined
          ? Number(slot.worker.chargesPct)
          : null,
      additionalCosts: (slot.worker.additionalCosts ?? []).map((cost) => ({
        id: cost.id,
        label: cost.label,
        unit: cost.unit as "HOUR" | "DAY",
        amount: Number(cost.amount),
      })),
    },
    compliance: slot.compliance,
  }));

  const teamOptions = timesheet.teams.map((team) => ({
    id: team.id,
    name: team.name,
    members: team.members.map((member) => ({
      workerId: member.workerId,
      firstName: member.worker.firstName,
      lastName: member.worker.lastName,
      status: member.worker.status,
    })),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        {fromClient ? (
          <Link href={`/clients/${fromClient}`} className="text-sm text-slate-500 hover:text-slate-700">
            ← Retour au client
          </Link>
        ) : null}
        <PageHeader
          title="Pointage"
          description="Comparez la liste du personnel, les heures pointées et les totaux exports dans une même interface multi-onglets."
        />
      </div>
      <TimesheetDashboard
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          archived: project.archived,
          clientName: project.clientName ?? null,
          billingRate: project.billingRate !== null ? Number(project.billingRate) : null,
          defaultHours: project.defaultHours !== null ? Number(project.defaultHours) : null,
        }))}
        projectId={selectedProjectId}
        month={month}
        roster={roster}
        days={days}
        entries={entries}
        navigation={{
          mode: "global",
          fromClient: fromClient ?? undefined,
        }}
        teams={teamOptions}
      />
    </div>
  );
}
