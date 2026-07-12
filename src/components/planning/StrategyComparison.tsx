import { rankRecommendations, strategyLabels, type PlanningStrategy, type StrategyWeights } from "@/features/planning-control/planning-control";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";

type Props = { recommendations: UpgradeRecommendation[]; weights: StrategyWeights };
const strategies: PlanningStrategy[] = ["balanced", "offense", "war", "farming", "fastest", "rush_recovery", "town_hall_push", "custom"];

export function StrategyComparison({ recommendations, weights }: Props) {
  return <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
    <h2 className="text-2xl font-bold">Strategien vergleichen</h2>
    <p className="mt-2 text-sm text-slate-400">Zeigt das jeweils wichtigste nächste Upgrade für jede Planung.</p>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {strategies.map((strategy) => {
        const top = rankRecommendations(recommendations, strategy, weights)[0];
        return <div key={strategy} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-xs font-bold text-amber-300">{strategyLabels[strategy]}</p>
          <p className="mt-1 font-bold">{top?.name || "Kein Upgrade"}</p>
          {top ? <p className="mt-1 text-xs text-slate-400">Level {top.currentLevel} → {top.nextLevel} · {top.nextLevelTime.hours} h</p> : null}
        </div>;
      })}
    </div>
  </section>;
}
