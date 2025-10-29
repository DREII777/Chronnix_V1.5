import { Prisma } from "@prisma/client";
import { prisma } from "@/data/prisma";
import { computeWorkerCompliance } from "@/utils/compliance";

const projectInclude = {
  assignments: {
    include: {
      worker: true,
    },
  },
  timeEntries: true,
} satisfies Prisma.ProjectInclude;

export type ProjectInput = {
  name: string;
  clientName?: string | null;
  billingRate?: number | null;
  defaultHours?: number | null;
  archived?: boolean;
};

export async function listProjects(accountId: number) {
  return prisma.project.findMany({
    where: { accountId },
    include: projectInclude,
    orderBy: [{ archived: "asc" }, { name: "asc" }],
  });
}

export async function getProject(accountId: number, id: number) {
  return prisma.project.findFirst({
    where: { id, accountId },
    include: projectInclude,
  });
}

export async function createProject(accountId: number, input: ProjectInput) {
  return prisma.project.create({
    data: {
      ...normalizeProjectCreateInput(input),
      accountId,
    },
    include: projectInclude,
  });
}

export async function updateProject(accountId: number, id: number, input: Partial<ProjectInput>) {
  const existing = await prisma.project.findFirst({ where: { id, accountId } });
  if (!existing) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return prisma.project.update({
    where: { id },
    data: normalizeProjectUpdateInput(input),
    include: projectInclude,
  });
}

export async function deleteProject(accountId: number, id: number) {
  const existing = await prisma.project.findFirst({ where: { id, accountId } });
  if (!existing) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return prisma.project.delete({
    where: { id },
  });
}

export async function listProjectWorkers(accountId: number, projectId: number) {
  const project = await prisma.project.findFirst({ where: { id: projectId, accountId } });
  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const [assigned, allWorkers, companySettings] = await Promise.all([
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
            documents: {
              select: {
                kind: true,
                validUntil: true,
              },
            },
            assignments: {
              select: {
                projectId: true,
                project: { select: { name: true } },
              },
            },
            teamMemberships: {
              select: {
                teamId: true,
                role: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { worker: { lastName: "asc" } },
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
        documents: {
          select: {
            kind: true,
            validUntil: true,
          },
        },
        assignments: {
          select: {
            projectId: true,
            project: { select: { name: true } },
          },
        },
        teamMemberships: {
          select: {
            teamId: true,
            role: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.companySettings.findUnique({ where: { accountId } }),
  ]);

  const assignedIds = new Set(assigned.map((item) => item.workerId));

  const available = allWorkers
    .filter((worker) => !assignedIds.has(worker.id))
    .map((worker) => ({
      worker,
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

  const assignedWithCompliance = assigned.map((item) => ({
    ...item,
    compliance: computeWorkerCompliance(
      {
        email: item.worker.email,
        nationalId: item.worker.nationalId,
        status: item.worker.status,
        vatNumber: item.worker.vatNumber,
        documents: item.worker.documents,
      },
      companySettings ?? null,
    ),
  }));

  return {
    assigned: assignedWithCompliance,
    available,
  };
}

function normalizeProjectCreateInput(input: ProjectInput): Omit<Prisma.ProjectUncheckedCreateInput, "accountId"> {
  return {
    name: input.name,
    clientName: input.clientName ?? null,
    billingRate:
      input.billingRate !== undefined && input.billingRate !== null
        ? new Prisma.Decimal(input.billingRate)
        : null,
    defaultHours:
      input.defaultHours !== undefined && input.defaultHours !== null
        ? new Prisma.Decimal(input.defaultHours)
        : null,
    archived: input.archived ?? false,
  } satisfies Omit<Prisma.ProjectUncheckedCreateInput, "accountId">;
}

function normalizeProjectUpdateInput(input: Partial<ProjectInput>): Prisma.ProjectUpdateInput {
  const data: Prisma.ProjectUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.clientName !== undefined) data.clientName = input.clientName;
  if (input.billingRate !== undefined)
    data.billingRate = input.billingRate !== null ? new Prisma.Decimal(input.billingRate) : null;
  if (input.defaultHours !== undefined)
    data.defaultHours = input.defaultHours !== null ? new Prisma.Decimal(input.defaultHours) : null;
  if (input.archived !== undefined) data.archived = input.archived;

  return data;
}
