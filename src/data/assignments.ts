import { prisma } from "@/data/prisma";

export async function assignWorker(accountId: number, projectId: number, workerId: number) {
  const [project, worker] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, accountId } }),
    prisma.worker.findFirst({ where: { id: workerId, accountId } }),
  ]);
  if (!project || !worker) {
    throw new Error("NOT_FOUND");
  }

  return prisma.projectWorker.upsert({
    where: {
      projectId_workerId: { projectId, workerId },
    },
    create: {
      projectId,
      workerId,
    },
    update: {},
  });
}

export async function unassignWorker(accountId: number, projectId: number, workerId: number) {
  const project = await prisma.project.findFirst({ where: { id: projectId, accountId } });
  if (!project) {
    throw new Error("NOT_FOUND");
  }

  return prisma.projectWorker.delete({
    where: {
      projectId_workerId: { projectId, workerId },
    },
  });
}
