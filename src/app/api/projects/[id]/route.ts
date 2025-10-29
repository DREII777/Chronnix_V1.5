import { NextResponse } from "next/server";
import { deleteProject, getProject, listProjectWorkers, updateProject, type ProjectInput } from "@/data/projects";
import { requireUser } from "@/lib/auth";

async function resolveId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const numeric = Number(id);
  if (Number.isNaN(numeric)) {
    throw new Error("Invalid project id");
  }
  return numeric;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  let id: number;
  try {
    id = await resolveId(context);
  } catch {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }
  const user = await requireUser();
  const project = await getProject(user.accountId, id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const members = await listProjectWorkers(user.accountId, id);
  return NextResponse.json({ project, ...members });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  let id: number;
  try {
    id = await resolveId(context);
  } catch {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }
  const user = await requireUser();
  const body = (await request.json()) as Partial<ProjectInput>;
  const project = await updateProject(user.accountId, id, body);
  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  let id: number;
  try {
    id = await resolveId(context);
  } catch {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }
  const user = await requireUser();
  await deleteProject(user.accountId, id);
  return NextResponse.json({ ok: true });
}
