import { Prisma, TimeEntryStatus } from "@prisma/client";
import { prisma } from "@/data/prisma";
import { getMonthInterval } from "@/utils/date";
import { computeWorkerCompliance } from "@/utils/compliance";

type TimesheetFilters = {
  projectId: number;
  month: string;
};

export async function getTimesheetData(accountId: number, { projectId, month }: TimesheetFilters) {
  const { start, end } = getMonthInterval(month);

  const [project, assignments, allWorkers, entries, companySettings, teams] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, accountId } }),
    prisma.projectWorker.findMany({
      where: { projectId },
      select: {
        workerId: true,
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            email: true,
            nationalId: true,
            vatNumber: true,
            payRate: true,
            chargesPct: true,
            includeInExport: true,
            documents: {
              select: {
                kind: true,
                validUntil: true,
              },
            },
            additionalCosts: {
              select: {
                id: true,
                label: true,
                unit: true,
                amount: true,
              },
            },
          },
        },
      },
    }),
    prisma.worker.findMany({
      where: { accountId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        email: true,
        nationalId: true,
        vatNumber: true,
        payRate: true,
        chargesPct: true,
        includeInExport: true,
        documents: {
          select: {
            kind: true,
            validUntil: true,
          },
        },
        assignments: {
          select: {
            projectId: true,
          },
        },
        teamMemberships: {
          select: {
            teamId: true,
          },
        },
        additionalCosts: {
          select: {
            id: true,
            label: true,
            unit: true,
            amount: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.timeEntry.findMany({
      where: {
        projectId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        worker: true,
      },
      orderBy: [{ date: "asc" }, { worker: { lastName: "asc" } }],
    }),
    prisma.companySettings.findUnique({ where: { accountId } }),
    prisma.team.findMany({
      include: {
        members: {
          include: {
            worker: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
          },
          orderBy: {
            worker: {
              lastName: "asc",
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) {
    throw new Error("Project not found");
  }

  const assignedWorkerIds = new Set(assignments.map((assignment) => assignment.workerId));

  const roster = allWorkers.map((worker) => ({
    worker,
    assigned: assignedWorkerIds.has(worker.id),
    compliance: computeWorkerCompliance(
      {
        email: worker.email,
        nationalId: worker.nationalId,
        status: worker.status,
        vatNumber: worker.vatNumber,
        documents: worker.documents,
      },
      companySettings ?? null,
    ),
  }));

  return {
    project,
    roster,
    entries,
    teams,
  };
}

export type TimeEntryPayload = {
  projectId: number;
  workerId: number;
  date: string;
  status: TimeEntryStatus;
  hours?: number;
  note?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export async function setTimeEntry(accountId: number, payload: TimeEntryPayload) {
  const date = new Date(payload.date);

  const providedHours = payload.hours ?? 0;

  const [project, worker] = await Promise.all([
    prisma.project.findFirst({ where: { id: payload.projectId, accountId } }),
    prisma.worker.findFirst({ where: { id: payload.workerId, accountId } }),
  ]);

  if (!project || !worker) {
    throw new Error("NOT_FOUND");
  }

  if (payload.status === TimeEntryStatus.ABSENT || providedHours <= 0) {
    if (payload.status === TimeEntryStatus.ABSENT) {
      return prisma.timeEntry.upsert({
        where: {
          projectId_workerId_date: {
            projectId: payload.projectId,
            workerId: payload.workerId,
            date,
          },
        },
        create: {
          projectId: payload.projectId,
          workerId: payload.workerId,
          date,
          hours: new Prisma.Decimal(0),
          status: TimeEntryStatus.ABSENT,
          note: payload.note ?? null,
          startTime: payload.startTime ?? null,
          endTime: payload.endTime ?? null,
        },
        update: {
          hours: new Prisma.Decimal(0),
          status: TimeEntryStatus.ABSENT,
          note: payload.note ?? null,
          startTime: payload.startTime ?? null,
          endTime: payload.endTime ?? null,
        },
      });
    }
    await prisma.timeEntry.deleteMany({
      where: {
        projectId: payload.projectId,
        workerId: payload.workerId,
        date,
      },
    });
    return null;
  }

  try {
    return await prisma.timeEntry.upsert({
      where: {
        projectId_workerId_date: {
          projectId: payload.projectId,
          workerId: payload.workerId,
          date,
        },
      },
      create: {
        projectId: payload.projectId,
        workerId: payload.workerId,
        date,
        hours: new Prisma.Decimal(providedHours),
        status: payload.status,
        note: payload.note ?? null,
        startTime: payload.startTime ?? null,
        endTime: payload.endTime ?? null,
      },
      update: {
        hours: new Prisma.Decimal(providedHours),
        status: payload.status,
        note: payload.note ?? null,
        startTime: payload.startTime ?? null,
        endTime: payload.endTime ?? null,
      },
    });
  } catch (error) {
    console.error("setTimeEntry error", error);
    throw error;
  }
}
