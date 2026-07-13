import { BuilderAssignmentCard } from "@/components/builder-simulation/BuilderAssignmentCard";
import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";

type BuilderSimulationOverviewProps = {
  simulation: BuilderSimulationResult;
  language?: "de" | "en";
};

function formatNumber(value: number, language: "de" | "en"): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE").format(
    value,
  );
}

export function BuilderSimulationOverview({
  simulation,
  language = "de",
}: BuilderSimulationOverviewProps) {
  const en = language === "en";
  const assignments = simulation.assignments;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Builder Simulation</h2>
          <p className="mt-2 text-sm text-slate-400">
            {simulation.builderCount} {en ? "builders" : "Builder"} ·{" "}
            {formatNumber(simulation.totalDurationHours, language)} h ·{" "}
            {formatNumber(simulation.totalDurationDays, language)}{" "}
            {en ? "days" : "Tage"}
          </p>
        </div>
        <span className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
          {en ? "Idle" : "Leerlauf"}{" "}
          {formatNumber(simulation.idleTimeHours, language)} h
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs text-slate-400">
            {en ? "Builder upgrades" : "Bauarbeiter-Upgrades"}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {simulation.builderAssignmentCount}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs text-slate-400">
            {en ? "Laboratory upgrades" : "Labor-Upgrades"}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {simulation.laboratoryAssignmentCount}
          </p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en
            ? "No queue entries available for the simulation."
            : "Keine Queue-Einträge für die Simulation vorhanden."}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {assignments.map((assignment) => (
            <BuilderAssignmentCard
              key={`${assignment.queueItemId}-${assignment.builderIndex}-${assignment.startHour}`}
              assignment={assignment}
              language={language}
            />
          ))}
        </div>
      )}
    </section>
  );
}
