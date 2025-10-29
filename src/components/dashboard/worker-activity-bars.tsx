import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export type WorkerActivityPoint = {
  label: string;
  hours: number;
  status?: string;
};

type WorkerActivityBarsProps = {
  data: WorkerActivityPoint[];
};

const STATUS_COLORS: Record<string, string> = {
  SALARIE: "bg-sky-400",
  INDEPENDANT: "bg-emerald-400",
  ASSOCIE: "bg-indigo-400",
};

export function WorkerActivityBars({ data }: WorkerActivityBarsProps) {
  const items = data.slice(0, 3);

  if (items.length === 0) {
    return (
      <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Top ouvriers</CardTitle>
        </CardHeader>
        <CardContent className="flex h-44 items-center justify-center text-sm text-slate-500">
          Aucune prestation enregistrée pour cette période.
        </CardContent>
      </Card>
    );
  }

  const max = Math.max(...items.map((point) => point.hours), 1);

  return (
    <Card className="border border-slate-200/70 bg-white/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-slate-900">Équipe engagée</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 text-sm text-slate-600">
        {items.map((point) => {
          const color = STATUS_COLORS[point.status ?? ""] ?? "bg-slate-400";
          return (
            <div key={point.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
                  <span className="font-semibold text-slate-900">{point.label}</span>
                </div>
                <span className="text-xs text-slate-500">{formatNumber(Math.round(point.hours))} h</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((point.hours / max) * 100))}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
