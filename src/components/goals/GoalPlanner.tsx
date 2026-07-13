"use client";

import { useMemo, useState } from "react";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { PlanningGoal } from "@/types/planningProfile";

type Props = {
  recommendations: UpgradeRecommendation[];
  queuedKeys: Set<string>;
  onAddToQueue: (recommendation: UpgradeRecommendation) => void;
  isSaving: boolean;
  accountId: string;
  goals: PlanningGoal[];
  onSaveGoal: (goal: Omit<PlanningGoal, "id" | "status">) => void;
  onDeleteGoal: (id: string) => void;
};

const typeLabels = { building: "Gebäude", hero: "Helden", troop: "Truppen", spell: "Zauber", siege_machine: "Belagerungsmaschinen" };

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function GoalPlanner({ recommendations, queuedKeys, onAddToQueue, isSaving, accountId, goals, onSaveGoal, onDeleteGoal }: Props) {
  const [itemKey, setItemKey] = useState("");
  const [targetLevel, setTargetLevel] = useState(1);
  const today = useMemo(() => toDateInput(new Date()), []);
  const defaultDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return toDateInput(date);
  }, []);
  const [targetDate, setTargetDate] = useState(defaultDate);
  const selected = recommendations.find((item) => `${item.itemType}:${item.itemId}` === itemKey);
  const safeTarget = selected ? Math.min(Math.max(targetLevel, selected.nextLevel), selected.maxLevel) : targetLevel;
  const levelsNeeded = selected ? Math.max(0, safeTarget - selected.currentLevel) : 0;
  const averageHours = selected && selected.missingLevels > 0 ? selected.remainingTime.hours / selected.missingLevels : 0;
  const estimatedHours = Math.ceil(averageHours * levelsNeeded);
  const daysAvailable = Math.max(0, Math.floor((new Date(`${targetDate}T23:59:59`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000));
  const estimatedDays = Math.ceil(estimatedHours / 24);
  const feasible = Boolean(selected) && estimatedDays <= daysAvailable;
  const alreadyQueued = selected ? queuedKeys.has(`${selected.itemType}:${selected.itemId}:${selected.nextLevel}`) : false;
  const milestonePrograms = useMemo(() => {
    const definitions = [
      { name: "Labor fertigstellen", description: "Alle Truppen, Zauber und Belagerungsmaschinen", filter: (item: UpgradeRecommendation) => ["troop", "spell", "siege_machine"].includes(item.itemType) },
      { name: "Helden-Offensive für CWL", description: "Alle noch offenen Helden-Upgrades", filter: (item: UpgradeRecommendation) => item.itemType === "hero" },
      { name: "Verteidigungen maxen", description: "Alle noch offenen Gebäude-Upgrades", filter: (item: UpgradeRecommendation) => item.itemType === "building" && !/wall|mauer|town hall|rathaus/i.test(item.name) },
      { name: "Bereit fürs nächste Rathaus", description: "Alle aktuell verfügbaren Rest-Upgrades", filter: () => true },
    ];
    return definitions.map((definition) => {
      const items = recommendations.filter(definition.filter);
      const hours = Math.ceil(items.reduce((sum, item) => sum + item.remainingTime.hours, 0));
      const date = new Date(); date.setHours(date.getHours() + hours);
      return { ...definition, items, hours, realisticDate: toDateInput(date) };
    });
  }, [recommendations]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Konkretes Ziel planen</h2>
        <p className="text-sm text-slate-400">Definiere ein Ziellevel und einen Termin. Die Schätzung verwendet die echten verbleibenden Upgradezeiten.</p>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {milestonePrograms.map((program) => {
          const next = program.items.find((item) => !queuedKeys.has(`${item.itemType}:${item.itemId}:${item.nextLevel}`));
          return <article key={program.name} className="rounded-2xl bg-slate-900 p-4"><h3 className="font-bold">{program.name}</h3><p className="mt-1 text-xs text-slate-400">{program.description}</p><p className="mt-3 text-sm"><b>{program.items.length}</b> Upgrade-Reihen · {Math.ceil(program.hours / 24)} Tage reine Zeit</p><p className="mt-1 text-xs text-slate-500">Frühester rechnerischer Termin: {new Intl.DateTimeFormat("de-DE").format(new Date(`${program.realisticDate}T00:00:00`))}</p><button type="button" disabled={!next || isSaving} onClick={() => next && onAddToQueue(next)} className="mt-3 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-40">{next ? "Plan auf Ziel optimieren" : "Alle Schritte eingeplant"}</button></article>;
        })}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold text-slate-300">Upgrade-Ziel
          <select value={itemKey} onChange={(event) => {
            const next = recommendations.find((item) => `${item.itemType}:${item.itemId}` === event.target.value);
            setItemKey(event.target.value);
            setTargetLevel(next?.maxLevel || 1);
          }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3">
            <option value="">Ziel auswählen …</option>
            {Object.entries(typeLabels).map(([type, label]) => (
              <optgroup key={type} label={label}>
                {recommendations.filter((item) => item.itemType === type).map((item) => <option key={`${item.itemType}:${item.itemId}`} value={`${item.itemType}:${item.itemId}`}>{item.name} (aktuell {item.currentLevel})</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-300">Ziellevel
          <input type="number" disabled={!selected} min={selected?.nextLevel || 1} max={selected?.maxLevel || 1} value={safeTarget} onChange={(event) => setTargetLevel(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 disabled:opacity-40" />
        </label>
        <label className="text-sm font-semibold text-slate-300">Zieldatum
          <input type="date" min={today} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3" />
        </label>
      </div>

      {selected ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm font-bold text-amber-300">Benötigter Weg</p>
            <p className="mt-2 text-xl font-bold">{selected.name}: Level {selected.currentLevel} → {safeTarget}</p>
            <p className="mt-2 text-sm text-slate-400">{levelsNeeded} Upgrades · ungefähr {estimatedHours} Stunden bzw. {estimatedDays} Tage reine Upgradezeit</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: levelsNeeded }, (_, index) => selected.currentLevel + index + 1).map((level) => <span key={level} className="rounded-lg bg-white/5 px-3 py-1 text-xs">Level {level}</span>)}
            </div>
          </div>
          <div className={`rounded-2xl border p-5 ${feasible ? "border-emerald-400/30 bg-emerald-400/10" : "border-red-400/30 bg-red-400/10"}`}>
            <p className={`font-bold ${feasible ? "text-emerald-200" : "text-red-200"}`}>{feasible ? "Ziel erscheint erreichbar" : "Zieltermin wahrscheinlich unrealistisch"}</p>
            <p className="mt-2 text-sm text-slate-300">Verfügbar: {daysAvailable} Tage · geschätzt benötigt: {estimatedDays} Tage. Ressourcen und mögliche Pausen können den Termin zusätzlich verschieben.</p>
            <button type="button" disabled={alreadyQueued || isSaving} onClick={() => onAddToQueue(selected)} className="mt-4 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">
              {alreadyQueued ? "Nächstes Level bereits in Queue" : "Nächstes benötigtes Level einplanen"}
            </button>
            <button type="button" onClick={() => onSaveGoal({ accountId, itemType: selected.itemType, itemId: selected.itemId, name: selected.name, currentLevel: selected.currentLevel, targetLevel: safeTarget, targetDate, estimatedHours })} className="ml-2 mt-4 rounded-xl border border-amber-400/40 px-4 py-2 text-sm font-bold text-amber-200">Ziel dauerhaft speichern</button>
          </div>
        </div>
      ) : <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-slate-400">Wähle ein konkretes Ziel aus.</div>}
      {goals.length ? <div className="mt-6 border-t border-white/10 pt-5"><h3 className="font-bold">Gespeicherte Ziele</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{goals.map((goal) => <div key={goal.id} className="rounded-xl bg-slate-900 p-4"><p className="font-bold">{goal.name} Level {goal.targetLevel}</p><p className="mt-1 text-xs text-slate-400">{goal.targetDate ? `bis ${new Intl.DateTimeFormat("de-DE").format(new Date(`${goal.targetDate}T00:00:00`))}` : "ohne Termin"} · ca. {Math.ceil(goal.estimatedHours / 24)} Tage</p><button type="button" onClick={() => onDeleteGoal(goal.id)} className="mt-3 text-xs font-bold text-red-300">Ziel löschen</button></div>)}</div></div> : null}
    </section>
  );
}
