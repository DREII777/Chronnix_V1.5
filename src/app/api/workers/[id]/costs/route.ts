import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addWorkerAdditionalCost } from "@/data/workers";
import { AdditionalCostUnit } from "@prisma/client";

async function resolveWorkerId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const numeric = Number(id);
  if (Number.isNaN(numeric)) {
    throw new Error("INVALID_WORKER_ID");
  }
  return numeric;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let workerId: number;
  try {
    workerId = await resolveWorkerId(context.params);
  } catch {
    return NextResponse.json({ error: "Invalid worker id" }, { status: 400 });
  }

  const user = await requireUser();
  const body = (await request.json()) as Partial<{
    label: string;
    unit: string;
    amount: number;
  }>;

  const label = body.label?.trim() ?? "";
  if (!label) {
    return NextResponse.json({ error: "Le libellé est requis" }, { status: 400 });
  }

  const unitValue = (body.unit ?? "").toUpperCase();
  if (!(Object.values(AdditionalCostUnit) as string[]).includes(unitValue)) {
    return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
  }

  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Le montant doit être supérieur à zéro" }, { status: 400 });
  }

  try {
    const cost = await addWorkerAdditionalCost(user.accountId, workerId, {
      label,
      unit: unitValue as AdditionalCostUnit,
      amount,
    });

    return NextResponse.json({
      cost: {
        id: cost.id,
        label: cost.label,
        unit: cost.unit,
        amount: Number(cost.amount),
        createdAt: cost.createdAt,
        updatedAt: cost.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === "WORKER_NOT_FOUND") {
      return NextResponse.json({ error: "Ouvrier introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Impossible d'ajouter le coût" }, { status: 500 });
  }
}
