"use client";

import { useMemo, useState } from "react";
import {
  createScenarioDraft,
  duplicateScenarioDraft,
  evaluatePlanningScenario,
  type ScenarioEvaluationContext,
} from "@/features/planning-scenarios/planning-scenario.engine";
import {
  strategyLabels,
  strategyLabelsEnglish,
} from "@/features/planning-control/planning-control";
import type {
  PlanningScenario,
  ScenarioDraft,
  ScenarioQueueItem,
  ScenarioResults,
} from "@/types/planningScenario";

type Props = {
  context: ScenarioEvaluationContext;
  scenarios: PlanningScenario[];
  horizonDays: number;
  goalPercent: number;
  strategyWeights: ScenarioDraft["strategyWeights"];
  language: "de" | "en";
  isBusy: boolean;
  onSave: (draft: ScenarioDraft, id?: string) => void;
  onApply: (scenario: PlanningScenario, replaceLocked: boolean) => void;
  onDelete: (id: string) => void;
};

function scenarioToDraft(scenario: PlanningScenario): ScenarioDraft {
  return {
    accountId: scenario.accountId,
    name: scenario.name,
    description: scenario.description,
    strategy: scenario.strategy,
    horizonDays: scenario.horizonDays,
    goalPercent: scenario.goalPercent,
    resources: structuredClone(scenario.resources),
    storageCapacities: structuredClone(scenario.storageCapacities),
    dailyIncome: structuredClone(scenario.dailyIncome),
    strategyWeights: structuredClone(scenario.strategyWeights),
    assumptions: structuredClone(scenario.assumptions),
    queueSnapshot: structuredClone(scenario.queueSnapshot),
    comparisonScenarioId: scenario.comparisonScenarioId,
  };
}

function moveQueueItem(items: ScenarioQueueItem[], id: string, direction: -1 | 1): ScenarioQueueItem[] {
  const current = items.findIndex((item) => item.id === id);
  const target = current + direction;
  if (current < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[current], next[target]] = [next[target], next[current]];
  return next.map((item, index) => ({ ...item, queueOrder: index + 1 }));
}

function sumResources(value: ScenarioResults["resourcesRequired"]): number {
  return value.gold + value.elixir + value.darkElixir;
}

function totalFarming(value: ScenarioResults): number {
  return sumResources(value.farmingRequiredPerDay);
}

function metricRows(en: boolean, value: ScenarioResults) {
  const number = new Intl.NumberFormat(en ? "en-US" : "de-DE", { maximumFractionDigits: 1 });
  const date = (input: string | null) => input ? new Date(input).toLocaleDateString(en ? "en-US" : "de-DE") : "–";
  return [
    { key: "total", label: en ? "Total duration" : "Gesamtdauer", value: `${number.format(value.totalDurationHours / 24)} d`, numeric: value.totalDurationHours, lowerBetter: true },
    { key: "th", label: en ? "Current TH max date*" : "Datum bis Rathaus-Max*", value: date(value.townHallMaxAt), numeric: value.townHallMaxAt ? new Date(value.townHallMaxAt).getTime() : 0, lowerBetter: true },
    { key: "all", label: en ? "Overall max date*" : "Datum bis Gesamt-Max*", value: date(value.overallMaxAt), numeric: value.overallMaxAt ? new Date(value.overallMaxAt).getTime() : 0, lowerBetter: true },
    { key: "builder", label: en ? "Builder idle" : "Builder-Leerlauf", value: `${number.format(value.builderIdleHours)} h`, numeric: value.builderIdleHours, lowerBetter: true },
    { key: "lab", label: en ? "Laboratory idle" : "Labor-Leerlauf", value: `${number.format(value.laboratoryIdleHours)} h`, numeric: value.laboratoryIdleHours, lowerBetter: true },
    { key: "resources", label: en ? "Resources required" : "Ressourcenbedarf", value: number.format(sumResources(value.resourcesRequired)), numeric: sumResources(value.resourcesRequired), lowerBetter: true },
    { key: "farming", label: en ? "Farming per day" : "Farming pro Tag", value: number.format(totalFarming(value)), numeric: totalFarming(value), lowerBetter: true },
    { key: "goals", label: en ? "Goals achievable" : "Ziele erreichbar", value: value.goalsAchievable ? (en ? "Yes" : "Ja") : (en ? "No" : "Nein"), numeric: value.goalsAchievable ? 1 : 0, lowerBetter: false },
    { key: "time", label: en ? "Time saved" : "Eingesparte Zeit", value: `${number.format(value.timeSavedHours)} h`, numeric: value.timeSavedHours, lowerBetter: false },
    { key: "saved", label: en ? "Resources saved" : "Eingesparte Ressourcen", value: number.format(sumResources(value.resourcesSaved)), numeric: sumResources(value.resourcesSaved), lowerBetter: false },
    { key: "magic", label: en ? "Magic Items needed" : "Benötigte Magic Items", value: number.format(value.magicItemsNeeded), numeric: value.magicItemsNeeded, lowerBetter: true },
    { key: "health", label: en ? "Health at target*" : "Health Score am Ziel*", value: `${number.format(value.healthScoreAtTarget)}/100`, numeric: value.healthScoreAtTarget, lowerBetter: false },
  ];
}

export function WhatIfScenarioLab({
  context,
  scenarios,
  horizonDays,
  goalPercent,
  strategyWeights,
  language,
  isBusy,
  onSave,
  onApply,
  onDelete,
}: Props) {
  const en = language === "en";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScenarioDraft>(() => createScenarioDraft(context, { horizonDays, goalPercent, strategyWeights }));
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [replaceLocked, setReplaceLocked] = useState(false);
  const [recommendationToAdd, setRecommendationToAdd] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventCostDiscount, setEventCostDiscount] = useState(0);
  const [eventTimeDiscount, setEventTimeDiscount] = useState(0);
  const selected = scenarios.find((scenario) => scenario.id === selectedId) || null;
  const comparison = scenarios.find((scenario) => scenario.id === comparisonId) || null;
  const evaluation = useMemo(() => evaluatePlanningScenario(draft, context), [context, draft]);
  const baselineDraft = useMemo(() => createScenarioDraft(context, { horizonDays, goalPercent, strategyWeights }), [context, goalPercent, horizonDays, strategyWeights]);
  const baseline = useMemo(() => evaluatePlanningScenario(baselineDraft, context).results, [baselineDraft, context]);
  const strategyNames = en ? strategyLabelsEnglish : strategyLabels;
  const rows = metricRows(en, evaluation.results);
  const baselineRows = metricRows(en, baseline);
  const comparisonRows = comparison ? metricRows(en, comparison.results) : null;
  const lockedActiveCount = context.activeQueue.filter((item) => item.isLocked && ["planned", "active"].includes(item.status)).length;

  const updateAssumptions = (next: Partial<ScenarioDraft["assumptions"]>) =>
    setDraft((current) => ({ ...current, assumptions: { ...current.assumptions, ...next } }));
  const updateResource = (field: "resources" | "dailyIncome", key: "gold" | "elixir" | "darkElixir", value: number) =>
    setDraft((current) => ({ ...current, [field]: { ...current[field], [key]: Math.max(0, value || 0) } }));
  const resetNew = () => {
    setSelectedId(null);
    setDraft(createScenarioDraft(context, { horizonDays, goalPercent, strategyWeights }));
  };
  const addRecommendation = () => {
    const recommendation = context.recommendations.find((item) => `${item.itemType}:${item.itemId}` === recommendationToAdd);
    if (!recommendation || draft.queueSnapshot.some((item) => `${item.itemType}:${item.itemId}:${item.toLevel}` === `${recommendation.itemType}:${recommendation.itemId}:${recommendation.nextLevel}`)) return;
    const now = context.simulationStartsAt;
    setDraft((current) => ({
      ...current,
      queueSnapshot: [...current.queueSnapshot, {
        id: `scenario:manual:${recommendation.itemType}:${recommendation.itemId}:${recommendation.nextLevel}`,
        createdAt: now, updatedAt: now, accountId: context.accountId,
        itemType: recommendation.itemType, itemId: recommendation.itemId, name: recommendation.name,
        fromLevel: recommendation.currentLevel, toLevel: recommendation.nextLevel,
        goldCost: recommendation.nextLevelCosts.gold, elixirCost: recommendation.nextLevelCosts.elixir,
        darkElixirCost: recommendation.nextLevelCosts.darkElixir, durationHours: recommendation.nextLevelTime.hours,
        priorityScore: recommendation.score, queueOrder: current.queueSnapshot.length + 1,
        status: "planned", isLocked: false, slotType: null, plannedStartAt: null,
        plannedFinishAt: null, notBeforeAt: null, source: "scenario",
      }],
    }));
    setRecommendationToAdd("");
  };

  return (
    <section id="what-if-scenarios" className="rounded-3xl border border-indigo-400/20 bg-indigo-400/5 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-300">{en ? "What-if laboratory" : "Was-wäre-wenn-Labor"}</p>
          <h2 className="mt-2 text-2xl font-bold">{en ? "Test plans without changing your account" : "Pläne testen, ohne den Account zu verändern"}</h2>
          <p className="mt-1 text-sm text-slate-400">{en ? "Every scenario keeps its own baseline, assumptions, queue, forecast and calculated result." : "Jedes Szenario besitzt eigenen Ausgangszustand, Annahmen, Queue, Prognose und berechnetes Ergebnis."}</p>
        </div>
        <button type="button" onClick={resetNew} className="rounded-xl border border-indigo-300/30 px-4 py-2 text-sm font-bold text-indigo-200">{en ? "New scenario" : "Neues Szenario"}</button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <select
          aria-label={en ? "Edit saved scenario" : "Gespeichertes Szenario bearbeiten"}
          value={selectedId || ""}
          onChange={(event) => {
            const scenario = scenarios.find((item) => item.id === event.target.value);
            setSelectedId(scenario?.id || null);
            if (scenario) {
              setDraft(scenarioToDraft(scenario));
              setComparisonId(scenario.comparisonScenarioId);
            }
          }}
          className="rounded-xl border border-white/10 bg-slate-950 p-3"
        >
          <option value="">{en ? "Unsaved scenario" : "Ungespeichertes Szenario"}</option>
          {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}{scenario.isActive ? (en ? " · active" : " · aktiv") : ""}</option>)}
        </select>
        <button type="button" disabled={!selected} onClick={() => { if (selected) { setSelectedId(null); setDraft(duplicateScenarioDraft(selected)); } }} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold disabled:opacity-40">{en ? "Duplicate" : "Duplizieren"}</button>
        <button type="button" disabled={!selected || isBusy} onClick={() => selected && onDelete(selected.id)} className="rounded-xl border border-rose-400/30 px-4 py-3 text-sm font-bold text-rose-200 disabled:opacity-40">{en ? "Delete" : "Löschen"}</button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h3 className="font-bold">{en ? "Identity and planning assumptions" : "Name und Planungsannahmen"}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400">{en ? "Name" : "Name"}<input value={draft.name} maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white" /></label>
            <label className="text-xs text-slate-400">{en ? "Strategy" : "Strategie"}<select value={draft.strategy} onChange={(event) => setDraft((current) => ({ ...current, strategy: event.target.value as ScenarioDraft["strategy"], assumptions: { ...current.assumptions, autoOptimizeQueue: true } }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white">{Object.entries(strategyNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="text-xs text-slate-400 sm:col-span-2">{en ? "Description" : "Beschreibung"}<textarea value={draft.description} maxLength={1000} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white" /></label>
            <label className="text-xs text-slate-400">{en ? "Horizon (days)" : "Horizont (Tage)"}<input type="number" min={1} max={3650} value={draft.horizonDays} onChange={(event) => setDraft((current) => ({ ...current, horizonDays: Math.max(1, Number(event.target.value) || 1) }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label>
            <label className="text-xs text-slate-400">{en ? "Builders" : "Builder"}<input type="number" min={1} max={7} value={draft.assumptions.builderCount} onChange={(event) => updateAssumptions({ builderCount: Math.min(7, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label>
            <label className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm sm:col-span-2"><input type="checkbox" checked={draft.assumptions.goldPassEnabled} onChange={(event) => updateAssumptions({ goldPassEnabled: event.target.checked })} />{en ? "Gold Pass (model 20% time and cost reduction)" : "Gold Pass (20 % Zeit- und Kostenrabatt modellieren)"}</label>
            <label className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm sm:col-span-2"><input type="checkbox" checked={draft.assumptions.autoOptimizeQueue} onChange={(event) => updateAssumptions({ autoOptimizeQueue: event.target.checked })} />{en ? "Optimize scenario queue for this strategy" : "Szenario-Queue nach dieser Strategie optimieren"}</label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h3 className="font-bold">{en ? "Town Hall and play pause" : "Rathaus und Spielpause"}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400 sm:col-span-2">{en ? "Simulation starts" : "Simulation beginnt"}<input type="datetime-local" value={draft.assumptions.simulationStartsAt?.slice(0, 16) || ""} onChange={(event) => updateAssumptions({ simulationStartsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label>
            <label className="text-xs text-slate-400">{en ? "Town Hall change" : "Rathauswechsel"}<select value={draft.assumptions.townHallMode} onChange={(event) => updateAssumptions({ townHallMode: event.target.value as ScenarioDraft["assumptions"]["townHallMode"] })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white"><option value="unchanged">{en ? "No change" : "Unverändert"}</option><option value="immediate">{en ? "Upgrade immediately" : "Sofort upgraden"}</option><option value="scheduled">{en ? "Upgrade on date" : "An Datum upgraden"}</option></select></label>
            <label className="text-xs text-slate-400">{en ? "Target TH" : "Ziel-Rathaus"}<input type="number" min={context.townHallLevel} max={18} value={draft.assumptions.townHallTargetLevel || context.townHallLevel} onChange={(event) => updateAssumptions({ townHallTargetLevel: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label>
            {draft.assumptions.townHallMode === "scheduled" ? <label className="text-xs text-slate-400 sm:col-span-2">{en ? "Town Hall upgrade date" : "Rathaus-Upgrade am"}<input type="datetime-local" value={draft.assumptions.townHallUpgradeAt?.slice(0, 16) || ""} onChange={(event) => updateAssumptions({ townHallUpgradeAt: event.target.value ? new Date(event.target.value).toISOString() : null })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label> : null}
            <label className="text-xs text-slate-400">{en ? "Pause starts" : "Pause beginnt"}<input type="datetime-local" value={draft.assumptions.pauseStartsAt?.slice(0, 16) || ""} onChange={(event) => updateAssumptions({ pauseStartsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label>
            <label className="text-xs text-slate-400">{en ? "Pause ends" : "Pause endet"}<input type="datetime-local" value={draft.assumptions.pauseEndsAt?.slice(0, 16) || ""} onChange={(event) => updateAssumptions({ pauseEndsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <h3 className="font-bold">{en ? "Resources and daily farming" : "Ressourcen und tägliches Farming"}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["gold", "elixir", "darkElixir"] as const).map((key) => <div key={key} className="grid gap-2"><label className="text-xs text-slate-400">{key}<input type="number" min={0} value={draft.resources[key]} onChange={(event) => updateResource("resources", key, Number(event.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label><label className="text-xs text-slate-400">{en ? "per day" : "pro Tag"}<input type="number" min={0} value={draft.dailyIncome[key]} onChange={(event) => updateResource("dailyIncome", key, Number(event.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white" /></label></div>)}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div className="flex items-center justify-between"><h3 className="font-bold">{en ? "Isolated scenario queue" : "Isolierte Szenario-Queue"}</h3><span className="text-xs text-slate-400">{draft.queueSnapshot.length}</span></div>
          <div className="mt-3 flex gap-2"><select value={recommendationToAdd} onChange={(event) => setRecommendationToAdd(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="">{en ? "Select another upgrade" : "Weiteres Upgrade wählen"}</option>{context.recommendations.map((item) => <option key={`${item.itemType}:${item.itemId}`} value={`${item.itemType}:${item.itemId}`}>{item.name} → {item.nextLevel}</option>)}</select><button type="button" onClick={addRecommendation} disabled={!recommendationToAdd} className="rounded-xl bg-indigo-300 px-4 text-sm font-bold text-slate-950 disabled:opacity-40">+</button></div>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {draft.queueSnapshot.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm"><span className="w-6 text-slate-500">{index + 1}</span><span className="min-w-0 flex-1 truncate"><b>{item.name}</b> · {item.fromLevel}→{item.toLevel}{item.isLocked ? " 🔒" : ""}</span><button type="button" aria-label={en ? "Move up" : "Nach oben"} onClick={() => setDraft((current) => ({ ...current, queueSnapshot: moveQueueItem(current.queueSnapshot, item.id, -1) }))}>↑</button><button type="button" aria-label={en ? "Move down" : "Nach unten"} onClick={() => setDraft((current) => ({ ...current, queueSnapshot: moveQueueItem(current.queueSnapshot, item.id, 1) }))}>↓</button><button type="button" aria-label={en ? "Remove" : "Entfernen"} className="text-rose-300" onClick={() => setDraft((current) => ({ ...current, queueSnapshot: current.queueSnapshot.filter((entry) => entry.id !== item.id).map((entry, position) => ({ ...entry, queueOrder: position + 1 })) }))}>×</button></div>)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h3 className="font-bold">{en ? "Force or exclude upgrades" : "Upgrades erzwingen oder ausschließen"}</h3>
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {context.recommendations.slice(0, 20).map((item) => {
              const key = `${item.itemType}:${item.itemId}`;
              const forced = draft.assumptions.forcedUpgradeKeys.includes(key);
              const excluded = draft.assumptions.excludedUpgradeKeys.includes(key);
              return <div key={key} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 p-3 text-sm"><span className="min-w-0 flex-1 truncate">{item.name}</span><button type="button" onClick={() => updateAssumptions({ forcedUpgradeKeys: forced ? draft.assumptions.forcedUpgradeKeys.filter((value) => value !== key) : [...draft.assumptions.forcedUpgradeKeys.filter((value) => value !== key), key], excludedUpgradeKeys: draft.assumptions.excludedUpgradeKeys.filter((value) => value !== key) })} className={`rounded-lg px-2 py-1 text-xs ${forced ? "bg-emerald-300 text-slate-950" : "bg-white/5"}`}>{en ? "Force" : "Erzwingen"}</button><button type="button" onClick={() => updateAssumptions({ excludedUpgradeKeys: excluded ? draft.assumptions.excludedUpgradeKeys.filter((value) => value !== key) : [...draft.assumptions.excludedUpgradeKeys.filter((value) => value !== key), key], forcedUpgradeKeys: draft.assumptions.forcedUpgradeKeys.filter((value) => value !== key) })} className={`rounded-lg px-2 py-1 text-xs ${excluded ? "bg-rose-300 text-slate-950" : "bg-white/5"}`}>{en ? "Exclude" : "Ausschließen"}</button></div>;
            })}
          </div>
        </div>
      </div>

      <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <summary className="cursor-pointer font-bold">{en ? "Events, Magic Items and goal dates" : "Events, Magic Items und Zieltermine"}</summary>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <div><h4 className="text-sm font-bold">{en ? "Existing events" : "Bestehende Events"}</h4><div className="mt-2 space-y-2">{context.events.map((event) => { const removed = draft.assumptions.removedEventIds.includes(event.id); return <label key={event.id} className="flex gap-2 text-sm"><input type="checkbox" checked={!removed} onChange={() => updateAssumptions({ removedEventIds: removed ? draft.assumptions.removedEventIds.filter((id) => id !== event.id) : [...draft.assumptions.removedEventIds, event.id] })} />{event.name}</label>; })}</div><div className="mt-3 grid gap-2"><input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder={en ? "New event" : "Neues Event"} className="rounded-lg bg-slate-900 p-2 text-sm" /><input type="datetime-local" value={eventStart} onChange={(event) => setEventStart(event.target.value)} className="rounded-lg bg-slate-900 p-2 text-sm" /><input type="datetime-local" value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} className="rounded-lg bg-slate-900 p-2 text-sm" /><div className="flex gap-2"><input type="number" min={0} max={100} value={eventCostDiscount} onChange={(event) => setEventCostDiscount(Number(event.target.value))} aria-label={en ? "Cost discount" : "Kostenrabatt"} className="w-full rounded-lg bg-slate-900 p-2" /><input type="number" min={0} max={100} value={eventTimeDiscount} onChange={(event) => setEventTimeDiscount(Number(event.target.value))} aria-label={en ? "Time discount" : "Zeitrabatt"} className="w-full rounded-lg bg-slate-900 p-2" /></div><button type="button" disabled={!eventName || !eventStart} onClick={() => { updateAssumptions({ addedEvents: [...draft.assumptions.addedEvents, { id: `scenario-event:${draft.assumptions.addedEvents.length + 1}`, accountId: context.accountId, eventType: "scenario", name: eventName, startsAt: new Date(eventStart).toISOString(), endsAt: eventEnd ? new Date(eventEnd).toISOString() : null, costDiscountPercent: eventCostDiscount, timeDiscountPercent: eventTimeDiscount, resourceGold: 0, resourceElixir: 0, resourceDarkElixir: 0, rewardType: "none", rewardAmount: 0, enabled: true }] }); setEventName(""); }} className="rounded-lg bg-indigo-300 p-2 text-xs font-bold text-slate-950 disabled:opacity-40">{en ? "Add event" : "Event hinzufügen"}</button></div></div>
          <div><h4 className="text-sm font-bold">Magic Items</h4><div className="mt-2 space-y-2">{context.magicItems.filter((item) => item.quantity > 0).map((magic) => <div key={magic.itemKey} className="rounded-lg bg-white/5 p-2 text-xs"><p>{magic.name} ×{magic.quantity}</p><select value="" onChange={(event) => { if (!event.target.value) return; updateAssumptions({ magicItemUses: [...draft.assumptions.magicItemUses.filter((use) => !(use.itemKey === magic.itemKey && use.queueItemId === event.target.value)), { itemKey: magic.itemKey, queueItemId: event.target.value, quantity: 1 }] }); }} className="mt-1 w-full rounded bg-slate-900 p-2"><option value="">{en ? "Use on…" : "Verwenden für…"}</option>{draft.queueSnapshot.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>)}</div></div>
          <div><h4 className="text-sm font-bold">{en ? "Goal dates" : "Zieltermine"}</h4><div className="mt-2 space-y-2">{context.goals.filter((goal) => goal.status === "active").map((goal) => <label key={goal.id} className="block text-xs text-slate-400">{goal.name}<input type="date" value={draft.assumptions.goalDateOverrides[goal.id] || goal.targetDate || ""} onChange={(event) => updateAssumptions({ goalDateOverrides: { ...draft.assumptions.goalDateOverrides, [goal.id]: event.target.value } })} className="mt-1 w-full rounded-lg bg-slate-900 p-2 text-white" /></label>)}</div></div>
        </div>
      </details>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4"><div><h3 className="font-bold">{en ? "Scenario comparison" : "Szenariovergleich"}</h3><p className="text-xs text-slate-400">* {en ? "Model estimate from current game data" : "Modellschätzung aus aktuellen Spieldaten"}</p></div><select value={comparisonId || ""} onChange={(event) => { const id = event.target.value || null; setComparisonId(id); setDraft((current) => ({ ...current, comparisonScenarioId: id })); }} className="rounded-xl border border-white/10 bg-slate-900 p-2 text-sm"><option value="">{en ? "No second scenario" : "Kein zweites Szenario"}</option>{scenarios.filter((scenario) => scenario.id !== selectedId).map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></div>
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">{en ? "Metric" : "Kennzahl"}</th><th className="p-3">{en ? "Active plan" : "Aktiver Plan"}</th><th className="p-3">{draft.name || (en ? "Draft" : "Entwurf")}</th>{comparison ? <th className="p-3">{comparison.name}</th> : null}<th className="p-3">{en ? "Difference vs active" : "Unterschied zum aktiven Plan"}</th></tr></thead><tbody>{rows.map((row, index) => { const base = baselineRows[index]; const other = comparisonRows?.[index]; const difference = row.numeric - base.numeric; const improved = row.lowerBetter ? difference < 0 : difference > 0; return <tr key={row.key} className="border-t border-white/10"><td className="p-3 text-slate-300">{row.label}</td><td className="p-3">{base.value}</td><td className="p-3 font-bold text-indigo-200">{row.value}</td>{comparison ? <td className="p-3">{other?.value}</td> : null}<td className={`p-3 ${difference === 0 ? "text-slate-500" : improved ? "text-emerald-300" : "text-rose-300"}`}>{difference === 0 ? "–" : `${difference > 0 ? "+" : ""}${new Intl.NumberFormat(en ? "en-US" : "de-DE", { maximumFractionDigits: 1 }).format(row.key === "th" || row.key === "all" ? difference / 86_400_000 : difference)}${row.key === "th" || row.key === "all" ? " d" : ""}`}</td></tr>; })}</tbody></table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={isBusy || !draft.name.trim()} onClick={() => onSave(draft, selectedId || undefined)} className="rounded-xl bg-indigo-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">{selected ? (en ? "Update scenario" : "Szenario aktualisieren") : (en ? "Save scenario" : "Szenario speichern")}</button>
        {selected ? <><label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300"><input type="checkbox" checked={replaceLocked} onChange={(event) => setReplaceLocked(event.target.checked)} />{en ? `Explicitly replace ${lockedActiveCount} locked active entries` : `${lockedActiveCount} gesperrte aktive Einträge ausdrücklich ersetzen`}</label><button type="button" disabled={isBusy} onClick={() => onApply(selected, replaceLocked)} className="rounded-xl border border-emerald-300/30 px-5 py-3 font-bold text-emerald-200 disabled:opacity-40">{en ? "Adopt as active plan" : "Als aktiven Plan übernehmen"}</button></> : null}
        <span className="text-xs text-slate-500">{en ? "Saving and comparing never changes productive account data." : "Speichern und Vergleichen verändert keine produktiven Accountdaten."}</span>
      </div>
    </section>
  );
}
