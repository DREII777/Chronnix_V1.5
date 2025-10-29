import { NextResponse } from "next/server";
import { createWorker, listWorkers, type WorkerInput } from "@/data/workers";
import { WorkerStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const teamId = searchParams.get("teamId");
  const compliant = searchParams.get("compliant");

  const user = await requireUser();
  const workers = await listWorkers(user.accountId, {
    search,
    teamId: teamId ? Number(teamId) : undefined,
    compliant: compliant !== null ? compliant === "true" : undefined,
  });

  return NextResponse.json({ workers });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<WorkerInput>;

  if (!body.firstName || !body.lastName || !body.status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const nationalId = String(body.nationalId).trim();
  if (!nationalId) {
    return NextResponse.json({ error: "Numéro national requis" }, { status: 400 });
  }

  const payRate = typeof body.payRate === "string" ? Number(body.payRate) : body.payRate;
  if (payRate === undefined || payRate === null || Number.isNaN(payRate)) {
    return NextResponse.json({ error: "Le taux horaire est requis" }, { status: 400 });
  }

  const status = (body.status as WorkerStatus) ?? WorkerStatus.SALARIE;

  const vatNumber = body.vatNumber ? String(body.vatNumber).trim() : "";
  if (status === WorkerStatus.INDEPENDANT && !vatNumber) {
    return NextResponse.json({ error: "Le numéro de TVA est requis pour un indépendant" }, { status: 400 });
  }

  const rawCharges = typeof body.chargesPct === "string" ? Number(body.chargesPct) : body.chargesPct;
  const charges = rawCharges !== undefined && !Number.isNaN(rawCharges) ? rawCharges : 0;

  const user = await requireUser();
  const worker = await createWorker(user.accountId, {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email ?? null,
    phone: body.phone ?? null,
    nationalId,
    status,
    vatNumber: vatNumber || null,
    payRate,
    chargesPct: charges,
    includeInExport: body.includeInExport ?? true,
  });

  return NextResponse.json({ worker }, { status: 201 });
}
