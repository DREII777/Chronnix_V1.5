import { NextResponse } from "next/server";
import { getAccount, updateAccount } from "@/data/account";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const account = await getAccount(user.accountId);
  return NextResponse.json({ account });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  const account = await updateAccount(user.accountId, body);
  return NextResponse.json({ account });
}
