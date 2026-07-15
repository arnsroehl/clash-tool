"use client";

import type {
  InsightCategory,
  InsightSeverity,
  PlannerInsight,
} from "@/features/planner-intelligence/planner-intelligence.types";

type Props = {
  insights: PlannerInsight[];
  disabledCategories: InsightCategory[];
  language: "de" | "en";
  isSaving: boolean;
  onDismiss: (key: string) => void;
  onSnooze: (key: string) => void;
  onToggleCategory: (category: InsightCategory) => void;
  onApply: (insight: PlannerInsight) => void;
};

const severityLabels: Record<InsightSeverity, { de: string; en: string; color: string }> = {
  information: { de: "Information", en: "Information", color: "border-sky-400/30 bg-sky-400/10 text-sky-200" },
  recommendation: { de: "Empfehlung", en: "Recommendation", color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
  important: { de: "Wichtig", en: "Important", color: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  critical: { de: "Kritisch", en: "Critical", color: "border-rose-400/40 bg-rose-400/10 text-rose-200" },
};

const categoryLabels: Record<InsightCategory, { de: string; en: string }> = {
  builder_idle: { de: "Builder-Leerlauf", en: "Builder idle" },
  resource_shortfall: { de: "Ressourcenengpass", en: "Resource shortfall" },
  resource_overflow: { de: "Ressourcenüberlauf", en: "Resource overflow" },
  magic_item: { de: "Magic Items", en: "Magic Items" },
  finish_time: { de: "Fertigstellungszeit", en: "Finish time" },
  goal_risk: { de: "Zielrisiko", en: "Goal risk" },
  event_opportunity: { de: "Eventchance", en: "Event opportunity" },
  queue_conflict: { de: "Queue-Konflikt", en: "Queue conflict" },
};

const allCategories = Object.keys(categoryLabels) as InsightCategory[];

function formatImpact(insight: PlannerInsight, language: "de" | "en"): string[] {
  const en = language === "en";
  const number = new Intl.NumberFormat(en ? "en-US" : "de-DE", { maximumFractionDigits: 1 });
  const parts = [`${en ? "Urgency" : "Dringlichkeit"}: ${number.format(insight.urgency)}/100`];
  if (insight.financialImpact > 0) parts.push(`${en ? "Financial impact" : "Finanzielle Wirkung"}: ${number.format(insight.financialImpact)}`);
  if (insight.timeImpactHours > 0) parts.push(`${en ? "Time impact" : "Zeitwirkung"}: ${number.format(insight.timeImpactHours)} h`);
  if (insight.goalId) parts.push(en ? "Linked to a goal" : "Mit Ziel verknüpft");
  return parts;
}

export function PlannerInsights({
  insights,
  disabledCategories,
  language,
  isSaving,
  onDismiss,
  onSnooze,
  onToggleCategory,
  onApply,
}: Props) {
  const en = language === "en";
  return (
    <section className="rounded-3xl border border-amber-300/20 bg-slate-900/80 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">Planner Intelligence</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{en ? "Risks and opportunities" : "Risiken und Chancen"}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {en ? "Derived from your current queue, simulation, resources, goals, events and Magic Items." : "Aus Queue, Simulation, Ressourcen, Zielen, Events und Magic Items berechnet."}
          </p>
        </div>
        <span className="rounded-2xl bg-amber-300 px-4 py-2 font-black text-slate-950">{insights.length}</span>
      </div>

      <details className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">{en ? "Insight categories" : "Hinweiskategorien"}</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {allCategories.map((category) => {
            const enabled = !disabledCategories.includes(category);
            return (
              <button
                key={category}
                type="button"
                disabled={isSaving}
                aria-pressed={enabled}
                onClick={() => onToggleCategory(category)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${enabled ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-slate-500"}`}
              >
                {categoryLabels[category][language]} · {enabled ? (en ? "on" : "an") : (en ? "off" : "aus")}
              </button>
            );
          })}
        </div>
      </details>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {insights.map((insight) => {
          const severity = severityLabels[insight.severity];
          return (
            <article key={insight.key} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${severity.color}`}>{severity[language]}</span>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{categoryLabels[insight.category][language]}</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">{en ? insight.titleEn : insight.titleDe}</h3>
              <p className="mt-2 text-sm text-slate-300">{en ? insight.messageEn : insight.messageDe}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                {formatImpact(insight, language).map((part) => <span key={part} className="rounded-lg bg-white/5 px-2 py-1">{part}</span>)}
              </div>
              <div className={`mt-4 rounded-xl p-3 text-sm ${insight.severity === "critical" ? "bg-rose-400/10 text-rose-100" : "bg-emerald-400/10 text-emerald-100"}`}>
                <b>{en ? "Solution:" : "Lösung:"}</b> {en ? insight.solutionEn : insight.solutionDe}
              </div>
              <details className="mt-3 text-sm text-slate-400">
                <summary className="cursor-pointer font-semibold text-slate-300">{en ? "Show explanation" : "Erklärung anzeigen"}</summary>
                <p className="mt-2">{en ? insight.explanationEn : insight.explanationDe}</p>
                <p className="mt-2 text-xs">Rule: {insight.reasonCode} · {en ? "Expires" : "Läuft ab"}: {new Date(insight.expiresAt).toLocaleString(en ? "en-US" : "de-DE")}</p>
              </details>
              <div className="mt-4 flex flex-wrap gap-2">
                {insight.action ? (
                  <button type="button" onClick={() => onApply(insight)} className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950">
                    {en ? insight.action.labelEn : insight.action.labelDe}
                  </button>
                ) : null}
                <button type="button" disabled={isSaving} onClick={() => onSnooze(insight.key)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-40">
                  {en ? "Remind tomorrow" : "Morgen erinnern"}
                </button>
                <button type="button" disabled={isSaving} onClick={() => onDismiss(insight.key)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 disabled:opacity-40">
                  {en ? "Hide" : "Ausblenden"}
                </button>
                <button type="button" disabled={isSaving} onClick={() => onToggleCategory(insight.category)} className="rounded-xl px-3 py-2 text-xs text-slate-500 disabled:opacity-40">
                  {en ? "Disable similar" : "Ähnliche deaktivieren"}
                </button>
              </div>
            </article>
          );
        })}
        {!insights.length ? (
          <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-200">
            {en ? "No current risk or saving opportunity was detected in the active plan." : "Im aktiven Plan wurde aktuell kein Risiko und keine Sparchance erkannt."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
