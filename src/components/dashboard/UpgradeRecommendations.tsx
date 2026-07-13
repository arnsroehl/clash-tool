"use client";

import { useState } from "react";
import type {
  PlannerResult,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";

/** Renders the first planner recommendations without adding planner logic. */
type UpgradeRecommendationsProps = {
  language?: "de" | "en";
  plannerResult: PlannerResult | null;
  recommendations?: UpgradeRecommendation[];
};

function formatNumber(value: number, language: "de" | "en"): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE").format(
    value,
  );
}

function formatType(type: string, language: "de" | "en"): string {
  const labels: Record<string, string> =
    language === "en"
      ? {
          building: "Building",
          hero: "Hero",
          troop: "Troop",
          spell: "Spell",
          siege_machine: "Siege machine",
        }
      : {
          building: "Gebäude",
          hero: "Held",
          troop: "Truppe",
          spell: "Zauber",
          siege_machine: "Belagerung",
        };

  return labels[type] || type;
}

export function UpgradeRecommendations({
  language = "de",
  plannerResult,
  recommendations: suppliedRecommendations,
}: UpgradeRecommendationsProps) {
  const en = language === "en";
  const recommendations =
    suppliedRecommendations || plannerResult?.recommendations || [];
  const [visibleCount, setVisibleCount] = useState(4);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">
          {en ? "Upgrade recommendations" : "Upgrade-Empfehlungen"}
        </h2>
        <span className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
          {plannerResult?.summary.possibleUpgradeCount || 0}
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en
            ? "No available upgrades found."
            : "Keine möglichen Upgrades gefunden."}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {recommendations
            .slice(0, visibleCount)
            .map((recommendation, index) => (
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
                      {formatType(recommendation.itemType, language)} · Level{" "}
                      {recommendation.currentLevel} {en ? "to" : "auf"}{" "}
                      {recommendation.nextLevel}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Gold{" "}
                      {formatNumber(
                        recommendation.nextLevelCosts.gold,
                        language,
                      )}{" "}
                      ·{en ? "Elixir" : "Elixier"}{" "}
                      {formatNumber(
                        recommendation.nextLevelCosts.elixir,
                        language,
                      )}{" "}
                      · DE{" "}
                      {formatNumber(
                        recommendation.nextLevelCosts.darkElixir,
                        language,
                      )}{" "}
                      ·{" "}
                      {formatNumber(
                        recommendation.nextLevelTime.hours,
                        language,
                      )}{" "}
                      h
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-amber-300">
                    {en ? "Priority" : "Priorität"} {index + 1}
                  </div>
                </div>
              </div>
            ))}
          {visibleCount < recommendations.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 4)}
              className="rounded-2xl border border-amber-400/30 px-4 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-400/10"
            >
              {en
                ? "Show more recommendations"
                : "Weitere Empfehlungen anzeigen"}{" "}
              ({recommendations.length - visibleCount})
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
