import { Prisma } from "@prisma/client";

export function sumDecimal(values: Array<Prisma.Decimal | number | null | undefined>): number {
  let total = 0;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    total += typeof value === "number" ? value : Number(value);
  }
  return total;
}
