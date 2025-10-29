import { NextResponse } from "next/server";
import { createClientProfile } from "@/data/clients";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      contactName?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      notes?: string | null;
    };

    if (!body?.name || !body.name.trim()) {
      return NextResponse.json({ error: "Le nom du client est requis" }, { status: 400 });
    }

    const user = await requireUser();
    const profile = await createClientProfile(user.accountId, {
      name: body.name,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      address: body.address,
      notes: body.notes,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de créer le client" }, { status: 500 });
  }
}
