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
  const eventSavings = assignments.reduce(
    (total, assignment) => ({
      gold:
        total.gold +
        assignment.originalCosts.gold -
        assignment.effectiveCosts.gold,
      elixir:
        total.elixir +
        assignment.originalCosts.elixir -
        assignment.effectiveCosts.elixir,
      darkElixir:
        total.darkElixir +
        assignment.originalCosts.darkElixir -
        assignment.effectiveCosts.darkElixir,
      shinyOre: total.shinyOre + (assignment.originalCosts.shinyOre || 0) - (assignment.effectiveCosts.shinyOre || 0),
      glowyOre: total.glowyOre + (assignment.originalCosts.glowyOre || 0) - (assignment.effectiveCosts.glowyOre || 0),
      starryOre: total.starryOre + (assignment.originalCosts.starryOre || 0) - (assignment.effectiveCosts.starryOre || 0),
    }),
    { gold: 0, elixir: 0, darkElixir: 0, shinyOre: 0, glowyOre: 0, starryOre: 0 },
  );
  const formattedSavings = [
    [en ? "gold" : "Gold", eventSavings.gold],
    [en ? "elixir" : "Elixier", eventSavings.elixir],
    [en ? "dark elixir" : "Dunkles Elixier", eventSavings.darkElixir],
    [en ? "shiny ore" : "Glänzendes Erz", eventSavings.shinyOre],
    [en ? "glowy ore" : "Leuchtendes Erz", eventSavings.glowyOre],
    [en ? "starry ore" : "Sternenerz", eventSavings.starryOre],
  ]
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value]) => `${formatNumber(Number(value), language)} ${label}`);
  const assignmentCounts = simulation.assignmentCounts || {
    builder: simulation.builderAssignmentCount,
    laboratory: simulation.laboratoryAssignmentCount,
  };
  const slotLabels: Record<string, string> = en
    ? { builder: "Builder", goblin_builder: "Goblin Builder", laboratory: "Laboratory", pet_house: "Pet House", blacksmith: "Blacksmith", helper: "Helper" }
    : { builder: "Builder", goblin_builder: "Goblin Builder", laboratory: "Labor", pet_house: "Pet House", blacksmith: "Schmied", helper: "Helfer" };

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

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(assignmentCounts).filter(([, count]) => (count || 0) > 0).map(([type, count]) => (
          <div key={type} className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs text-slate-400">{slotLabels[type] || type}</p>
            <p className="mt-1 text-2xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      {formattedSavings.length > 0 ? (
        <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {en
            ? "Event savings in this plan: "
            : "Event-Ersparnis in diesem Plan: "}
          <b>{formattedSavings.join(" · ")}</b>
        </p>
      ) : null}

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
