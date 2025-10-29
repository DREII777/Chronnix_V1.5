import { NextResponse } from "next/server";
import { generateTimesheetExport } from "@/services/exports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get("projectId");
  const month = searchParams.get("month");
  const kind = (searchParams.get("kind") ?? "payroll") as "payroll" | "detail" | "global";

  if (!projectIdParam || !month) {
    return NextResponse.json({ error: "projectId and month are required" }, { status: 400 });
  }

  const projectId = Number(projectIdParam);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const workbook = await generateTimesheetExport({ projectId, month, kind });
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="timesheet-${projectId}-${month}-${kind}.xlsx"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
