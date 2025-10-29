import { NextResponse } from "next/server";
import { createTeam, listTeams } from "@/data/teams";
import { requireUser } from "@/lib/auth";

type TeamMemberResponse = {
  workerId: number;
  role: string;
  worker: {
    id: number;
    firstName: string;
    lastName: string;
    status: string;
  };
};

type TeamResponse = {
  id: number;
  name: string;
  members: TeamMemberResponse[];
};

function serializeTeam(team: TeamResponse | null) {
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

export async function GET() {
  const user = await requireUser();
  const teams = await listTeams(user.accountId);
  return NextResponse.json({ teams: teams.map((team) => serializeTeam(team)).filter(Boolean) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Le nom de l'équipe est requis" }, { status: 400 });
  }

  const team = await createTeam(user.accountId, name);
  const serialized = serializeTeam(team);
  if (!serialized) {
    return NextResponse.json({ error: "Impossible de créer l'équipe" }, { status: 500 });
  }

  return NextResponse.json({ team: serialized }, { status: 201 });
}
