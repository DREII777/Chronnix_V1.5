import ExcelJS from "exceljs";
import { Prisma, TimeEntryStatus } from "@prisma/client";
import { prisma } from "@/data/prisma";
import { getMonthDays, getMonthInterval } from "@/utils/date";
import { hoursToHHMM, sumDecimal, sumHHMM, toNumber } from "@/utils/timesheet";

export type ExportKind = "payroll" | "detail" | "global";

export type TimesheetWorkbookOptions = {
  applyPrintSetup: boolean;
  applyColors: boolean;
};

type ExportParams = {
  projectId: number;
  month: string;
  kind: ExportKind;
  options?: Partial<TimesheetWorkbookOptions>;
};

type TimesheetSheetData = {
  name: string;
  rows: (string | number | null)[][];
};

type TimesheetWorkbookData = {
  sheets: TimesheetSheetData[];
};

const DEFAULT_TIMESHEET_OPTIONS: TimesheetWorkbookOptions = {
  applyPrintSetup: true,
  applyColors: true,
};

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F1FF" } } as const;
const ZEBRA_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F8" } } as const;
const BORDER = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
} as const;

export async function generateTimesheetExport({ projectId, month, kind, options }: ExportParams) {
  const dataset = await loadTimesheetDataset(projectId, month);

  let sheetData: TimesheetSheetData[];
  switch (kind) {
    case "payroll":
      sheetData = [buildPayrollSheetData(dataset)];
      break;
    case "detail":
      sheetData = [buildDetailSheetData(dataset)];
      break;
    case "global":
      sheetData = [buildGlobalSheetData(dataset)];
      break;
    default:
      throw new Error(`Unsupported export kind: ${kind satisfies never}`);
  }

  const workbook = buildTimesheetsWorkbook({ sheets: sheetData }, options);
  applyPostFormatting(workbook, kind);
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

  const workers = project.assignments
    .map((assignment) => assignment.worker)
    .sort((a, b) => {
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

function buildPayrollSheetData(dataset: Dataset): TimesheetSheetData {
  type PayrollRow = [string, string, number | "—", string, number];

  const rows: (string | number | null)[][] = [
    ["Ouvrier", "Heures", "Taux €/h", "Charges %", "Coût total €"],
  ];

  const hourTotals: string[] = [];
  let costTotal = 0;

  for (const worker of dataset.workers) {
    const totalHours = getTotalHoursForWorker(dataset, worker.id);
    const hoursHHMM = hoursToHHMM(totalHours) || "00:00";
    const daysWorked = getWorkedDaysForWorker(dataset, worker.id);
    const rate = worker.payRate ? Number(worker.payRate) : 0;
    const chargesPct = worker.chargesPct ? Number(worker.chargesPct) : 0;

    const hourlyExtras = (worker.additionalCosts ?? []).filter((cost) => cost.unit === "HOUR");
    const dailyExtras = (worker.additionalCosts ?? []).filter((cost) => cost.unit === "DAY");

    const hourlyExtraTotal = hourlyExtras.reduce((sum, cost) => sum + Number(cost.amount) * totalHours, 0);
    const dailyExtraTotal = dailyExtras.reduce((sum, cost) => sum + Number(cost.amount) * daysWorked, 0);

    const baseCost = totalHours * rate * (1 + chargesPct / 100);
    const cost = baseCost + hourlyExtraTotal + dailyExtraTotal;

    const row: PayrollRow = [
      formatWorkerName(worker),
      hoursHHMM,
      rate > 0 ? Number(rate.toFixed(2)) : "—",
      `${chargesPct.toFixed(2)}%`,
      Number(cost.toFixed(2)),
    ];

    rows.push(row);
    hourTotals.push(hoursHHMM);
    costTotal += Number(cost.toFixed(2));
  }

  rows.push(["TOTAL", sumHHMM(hourTotals), "—", "", Number(costTotal.toFixed(2))]);

  return {
    name: "Paie",
    rows,
  };
}

function buildDetailSheetData(dataset: Dataset): TimesheetSheetData {
  const headers = ["Ouvrier", ...dataset.days.map((day) => day.label), "Total"];
  const rows: (string | number | null)[][] = [headers];

  for (const worker of dataset.workers) {
    const row: (string | number | null)[] = Array(headers.length).fill("");
    row[0] = formatWorkerName(worker);
    const dailyValues: string[] = [];

    dataset.days.forEach((day, index) => {
      const entry = dataset.entryMap.get(`${worker.id}:${day.key}`);
      if (!entry) {
        row[index + 1] = "";
        return;
      }
      if (entry.status === TimeEntryStatus.ABSENT) {
        row[index + 1] = "ABS";
        return;
      }
      const hoursLabel = hoursToHHMM(entry.hours) || "";
      row[index + 1] = hoursLabel;
      if (hoursLabel) {
        dailyValues.push(hoursLabel);
      }
    });

    row[row.length - 1] = sumHHMM(dailyValues);
    rows.push(row);
  }

  const bodyRows = rows.slice(1);
  const totalRow: (string | number | null)[] = Array(headers.length).fill("");
  totalRow[0] = "TOTAL";

  dataset.days.forEach((_, index) => {
    const values = bodyRows.map((row) => row[index + 1] as string | null | undefined);
    totalRow[index + 1] = sumHHMM(values);
  });

  const totals = bodyRows.map((row) => row[row.length - 1] as string | null | undefined);
  totalRow[headers.length - 1] = sumHHMM(totals);
  rows.push(totalRow);

  return {
    name: "Détail",
    rows,
  };
}

function buildGlobalSheetData(dataset: Dataset): TimesheetSheetData {
  const rows: (string | number | null)[][] = [["Ouvrier", "Total heures", "Jours prestés"]];
  const hourTotals: string[] = [];
  let dayTotal = 0;

  for (const worker of dataset.workers) {
    const totalHours = getTotalHoursForWorker(dataset, worker.id);
    const daysWorked = getWorkedDaysForWorker(dataset, worker.id);
    const hoursHHMM = hoursToHHMM(totalHours) || "00:00";

    rows.push([formatWorkerName(worker), hoursHHMM, daysWorked]);
    hourTotals.push(hoursHHMM);
    dayTotal += daysWorked;
  }

  rows.push(["TOTAL", sumHHMM(hourTotals), dayTotal]);

  return {
    name: "Global",
    rows,
  };
}

function buildTimesheetsWorkbook(
  data: TimesheetWorkbookData,
  options: Partial<TimesheetWorkbookOptions> = {},
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const resolved: TimesheetWorkbookOptions = { ...DEFAULT_TIMESHEET_OPTIONS, ...options };

  data.sheets.forEach(({ name, rows }) => {
    const worksheet = workbook.addWorksheet(name.slice(0, 31));
    rows.forEach((row) => worksheet.addRow(row));

    if (!rows.length) {
      return;
    }

    const columnCount = rows[0]?.length ?? 0;
    const rowCount = rows.length;

    worksheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

    rows.forEach((row, rowIndex) => {
      row.forEach((_, columnIndex) => {
        const cell = worksheet.getCell(rowIndex + 1, columnIndex + 1);
        cell.border = BORDER;
        cell.alignment = {
          vertical: "middle",
          horizontal: rowIndex === 0 ? "center" : "left",
          wrapText: true,
        };

        if (rowIndex === 0) {
          cell.font = { bold: true };
          if (resolved.applyColors) {
            cell.fill = HEADER_FILL;
          }
        } else if (resolved.applyColors && rowIndex % 2 === 1) {
          cell.fill = ZEBRA_FILL;
        }
      });
    });

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      let maxLength = 4;
      rows.forEach((row) => {
        const value = row[columnIndex];
        if (value === null || value === undefined) {
          return;
        }
        const text = typeof value === "number" ? value.toString() : String(value);
        maxLength = Math.max(maxLength, text.length);
      });
      worksheet.getColumn(columnIndex + 1).width = Math.min(40, maxLength + 2);
    }

    if (columnCount > 0 && rowCount > 0 && resolved.applyPrintSetup) {
      const lastColumn = worksheet.getColumn(columnCount).letter;
      worksheet.pageSetup.printArea = `A1:${lastColumn}${rowCount}`;
      worksheet.pageSetup.printTitlesRow = "1:1";
      worksheet.pageSetup.orientation = "landscape";
      worksheet.pageSetup.fitToPage = true;
      worksheet.pageSetup.fitToWidth = 1;
      worksheet.pageSetup.fitToHeight = 1;
      worksheet.pageSetup.horizontalCentered = true;
      worksheet.pageSetup.verticalCentered = false;
      worksheet.pageSetup.margins = {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      };
    }
  });

  return workbook;
}

function applyPostFormatting(workbook: ExcelJS.Workbook, kind: ExportKind) {
  workbook.worksheets.forEach((sheet) => {
    sheet.eachRow((row) => {
      const firstCell = row.getCell(1);
      if (typeof firstCell.value === "string" && firstCell.value.trim().toUpperCase() === "TOTAL") {
        row.font = { ...(row.font ?? {}), bold: true };
      }
    });
  });

  if (kind === "payroll") {
    const sheet = workbook.worksheets[0];
    const rateColumn = sheet.getColumn(3);
    rateColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber === 1) return;
      if (typeof cell.value === "number") {
        cell.numFmt = "€0.00";
      }
    });

    const costColumn = sheet.getColumn(5);
    costColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber === 1) return;
      if (typeof cell.value === "number") {
        cell.numFmt = "€0.00";
      }
    });
  }
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
    if (toNumber(entry.hours) <= 0) continue;
    days += 1;
  }
  return days;
}

function formatWorkerName(worker: Dataset["workers"][number]) {
  return `${worker.lastName.toUpperCase()} ${worker.firstName}`;
}

