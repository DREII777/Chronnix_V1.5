import { cn, formatCurrency } from "@/lib/utils";

type TrendPoint = {
  label: string;
  invoice: number;
  payroll: number;
};

type Props = {
  data: TrendPoint[];
};

export function TrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
        <div className="mx-auto max-w-sm space-y-3">
          <p className="text-base font-semibold text-slate-700">Flux financier</p>
          <p>Encodez des heures supplémentaires ou sélectionnez une autre période pour afficher l&apos;écart facturation / charges.</p>
        </div>
      </section>
    );
  }

  const invoiceValues = data.map((point) => point.invoice);
  const payrollValues = data.map((point) => point.payroll);
  const maxValue = Math.max(...invoiceValues, ...payrollValues, 1);

  const buildPoints = (values: number[]) => {
    if (values.length === 1) {
      const y = 100 - (values[0] / maxValue) * 100;
      return `0,${y} 100,${y}`;
    }
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 100 - (value / maxValue) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const invoicePoints = buildPoints(invoiceValues);
  const payrollPoints = buildPoints(payrollValues);

  const coordinateFor = (value: number, index: number) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 100;
    return { x, y };
  };

  const deltas = data.map((point) => point.invoice - point.payroll);
  const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  const positivePeriods = deltas.filter((value) => value >= 0).length;
  const bestPeriod = data.reduce((best, point) => (point.invoice - point.payroll > best.delta ? { point, delta: point.invoice - point.payroll } : best), { point: data[0], delta: data[0].invoice - data[0].payroll });
  const worstPeriod = data.reduce((worst, point) => (point.invoice - point.payroll < worst.delta ? { point, delta: point.invoice - point.payroll } : worst), { point: data[0], delta: data[0].invoice - data[0].payroll });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Flux financier</h2>
          <p className="text-sm text-slate-500">Analyse rapide du différentiel facturation vs. charges sur la période sélectionnée.</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden /> À facturer
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" aria-hidden /> À payer
            </span>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-56 w-full">
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                x2="100"
                y1={ratio * 100}
                y2={ratio * 100}
                stroke="#E2E8F0"
                strokeDasharray="4 6"
                strokeWidth="0.6"
              />
            ))}

            <polyline
              points={invoicePoints}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={payrollPoints}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />

            {data.map((point, index) => {
              const invoiceCoord = coordinateFor(point.invoice, index);
              const payrollCoord = coordinateFor(point.payroll, index);
              return (
                <g key={`${point.label}-${index}`}>
                  <circle cx={invoiceCoord.x} cy={invoiceCoord.y} r={1.8} fill="#38bdf8" />
                  <circle cx={payrollCoord.x} cy={payrollCoord.y} r={1.7} fill="#a855f7" opacity={0.9} />
                </g>
              );
            })}
          </svg>

          <div className="mt-4 flex flex-wrap justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {data.map((point) => (
              <div key={point.label} className="min-w-[56px] text-center">
                <p className="font-semibold text-slate-600">{point.label}</p>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="text-sky-500">{formatCurrency(point.invoice)}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-violet-500">{formatCurrency(point.payroll)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <InsightCard
            label="Écart moyen"
            value={formatCurrency(averageDelta)}
            helper="Par période"
            tone={averageDelta >= 0 ? "positive" : "warning"}
          />
          <InsightCard
            label="Périodes favorables"
            value={`${positivePeriods}/${data.length}`}
            helper="Facturation ≥ charges"
            tone="neutral"
          />
          <InsightCard
            label={worstPeriod.delta >= 0 ? "Période la plus rentable" : "Période la plus exposée"}
            value={worstPeriod.delta >= 0 ? bestPeriod.point.label : worstPeriod.point.label}
            helper={
              worstPeriod.delta >= 0
                ? `${formatCurrency(bestPeriod.delta)} d'avance`
                : `${formatCurrency(worstPeriod.delta)} de déficit`
            }
            tone={worstPeriod.delta >= 0 ? "positive" : "warning"}
          />
        </div>
      </div>
    </section>
  );
}

type InsightCardProps = {
  label: string;
  value: string;
  helper: string;
  tone: "positive" | "warning" | "neutral";
};

function InsightCard({ label, value, helper, tone }: InsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "positive" && "border-emerald-100 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-100 bg-amber-50 text-amber-700",
        tone === "neutral" && "border-slate-200 bg-white text-slate-600",
      )}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-current/60">{label}</p>
      <p className="mt-2 text-lg font-semibold text-current">{value}</p>
      <p className="text-xs text-current/70">{helper}</p>
    </div>
  );
}
