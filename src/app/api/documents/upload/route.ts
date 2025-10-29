import { NextResponse } from "next/server";
import { saveFileFromBuffer } from "@/services/files/local";
import { fileToBuffer } from "@/utils/files";
import { upsertDocument } from "@/data/workers";
import { requireUser } from "@/lib/auth";
import { DocumentKind } from "@prisma/client";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const fileName = url.searchParams.get("file");
  const workerIdParam = url.searchParams.get("workerId");
  const kindParam = url.searchParams.get("kind");
  const labelParam = url.searchParams.get("label");
  const documentIdParam = url.searchParams.get("documentId");

  if (!fileName || !workerIdParam || !kindParam) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const workerId = Number(workerIdParam);
  if (Number.isNaN(workerId)) {
    return NextResponse.json({ error: "Invalid worker id" }, { status: 400 });
  }

  const kind = kindParam.toUpperCase();
  if (!(Object.keys(DocumentKind) as string[]).includes(kind)) {
    return NextResponse.json({ error: "Invalid document kind" }, { status: 400 });
  }

  const label = labelParam ? labelParam.trim() : null;
  const isCustom = kind === "OTHER";

  if (isCustom && !label) {
    return NextResponse.json({ error: "Missing label for custom document" }, { status: 400 });
  }

  const documentId = documentIdParam ? Number(documentIdParam) : undefined;
  if (documentIdParam && (documentId === undefined || Number.isNaN(documentId))) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const validUntilRaw = formData.get("validUntil");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const buffer = await fileToBuffer(file);
  const stored = await saveFileFromBuffer(fileName, buffer);

  const validUntilValue =
    typeof validUntilRaw === "string" && validUntilRaw.trim() !== ""
      ? new Date(validUntilRaw)
      : null;

  const user = await requireUser();

  const document = await upsertDocument(user.accountId, workerId, {
    kind: kind as DocumentKind,
    fileName: file.name,
    fileUrl: stored.publicUrl,
    validUntil: validUntilValue,
    label,
    documentId,
  });

  return NextResponse.json({
    ok: true,
    document: {
      id: document.id,
      kind: document.kind,
      label: document.label,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      validUntil: document.validUntil ? document.validUntil.toISOString() : null,
    },
  });
}
