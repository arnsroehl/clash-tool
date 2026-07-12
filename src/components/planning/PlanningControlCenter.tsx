import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import {
  recommendationExplanation,
  strategyLabels,
  type PlanningStrategy,
  type StrategyWeights,
} from "@/features/planning-control/planning-control";
import type { PlannerResult, ResourceSnapshot, UpgradeRecommendation } from "@/features/planner/planner.types";

type Props = {
  plannerResult: PlannerResult | null;
  recommendations: UpgradeRecommendation[];
  simulation: BuilderSimulationResult;
  strategy: PlanningStrategy;
  resources: ResourceSnapshot;
  horizonDays: number;
  goalPercent: number;
  dailyIncome: ResourceSnapshot;
  strategyWeights: StrategyWeights;
  onStrategyChange: (value: PlanningStrategy) => void;
  onResourcesChange: (value: ResourceSnapshot) => void;
  onHorizonChange: (value: number) => void;
  onGoalPercentChange: (value: number) => void;
  onDailyIncomeChange: (value: ResourceSnapshot) => void;
  onStrategyWeightsChange: (value: StrategyWeights) => void;
};

const numberFormat = new Intl.NumberFormat("de-DE");

export function PlanningControlCenter(props: Props) {
  const top = props.recommendations[0];
  const completedInHorizon = props.simulation.assignments.filter(
    (assignment) => assignment.endHour <= props.horizonDays * 24,
  ).length;
  const affordable = top
    ? props.resources.gold >= top.nextLevelCosts.gold &&
      props.resources.elixir >= top.nextLevelCosts.elixir &&
      props.resources.darkElixir >= top.nextLevelCosts.darkElixir
    : false;
  const currentProgress = props.plannerResult?.summary.progressPercent ?? 0;
  const goalReached = currentProgress >= props.goalPercent;
  const resourceKeys = ["gold", "elixir", "darkElixir"] as const;
  const waitDays = top ? Math.ceil(Math.max(0, ...resourceKeys.map((key) => {
    const deficit = Math.max(0, top.nextLevelCosts[key] - props.resources[key]);
    return deficit === 0 ? 0 : props.dailyIncome[key] > 0 ? deficit / props.dailyIncome[key] : Number.POSITIVE_INFINITY;
  }))) : 0;

  const updateResource = (key: keyof ResourceSnapshot, value: string) =>
    props.onResourcesChange({ ...props.resources, [key]: Math.max(0, Number(value) || 0) });
  const updateIncome = (key: keyof ResourceSnapshot, value: string) =>
    props.onDailyIncomeChange({ ...props.dailyIncome, [key]: Math.max(0, Number(value) || 0) });

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">Strategie & Ressourcen</h2>
        <label className="mt-5 block text-sm font-semibold text-slate-300">
          Planungsstrategie
          <select className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3" value={props.strategy} onChange={(event) => props.onStrategyChange(event.target.value as PlanningStrategy)}>
            {Object.entries(strategyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {props.strategy === "custom" ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold">Eigene Gewichtung</h3>
            {(["building", "hero", "troop", "spell", "siege_machine"] as const).map((type) => {
              const labels = { building: "Gebäude", hero: "Helden", troop: "Truppen", spell: "Zauber", siege_machine: "Belagerung" };
              return <label key={type} className="mt-3 grid grid-cols-[100px_1fr_35px] items-center gap-3 text-xs text-slate-300"><span>{labels[type]}</span><input type="range" min="0" max="100" value={props.strategyWeights[type]} onChange={(event) => props.onStrategyWeightsChange({ ...props.strategyWeights, [type]: Number(event.target.value) })} className="accent-amber-400" /><span>{props.strategyWeights[type]}</span></label>;
            })}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["gold", "elixir", "darkElixir"] as const).map((key) => (
            <label key={key} className="text-xs font-semibold text-slate-400">
              {key === "darkElixir" ? "Dunkles Elixier" : key === "elixir" ? "Elixier" : "Gold"}
              <input type="number" min="0" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" value={props.resources[key]} onChange={(event) => updateResource(key, event.target.value)} />
            </label>
          ))}
        </div>
        <h3 className="mt-5 text-sm font-bold text-white">Durchschnittliches Farming pro Tag</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {resourceKeys.map((key) => (
            <label key={key} className="text-xs font-semibold text-slate-400">
              {key === "darkElixir" ? "Dunkles Elixier" : key === "elixir" ? "Elixier" : "Gold"}
              <input type="number" min="0" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" value={props.dailyIncome[key]} onChange={(event) => updateIncome(key, event.target.value)} />
            </label>
          ))}
        </div>
        <div className={`mt-4 rounded-2xl border p-4 text-sm ${affordable ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>
          {top ? affordable ? `${top.name} Level ${top.nextLevel} ist mit den eingetragenen Ressourcen bezahlbar.` : `Für ${top.name} Level ${top.nextLevel} fehlen noch Ressourcen.` : "Keine mögliche Empfehlung vorhanden."}
        </div>
        <p className="mt-4 text-sm text-slate-300">{recommendationExplanation(top, props.strategy)}</p>
        {top && !affordable ? (
          <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
            {Number.isFinite(waitDays) ? `Bei diesem Farming-Profil ist das Upgrade voraussichtlich in ${waitDays} Tagen finanzierbar.` : "Für mindestens eine fehlende Ressource ist noch kein tägliches Farming eingetragen."}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">Simulation & Meilenstein</h2>
        <label className="mt-5 block text-sm font-semibold text-slate-300">
          Vorschauzeitraum
          <select className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3" value={props.horizonDays} onChange={(event) => props.onHorizonChange(Number(event.target.value))}>
            <option value={7}>7 Tage</option><option value={30}>30 Tage</option><option value={90}>90 Tage</option><option value={180}>180 Tage</option>
          </select>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Queue-Upgrades fertig</p><p className="mt-1 text-2xl font-bold">{completedInHorizon}</p></div>
          <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Queue-Gesamtdauer</p><p className="mt-1 text-2xl font-bold">{numberFormat.format(Math.ceil(props.simulation.totalDurationDays))} Tage</p></div>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-300">
          Fortschrittsziel: {props.goalPercent} %
          <input aria-label="Fortschrittsziel" type="range" min="1" max="100" value={props.goalPercent} onChange={(event) => props.onGoalPercentChange(Number(event.target.value))} className="mt-3 w-full accent-amber-400" />
        </label>
        <div className={`mt-4 rounded-2xl p-4 text-sm ${goalReached ? "bg-emerald-400/10 text-emerald-200" : "bg-white/5 text-slate-300"}`}>
          Aktuell {numberFormat.format(currentProgress)} %. {goalReached ? "Meilenstein erreicht." : `Noch ${numberFormat.format(Math.max(0, props.goalPercent - currentProgress))} Prozentpunkte bis zum Ziel.`}
        </div>
      </div>
    </section>
  );
}
