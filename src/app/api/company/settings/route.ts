import { NextResponse } from "next/server";
import { getCompanySettings, updateCompanySettings } from "@/data/company";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const settings = await getCompanySettings(user.accountId);
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  const settings = await updateCompanySettings(user.accountId, body);
  return NextResponse.json({ settings });
}
