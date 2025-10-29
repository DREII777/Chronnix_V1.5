import { NextResponse } from "next/server";
import { createProject, listProjects, type ProjectInput } from "@/data/projects";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const projects = await listProjects(user.accountId);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as Partial<ProjectInput>;
  if (!body.name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }
  const project = await createProject(user.accountId, {
    name: body.name,
    clientName: body.clientName ?? null,
    billingRate: body.billingRate ?? null,
    defaultHours: body.defaultHours ?? null,
    archived: body.archived ?? false,
  });
  return NextResponse.json({ project }, { status: 201 });
}
