import {
  eachDayOfInterval,
  endOfMonth,
  endOfQuarter,
  format,
  getQuarter,
  isWeekend,
  parse,
  startOfMonth,
  startOfQuarter,
} from "date-fns";
import { fr } from "date-fns/locale";

export function parseMonth(month: string): Date {
  return parse(month, "yyyy-MM", new Date());
}

export function parseQuarter(quarter: string): Date {
  const [yearPart, quarterPart] = quarter.split("-Q");
  const year = Number(yearPart);
  const quarterIndex = Number(quarterPart) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(quarterIndex)) {
    return startOfQuarter(new Date());
  }
  return startOfQuarter(new Date(year, quarterIndex * 3, 1));
}

export function getMonthInterval(month: string | Date) {
  const base = typeof month === "string" ? parseMonth(month) : month;
  return {
    start: startOfMonth(base),
    end: endOfMonth(base),
  };
}

export function getQuarterInterval(quarter: string | Date) {
  const base = typeof quarter === "string" ? parseQuarter(quarter) : quarter;
  return {
    start: startOfQuarter(base),
    end: endOfQuarter(base),
  };
}

export function getMonthDays(month: string | Date) {
  const { start, end } = getMonthInterval(month);
  return eachDayOfInterval({ start, end }).map((day) => ({
    date: day,
    key: format(day, "yyyy-MM-dd"),
    label: format(day, "dd"),
    isWeekend: isWeekend(day),
  }));
}

export function formatDisplayDate(date: Date) {
  return format(date, "dd/MM/yyyy", { locale: fr });
}

export function formatDisplayMonth(date: Date) {
  return format(date, "MMMM yyyy", { locale: fr });
}

export function formatDisplayQuarter(date: Date) {
  return `T${getQuarter(date)} ${format(date, "yyyy")}`;
}

export function getQuarterKey(date: Date) {
  return `${format(date, "yyyy")}-Q${getQuarter(date)}`;
}
