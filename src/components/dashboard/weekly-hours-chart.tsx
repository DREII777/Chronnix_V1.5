import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type WeeklyHoursPoint = {
  label: string;
  hours: number;
};

type WeeklyHoursChartProps = {
  data: WeeklyHoursPoint[];
};

export function WeeklyHoursChart({ data }: WeeklyHoursChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Heures prestées</CardTitle>
        </CardHeader>
        <CardContent className="flex h-44 items-center justify-center text-sm text-slate-500">
          Aucune heure encodée sur la période sélectionnée.
        </CardContent>
      </Card>
    );
  }

  const maxHours = Math.max(...data.map((point) => point.hours), 1);
  const points = buildPolyline(data, maxHours);
  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : null;
  const delta = previous ? latest.hours - previous.hours : null;

  return (
    <Card className="border border-slate-200/70 bg-white/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-slate-900">Heures prestées</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-baseline gap-3 text-slate-900">
          <p className="text-3xl font-semibold">{formatHours(latest.hours)}</p>
          {delta !== null ? (
            <span
              className={cn(
                "text-sm font-medium",
                delta >= 0 ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {delta >= 0 ? "+" : ""}
              {formatHours(Math.abs(delta))}
            </span>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-36 w-full">
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                x2="100"
                y1={ratio * 48}
                y2={ratio * 48}
                stroke="#e2e8f0"
                strokeDasharray="4 6"
                strokeWidth="0.6"
              />
            ))}
            <polyline
              points={points}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {data.map((point, index) => {
              const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
              const y = 48 - (point.hours / maxHours) * 48;
              return <circle key={point.label} cx={x} cy={y} r={1.6} fill="#0ea5e9" />;
            })}
          </svg>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
            {data.map((point) => (
              <span key={point.label} className="min-w-[48px] text-center">
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildPolyline(data: WeeklyHoursPoint[], max: number) {
  if (data.length === 1) {
    const y = 48 - (data[0].hours / max) * 48;
    return `0,${y} 100,${y}`;
  }
  return data
    .map((point, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 48 - (point.hours / max) * 48;
      return `${x},${y}`;
    })
    .join(" ");
}

function formatHours(value: number) {
  return `${value.toFixed(0)} h`;
}
