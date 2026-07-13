"use client";

import { useMemo, useState } from "react";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { PlanningGoal } from "@/types/planningProfile";

type Props = {
  recommendations: UpgradeRecommendation[];
  queuedKeys: Set<string>;
  onAddToQueue: (recommendation: UpgradeRecommendation) => void;
  onOptimizeQueue: (recommendations: UpgradeRecommendation[]) => void;
  isSaving: boolean;
  accountId: string;
  builderCount: number;
  goals: PlanningGoal[];
  currentLevels: Record<string, number>;
  onSaveGoal: (goal: Omit<PlanningGoal, "id" | "status">) => void;
  onDeleteGoal: (id: string) => void;
  language?: "de" | "en";
};

const typeLabels = {
  de: {
    building: "Gebäude",
    hero: "Helden",
    troop: "Truppen",
    spell: "Zauber",
    siege_machine: "Belagerungsmaschinen",
  },
  en: {
    building: "Buildings",
    hero: "Heroes",
    troop: "Troops",
    spell: "Spells",
    siege_machine: "Siege Machines",
  },
};

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function GoalPlanner({
  recommendations,
  queuedKeys,
  onAddToQueue,
  onOptimizeQueue,
  isSaving,
  accountId,
  builderCount,
  goals,
  currentLevels,
  onSaveGoal,
  onDeleteGoal,
  language = "de",
}: Props) {
  const en = language === "en";
  const [itemKey, setItemKey] = useState("");
  const [targetLevel, setTargetLevel] = useState(1);
  const today = useMemo(() => toDateInput(new Date()), []);
  const defaultDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return toDateInput(date);
  }, []);
  const [targetDate, setTargetDate] = useState(defaultDate);
  const selected = recommendations.find(
    (item) => `${item.itemType}:${item.itemId}` === itemKey,
  );
  const safeTarget = selected
    ? Math.min(Math.max(targetLevel, selected.nextLevel), selected.maxLevel)
    : targetLevel;
  const levelsNeeded = selected
    ? Math.max(0, safeTarget - selected.currentLevel)
    : 0;
  const requiredUpgradePath = selected?.upgradePath?.filter(
    (level) => level.level <= safeTarget,
  );
  const estimatedHours = Math.ceil(
    requiredUpgradePath?.length
      ? requiredUpgradePath.reduce((sum, level) => sum + level.time.hours, 0)
      : selected && selected.missingLevels > 0
        ? (selected.remainingTime.hours / selected.missingLevels) * levelsNeeded
        : 0,
  );
  const daysAvailable = Math.max(
    0,
    Math.floor(
      (new Date(`${targetDate}T23:59:59`).getTime() -
        new Date(`${today}T00:00:00`).getTime()) /
        86_400_000,
    ),
  );
  const estimatedDays = Math.ceil(estimatedHours / 24);
  const feasible = Boolean(selected) && estimatedDays <= daysAvailable;
  const alreadyQueued = selected
    ? queuedKeys.has(
        `${selected.itemType}:${selected.itemId}:${selected.nextLevel}`,
      )
    : false;
  const milestonePrograms = useMemo(() => {
    const definitions = [
      {
        name: en ? "Finish the laboratory" : "Labor fertigstellen",
        description: en
          ? "All troops, spells and siege machines"
          : "Alle Truppen, Zauber und Belagerungsmaschinen",
        filter: (item: UpgradeRecommendation) =>
          ["troop", "spell", "siege_machine"].includes(item.itemType),
      },
      {
        name: en ? "CWL-ready heroes" : "Helden-Offensive für CWL",
        description: en
          ? "All remaining hero upgrades"
          : "Alle noch offenen Helden-Upgrades",
        filter: (item: UpgradeRecommendation) => item.itemType === "hero",
      },
      {
        name: en
          ? "Complete all walls at the next level"
          : "Alle Mauern auf der nächsten Stufe abschließen",
        description: en
          ? "Every individual wall segment is included"
          : "Jedes einzelne Mauersegment wird berücksichtigt",
        filter: (item: UpgradeRecommendation) =>
          item.itemType === "building" && /wall|mauer/i.test(item.name),
      },
      {
        name: en ? "Max defenses" : "Verteidigungen maxen",
        description: en
          ? "All remaining defensive building upgrades"
          : "Alle noch offenen Gebäude-Upgrades",
        filter: (item: UpgradeRecommendation) =>
          item.itemType === "building" &&
          /defense|verteidigung/i.test(item.category) &&
          !/wall|mauer|town hall|rathaus/i.test(item.name),
      },
      {
        name: en
          ? "Ready for the next Town Hall"
          : "Bereit fürs nächste Rathaus",
        description: en
          ? "All currently available remaining upgrades"
          : "Alle aktuell verfügbaren Rest-Upgrades",
        filter: () => true,
      },
    ];
    return definitions.map((definition) => {
      const items = recommendations.filter(definition.filter);
      const builderHours = items
        .filter(
          (item) => item.itemType === "building" || item.itemType === "hero",
        )
        .reduce((sum, item) => sum + item.remainingTime.hours, 0);
      const laboratoryHours = items
        .filter((item) =>
          ["troop", "spell", "siege_machine"].includes(item.itemType),
        )
        .reduce((sum, item) => sum + item.remainingTime.hours, 0);
      const elapsedHours = Math.ceil(
        Math.max(builderHours / Math.max(1, builderCount), laboratoryHours),
      );
      const date = new Date();
      date.setHours(date.getHours() + elapsedHours);
      return {
        ...definition,
        items,
        elapsedHours,
        realisticDate: toDateInput(date),
      };
    });
  }, [builderCount, en, recommendations]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">
          {en ? "Plan a specific goal" : "Konkretes Ziel planen"}
        </h2>
        <p className="text-sm text-slate-400">
          {en
            ? "Define a target level and date. The estimate uses the actual remaining upgrade times."
            : "Definiere ein Ziellevel und einen Termin. Die Schätzung verwendet die echten verbleibenden Upgradezeiten."}
        </p>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {milestonePrograms.map((program) => {
          const missingNextSteps = program.items.filter(
            (item) =>
              !queuedKeys.has(
                `${item.itemType}:${item.itemId}:${item.nextLevel}`,
              ),
          );
          return (
            <article
              key={program.name}
              className="rounded-2xl bg-slate-900 p-4"
            >
              <h3 className="font-bold">{program.name}</h3>
              <p className="mt-1 text-xs text-slate-400">
                {program.description}
              </p>
              <p className="mt-3 text-sm">
                <b>{program.items.length}</b>{" "}
                {en
                  ? `upgrade paths · about ${Math.ceil(program.elapsedHours / 24)} calendar days`
                  : `Upgrade-Reihen · ca. ${Math.ceil(program.elapsedHours / 24)} Kalendertage`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {en
                  ? "Earliest calculated date"
                  : "Frühester rechnerischer Termin"}
                :{" "}
                {new Intl.DateTimeFormat(en ? "en-US" : "de-DE").format(
                  new Date(`${program.realisticDate}T00:00:00`),
                )}
              </p>
              <button
                type="button"
                disabled={!missingNextSteps.length || isSaving}
                onClick={() => onOptimizeQueue(missingNextSteps)}
                className="mt-3 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-40"
              >
                {missingNextSteps.length
                  ? en
                    ? `Prioritize ${missingNextSteps.length} next steps`
                    : `${missingNextSteps.length} nächste Schritte priorisieren`
                  : en
                    ? "All steps scheduled"
                    : "Alle Schritte eingeplant"}
              </button>
            </article>
          );
        })}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold text-slate-300">
          {en ? "Upgrade goal" : "Upgrade-Ziel"}
          <select
            value={itemKey}
            onChange={(event) => {
              const next = recommendations.find(
                (item) =>
                  `${item.itemType}:${item.itemId}` === event.target.value,
              );
              setItemKey(event.target.value);
              setTargetLevel(next?.maxLevel || 1);
            }}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
          >
            <option value="">
              {en ? "Select goal …" : "Ziel auswählen …"}
            </option>
            {Object.entries(typeLabels[language]).map(([type, label]) => (
              <optgroup key={type} label={label}>
                {recommendations
                  .filter((item) => item.itemType === type)
                  .map((item) => (
                    <option
                      key={`${item.itemType}:${item.itemId}`}
                      value={`${item.itemType}:${item.itemId}`}
                    >
                      {item.name} ({en ? "current" : "aktuell"}{" "}
                      {item.currentLevel})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-300">
          {en ? "Target level" : "Ziellevel"}
          <input
            type="number"
            disabled={!selected}
            min={selected?.nextLevel || 1}
            max={selected?.maxLevel || 1}
            value={safeTarget}
            onChange={(event) => setTargetLevel(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 disabled:opacity-40"
          />
        </label>
        <label className="text-sm font-semibold text-slate-300">
          {en ? "Target date" : "Zieldatum"}
          <input
            type="date"
            min={today}
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
          />
        </label>
      </div>

      {selected ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm font-bold text-amber-300">
              {en ? "Required path" : "Benötigter Weg"}
            </p>
            <p className="mt-2 text-xl font-bold">
              {selected.name}: Level {selected.currentLevel} → {safeTarget}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {levelsNeeded} upgrades ·{" "}
              {en
                ? `about ${estimatedHours} hours or ${estimatedDays} days of pure upgrade time`
                : `ungefähr ${estimatedHours} Stunden bzw. ${estimatedDays} Tage reine Upgradezeit`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                requiredUpgradePath?.map((step) => step.level) ||
                Array.from(
                  { length: levelsNeeded },
                  (_, index) => selected.currentLevel + index + 1,
                )
              ).map((level) => (
                <span
                  key={level}
                  className="rounded-lg bg-white/5 px-3 py-1 text-xs"
                >
                  Level {level}
                </span>
              ))}
            </div>
          </div>
          <div
            className={`rounded-2xl border p-5 ${feasible ? "border-emerald-400/30 bg-emerald-400/10" : "border-red-400/30 bg-red-400/10"}`}
          >
            <p
              className={`font-bold ${feasible ? "text-emerald-200" : "text-red-200"}`}
            >
              {feasible
                ? en
                  ? "Goal appears achievable"
                  : "Ziel erscheint erreichbar"
                : en
                  ? "Target date is probably unrealistic"
                  : "Zieltermin wahrscheinlich unrealistisch"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {en
                ? `Available: ${daysAvailable} days · estimated: ${estimatedDays} days. Resources and pauses may delay the date further.`
                : `Verfügbar: ${daysAvailable} Tage · geschätzt benötigt: ${estimatedDays} Tage. Ressourcen und mögliche Pausen können den Termin zusätzlich verschieben.`}
            </p>
            <button
              type="button"
              disabled={alreadyQueued || isSaving}
              onClick={() => onAddToQueue(selected)}
              className="mt-4 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
            >
              {alreadyQueued
                ? en
                  ? "Next level already queued"
                  : "Nächstes Level bereits in Queue"
                : en
                  ? "Schedule next required level"
                  : "Nächstes benötigtes Level einplanen"}
            </button>
            <button
              type="button"
              onClick={() =>
                onSaveGoal({
                  accountId,
                  itemType: selected.itemType,
                  itemId: selected.itemId,
                  name: selected.name,
                  currentLevel: selected.currentLevel,
                  targetLevel: safeTarget,
                  targetDate,
                  estimatedHours,
                })
              }
              className="ml-2 mt-4 rounded-xl border border-amber-400/40 px-4 py-2 text-sm font-bold text-amber-200"
            >
              {en ? "Save goal" : "Ziel dauerhaft speichern"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-slate-400">
          {en ? "Select a specific goal." : "Wähle ein konkretes Ziel aus."}
        </div>
      )}
      {goals.length ? (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="font-bold">
            {en ? "Saved goals" : "Gespeicherte Ziele"}
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-xl bg-slate-900 p-4">
                {(() => {
                  const current =
                    currentLevels[`${goal.itemType}:${goal.itemId}`] ??
                    goal.currentLevel;
                  const total = Math.max(
                    1,
                    goal.targetLevel - goal.currentLevel,
                  );
                  const progress = Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round(((current - goal.currentLevel) / total) * 100),
                    ),
                  );
                  return (
                    <>
                      <p className="font-bold">
                        {goal.name} Level {goal.targetLevel}
                      </p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-emerald-300">
                        {current} / {goal.targetLevel} · {progress}%{" "}
                        {en ? "complete" : "erreicht"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {goal.targetDate
                          ? `${en ? "by" : "bis"} ${new Intl.DateTimeFormat(en ? "en-US" : "de-DE").format(new Date(`${goal.targetDate}T00:00:00`))}`
                          : en
                            ? "without a date"
                            : "ohne Termin"}{" "}
                        ·{" "}
                        {en
                          ? `about ${Math.ceil(goal.estimatedHours / 24)} days`
                          : `ca. ${Math.ceil(goal.estimatedHours / 24)} Tage`}
                      </p>
                      <button
                        type="button"
                        onClick={() => onDeleteGoal(goal.id)}
                        className="mt-3 text-xs font-bold text-red-300"
                      >
                        {en ? "Delete goal" : "Ziel löschen"}
                      </button>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
