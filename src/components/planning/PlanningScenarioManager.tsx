"use client";

import { useState } from "react";
import type { PlanningScenario } from "@/types/planningScenario";

type Props = {
  language?: "de" | "en";
  scenarios: PlanningScenario[];
  isBusy: boolean;
  onLoad: (scenario: PlanningScenario) => void;
  onSave: (name: string, id?: string) => void;
  onDelete: (id: string) => void;
};

export function PlanningScenarioManager({
  language = "de",
  scenarios,
  isBusy,
  onLoad,
  onSave,
  onDelete,
}: Props) {
  const en = language === "en";
  const active = scenarios.find((scenario) => scenario.isActive) || null;
  const [name, setName] = useState(active?.name || "");
  const strategyLabels = en
    ? {
        balanced: "Balanced",
        offense: "Offense",
        war: "War / CWL",
        farming: "Farming",
        fastest: "Fastest",
        rush_recovery: "Rush recovery",
        town_hall_push: "Town Hall push",
        custom: "Custom",
      }
    : {
        balanced: "Ausgewogen",
        offense: "Offensive",
        war: "Krieg / CWL",
        farming: "Farming",
        fastest: "Schnellste",
        rush_recovery: "Rush aufholen",
        town_hall_push: "Rathaus-Fokus",
        custom: "Eigene Gewichtung",
      };
  const format = (value: number) =>
    new Intl.NumberFormat(en ? "en-US" : "de-DE", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  return (
    <section className="mb-5 rounded-3xl border border-indigo-400/20 bg-indigo-400/5 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold">
            {en
              ? "Synchronized planning scenarios"
              : "Synchronisierte Planungsszenarien"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {en
              ? "Compare and save resources, capacities, farming, strategy and forecast settings across devices."
              : "Vergleiche und speichere Ressourcen, Kapazitäten, Farming, Strategie und Prognose geräteübergreifend."}
          </p>
        </div>
        <span className="text-xs text-indigo-200">
          {scenarios.length} {en ? "scenarios" : "Szenarien"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
        <select
          aria-label={en ? "Saved scenario" : "Gespeichertes Szenario"}
          value={active?.id || ""}
          onChange={(event) => {
            const scenario = scenarios.find(
              (item) => item.id === event.target.value,
            );
            if (scenario) onLoad(scenario);
          }}
          className="rounded-xl border border-white/10 bg-slate-950 p-3"
        >
          <option value="">
            {en ? "No active scenario" : "Kein aktives Szenario"}
          </option>
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
        <input
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          placeholder={en ? "Scenario name" : "Szenarioname"}
          className="rounded-xl border border-white/10 bg-slate-950 p-3"
        />
        <button
          type="button"
          disabled={isBusy || !name.trim()}
          onClick={() => onSave(name.trim(), active?.id)}
          className="rounded-xl bg-indigo-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-40"
        >
          {active
            ? en
              ? "Update"
              : "Aktualisieren"
            : en
              ? "Save"
              : "Speichern"}
        </button>
        <button
          type="button"
          disabled={isBusy || !name.trim()}
          onClick={() => onSave(name.trim())}
          className="rounded-xl border border-indigo-400/30 px-4 py-3 font-bold text-indigo-200 disabled:opacity-40"
        >
          {en ? "Save as new" : "Als neu speichern"}
        </button>
        <button
          type="button"
          disabled={isBusy || !active}
          onClick={() => active && onDelete(active.id)}
          className="rounded-xl border border-red-400/30 px-4 py-3 font-bold text-red-200 disabled:opacity-40"
        >
          {en ? "Delete" : "Löschen"}
        </button>
      </div>
      {scenarios.length > 1 ? (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="p-3">{en ? "Scenario" : "Szenario"}</th>
                <th className="p-3">{en ? "Strategy" : "Strategie"}</th>
                <th className="p-3">{en ? "Horizon" : "Horizont"}</th>
                <th className="p-3">{en ? "Goal" : "Ziel"}</th>
                <th className="p-3">{en ? "Resources" : "Ressourcen"}</th>
                <th className="p-3">{en ? "Daily income" : "Tagesertrag"}</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr
                  key={scenario.id}
                  className={`border-t border-white/10 ${scenario.isActive ? "bg-indigo-400/10" : "bg-slate-900/60"}`}
                >
                  <td className="p-3 font-bold">
                    {scenario.name}
                    {scenario.isActive ? (
                      <span className="ml-2 text-indigo-300">
                        {en ? "active" : "aktiv"}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">{strategyLabels[scenario.strategy]}</td>
                  <td className="p-3">{scenario.horizonDays} d</td>
                  <td className="p-3">{scenario.goalPercent}%</td>
                  <td className="p-3">
                    {format(
                      scenario.resources.gold +
                        scenario.resources.elixir +
                        scenario.resources.darkElixir,
                    )}
                  </td>
                  <td className="p-3">
                    {format(
                      scenario.dailyIncome.gold +
                        scenario.dailyIncome.elixir +
                        scenario.dailyIncome.darkElixir,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
