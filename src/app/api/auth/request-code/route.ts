import { NextResponse } from "next/server";
import { requestLoginCode } from "@/lib/auth";

export async function POST(request: Request) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  try {
    await requestLoginCode(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("request-code", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 400 });
  }
}
