import { Prisma } from "@prisma/client";

export function sumDecimal(values: Array<Prisma.Decimal | number | null | undefined>): number {
  let total = 0;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    total += typeof value === "number" ? value : Number(value);
  }
  return total;
}

export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return Number(value);
}

export function hoursToHHMM(value: Prisma.Decimal | number | null | undefined): string {
  const hours = toNumber(value);
  if (!hours || hours <= 0) {
    return "";
  }
  const totalMinutes = Math.round(hours * 60);
  const hh = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const mm = (totalMinutes % 60)
    .toString()
    .padStart(2, "0");
  return `${hh}:${mm}`;
}

export function sumHHMM(values: Array<string | null | undefined>): string {
  let minutes = 0;
  for (const value of values) {
    if (!value || value === "ABS") continue;
    const [h, m] = value.split(":").map((part) => Number(part || 0));
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    minutes += h * 60 + m;
  }
  const hh = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mm = (minutes % 60)
    .toString()
    .padStart(2, "0");
  return `${hh}:${mm}`;
}
