import { prisma } from "@/data/prisma";

const TEAM_INCLUDE = {
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
} as const;

export async function listTeams(accountId: number) {
  return prisma.team.findMany({
    where: { accountId },
    include: TEAM_INCLUDE,
    orderBy: { name: "asc" },
  });
}

export async function getTeamById(accountId: number, id: number) {
  return prisma.team.findFirst({
    where: { id, accountId },
    include: TEAM_INCLUDE,
  });
}

export async function createTeam(accountId: number, name: string) {
  const team = await prisma.team.create({
    data: { name, accountId },
  });
  return getTeamById(accountId, team.id);
}

export async function updateTeam(accountId: number, id: number, data: { name?: string }) {
  const existing = await prisma.team.findFirst({ where: { id, accountId } });
  if (!existing) throw new Error("TEAM_NOT_FOUND");
  await prisma.team.update({
    where: { id },
    data,
  });
  return getTeamById(accountId, id);
}

export async function deleteTeam(accountId: number, id: number) {
  const existing = await prisma.team.findFirst({ where: { id, accountId } });
  if (!existing) throw new Error("TEAM_NOT_FOUND");
  await prisma.teamMember.deleteMany({ where: { teamId: id } });
  await prisma.team.delete({ where: { id } });
}

export async function addTeamMember(accountId: number, teamId: number, workerId: number, role = "Membre") {
  const [team, worker] = await Promise.all([
    prisma.team.findFirst({ where: { id: teamId, accountId } }),
    prisma.worker.findFirst({ where: { id: workerId, accountId } }),
  ]);
  if (!team || !worker) throw new Error("TEAM_OR_WORKER_NOT_FOUND");

  await prisma.teamMember.upsert({
    where: {
      teamId_workerId: {
        teamId,
        workerId,
      },
    },
    create: {
      teamId,
      workerId,
      role,
    },
    update: {
      role,
    },
  });
  return getTeamById(accountId, teamId);
}

export async function removeTeamMember(accountId: number, teamId: number, workerId: number) {
  const team = await prisma.team.findFirst({ where: { id: teamId, accountId } });
  if (!team) throw new Error("TEAM_NOT_FOUND");
  await prisma.teamMember.delete({
    where: {
      teamId_workerId: {
        teamId,
        workerId,
      },
    },
  });
  return getTeamById(accountId, teamId);
}
