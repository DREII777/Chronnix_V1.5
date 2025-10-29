import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

type Item = {
  label: string;
  value: string;
  subLabel?: string;
  ratio?: number;
};

type Props = {
  title: string;
  items: Item[];
  emptyLabel: string;
};

export function TopList({ title, items, emptyLabel }: Props) {
  const maxRatio = items.reduce((max, item) => Math.max(max, item.ratio ?? 0), 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
                  {item.subLabel ? <p className="truncate text-xs text-slate-500">{item.subLabel}</p> : null}
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={cn("h-2 rounded-full bg-slate-900 transition-all")}
                  style={{ width: `${Math.round(((item.ratio ?? 0) / maxRatio) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function formatHours(hours: number) {
  if (!Number.isFinite(hours)) return "0 h";
  return `${formatNumber(Math.round(hours))} h`;
}
