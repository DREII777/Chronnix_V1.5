import { NextResponse } from "next/server";
import { listProjectWorkers } from "@/data/projects";
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
  const result = await listProjectWorkers(user.accountId, id);
  return NextResponse.json(result);
}
