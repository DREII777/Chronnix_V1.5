import { NextResponse } from "next/server";
import { deleteWorker, getWorker, updateWorker, type WorkerInput } from "@/data/workers";
import { WorkerStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";

async function resolveId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const numeric = Number(id);
  if (Number.isNaN(numeric)) {
    throw new Error("Invalid worker id");
  }
  return numeric;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  let id: number;
  try {
    id = await resolveId(context);
  } catch {
    return NextResponse.json({ error: "Invalid worker id" }, { status: 400 });
  }
  const user = await requireUser();
  const worker = await getWorker(user.accountId, id);
  if (!worker) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }
  return NextResponse.json({ worker });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  let id: number;
  try {
    id = await resolveId(context);
  } catch {
    return NextResponse.json({ error: "Invalid worker id" }, { status: 400 });
  }
  const body = (await request.json()) as Partial<WorkerInput>;
  if (body.status && !(Object.values(WorkerStatus) as string[]).includes(body.status)) {
    return NextResponse.json({ error: "Invalid worker status" }, { status: 400 });
  }
  const user = await requireUser();
  const existing = await getWorker(user.accountId, id);
  if (!existing) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  const nextStatus = (body.status as WorkerStatus | undefined) ?? existing.status;

  if (body.nationalId !== undefined && body.nationalId !== null) {
    body.nationalId = String(body.nationalId).trim();
  }
  const nationalId = body.nationalId ?? existing.nationalId ?? "";
  if (nationalId.trim() === "") {
    return NextResponse.json({ error: "Le numéro national est requis" }, { status: 400 });
  }

  if (nextStatus === WorkerStatus.INDEPENDANT) {
    if (body.vatNumber !== undefined && body.vatNumber !== null) {
      body.vatNumber = String(body.vatNumber).trim();
    }
    const vatNumber = body.vatNumber ?? existing.vatNumber ?? "";
    if (vatNumber.trim() === "") {
      return NextResponse.json({ error: "Le numéro de TVA est requis pour un indépendant" }, { status: 400 });
    }
  } else if (body.vatNumber === "") {
    body.vatNumber = null;
  }

  if (body.payRate !== undefined) {
    const numeric = typeof body.payRate === "string" ? Number(body.payRate) : body.payRate;
    if (numeric === null || Number.isNaN(numeric)) {
      return NextResponse.json({ error: "Le taux horaire doit être un nombre" }, { status: 400 });
    }
    body.payRate = numeric;
  }

  if (body.chargesPct !== undefined) {
    const numeric = typeof body.chargesPct === "string" ? Number(body.chargesPct) : body.chargesPct;
    body.chargesPct = numeric && !Number.isNaN(numeric) ? numeric : 0;
  }

  const worker = await updateWorker(user.accountId, id, body);
  return NextResponse.json({ worker });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  let id: number;
  try {
    id = await resolveId(context);
  } catch {
    return NextResponse.json({ error: "Invalid worker id" }, { status: 400 });
  }
  const user = await requireUser();
  await deleteWorker(user.accountId, id);
  return NextResponse.json({ ok: true });
}
