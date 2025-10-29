import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  deleteWorkerAdditionalCost,
  updateWorkerAdditionalCost,
} from "@/data/workers";
import { AdditionalCostUnit } from "@prisma/client";

async function resolveIds(params: Promise<{ id: string; costId: string }>) {
  const { id, costId } = await params;
  const workerId = Number(id);
  const additionalCostId = Number(costId);
  if (Number.isNaN(workerId) || Number.isNaN(additionalCostId)) {
    throw new Error("INVALID_IDS");
  }
  return { workerId, additionalCostId };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string; costId: string }> }) {
  let ids: { workerId: number; additionalCostId: number };
  try {
    ids = await resolveIds(context.params);
  } catch {
    return NextResponse.json({ error: "Invalid identifiers" }, { status: 400 });
  }

  const user = await requireUser();
  const body = (await request.json()) as Partial<{
    label: string;
    unit: string;
    amount: number;
  }>;

  const patch: Partial<{ label: string; unit: AdditionalCostUnit; amount: number }> = {};

  if (body.label !== undefined) {
    const trimmed = body.label.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Le libellé ne peut pas être vide" }, { status: 400 });
    }
    patch.label = trimmed;
  }

  if (body.unit !== undefined) {
    const unitValue = body.unit.toUpperCase();
    if (!(Object.values(AdditionalCostUnit) as string[]).includes(unitValue)) {
      return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
    }
    patch.unit = unitValue as AdditionalCostUnit;
  }

  if (body.amount !== undefined) {
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Le montant doit être supérieur à zéro" }, { status: 400 });
    }
    patch.amount = amount;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  try {
    const cost = await updateWorkerAdditionalCost(
      user.accountId,
      ids.workerId,
      ids.additionalCostId,
      patch,
    );

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
    if (error instanceof Error) {
      if (error.message === "WORKER_COST_NOT_FOUND") {
        return NextResponse.json({ error: "Coût non trouvé" }, { status: 404 });
      }
      if (error.message === "WORKER_NOT_FOUND") {
        return NextResponse.json({ error: "Ouvrier introuvable" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Impossible de mettre à jour le coût" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; costId: string }> }) {
  let ids: { workerId: number; additionalCostId: number };
  try {
    ids = await resolveIds(context.params);
  } catch {
    return NextResponse.json({ error: "Invalid identifiers" }, { status: 400 });
  }

  const user = await requireUser();

  try {
    await deleteWorkerAdditionalCost(user.accountId, ids.workerId, ids.additionalCostId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === "WORKER_COST_NOT_FOUND") {
      return NextResponse.json({ error: "Coût non trouvé" }, { status: 404 });
    }
    return NextResponse.json({ error: "Impossible de supprimer le coût" }, { status: 500 });
  }
}
