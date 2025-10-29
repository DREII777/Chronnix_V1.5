import { cn } from "@/lib/utils";
import type {
  HTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from "react";

type TableProps = TableHTMLAttributes<HTMLTableElement>;
type TableSectionProps = HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = HTMLAttributes<HTMLTableRowElement>;
type TableHeadCellProps = ThHTMLAttributes<HTMLTableCellElement>;
type TableCellProps = TdHTMLAttributes<HTMLTableCellElement>;

export function Table({ className, ...props }: TableProps) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: TableSectionProps) {
  return <thead className={cn("bg-slate-100/70 text-xs uppercase text-slate-500", className)} {...props} />;
}

export function TableBody({ className, ...props }: TableSectionProps) {
  return <tbody className={cn("divide-y divide-slate-100", className)} {...props} />;
}

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn("transition hover:bg-slate-50", className)} {...props} />;
}

export function TableHead({ className, ...props }: TableHeadCellProps) {
  return <th className={cn("px-4 py-3 text-left font-medium text-slate-500", className)} {...props} />;
}

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn("px-4 py-4 align-top text-sm", className)} {...props} />;
}
