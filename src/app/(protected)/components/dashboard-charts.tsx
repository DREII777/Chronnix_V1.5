"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import type { WeeklyHoursPoint } from "@/components/dashboard/weekly-hours-chart";
import type { ProjectDistributionSlice } from "@/components/dashboard/project-distribution-donut";
import type { WorkerActivityPoint } from "@/components/dashboard/worker-activity-bars";

const WeeklyHoursChart = dynamic(
  () => import("@/components/dashboard/weekly-hours-chart").then((mod) => mod.WeeklyHoursChart),
  { ssr: false },
);

const ProjectDistributionDonut = dynamic(
  () =>
    import("@/components/dashboard/project-distribution-donut").then(
      (mod) => mod.ProjectDistributionDonut,
    ),
  { ssr: false },
);

const WorkerActivityBars = dynamic(
  () =>
    import("@/components/dashboard/worker-activity-bars").then(
      (mod) => mod.WorkerActivityBars,
    ),
  { ssr: false },
);

type Props = {
  weekly: WeeklyHoursPoint[];
  projects: ProjectDistributionSlice[];
  workers: WorkerActivityPoint[];
};

export function DashboardCharts({ weekly, projects, workers }: Props) {
  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton className="h-64" />}>
          <WeeklyHoursChart data={weekly} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton className="h-64" />}>
          <ProjectDistributionDonut data={projects} />
        </Suspense>
      </div>
      <Suspense fallback={<ChartSkeleton className="h-[360px]" />}>
        <WorkerActivityBars data={workers} />
      </Suspense>
    </section>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-3xl border border-slate-200/70 bg-slate-100/60",
        className ?? "h-64",
      )}
    />
  );
}
