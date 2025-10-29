import ExcelJS from "exceljs";
import { Prisma, TimeEntryStatus } from "@prisma/client";
import { prisma } from "@/data/prisma";
import { getMonthDays, getMonthInterval } from "@/utils/date";
import { sumDecimal } from "@/utils/timesheet";

type ExportKind = "payroll" | "detail" | "global";

type ExportParams = {
  projectId: number;
  month: string;
  kind: ExportKind;
};

export async function generateTimesheetExport({ projectId, month, kind }: ExportParams) {
  const dataset = await loadTimesheetDataset(projectId, month);

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  switch (kind) {
    case "payroll":
      buildPayrollSheet(workbook, dataset);
      break;
    case "detail":
      buildDetailSheet(workbook, dataset);
      break;
    case "global":
      buildGlobalSheet(workbook, dataset);
      break;
    default:
      throw new Error(`Unsupported export kind: ${kind}`);
  }

  return workbook;
}

type Dataset = Awaited<ReturnType<typeof loadTimesheetDataset>>;

type EntryMap = Map<string, Prisma.TimeEntryGetPayload<{ include: { worker: true } }>>;

async function loadTimesheetDataset(projectId: number, month: string) {
  const { start, end } = getMonthInterval(month);
  const days = getMonthDays(month);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      assignments: {
        include: {
          worker: {
            include: {
              additionalCosts: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      projectId,
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      worker: true,
    },
  });

  const workers = project.assignments.map((assignment) => assignment.worker).sort((a, b) => {
    if (a.lastName === b.lastName) return a.firstName.localeCompare(b.firstName);
    return a.lastName.localeCompare(b.lastName);
  });

  const entryMap: EntryMap = new Map();
  for (const entry of entries) {
    const key = `${entry.workerId}:${entry.date.toISOString().slice(0, 10)}`;
    entryMap.set(key, entry);
  }

  return {
    project,
    workers,
    days,
    entryMap,
  };
}

function buildPayrollSheet(workbook: ExcelJS.Workbook, dataset: Dataset) {
  const sheet = workbook.addWorksheet("Paie", { properties: { tabColor: { argb: "FF1E3A8A" } } });
  prepareWorksheet(sheet);

  sheet.columns = [
    { header: "Ouvrier", key: "worker", width: 28 },
    { header: "Total heures", key: "hours", width: 18 },
    { header: "Taux horaire", key: "rate", width: 16 },
    { header: "Charges %", key: "charges", width: 14 },
    { header: "Coût total", key: "cost", width: 18 },
  ];

  for (const worker of dataset.workers) {
    const totalHours = getTotalHoursForWorker(dataset, worker.id);
    const daysWorked = getWorkedDaysForWorker(dataset, worker.id);
    const rate = worker.payRate ? Number(worker.payRate) : 0;
    const charges = worker.chargesPct ? Number(worker.chargesPct) : 0;
    const baseCost = totalHours * rate * (1 + charges / 100);

    const hourlyExtras = (worker.additionalCosts ?? []).filter((cost) => cost.unit === "HOUR");
    const dailyExtras = (worker.additionalCosts ?? []).filter((cost) => cost.unit === "DAY");

    const hourlyExtraTotal = hourlyExtras.reduce((sum, cost) => sum + Number(cost.amount) * totalHours, 0);
    const dailyExtraTotal = dailyExtras.reduce((sum, cost) => sum + Number(cost.amount) * daysWorked, 0);

    const cost = baseCost + hourlyExtraTotal + dailyExtraTotal;

    sheet.addRow({
      worker: `${worker.lastName.toUpperCase()} ${worker.firstName}`,
      hours: totalHours,
      rate,
      charges,
      cost,
    });
  }

  addTotalsRow(sheet, { hours: true, cost: true });
  formatNumberColumn(sheet, "hours", "0.00");
  formatNumberColumn(sheet, "rate", "€0.00");
  formatNumberColumn(sheet, "charges", "0.00%", (value) => value / 100);
  formatNumberColumn(sheet, "cost", "€0.00");
}

function buildDetailSheet(workbook: ExcelJS.Workbook, dataset: Dataset) {
  const sheet = workbook.addWorksheet("Détail", { properties: { tabColor: { argb: "FF1E3A8A" } } });
  prepareWorksheet(sheet);

  const dayHeaders = dataset.days.map((day) => ({ header: day.key.slice(8, 10), key: day.key, width: 12 }));

  sheet.columns = [
    { header: "Ouvrier", key: "worker", width: 28 },
    ...dayHeaders,
    { header: "Total", key: "total", width: 14 },
  ];

  for (const worker of dataset.workers) {
    const row: Record<string, string | number> = {
      worker: `${worker.lastName.toUpperCase()} ${worker.firstName}`,
    };
    const dailyValues: number[] = [];

    for (const day of dataset.days) {
      const entry = dataset.entryMap.get(`${worker.id}:${day.key}`);
      let value = 0;
      if (entry) {
        if (entry.status === TimeEntryStatus.ABSENT) {
          row[day.key] = "ABS";
        } else {
          value = Number(entry.hours);
          row[day.key] = value;
        }
      } else {
        row[day.key] = "";
      }
      dailyValues.push(value);
    }

    row.total = sumDecimal(dailyValues);
    sheet.addRow(row);
  }

  addTotalsRow(sheet, { total: true, dynamicDayKeys: dataset.days.map((day) => day.key) });
  formatNumberColumn(sheet, "total", "0.00");
  for (const day of dataset.days) {
    formatNumberColumn(sheet, day.key, "0.00");
  }
}

function buildGlobalSheet(workbook: ExcelJS.Workbook, dataset: Dataset) {
  const sheet = workbook.addWorksheet("Global", { properties: { tabColor: { argb: "FF1E3A8A" } } });
  prepareWorksheet(sheet);

  sheet.columns = [
    { header: "Ouvrier", key: "worker", width: 28 },
    { header: "Total heures", key: "hours", width: 18 },
    { header: "Jours prestés", key: "days", width: 16 },
  ];

  for (const worker of dataset.workers) {
    const hours = getTotalHoursForWorker(dataset, worker.id);
    const daysWorked = dataset.days.filter((day) => {
      const entry = dataset.entryMap.get(`${worker.id}:${day.key}`);
      if (!entry) return false;
      return entry.status === TimeEntryStatus.WORKED && Number(entry.hours) > 0;
    }).length;

    sheet.addRow({
      worker: `${worker.lastName.toUpperCase()} ${worker.firstName}`,
      hours,
      days: daysWorked,
    });
  }

  addTotalsRow(sheet, { hours: true, days: true });
  formatNumberColumn(sheet, "hours", "0.00");
}

function getTotalHoursForWorker(dataset: Dataset, workerId: number) {
  const values: number[] = [];
  for (const day of dataset.days) {
    const entry = dataset.entryMap.get(`${workerId}:${day.key}`);
    if (entry && entry.status === TimeEntryStatus.WORKED) {
      values.push(Number(entry.hours));
    }
  }
  return sumDecimal(values);
}

function getWorkedDaysForWorker(dataset: Dataset, workerId: number) {
  let days = 0;
  for (const day of dataset.days) {
    const entry = dataset.entryMap.get(`${workerId}:${day.key}`);
    if (!entry) continue;
    if (entry.status !== TimeEntryStatus.WORKED) continue;
    if (Number(entry.hours) <= 0) continue;
    days += 1;
  }
  return days;
}

function prepareWorksheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
}

function addTotalsRow(
  sheet: ExcelJS.Worksheet,
  options: {
    hours?: boolean;
    cost?: boolean;
    days?: boolean;
    total?: boolean;
    dynamicDayKeys?: string[];
  },
) {
  const totalRow = sheet.addRow({ worker: "Total" });
  totalRow.font = { bold: true };

  const rowNumber = totalRow.number;
  const dataRangeStart = 2; // first data row after header
  const dataRangeEnd = rowNumber - 1;

  if (options.hours) {
    totalRow.getCell("hours").value = {
      formula: `SUM(B${dataRangeStart}:B${dataRangeEnd})`,
    };
  }

  if (options.cost) {
    totalRow.getCell("cost").value = {
      formula: `SUM(E${dataRangeStart}:E${dataRangeEnd})`,
    };
  }

  if (options.days) {
    totalRow.getCell("days").value = {
      formula: `SUM(C${dataRangeStart}:C${dataRangeEnd})`,
    };
  }

  if (options.total) {
    const column = columnLetterFromKey(sheet, "total");
    if (column) {
      totalRow.getCell("total").value = {
        formula: `SUM(${column}${dataRangeStart}:${column}${dataRangeEnd})`,
      };
    }
  }

  if (options.dynamicDayKeys) {
    options.dynamicDayKeys.forEach((dayKey) => {
      const column = columnLetterFromKey(sheet, dayKey);
      if (!column) return;
      const cell = totalRow.getCell(dayKey);
      cell.value = {
        formula: `SUM(${column}${dataRangeStart}:${column}${dataRangeEnd})`,
      };
    });
  }

  sheet.getRow(rowNumber).border = {
    top: { style: "thin", color: { argb: "FF1E3A8A" } },
    bottom: { style: "double", color: { argb: "FF1E3A8A" } },
  };
}

function columnLetterFromKey(sheet: ExcelJS.Worksheet, key: string) {
  const column = sheet.columns.find((col) => col.key === key);
  if (!column) return null;
  const columnNumber = sheet.columns.indexOf(column) + 1;
  return columnNumberToLetter(columnNumber);
}

function formatNumberColumn(
  sheet: ExcelJS.Worksheet,
  key: string,
  format: string,
  transform?: (value: number) => number,
) {
  const column = sheet.getColumn(key);
  column.numFmt = format;
  column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber === 1) return;
    if (typeof cell.value !== "number") return;
    const nextValue = transform ? transform(cell.value) : cell.value;
    cell.value = nextValue;
  });
}

function columnNumberToLetter(columnNumber: number) {
  let temp = columnNumber;
  let letter = "";
  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - remainder) / 26);
  }
  return letter;
}
