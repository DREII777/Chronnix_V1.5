import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export type ProjectDistributionSlice = {
  label: string;
  hours: number;
};

type ProjectDistributionDonutProps = {
  data: ProjectDistributionSlice[];
};

const COLORS = ["#0ea5e9", "#22c55e", "#f97316", "#8b5cf6", "#ec4899", "#94a3b8"];

export function ProjectDistributionDonut({ data }: ProjectDistributionDonutProps) {
  if (data.length === 0) {
    return (
      <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Répartition par chantier</CardTitle>
        </CardHeader>
        <CardContent className="flex h-44 items-center justify-center text-sm text-slate-500">
          Aucune heure imputée aux chantiers sur la période.
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, slice) => sum + slice.hours, 0);
  const segments = buildSegments(data, total);
  const gradient = segments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(", ");

  return (
    <Card className="border border-slate-200/70 bg-white/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-slate-900">Répartition par chantier</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pt-4">
        <div className="relative h-40 w-40">
          <div
            className="h-full w-full rounded-full"
            style={{ background: `conic-gradient(${gradient})` }}
          />
          <div className="absolute inset-6 rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Heures</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(Math.round(total))}</p>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden
                />
                {segment.label}
              </span>
              <span className="font-semibold text-slate-900">{Math.round((segment.share ?? 0) * 100)}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function buildSegments(data: ProjectDistributionSlice[], total: number) {
  let current = 0;
  return data.slice(0, COLORS.length).map((slice, index) => {
    const share = total > 0 ? slice.hours / total : 0;
    const start = current * 100;
    current += share;
    const end = current * 100;
    return {
      label: slice.label,
      color: COLORS[index % COLORS.length],
      start,
      end,
      share,
    };
  });
}
