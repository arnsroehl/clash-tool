import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import {
  recommendationExplanation,
  strategyLabels,
  strategyLabelsEnglish,
  type PlanningStrategy,
  type StrategyWeights,
} from "@/features/planning-control/planning-control";
import type {
  PlannerResult,
  ResourceSnapshot,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";
import { PlanningScenarioManager } from "@/components/planning/PlanningScenarioManager";
import type { PlanningScenario } from "@/types/planningScenario";

type Props = {
  language?: "de" | "en";
  plannerResult: PlannerResult | null;
  recommendations: UpgradeRecommendation[];
  simulation: BuilderSimulationResult;
  strategy: PlanningStrategy;
  resources: ResourceSnapshot;
  resourceBonus: ResourceSnapshot;
  scheduledResourceBonus: ResourceSnapshot;
  storageCapacities: ResourceSnapshot;
  horizonDays: number;
  goalPercent: number;
  dailyIncome: ResourceSnapshot;
  strategyWeights: StrategyWeights;
  costDiscountPercent: number;
  onStrategyChange: (value: PlanningStrategy) => void;
  onResourcesChange: (value: ResourceSnapshot) => void;
  onStorageCapacitiesChange: (value: ResourceSnapshot) => void;
  onHorizonChange: (value: number) => void;
  onGoalPercentChange: (value: number) => void;
  onDailyIncomeChange: (value: ResourceSnapshot) => void;
  onStrategyWeightsChange: (value: StrategyWeights) => void;
  scenarios: PlanningScenario[];
  isScenarioBusy: boolean;
  onLoadScenario: (scenario: PlanningScenario) => void;
  onSaveScenario: (name: string, id?: string) => void;
  onDeleteScenario: (id: string) => void;
};

export function PlanningControlCenter(props: Props) {
  const en = props.language === "en";
  const labels = en ? strategyLabelsEnglish : strategyLabels;
  const numberFormat = new Intl.NumberFormat(en ? "en-US" : "de-DE");
  const top = props.recommendations[0];
  const effectiveCost = (value: number) =>
    Math.ceil(
      value * (1 - Math.min(100, Math.max(0, props.costDiscountPercent)) / 100),
    );
  const effectiveResources: ResourceSnapshot = {
    gold: props.resources.gold + props.resourceBonus.gold,
    elixir: props.resources.elixir + props.resourceBonus.elixir,
    darkElixir: props.resources.darkElixir + props.resourceBonus.darkElixir,
  };
  const hasResourceBonus = Object.values(props.resourceBonus).some(
    (value) => value > 0,
  );
  const hasScheduledResourceBonus = Object.values(
    props.scheduledResourceBonus,
  ).some((value) => value > 0);
  const completedInHorizon = props.simulation.assignments.filter(
    (assignment) => assignment.endHour <= props.horizonDays * 24,
  ).length;
  const affordable = top
    ? effectiveResources.gold >= effectiveCost(top.nextLevelCosts.gold) &&
      effectiveResources.elixir >= effectiveCost(top.nextLevelCosts.elixir) &&
      effectiveResources.darkElixir >=
        effectiveCost(top.nextLevelCosts.darkElixir)
    : false;
  const affordableAlternative = props.recommendations
    .slice(1)
    .find(
      (item) =>
        effectiveResources.gold >= effectiveCost(item.nextLevelCosts.gold) &&
        effectiveResources.elixir >=
          effectiveCost(item.nextLevelCosts.elixir) &&
        effectiveResources.darkElixir >=
          effectiveCost(item.nextLevelCosts.darkElixir),
    );
  const currentProgress = props.plannerResult?.summary.progressPercent ?? 0;
  const goalReached = currentProgress >= props.goalPercent;
  const resourceKeys = ["gold", "elixir", "darkElixir"] as const;
  const waitDays = top
    ? Math.ceil(
        Math.max(
          0,
          ...resourceKeys.map((key) => {
            const deficit = Math.max(
              0,
              effectiveCost(top.nextLevelCosts[key]) - effectiveResources[key],
            );
            return deficit === 0
              ? 0
              : props.dailyIncome[key] > 0
                ? deficit / props.dailyIncome[key]
                : Number.POSITIVE_INFINITY;
          }),
        ),
      )
    : 0;

  const updateResource = (key: keyof ResourceSnapshot, value: string) =>
    props.onResourcesChange({
      ...props.resources,
      [key]: Math.max(0, Number(value) || 0),
    });
  const updateIncome = (key: keyof ResourceSnapshot, value: string) =>
    props.onDailyIncomeChange({
      ...props.dailyIncome,
      [key]: Math.max(0, Number(value) || 0),
    });
  const updateCapacity = (key: keyof ResourceSnapshot, value: string) =>
    props.onStorageCapacitiesChange({
      ...props.storageCapacities,
      [key]: Math.max(0, Number(value) || 0),
    });

  return (
    <div id="planning-control-center" className="contents">
      <PlanningScenarioManager
        key={
          props.scenarios.find((scenario) => scenario.isActive)?.id ||
          "no-active-scenario"
        }
        language={props.language}
        scenarios={props.scenarios}
        isBusy={props.isScenarioBusy}
        onLoad={props.onLoadScenario}
        onSave={props.onSaveScenario}
        onDelete={props.onDeleteScenario}
      />
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">
            {en ? "Strategy & resources" : "Strategie & Ressourcen"}
          </h2>
          {props.costDiscountPercent > 0 ? (
            <p className="mt-2 text-sm font-bold text-emerald-300">
              {en
                ? "Active event/Gold Pass discount"
                : "Aktiver Event-/Gold-Pass-Rabatt"}
              : −{props.costDiscountPercent}%{" "}
              {en ? "on included costs" : "auf berücksichtigte Kosten"}
            </p>
          ) : null}
          {hasResourceBonus ? (
            <p className="mt-2 rounded-xl bg-sky-400/10 p-3 text-xs text-sky-200">
              {en
                ? "Active planned event resources"
                : "Aktive eingeplante Event-Ressourcen"}
              : +{numberFormat.format(props.resourceBonus.gold)} Gold · +
              {numberFormat.format(props.resourceBonus.elixir)}{" "}
              {en ? "Elixir" : "Elixier"} · +
              {numberFormat.format(props.resourceBonus.darkElixir)}{" "}
              {en ? "Dark elixir" : "Dunkles Elixier"}
            </p>
          ) : null}
          {hasScheduledResourceBonus ? (
            <p className="mt-2 rounded-xl bg-violet-400/10 p-3 text-xs text-violet-200">
              {en
                ? `Scheduled within ${props.horizonDays} days`
                : `In den nächsten ${props.horizonDays} Tagen eingeplant`}
              : +{numberFormat.format(props.scheduledResourceBonus.gold)} Gold · +
              {numberFormat.format(props.scheduledResourceBonus.elixir)}{" "}
              {en ? "Elixir" : "Elixier"} · +
              {numberFormat.format(props.scheduledResourceBonus.darkElixir)}{" "}
              {en ? "Dark elixir" : "Dunkles Elixier"}
            </p>
          ) : null}
          <label className="mt-5 block text-sm font-semibold text-slate-300">
            {en ? "Planning strategy" : "Planungsstrategie"}
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              value={props.strategy}
              onChange={(event) =>
                props.onStrategyChange(event.target.value as PlanningStrategy)
              }
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {props.strategy === "custom" ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-bold">
                {en ? "Custom weighting" : "Eigene Gewichtung"}
              </h3>
              {(
                ["building", "hero", "troop", "spell", "siege_machine"] as const
              ).map((type) => {
                const typeLabels = en
                  ? {
                      building: "Buildings",
                      hero: "Heroes",
                      troop: "Troops",
                      spell: "Spells",
                      siege_machine: "Siege",
                    }
                  : {
                      building: "Gebäude",
                      hero: "Helden",
                      troop: "Truppen",
                      spell: "Zauber",
                      siege_machine: "Belagerung",
                    };
                return (
                  <label
                    key={type}
                    className="mt-3 grid grid-cols-[100px_1fr_35px] items-center gap-3 text-xs text-slate-300"
                  >
                    <span>{typeLabels[type]}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={props.strategyWeights[type]}
                      onChange={(event) =>
                        props.onStrategyWeightsChange({
                          ...props.strategyWeights,
                          [type]: Number(event.target.value),
                        })
                      }
                      className="accent-amber-400"
                    />
                    <span>{props.strategyWeights[type]}</span>
                  </label>
                );
              })}
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["gold", "elixir", "darkElixir"] as const).map((key) => (
              <label key={key} className="text-xs font-semibold text-slate-400">
                {key === "darkElixir"
                  ? en
                    ? "Dark elixir"
                    : "Dunkles Elixier"
                  : key === "elixir"
                    ? en
                      ? "Elixir"
                      : "Elixier"
                    : "Gold"}
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white"
                  value={props.resources[key]}
                  onChange={(event) => updateResource(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-bold text-white">
            {en ? "Storage capacities" : "Lagerkapazitäten"}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {resourceKeys.map((key) => (
              <label key={key} className="text-xs font-semibold text-slate-400">
                {key === "darkElixir"
                  ? en
                    ? "Dark elixir"
                    : "Dunkles Elixier"
                  : key === "elixir"
                    ? en
                      ? "Elixir"
                      : "Elixier"
                    : "Gold"}
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white"
                  value={props.storageCapacities[key]}
                  onChange={(event) => updateCapacity(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-bold text-white">
            {en
              ? "Average farming per day"
              : "Durchschnittliches Farming pro Tag"}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {resourceKeys.map((key) => (
              <label key={key} className="text-xs font-semibold text-slate-400">
                {key === "darkElixir"
                  ? en
                    ? "Dark elixir"
                    : "Dunkles Elixier"
                  : key === "elixir"
                    ? en
                      ? "Elixir"
                      : "Elixier"
                    : "Gold"}
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white"
                  value={props.dailyIncome[key]}
                  onChange={(event) => updateIncome(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <div
            className={`mt-4 rounded-2xl border p-4 text-sm ${affordable ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}
          >
            {top
              ? affordable
                ? en
                  ? `${top.name} level ${top.nextLevel} is affordable with the entered resources.`
                  : `${top.name} Level ${top.nextLevel} ist mit den eingetragenen Ressourcen bezahlbar.`
                : en
                  ? `${top.name} level ${top.nextLevel} still needs more resources.`
                  : `Für ${top.name} Level ${top.nextLevel} fehlen noch Ressourcen.`
              : en
                ? "No available recommendation yet."
                : "Keine mögliche Empfehlung vorhanden."}
          </div>
          <p className="mt-4 text-sm text-slate-300">
            {recommendationExplanation(top, props.strategy, props.language)}
          </p>
          {top && !affordable ? (
            <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
              {Number.isFinite(waitDays)
                ? en
                  ? `With this farming profile, the upgrade should be affordable in ${waitDays} days.`
                  : `Bei diesem Farming-Profil ist das Upgrade voraussichtlich in ${waitDays} Tagen finanzierbar.`
                : en
                  ? "No daily farming amount is set for at least one missing resource."
                  : "Für mindestens eine fehlende Ressource ist noch kein tägliches Farming eingetragen."}
            </p>
          ) : null}
          {top && !affordable && affordableAlternative ? (
            <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">
              {en ? "Affordable alternative" : "Finanzierbare Alternative"}:{" "}
              {affordableAlternative.name} {en ? "to" : "auf"} Level{" "}
              {affordableAlternative.nextLevel}.
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {resourceKeys.map((key) => (
              <div key={key} className="rounded-lg bg-white/5 p-2">
                <span className="block text-slate-500">
                  7 {en ? "days" : "Tage"}
                </span>
                <span className="font-bold">
                  {numberFormat.format(props.dailyIncome[key] * 7)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">
            {en ? "Simulation & milestone" : "Simulation & Meilenstein"}
          </h2>
          <label className="mt-5 block text-sm font-semibold text-slate-300">
            {en ? "Forecast horizon" : "Vorschauzeitraum"}
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              value={props.horizonDays}
              onChange={(event) =>
                props.onHorizonChange(Number(event.target.value))
              }
            >
              <option value={7}>7 {en ? "days" : "Tage"}</option>
              <option value={30}>30 {en ? "days" : "Tage"}</option>
              <option value={90}>90 {en ? "days" : "Tage"}</option>
              <option value={180}>180 {en ? "days" : "Tage"}</option>
            </select>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs text-slate-400">
                {en ? "Queue upgrades completed" : "Queue-Upgrades fertig"}
              </p>
              <p className="mt-1 text-2xl font-bold">{completedInHorizon}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs text-slate-400">
                {en ? "Total queue duration" : "Queue-Gesamtdauer"}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {numberFormat.format(
                  Math.ceil(props.simulation.totalDurationDays),
                )}{" "}
                {en ? "days" : "Tage"}
              </p>
            </div>
          </div>
          <label className="mt-5 block text-sm font-semibold text-slate-300">
            {en ? "Progress target" : "Fortschrittsziel"}: {props.goalPercent} %
            <input
              aria-label={en ? "Progress target" : "Fortschrittsziel"}
              type="range"
              min="1"
              max="100"
              value={props.goalPercent}
              onChange={(event) =>
                props.onGoalPercentChange(Number(event.target.value))
              }
              className="mt-3 w-full accent-amber-400"
            />
          </label>
          <div
            className={`mt-4 rounded-2xl p-4 text-sm ${goalReached ? "bg-emerald-400/10 text-emerald-200" : "bg-white/5 text-slate-300"}`}
          >
            {en ? "Current" : "Aktuell"} {numberFormat.format(currentProgress)}{" "}
            %.{" "}
            {goalReached
              ? en
                ? "Milestone reached."
                : "Meilenstein erreicht."
              : en
                ? `${numberFormat.format(Math.max(0, props.goalPercent - currentProgress))} percentage points remaining.`
                : `Noch ${numberFormat.format(Math.max(0, props.goalPercent - currentProgress))} Prozentpunkte bis zum Ziel.`}
          </div>
        </div>
      </section>
    </div>
  );
}
