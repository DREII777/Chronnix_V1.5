import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string;
  description?: string;
  accent?: "blue" | "green" | "amber" | "violet";
  trendLabel?: string;
  trendValue?: string;
};

const ACCENTS: Record<NonNullable<Props["accent"]>, string> = {
  blue: "from-sky-400/20 to-cyan-300/15",
  green: "from-emerald-500/15 to-lime-500/15",
  amber: "from-amber-500/15 to-orange-500/15",
  violet: "from-sky-300/25 via-sky-400/20 to-sky-500/10",
};

export function MetricCard({ title, value, description, accent = "blue", trendLabel, trendValue }: Props) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", ACCENTS[accent])} />
      <CardHeader className="relative">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="relative">
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        {trendLabel && trendValue ? (
          <p className="mt-3 text-xs text-slate-500">
            {trendLabel} <span className="font-semibold text-slate-700">{trendValue}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
