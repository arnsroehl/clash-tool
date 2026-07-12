import { BuilderAssignmentCard } from "@/components/builder-simulation/BuilderAssignmentCard";
import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";

type BuilderSimulationOverviewProps = {
  simulation: BuilderSimulationResult;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value);
}

export function BuilderSimulationOverview({
  simulation,
}: BuilderSimulationOverviewProps) {
  const assignments = simulation.assignments;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Builder Simulation</h2>
          <p className="mt-2 text-sm text-slate-400">
            {simulation.builderCount} Builder · {formatNumber(simulation.totalDurationHours)} h ·{" "}
            {formatNumber(simulation.totalDurationDays)} Tage
          </p>
        </div>
        <span className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
          Leerlauf {formatNumber(simulation.idleTimeHours)} h
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Bauarbeiter-Upgrades</p><p className="mt-1 text-2xl font-bold">{simulation.builderAssignmentCount}</p></div>
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Labor-Upgrades</p><p className="mt-1 text-2xl font-bold">{simulation.laboratoryAssignmentCount}</p></div>
      </div>

      {assignments.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Keine Queue-Einträge für die Simulation vorhanden.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {assignments.map((assignment) => (
            <BuilderAssignmentCard
              key={`${assignment.queueItemId}-${assignment.builderIndex}-${assignment.startHour}`}
              assignment={assignment}
            />
          ))}
        </div>
      )}
    </section>
  );
}
