import { Prisma, WorkerStatus, DocumentKind, AdditionalCostUnit } from "@prisma/client";
import { prisma } from "@/data/prisma";
import type { WorkerFilters } from "@/types/workers";
import { computeWorkerCompliance } from "@/utils/compliance";

const workerInclude = {
  documents: true,
  additionalCosts: true,
  teamMemberships: {
    include: {
      team: true,
    },
  },
  assignments: {
    include: {
      project: true,
    },
  },
  timeEntries: true,
} satisfies Prisma.WorkerInclude;

export type WorkerInput = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  status: WorkerStatus;
  vatNumber?: string | null;
  payRate?: number | null;
  chargesPct?: number | null;
  includeInExport?: boolean;
};

export async function listWorkers(accountId: number, filters: WorkerFilters = {}) {
  const where: Prisma.WorkerWhereInput = {
    accountId,
  };

  if (filters.search) {
    const searchTerm = filters.search.trim();
    where.OR = [
      { firstName: { contains: searchTerm, mode: "insensitive" } },
      { lastName: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (filters.teamId) {
    where.teamMemberships = {
      some: {
        teamId: filters.teamId,
      },
    };
  }

  const [workers, companySettings] = await Promise.all([
    prisma.worker.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        nationalId: true,
        status: true,
        vatNumber: true,
        includeInExport: true,
        assignments: {
          select: {
            projectId: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
        teamMemberships: {
          select: {
            teamId: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        documents: {
          select: {
            kind: true,
            validUntil: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.companySettings.findUnique({ where: { accountId } }),
  ]);

  const withCompliance = workers.map((worker) => ({
    ...worker,
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

  if (typeof filters.compliant === "boolean") {
    return withCompliance.filter((worker) => worker.compliance.isCompliant === filters.compliant);
  }

  return withCompliance;
}

export async function getWorker(accountId: number, id: number) {
  return prisma.worker.findFirst({
    where: { id, accountId },
    include: workerInclude,
  });
}

export async function createWorker(accountId: number, input: WorkerInput) {
  return prisma.worker.create({
    data: {
      ...normalizeCreateWorkerInput(input),
      accountId,
    },
    include: workerInclude,
  });
}

export async function updateWorker(accountId: number, id: number, input: Partial<WorkerInput>) {
  const existing = await prisma.worker.findFirst({ where: { id, accountId } });
  if (!existing) {
    throw new Error("WORKER_NOT_FOUND");
  }

  return prisma.worker.update({
    where: { id },
    data: normalizeUpdateWorkerInput(input),
    include: workerInclude,
  });
}

export async function deleteWorker(accountId: number, id: number) {
  const existing = await prisma.worker.findFirst({ where: { id, accountId } });
  if (!existing) {
    throw new Error("WORKER_NOT_FOUND");
  }

  return prisma.worker.delete({
    where: { id },
  });
}

function normalizeCreateWorkerInput(input: WorkerInput): Omit<Prisma.WorkerUncheckedCreateInput, "accountId"> {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    nationalId: input.nationalId ?? null,
    status: input.status,
    vatNumber: input.vatNumber ?? null,
    payRate: input.payRate !== undefined && input.payRate !== null ? new Prisma.Decimal(input.payRate) : null,
    chargesPct:
      input.chargesPct !== undefined && input.chargesPct !== null ? new Prisma.Decimal(input.chargesPct) : null,
    includeInExport: input.includeInExport ?? true,
  } satisfies Omit<Prisma.WorkerUncheckedCreateInput, "accountId">;
}

function normalizeUpdateWorkerInput(input: Partial<WorkerInput>): Prisma.WorkerUpdateInput {
  const data: Prisma.WorkerUpdateInput = {};

  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.nationalId !== undefined) data.nationalId = input.nationalId;
  if (input.status !== undefined) data.status = input.status;
  if (input.vatNumber !== undefined) data.vatNumber = input.vatNumber;
  if (input.payRate !== undefined)
    data.payRate = input.payRate !== null ? new Prisma.Decimal(input.payRate) : null;
  if (input.chargesPct !== undefined)
    data.chargesPct = input.chargesPct !== null ? new Prisma.Decimal(input.chargesPct) : null;
  if (input.includeInExport !== undefined) data.includeInExport = input.includeInExport;

  return data;
}

export async function upsertDocument(
  accountId: number,
  workerId: number,
  payload: {
    kind: DocumentKind;
    fileName: string;
    fileUrl: string;
    validUntil?: Date | null;
    label?: string | null;
    documentId?: number;
  },
) {
  const worker = await prisma.worker.findFirst({ where: { id: workerId, accountId } });
  if (!worker) {
    throw new Error("WORKER_NOT_FOUND");
  }

  const data = {
    fileName: payload.fileName,
    fileUrl: payload.fileUrl,
    validUntil: payload.validUntil ?? null,
    label: payload.label?.trim() ? payload.label.trim() : null,
  } satisfies Prisma.DocumentUncheckedUpdateInput;

  if (payload.kind === DocumentKind.OTHER) {
    if (!data.label) {
      throw new Error("DOCUMENT_LABEL_REQUIRED");
    }

    if (payload.documentId) {
      const existing = await prisma.document.findFirst({
        where: {
          id: payload.documentId,
          workerId,
        },
      });

      if (!existing) {
        throw new Error("DOCUMENT_NOT_FOUND");
      }

      return prisma.document.update({
        where: { id: existing.id },
        data,
      });
    }

    return prisma.document.create({
      data: {
        workerId,
        kind: payload.kind,
        ...data,
      },
    });
  }

  const existing = await prisma.document.findFirst({
    where: {
      workerId,
      kind: payload.kind,
    },
  });

  if (existing) {
    return prisma.document.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.document.create({
    data: {
      workerId,
      kind: payload.kind,
      ...data,
    },
  });
}

export async function deleteWorkerDocument(accountId: number, documentId: number) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      worker: {
        accountId,
      },
    },
  });

  if (!document) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  if (document.kind !== DocumentKind.OTHER) {
    throw new Error("DOCUMENT_DELETE_FORBIDDEN");
  }

  await prisma.document.delete({
    where: { id: documentId },
  });
}

export async function addWorkerAdditionalCost(
  accountId: number,
  workerId: number,
  payload: { label: string; unit: AdditionalCostUnit; amount: number },
) {
  const worker = await prisma.worker.findFirst({ where: { id: workerId, accountId } });
  if (!worker) {
    throw new Error("WORKER_NOT_FOUND");
  }

  return prisma.workerAdditionalCost.create({
    data: {
      workerId,
      label: payload.label.trim(),
      unit: payload.unit,
      amount: new Prisma.Decimal(payload.amount),
    },
  });
}

export async function updateWorkerAdditionalCost(
  accountId: number,
  workerId: number,
  costId: number,
  payload: Partial<{ label: string; unit: AdditionalCostUnit; amount: number }>,
) {
  const existing = await prisma.workerAdditionalCost.findFirst({
    where: {
      id: costId,
      workerId,
      worker: { accountId },
    },
  });

  if (!existing) {
    throw new Error("WORKER_COST_NOT_FOUND");
  }

  const data: Prisma.WorkerAdditionalCostUpdateInput = {};
  if (payload.label !== undefined) data.label = payload.label.trim();
  if (payload.unit !== undefined) data.unit = payload.unit;
  if (payload.amount !== undefined) data.amount = new Prisma.Decimal(payload.amount);

  return prisma.workerAdditionalCost.update({
    where: { id: existing.id },
    data,
  });
}

export async function deleteWorkerAdditionalCost(accountId: number, workerId: number, costId: number) {
  const existing = await prisma.workerAdditionalCost.findFirst({
    where: {
      id: costId,
      workerId,
      worker: { accountId },
    },
  });

  if (!existing) {
    throw new Error("WORKER_COST_NOT_FOUND");
  }

  await prisma.workerAdditionalCost.delete({ where: { id: costId } });
}
