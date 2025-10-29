import { NextResponse } from "next/server";
import { createStorageFileName } from "@/services/files/local";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  await requireUser();

  const body = (await request.json()) as {
    workerId?: number;
    kind?: string;
    fileName?: string;
    label?: string;
    documentId?: number;
  };

  if (!body.workerId || !body.kind || !body.fileName) {
    return NextResponse.json({ error: "workerId, kind and fileName are required" }, { status: 400 });
  }

  const kind = body.kind.toUpperCase();
  const isCustom = kind === "OTHER";
  const label = (body.label ?? "").trim();

  if (isCustom && !label) {
    return NextResponse.json({ error: "label is required for custom documents" }, { status: 400 });
  }

  const storageName = createStorageFileName(body.fileName);
  const params = new URLSearchParams({
    file: storageName,
    workerId: String(body.workerId),
    kind,
  });

  if (body.documentId) {
    params.set("documentId", String(body.documentId));
  }

  if (isCustom) {
    params.set("label", label);
  }

  const uploadUrl = `/api/documents/upload?${params.toString()}`;
  const fileUrl = `/uploads/${storageName}`;

  return NextResponse.json({
    uploadUrl,
    fileUrl,
    storageName,
  });
}
