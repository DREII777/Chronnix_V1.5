import { prisma } from "@/data/prisma";
import {
  formatDisplayMonth,
  formatDisplayQuarter,
  getMonthInterval,
  getQuarterInterval,
  getQuarterKey,
  parseMonth,
  parseQuarter,
} from "@/utils/date";
import { format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

type DashboardPeriodMode = "month" | "quarter";

type DashboardRequest = {
  mode: DashboardPeriodMode;
  value: string;
};

type DashboardSnapshot = {
  meta: {
    mode: DashboardPeriodMode;
    value: string;
    label: string;
    start: Date;
    end: Date;
  };
  totals: {
    amountToInvoice: number;
    amountToPay: number;
    billableHours: number;
    estimatedMargin: number;
  };
  overview: {
    activeProjects: number;
    activeWorkers: number;
  };
  topClients: Array<{ label: string; amount: number; hours: number }>;
  topProjects: Array<{
    id: number;
    label: string;
    client?: string | null;
    amount: number;
    hours: number;
    payroll: number;
    margin: number;
  }>;
  topWorkers: Array<{ id: number; label: string; amount: number; hours: number; status: string }>;
  trend: Array<{ label: string; invoice: number; payroll: number }>;
  performance: {
    weeklyHours: Array<{ label: string; hours: number }>;
    projectDistribution: Array<{ label: string; hours: number }>;
    workerActivity: Array<{ label: string; hours: number; status: string }>;
  };
  alerts: Array<{ type: "project" | "worker" | "compliance"; title: string; description: string; href?: string }>;
};

export async function getDashboardSnapshot(
  accountId: number,
  { mode, value }: DashboardRequest,
): Promise<DashboardSnapshot> {
  const interval = mode === "quarter" ? getQuarterInterval(value) : getMonthInterval(value);
  const label = mode === "quarter" ? formatDisplayQuarter(interval.start) : formatDisplayMonth(interval.start);

  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      date: {
        gte: interval.start,
        lte: interval.end,
      },
      project: {
        accountId,
      },
    },
    include: {
      project: true,
      worker: {
        include: {
          additionalCosts: true,
        },
      },
    },
  });

  let amountToInvoice = 0;
  let amountToPay = 0;
  let billableHours = 0;

  const clients = new Map<string, { label: string; amount: number; hours: number }>();
  const projects = new Map<
    number,
    { id: number; label: string; client?: string | null; amount: number; hours: number; payroll: number }
  >();
  const workers = new Map<number, { id: number; label: string; amount: number; hours: number; status: string }>();
  const trend = new Map<string, { label: string; invoice: number; payroll: number; order: number }>();
  const weekly = new Map<string, { label: string; hours: number; order: number }>();

  for (const entry of timeEntries) {
    if (entry.status === "ABSENT") continue;
    const hours = Number(entry.hours ?? 0);
    if (hours <= 0) continue;

    const project = entry.project;
    const worker = entry.worker;

    const billingRate = project?.billingRate ? Number(project.billingRate) : 0;
    const payrollRate = worker?.payRate ? Number(worker.payRate) : 0;
    const chargesPct = worker?.chargesPct ? Number(worker.chargesPct) : 0;

    const invoiceAmount = hours * billingRate;
    const basePayroll = hours * payrollRate;
    const chargesAmount = basePayroll * (chargesPct / 100);

    let additionalCostAmount = 0;
    if (worker?.additionalCosts?.length) {
      for (const cost of worker.additionalCosts) {
        const amount = cost.amount ? Number(cost.amount) : 0;
        if (!amount) continue;
        if (cost.unit === "HOUR") {
          additionalCostAmount += amount * hours;
        } else if (cost.unit === "DAY") {
          additionalCostAmount += amount;
        }
      }
    }

    const payrollAmount = basePayroll + chargesAmount + additionalCostAmount;

    amountToInvoice += invoiceAmount;
    amountToPay += payrollAmount;
    billableHours += hours;

    const clientLabel = project?.clientName?.trim() || "Client indéfini";
    const clientBucket = clients.get(clientLabel) ?? { label: clientLabel, amount: 0, hours: 0 };
    clientBucket.amount += invoiceAmount;
    clientBucket.hours += hours;
    clients.set(clientLabel, clientBucket);

    if (project) {
      const projectBucket =
        projects.get(project.id) ?? {
          id: project.id,
          label: project.name,
          client: project.clientName,
          amount: 0,
          hours: 0,
          payroll: 0,
        };
      projectBucket.amount += invoiceAmount;
      projectBucket.hours += hours;
      projectBucket.payroll += payrollAmount;
      projects.set(project.id, projectBucket);
    }

    if (worker) {
      const workerBucket =
        workers.get(worker.id) ?? {
          id: worker.id,
          label: `${worker.firstName} ${worker.lastName}`.trim(),
          amount: 0,
          hours: 0,
          status: worker.status,
        };
      workerBucket.amount += payrollAmount;
      workerBucket.hours += hours;
      workers.set(worker.id, workerBucket);
    }

    const entryDate = new Date(entry.date);
    const bucketDate = mode === "quarter" ? new Date(entryDate.getFullYear(), entryDate.getMonth(), 1) : entryDate;
    const bucketKey =
      mode === "quarter"
        ? `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}`
        : bucketDate.toISOString().slice(0, 10);
    const trendLabel =
      mode === "quarter"
        ? bucketDate.toLocaleDateString("fr-BE", { month: "short" })
        : bucketDate.toLocaleDateString("fr-BE", { day: "2-digit", month: "short" });
    const trendBucket =
      trend.get(bucketKey) ?? {
        label: trendLabel,
        invoice: 0,
        payroll: 0,
        order: bucketDate.getTime(),
      };
    trendBucket.label = trendLabel;
    trendBucket.invoice += invoiceAmount;
    trendBucket.payroll += payrollAmount;
    trendBucket.order = bucketDate.getTime();
    trend.set(bucketKey, trendBucket);

    const weekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
    const weekKey = weekStart.toISOString().slice(0, 10);
    const weekBucket =
      weekly.get(weekKey) ?? {
        label: format(weekStart, "'Sem' w", { locale: fr }),
        hours: 0,
        order: weekStart.getTime(),
      };
    weekBucket.hours += hours;
    weekly.set(weekKey, weekBucket);
  }

  const estimatedMargin = amountToInvoice - amountToPay;

  const activeProjects = projects.size;
  const activeWorkers = workers.size;

  const trendPoints = Array.from(trend.values())
    .sort((a, b) => a.order - b.order)
    .map(({ label: pointLabel, invoice, payroll }) => ({ label: pointLabel, invoice, payroll }));

  const weeklyHours = Array.from(weekly.values())
    .sort((a, b) => a.order - b.order)
    .map(({ label: pointLabel, hours }) => ({ label: pointLabel, hours }));

  const projectDistributionRaw = Array.from(projects.values())
    .map((project) => ({ label: project.label, hours: project.hours }))
    .sort((a, b) => b.hours - a.hours);

  const projectDistributionTop = projectDistributionRaw.slice(0, 5);
  const projectDistributionRest = projectDistributionRaw.slice(5);
  const restHours = projectDistributionRest.reduce((total, project) => total + project.hours, 0);
  if (restHours > 0) {
    projectDistributionTop.push({ label: "Autres", hours: restHours });
  }

  const workerActivity = Array.from(workers.values())
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)
    .map((worker) => ({ label: worker.label, hours: worker.hours, status: worker.status }));

  const activeProjectIds = Array.from(projects.keys());

  const projectsWithoutAssignments: Array<{ id: number; label: string }> = [];
  if (activeProjectIds.length > 0) {
    const assignments = await prisma.projectWorker.findMany({
      where: {
        projectId: { in: activeProjectIds },
        project: { accountId },
      },
      select: { projectId: true },
    });
    const assignedProjectIds = new Set(assignments.map((assignment) => assignment.projectId));
    for (const projectId of activeProjectIds) {
      if (!assignedProjectIds.has(projectId)) {
        const project = projects.get(projectId);
        if (project) {
          projectsWithoutAssignments.push({ id: projectId, label: project.label });
        }
      }
    }
  }

  const now = new Date();
  const expiredDocuments = await prisma.document.findMany({
    where: {
      validUntil: {
        lt: now,
      },
      worker: {
        accountId,
      },
    },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const expiredWorkersMap = new Map<number, string>();
  for (const document of expiredDocuments) {
    if (!document.worker) continue;
    const name = `${document.worker.firstName} ${document.worker.lastName}`.trim();
    expiredWorkersMap.set(document.worker.id, name);
  }

  const expiredWorkers = Array.from(expiredWorkersMap.values()).slice(0, 3);

  const companySettings = await prisma.companySettings.findFirst({
    where: { accountId },
    select: { verified: true },
  });

  const alerts: DashboardSnapshot["alerts"] = [];

  if (projectsWithoutAssignments.length > 0) {
    const preview = projectsWithoutAssignments.slice(0, 3).map((project) => project.label).join(", ");
    alerts.push({
      type: "project",
      title: "Chantiers sans ouvriers",
      description:
        projectsWithoutAssignments.length > 3
          ? `${preview} et ${projectsWithoutAssignments.length - 3} autre(s) n’ont aucun ouvrier affecté.`
          : `${preview} n’ont aucun ouvrier affecté.`,
      href: "/timesheets",
    });
  }

  if (expiredWorkers.length > 0) {
    const preview = expiredWorkers.join(", ");
    alerts.push({
      type: "worker",
      title: "Documents expirés",
      description:
        expiredWorkers.length >= 3
          ? `${preview} ont des documents à renouveler.`
          : `${preview} doit renouveler ses documents.`,
      href: "/workers",
    });
  }

  if (!companySettings?.verified) {
    alerts.push({
      type: "compliance",
      title: "BCE non vérifiée",
      description: "Complétez ou mettez à jour votre dossier BCE avant l’export paie.",
      href: "/settings",
    });
  }

  return {
    meta: {
      mode,
      value,
      label,
      start: interval.start,
      end: interval.end,
    },
    totals: {
      amountToInvoice,
      amountToPay,
      billableHours,
      estimatedMargin,
    },
    overview: {
      activeProjects,
      activeWorkers,
    },
    topClients: Array.from(clients.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    topProjects: Array.from(projects.values())
      .sort((a, b) => b.amount - a.amount)
      .map((project) => ({
        ...project,
        margin: project.amount - project.payroll,
      }))
      .slice(0, 5),
    topWorkers: Array.from(workers.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5),
    trend: trendPoints,
    performance: {
      weeklyHours,
      projectDistribution: projectDistributionTop,
      workerActivity,
    },
    alerts,
  };
}

function resolveDefaultDashboardPeriod(): DashboardRequest {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return {
    mode: "month",
    value: monthKey,
  };
}

export function sanitizeDashboardPeriod(mode?: string, value?: string): DashboardRequest {
  if (mode === "quarter" && value) {
    const parsed = parseQuarter(value);
    return { mode: "quarter", value: getQuarterKey(parsed) };
  }

  if (mode === "month" && value) {
    const parsed = parseMonth(value);
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
    return { mode: "month", value: key };
  }

  return resolveDefaultDashboardPeriod();
}
