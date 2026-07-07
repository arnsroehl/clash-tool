import type { PlannerResult } from "@/features/planner/planner.types";

/** Visualizes planner progress and remaining level count for Dashboard v1. */
type ProgressOverviewProps = {
  plannerResult: PlannerResult | null;
};

function getProgressPercent(plannerResult: PlannerResult | null): number {
  return plannerResult?.summary.progressPercent || 0;
}

export function ProgressOverview({ plannerResult }: ProgressOverviewProps) {
  const progressPercent = getProgressPercent(plannerResult);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fortschritt</h2>
          <p className="mt-3 text-slate-300">
            {plannerResult?.summary.remainingLevels || 0} Level verbleibend
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-bold text-amber-300">
          {progressPercent} %
        </div>
      </div>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-amber-400"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </section>
  );
}
