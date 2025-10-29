import { NextResponse } from "next/server";
import { assignWorker, unassignWorker } from "@/data/assignments";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await requireUser();
  const { projectId, workerId } = (await request.json()) as {
    projectId?: number;
    workerId?: number;
  };

  if (!projectId || !workerId) {
    return NextResponse.json({ error: "projectId and workerId are required" }, { status: 400 });
  }

  const assignment = await assignWorker(user.accountId, projectId, workerId);
  return NextResponse.json({ assignment }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as { projectId?: number; workerId?: number };
  if (!body?.projectId || !body?.workerId) {
    return NextResponse.json({ error: "projectId and workerId are required" }, { status: 400 });
  }
  await unassignWorker(user.accountId, body.projectId, body.workerId);
  return NextResponse.json({ ok: true });
}
