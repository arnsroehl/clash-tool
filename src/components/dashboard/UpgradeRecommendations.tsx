"use client";

import { useState } from "react";
import {
  compareRecommendationExplanation,
  explainRecommendationReason,
  shortRecommendationExplanation,
} from "@/features/decision-engine/decision-engine.explanations";
import type {
  Recommendation,
  RecommendationPreference,
} from "@/features/decision-engine/decision-engine.types";
import type { PlannerResult, UpgradeRecommendation } from "@/features/planner/planner.types";

type UpgradeRecommendationsProps = {
  language?: "de" | "en";
  plannerResult: PlannerResult | null;
  recommendations?: Recommendation[];
  excludedRecommendations?: Recommendation[];
  onAddRecommendation?: (recommendation: UpgradeRecommendation) => void;
  onPreferenceChange?: (
    itemType: string,
    itemId: string,
    preference: RecommendationPreference,
  ) => void;
  preferenceSaving?: boolean;
};

function formatNumber(value: number, language: "de" | "en"): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatType(type: string, language: "de" | "en"): string {
  const labels: Record<string, { de: string; en: string }> = {
    building: { de: "Gebäude", en: "Building" },
    hero: { de: "Held", en: "Hero" },
    troop: { de: "Truppe", en: "Troop" },
    spell: { de: "Zauber", en: "Spell" },
    siege_machine: { de: "Belagerung", en: "Siege machine" },
  };
  return labels[type]?.[language] || type;
}

function formatDate(value: string, language: "de" | "en"): string {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UpgradeRecommendations({
  language = "de",
  plannerResult,
  recommendations = [],
  excludedRecommendations = [],
  onAddRecommendation,
  onPreferenceChange,
  preferenceSaving = false,
}: UpgradeRecommendationsProps) {
  const en = language === "en";
  const [visibleCount, setVisibleCount] = useState(4);

  return (
    <section id="upgrade-recommendations" className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {en ? "Explainable upgrade decisions" : "Erklärbare Upgrade-Entscheidungen"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {en
              ? "Deterministic ranking from strategy, goals, time, cost, slots, resources, dependencies, progress gaps, events and your preferences."
              : "Reproduzierbare Rangfolge aus Strategie, Zielen, Zeit, Kosten, Slots, Ressourcen, Abhängigkeiten, Fortschrittslücken, Events und deinen Prioritäten."}
          </p>
        </div>
        <span className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
          {recommendations.length}/{plannerResult?.summary.possibleUpgradeCount || 0}
        </span>
      </div>

      {excludedRecommendations.length > 0 && onPreferenceChange ? (
        <details className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/5 p-4">
          <summary className="cursor-pointer text-sm font-bold text-rose-100">
            {en ? "Hidden recommendations" : "Ausgeblendete Empfehlungen"} ({excludedRecommendations.length})
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {excludedRecommendations.map((recommendation) => (
              <button
                key={recommendation.id}
                type="button"
                disabled={preferenceSaving || recommendation.preference !== "exclude"}
                onClick={() => onPreferenceChange(recommendation.itemType, recommendation.itemId, "normal")}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
              >
                {recommendation.name} · {en ? "recommend again" : "wieder empfehlen"}
              </button>
            ))}
          </div>
        </details>
      ) : null}

      {recommendations.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en ? "No eligible upgrades found." : "Keine bewertbaren Upgrades gefunden."}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {recommendations.slice(0, visibleCount).map((recommendation) => (
            <article
              key={recommendation.id}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-amber-400 px-2 py-1 text-xs font-black text-slate-950">
                      #{recommendation.rank}
                    </span>
                    <p className="font-bold text-white">{recommendation.name}</p>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400">
                      {formatType(recommendation.itemType, language)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Level {recommendation.currentLevel} → {recommendation.nextLevel} · {recommendation.assignedSlot}
                  </p>
                  <p className="mt-2 text-sm text-emerald-200">
                    {shortRecommendationExplanation(recommendation, language)}
                  </p>
                  {recommendation.negativeFactors[0] ? (
                    <p className="mt-2 text-xs text-amber-200">
                      <b>{en ? "Trade-off:" : "Nachteil:"}</b>{" "}
                      {explainRecommendationReason(recommendation.negativeFactors[0], language)}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-32 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-sky-200">Score</p>
                  <p className="text-3xl font-black text-white">{formatNumber(recommendation.score, language)}</p>
                  <p className="text-[11px] text-slate-400">{recommendation.rulesetVersion}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                <span>{en ? "Cost" : "Kosten"}: G {formatNumber(recommendation.nextLevelCosts.gold, language)} · E {formatNumber(recommendation.nextLevelCosts.elixir, language)} · DE {formatNumber(recommendation.nextLevelCosts.darkElixir, language)}</span>
                <span>{en ? "Duration" : "Dauer"}: {formatNumber(recommendation.nextLevelTime.hours, language)} h</span>
                <span>{en ? "Start" : "Start"}: {formatDate(recommendation.expectedStartAt, language)}</span>
                <span>{en ? "Finish" : "Ende"}: {formatDate(recommendation.expectedFinishAt, language)}</span>
              </div>

              <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-4">
                <summary className="cursor-pointer font-bold text-sky-200">
                  {en ? "Why recommended?" : "Warum empfohlen?"}
                </summary>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-300">
                      {en ? "Positive factors" : "Positive Faktoren"}
                    </h4>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
                      {recommendation.positiveFactors.slice(0, 5).map((factor) => (
                        <li key={`${factor.code}:${factor.value || ""}`}>
                          {explainRecommendationReason(factor, language)}{" "}
                          <span className="text-emerald-300">({factor.impact >= 0 ? "+" : ""}{formatNumber(factor.impact, language)})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-amber-300">
                      {en ? "Why not higher?" : "Warum nicht höher?"}
                    </h4>
                    {recommendation.negativeFactors.length ? (
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
                        {recommendation.negativeFactors.map((factor) => (
                          <li key={`${factor.code}:${factor.value || ""}`}>
                            {explainRecommendationReason(factor, language)}{" "}
                            <span className="text-amber-300">({formatNumber(factor.impact, language)})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        {en ? "No material downside was calculated." : "Es wurde kein wesentlicher Nachteil berechnet."}
                      </p>
                    )}
                  </div>
                </div>
                {recommendation.alternatives.length ? (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-violet-300">
                      {en ? "Compare alternatives" : "Mit Alternativen vergleichen"}
                    </h4>
                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      {recommendation.alternatives.map((alternative) => (
                        <li key={alternative.upgradeId}>
                          {compareRecommendationExplanation(recommendation, alternative, language)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </details>

              <div className="mt-4 flex flex-wrap gap-2">
                {onAddRecommendation ? (
                  <button type="button" onClick={() => onAddRecommendation(recommendation)} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950">
                    {en ? "Add to queue" : "Zur Queue hinzufügen"}
                  </button>
                ) : null}
                {onPreferenceChange ? (
                  <>
                    <button
                      type="button"
                      disabled={preferenceSaving}
                      onClick={() => onPreferenceChange(recommendation.itemType, recommendation.itemId, recommendation.preference === "strongly_prefer" ? "normal" : "strongly_prefer")}
                      className="rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-40"
                    >
                      {recommendation.preference === "strongly_prefer"
                        ? (en ? "Reset priority" : "Priorität zurücksetzen")
                        : (en ? "Increase priority" : "Priorität erhöhen")}
                    </button>
                    <button
                      type="button"
                      disabled={preferenceSaving}
                      onClick={() => onPreferenceChange(recommendation.itemType, recommendation.itemId, "exclude")}
                      className="rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-bold text-rose-200 disabled:opacity-40"
                    >
                      {en ? "Do not recommend again" : "Nicht mehr empfehlen"}
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
          {visibleCount < recommendations.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 4)}
              className="rounded-2xl border border-amber-400/30 px-4 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-400/10"
            >
              {en ? "Show more recommendations" : "Weitere Empfehlungen anzeigen"} ({recommendations.length - visibleCount})
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
