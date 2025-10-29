import Link from "next/link";
import type { ReactNode } from "react";
import { PeriodSwitcher } from "@/components/dashboard/period-switcher";
import { DashboardCharts } from "@/app/(protected)/components/dashboard-charts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot, sanitizeDashboardPeriod } from "@/data/dashboard";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { formatDisplayMonth, formatDisplayQuarter, getQuarterKey } from "@/utils/date";
import { requireUser } from "@/lib/auth";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Factory,
  Scale,
  TrendingUp,
  Users,
} from "lucide-react";
import { startOfMonth, startOfQuarter, subMonths } from "date-fns";

const percentFormatter = new Intl.NumberFormat("fr-BE", {
  style: "percent",
  maximumFractionDigits: 1,
});

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; value?: string }>;
}) {
  const params = (searchParams ? await searchParams : undefined) ?? {};
  const period = sanitizeDashboardPeriod(params.period, params.value);
  const user = await requireUser();
  const snapshot = await getDashboardSnapshot(user.accountId, period);

  const monthOptions = generateMonthOptions();
  const quarterOptions = generateQuarterOptions();

  const { totals, topClients, topProjects, topWorkers, overview, performance, alerts: snapshotAlerts } = snapshot;
  const topClient = topClients[0];
  const topProject = topProjects[0];
  const topWorker = topWorkers[0];

  const payrollCoverage = totals.amountToPay > 0 ? totals.amountToInvoice / totals.amountToPay : null;
  const marginRatio = totals.amountToInvoice > 0 ? totals.estimatedMargin / totals.amountToInvoice : null;
  const averageRevenuePerHour = totals.billableHours > 0 ? totals.amountToInvoice / totals.billableHours : null;
  const averageCostPerHour = totals.billableHours > 0 ? totals.amountToPay / totals.billableHours : null;
  const marginPerHour =
    averageRevenuePerHour !== null && averageCostPerHour !== null ? averageRevenuePerHour - averageCostPerHour : null;

  const heroMetrics: HeroMetricProps[] = [
    {
      label: "Chantiers actifs",
      value: formatNumber(overview.activeProjects),
      helper: "Chantiers avec activité",
      icon: <Factory className="h-4 w-4" aria-hidden />,
    },
    {
      label: "Ouvriers actifs",
      value: formatNumber(overview.activeWorkers),
      helper: "Ouvriers ayant presté",
      icon: <Users className="h-4 w-4" aria-hidden />,
    },
    {
      label: "Heures prestées",
      value: formatHoursValue(totals.billableHours),
      helper: marginPerHour !== null ? `Marge horaire · ${formatCurrency(marginPerHour)}` : "—",
      icon: <Clock3 className="h-4 w-4" aria-hidden />,
    },
  ];

  const ratioLines: RatioLineProps[] = [
    {
      label: "Couverture des charges",
      value: payrollCoverage !== null ? percentFormatter.format(payrollCoverage) : "—",
      helper: "Facturation / charges",
      tone: payrollCoverage !== null && payrollCoverage < 1 ? "warning" : "neutral",
      icon: <Scale className="h-4 w-4" aria-hidden />,
    },
    {
      label: "Marge sur chiffre d’affaires",
      value: marginRatio !== null ? percentFormatter.format(marginRatio) : "—",
      helper: "Rentabilité période",
      tone: marginRatio !== null && marginRatio < 0 ? "warning" : "neutral",
      icon: <TrendingUp className="h-4 w-4" aria-hidden />,
    },
    {
      label: "Marge horaire",
      value: marginPerHour !== null ? formatCurrency(marginPerHour) : "—",
      helper: "Différence facturation - charges par heure",
      tone: marginPerHour !== null && marginPerHour < 0 ? "warning" : "neutral",
      icon: <Clock3 className="h-4 w-4" aria-hidden />,
    },
  ];

  const overviewHighlight: OverviewHighlight = {
    margin: totals.estimatedMargin,
    marginRatio,
    coverage: payrollCoverage,
    amountToInvoice: totals.amountToInvoice,
    amountToPay: totals.amountToPay,
    topClient: topClient?.label ?? null,
    topWorker: topWorker?.label ?? null,
  };

  const alerts: AlertItem[] = snapshotAlerts.length
    ? snapshotAlerts.map((alert) => ({
        tone: alert.type === "compliance" ? "warning" : "warning",
        title: alert.title,
        description: alert.description,
        href: alert.href,
      }))
    : [
        {
          tone: "positive",
          title: "Situation stable",
          description: "Aucune alerte détectée pour cette période.",
        },
      ];

  const clientFocus = topClients.slice(0, 3).map((client) => ({
    label: client.label,
    metric: formatCurrency(client.amount),
    context:
      totals.amountToInvoice > 0
        ? `${percentFormatter.format(client.amount / totals.amountToInvoice)} du chiffre d’affaires`
        : null,
    detail: `${formatHoursValue(client.hours)} saisies`,
    share: totals.amountToInvoice > 0 ? client.amount / totals.amountToInvoice : null,
    href: "/clients",
  }));

  const projectFocus = topProjects.slice(0, 3).map((project) => {
    const margin = project.margin;
    const status = margin < 0 ? "À risque" : project.hours > 120 ? "À clôturer" : "En cours";
    const statusTone: FocusItem["detailTone"] = margin < 0 ? "warning" : project.hours > 120 ? "neutral" : "positive";

    return {
      label: project.label,
      metric: formatCurrency(project.amount),
      context: project.client ? `Client · ${project.client}` : null,
      detail: status,
      detailTone: statusTone,
      share: totals.amountToInvoice > 0 ? project.amount / totals.amountToInvoice : null,
      href: `/timesheets?projectId=${project.id}`,
    };
  });

  const workforceFocus = topWorkers.slice(0, 3).map((worker) => {
    const tone: FocusItem["detailTone"] =
      worker.status === "SALARIE"
        ? "neutral"
        : worker.status === "INDEPENDANT"
          ? "positive"
          : "secondary";

    return {
      label: worker.label,
      metric: formatHoursValue(worker.hours),
      context:
        totals.billableHours > 0
          ? `${percentFormatter.format(worker.hours / totals.billableHours)} des heures`
          : worker.status,
      detail: worker.status,
      detailTone: tone,
      share: totals.billableHours > 0 ? worker.hours / totals.billableHours : null,
      href: `/workers?search=${encodeURIComponent(worker.label)}`,
    };
  });

  const nextActions: ActionItem[] = [
    {
      title: "Préparer les exports",
      description: "Contrôlez le pointage et générez vos fichiers",
      href: "/timesheets",
    },
    {
      title: "Mettre à jour la BCE",
      description: "Complétez les documents manquants avant validation",
      href: "/settings",
    },
    {
      title: "Relancer les clients prioritaires",
      description: "Planifiez vos relances depuis le module Clients",
      href: "/clients",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pilotage des chantiers"
        description="Surveillez la santé financière, isolez les chantiers critiques et pilotez vos équipes en un coup d’œil."
        actions={
          <PeriodSwitcher
            mode={snapshot.meta.mode}
            value={snapshot.meta.value}
            monthOptions={monthOptions}
            quarterOptions={quarterOptions}
          />
        }
      />

      <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <FinancialOverview highlight={overviewHighlight} hero={heroMetrics} ratios={ratioLines} />
        <AlertList items={alerts} />
      </section>

      <DashboardCharts
        weekly={performance.weeklyHours}
        projects={performance.projectDistribution}
        workers={performance.workerActivity}
      />

      <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="grid gap-6 lg:grid-cols-2">
          <FocusList title="Clients à fort impact" emptyLabel="Aucun client actif" items={clientFocus} />
          <FocusList title="Chantiers à suivre" emptyLabel="Aucun chantier enregistré" items={projectFocus} />
        </div>
        <FocusList title="Équipe engagée" emptyLabel="Aucune prestation relevée" items={workforceFocus} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <ActionList items={nextActions} />
        <NotesCard topProject={topProject?.label ?? null} topWorker={topWorker?.label ?? null} />
      </section>
    </div>
  );
}

type RatioLineProps = {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "warning";
  icon?: ReactNode;
};

function RatioLine({ label, value, helper, tone = "neutral", icon }: RatioLineProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border px-3 py-3",
        tone === "warning"
          ? "border-amber-200/80 bg-amber-50/80 text-amber-700"
          : "border-slate-200/70 bg-white/80 text-slate-600",
      )}
    >
      <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">
        {(icon ?? <Scale className="h-4 w-4" aria-hidden />)}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>{label}</span>
          <span className="text-base text-slate-900">{value}</span>
        </div>
        <p className="text-xs text-current/70">{helper}</p>
      </div>
    </div>
  );
}

type HeroMetricProps = {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  tone?: "positive" | "warning";
};

type OverviewHighlight = {
  margin: number;
  marginRatio: number | null;
  coverage: number | null;
  amountToInvoice: number;
  amountToPay: number;
  topClient: string | null;
  topWorker: string | null;
};

function HeroMetric({ label, value, helper, icon, tone }: HeroMetricProps) {
  return (
    <Card
      className={cn(
        "group border border-slate-200/60 bg-white/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        tone === "positive" && "border-emerald-100 bg-emerald-50/80",
        tone === "warning" && "border-amber-100 bg-amber-50/80",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition group-hover:bg-sky-200">
            {icon}
          </span>
          {label}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 transition group-hover:text-slate-600">{helper}</p>
      </CardContent>
    </Card>
  );
}

type FinancialOverviewProps = {
  highlight: OverviewHighlight;
  hero: readonly HeroMetricProps[];
  ratios: RatioLineProps[];
};

function FinancialOverview({ highlight, hero, ratios }: FinancialOverviewProps) {
  const marginLabel = formatCurrency(highlight.margin);
  const marginRatioLabel =
    highlight.marginRatio !== null ? percentFormatter.format(highlight.marginRatio) : "—";
  const coverageLabel =
    highlight.coverage !== null ? percentFormatter.format(highlight.coverage) : "—";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-sky-100/70 bg-gradient-to-br from-sky-100/80 via-white to-emerald-100/70 p-6 shadow-xl shadow-sky-100/60 backdrop-blur">
        <div className="pointer-events-none absolute -top-12 right-0 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl" aria-hidden />
        <div className="relative z-10 flex flex-col gap-6 text-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge variant="secondary" className="border border-white/50 bg-white/60 text-slate-700">
                Performance de la période
              </Badge>
              <div className="mt-3 flex items-baseline gap-3">
                <h2 className="text-4xl font-semibold tracking-tight">{marginLabel}</h2>
                <span className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-emerald-600">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  {marginRatioLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Marge nette après charges. Couverture actuelle des charges&nbsp;: {coverageLabel}.
              </p>
            </div>
            <Link
              href="/timesheets"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-slate-900"
            >
              Préparer les exports
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-white/40">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <TrendingUp className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Facturation</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(highlight.amountToInvoice)}</p>
                <p className="text-xs text-slate-500">Top client · {highlight.topClient ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-white/40">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Scale className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Charges</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(highlight.amountToPay)}</p>
                <p className="text-xs text-slate-500">Suivi paie · {highlight.topWorker ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {hero.map((metric) => (
          <HeroMetric key={metric.label} {...metric} />
        ))}
        {ratios.map((ratio) => (
          <RatioLine key={ratio.label} {...ratio} />
        ))}
      </section>
    </div>
  );
}

type FocusItem = {
  label: string;
  metric: string;
  context?: string | null;
  detail?: string | null;
  share?: number | null;
  href?: string | null;
  detailTone?: "positive" | "warning" | "neutral" | "secondary";
};

type FocusListProps = {
  title: string;
  items: FocusItem[];
  emptyLabel: string;
};

function FocusList({ title, items, emptyLabel }: FocusListProps) {
  return (
    <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          items.map((item) => {
            const content = (
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  {item.context ? <p className="text-xs text-slate-500">{item.context}</p> : null}
                  {item.detail ? (
                    <Badge
                      variant={badgeVariant(item.detailTone ?? "neutral")}
                      className="mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wide"
                    >
                      {item.detail}
                    </Badge>
                  ) : null}
                </div>
                  <span className="text-sm font-semibold text-slate-900">{item.metric}</span>
                </div>
                {typeof item.share === "number" ? (
                  <div className="h-2 w-full rounded-full bg-white">
                    <div
                      className="h-2 rounded-full bg-sky-300"
                      style={{ width: `${Math.min(100, Math.max(0, Math.round(item.share * 100)))}%` }}
                    />
                  </div>
                ) : null}
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className="block" prefetch={false}>
                  {content}
                </Link>
              );
            }

            return (
              <div key={item.label} className="block">
                {content}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

type AlertItem = {
  tone: "warning" | "positive";
  title: string;
  description: string;
  href?: string;
};

type AlertListProps = {
  items: AlertItem[];
};

function AlertList({ items }: AlertListProps) {
  return (
    <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
      <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Points d’attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.length === 0 ? (
          <p className="text-slate-500">Rien à signaler pour cette période.</p>
        ) : (
          items.map((item) => {
            const Icon = item.tone === "warning" ? AlertTriangle : CheckCircle2;
            return (
              <a
                key={item.title}
                href={item.href ?? "#"}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                  item.tone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300",
                  item.href ? "hover:shadow-sm" : "pointer-events-none",
                )}
              >
                <span className="mt-0.5">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="text-xs text-current/80">{item.description}</span>
                </span>
              </a>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

type ActionItem = {
  title: string;
  description: string;
  href: string;
};

function ActionList({ items }: { items: ActionItem[] }) {
  return (
    <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">Priorités de la semaine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        {items.map((item) => (
          <a
            key={item.title}
            href={item.href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50"
          >
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">{item.title}</span>
              <span className="text-xs text-slate-500">{item.description}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-500" aria-hidden />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

function NotesCard({ topProject, topWorker }: { topProject: string | null; topWorker: string | null }) {
  return (
    <Card className="border-dashed border-slate-200 bg-slate-50/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">Notes rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <p>Identifiez vos priorités :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Ouvrir le chantier le plus rentable {topProject ? `(${topProject})` : "dès qu’il est disponible"}</li>
          <li>Planifier une revue paie pour {topWorker ?? "vos équipes"}</li>
          <li>Valider les imputations manquantes avant export</li>
        </ul>
      </CardContent>
    </Card>
  );
}

function badgeVariant(tone: "positive" | "warning" | "neutral" | "secondary" | undefined) {
  switch (tone) {
    case "positive":
      return "success";
    case "warning":
      return "warning";
    case "secondary":
      return "secondary";
    default:
      return "secondary";
  }
}

function formatHoursValue(hours: number) {
  if (!Number.isFinite(hours)) {
    return "0 h";
  }
  return `${formatNumber(Math.round(hours))} h`;
}

function generateMonthOptions() {
  const base = startOfMonth(new Date());
  return Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(base, index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      value,
      label: formatDisplayMonth(date),
    };
  });
}

function generateQuarterOptions() {
  const base = startOfQuarter(new Date());
  return Array.from({ length: 4 }, (_, index) => {
    const date = subMonths(base, index * 3);
    return {
      value: getQuarterKey(date),
      label: formatDisplayQuarter(date),
    };
  });
}
