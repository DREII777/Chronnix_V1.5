import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deleteWorkerDocument } from "@/data/workers";

async function resolveId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const numeric = Number(id);
  if (Number.isNaN(numeric)) {
    throw new Error("INVALID_ID");
  }
  return numeric;
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  let documentId: number;
  try {
    documentId = await resolveId(context.params);
  } catch {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  const user = await requireUser();

  try {
    await deleteWorkerDocument(user.accountId, documentId);
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "WORKER_NOT_FOUND":
        case "DOCUMENT_NOT_FOUND":
          return NextResponse.json({ error: "Document not found" }, { status: 404 });
        case "DOCUMENT_DELETE_FORBIDDEN":
          return NextResponse.json({ error: "Only custom documents can be deleted" }, { status: 403 });
        default:
          break;
      }
    }
    console.error(error);
    return NextResponse.json({ error: "Unable to delete document" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
