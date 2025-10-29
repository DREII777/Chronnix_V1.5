import { NextResponse } from "next/server";
import { verifyLoginCode } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, code } = (await request.json().catch(() => ({}))) as {
    email?: string;
    code?: string;
  };
  if (!email || !code) {
    return NextResponse.json({ error: "Email et code requis" }, { status: 400 });
  }

  try {
    return await verifyLoginCode(email, code);
  } catch (error) {
    console.error("verify-code", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Code invalide" }, { status: 400 });
  }
}
