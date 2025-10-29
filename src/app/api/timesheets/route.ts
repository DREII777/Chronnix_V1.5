import { NextResponse } from "next/server";
import { getTimesheetData, setTimeEntry, type TimeEntryPayload } from "@/data/timesheets";
import { getMonthDays } from "@/utils/date";
import { TimeEntryStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get("projectId");
  const month = searchParams.get("month");

  if (!projectIdParam || !month) {
    return NextResponse.json({ error: "projectId and month are required" }, { status: 400 });
  }

  const projectId = Number(projectIdParam);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const user = await requireUser();
  const data = await getTimesheetData(user.accountId, { projectId, month });
  const days = getMonthDays(month);

  return NextResponse.json({ ...data, days });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<TimeEntryPayload>;

  if (!body.projectId || !body.workerId || !body.date || body.status === undefined) {
    return NextResponse.json(
      { error: "projectId, workerId, date, and status are required" },
      { status: 400 },
    );
  }

  const status = body.status as TimeEntryStatus;
  if (!(Object.values(TimeEntryStatus) as string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const hoursRaw = body.hours as number | string | undefined;
  let parsedHours: number | null = null;
  if (typeof hoursRaw === "number") {
    parsedHours = hoursRaw;
  } else if (typeof hoursRaw === "string" && hoursRaw.trim() !== "") {
    parsedHours = Number(hoursRaw);
  }

  const hours = parsedHours !== null && Number.isFinite(parsedHours) ? parsedHours : null;

  const user = await requireUser();
  try {
    console.log("/api/timesheets POST", {
      projectId: body.projectId,
      workerId: body.workerId,
      date: body.date,
      status,
      hours,
    });
    const entry = await setTimeEntry(user.accountId, {
      projectId: body.projectId,
      workerId: body.workerId,
      date: body.date,
      status,
      hours: hours ?? undefined,
      startTime: body.startTime ?? null,
      endTime: body.endTime ?? null,
      note: body.note ?? null,
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("/api/timesheets POST error", error);
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Chantier ou ouvrier introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update entry" }, { status: 500 });
  }
}
