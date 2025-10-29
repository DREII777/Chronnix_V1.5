import { NextResponse } from "next/server";
import { createStorageFileName, saveFileFromBuffer } from "@/services/files/local";
import { fileToBuffer } from "@/utils/files";
import { updateCompanySettings } from "@/data/company";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const validUntil = formData.get("validUntil");
  const verified = formData.get("verified");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const buffer = await fileToBuffer(file);
  const storageName = createStorageFileName(file.name);
  const stored = await saveFileFromBuffer(storageName, buffer);

  const user = await requireUser();

  const settings = await updateCompanySettings(user.accountId, {
    bceFileName: file.name,
    bceFileUrl: stored.publicUrl,
    validUntil: validUntil ? String(validUntil) : null,
    verified: verified === "true",
  });

  return NextResponse.json({ settings });
}
