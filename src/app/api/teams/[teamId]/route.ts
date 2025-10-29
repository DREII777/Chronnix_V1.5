import { NextResponse } from "next/server";
import { deleteTeam, updateTeam } from "@/data/teams";
import { requireUser } from "@/lib/auth";

type TeamWithMembers = {
  id: number;
  name: string;
  members: Array<{
    workerId: number;
    role: string;
    worker: {
      id: number;
      firstName: string;
      lastName: string;
      status: string;
    };
  }>;
};

async function resolveTeamId(context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params;
  const id = Number(teamId);
  if (Number.isNaN(id)) {
    throw new Error("Identifiant d'équipe invalide");
  }
  return id;
}

function serializeTeam(team: TeamWithMembers | null) {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    members: team.members.map((member) => ({
      workerId: member.workerId,
      role: member.role,
      worker: {
        id: member.worker.id,
        firstName: member.worker.firstName,
        lastName: member.worker.lastName,
        status: member.worker.status,
      },
    })),
  };
}

export async function PUT(request: Request, context: { params: Promise<{ teamId: string }> }) {
  let id: number;
  try {
    id = await resolveTeamId(context);
  } catch {
    return NextResponse.json({ error: "Identifiant d'équipe invalide" }, { status: 400 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Le nom de l'équipe est requis" }, { status: 400 });
  }

  const user = await requireUser();
  const team = await updateTeam(user.accountId, id, { name });
  if (!team) {
    return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
  }

  return NextResponse.json({ team: serializeTeam(team) });
}

export async function DELETE(_: Request, context: { params: Promise<{ teamId: string }> }) {
  let id: number;
  try {
    id = await resolveTeamId(context);
  } catch {
    return NextResponse.json({ error: "Identifiant d'équipe invalide" }, { status: 400 });
  }

  const user = await requireUser();
  await deleteTeam(user.accountId, id);
  return NextResponse.json({ ok: true });
}
