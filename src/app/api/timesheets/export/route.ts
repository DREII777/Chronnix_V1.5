import { NextResponse } from "next/server";
import { generateTimesheetExport } from "@/services/exports";
import type { TimesheetWorkbookOptions } from "@/services/exports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get("projectId");
  const month = searchParams.get("month");
  const kind = (searchParams.get("kind") ?? "payroll") as "payroll" | "detail" | "global";
  const applyPrintParam = searchParams.get("print");
  const applyColorsParam = searchParams.get("colors");

  const options: Partial<TimesheetWorkbookOptions> = {};
  if (applyPrintParam !== null) {
    options.applyPrintSetup = applyPrintParam !== "false";
  }
  if (applyColorsParam !== null) {
    options.applyColors = applyColorsParam !== "false";
  }

  if (!projectIdParam || !month) {
    return NextResponse.json({ error: "projectId and month are required" }, { status: 400 });
  }

  const projectId = Number(projectIdParam);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const workbook = await generateTimesheetExport({ projectId, month, kind, options });
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
