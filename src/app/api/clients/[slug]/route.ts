import { NextResponse } from "next/server";
import { getClientProfileBySlug, updateClientProfile } from "@/data/clients";
import { requireUser } from "@/lib/auth";

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireUser();
    const { slug } = await context.params;
    const profile = await getClientProfileBySlug(user.accountId, slug);

    if (!profile) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      contactName?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      notes?: string | null;
    };

    const result = await updateClientProfile(user.accountId, profile.id, body);

    return NextResponse.json({ profile: result.profile, slug: result.profile.slug });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de mettre à jour le client" }, { status: 500 });
  }
}
