import type { PlannerResult } from "@/features/planner/planner.types";

/** Renders the first planner recommendations without adding planner logic. */
type UpgradeRecommendationsProps = {
  plannerResult: PlannerResult | null;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    building: "Gebäude",
    hero: "Held",
    troop: "Truppe",
    spell: "Zauber",
    siege_machine: "Belagerung",
  };

  return labels[type] || type;
}

export function UpgradeRecommendations({
  plannerResult,
}: UpgradeRecommendationsProps) {
  const recommendations = plannerResult?.recommendations.slice(0, 5) || [];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Upgrade-Empfehlungen</h2>
        <span className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
          {plannerResult?.summary.possibleUpgradeCount || 0}
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Keine möglichen Upgrades gefunden.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {recommendations.map((recommendation) => (
            <div
              key={`${recommendation.buildingId}-${recommendation.nextLevel}`}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-white">
                    {recommendation.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatType(recommendation.itemType)} · Level{" "}
                    {recommendation.currentLevel} auf {recommendation.nextLevel}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Gold {formatNumber(recommendation.nextLevelCosts.gold)} ·
                    Elixier{" "}
                    {formatNumber(recommendation.nextLevelCosts.elixir)} · DE{" "}
                    {formatNumber(recommendation.nextLevelCosts.darkElixir)} ·{" "}
                    {formatNumber(recommendation.nextLevelTime.hours)} h
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-amber-300">
                  Priorität {recommendation.priorityScore.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
