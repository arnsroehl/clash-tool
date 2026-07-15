import {
  accountHealthAreaLabels,
} from "@/features/account-health/account-health";
import type {
  AccountHealthResult,
  AccountHealthSnapshot,
  RushRiskLevel,
} from "@/features/account-health/account-health.types";
import {
  strategyLabels,
  strategyLabelsEnglish,
} from "@/features/planning-control/planning-control";

type Props = {
  health: AccountHealthResult;
  history: AccountHealthSnapshot[];
  language: "de" | "en";
};

const rushLabels: Record<RushRiskLevel, { de: string; en: string }> = {
  low: { de: "Niedrig", en: "Low" },
  medium: { de: "Mittel", en: "Medium" },
  high: { de: "Hoch", en: "High" },
};

function ScoreBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-400" : value >= 55 ? "bg-amber-300" : "bg-rose-400";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
      <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function AccountHealthCard({ health, history, language }: Props) {
  const en = language === "en";
  const previous = history.find((snapshot) => snapshot.capturedOn < health.generatedAt.slice(0, 10));
  const delta = previous ? Math.round((health.score - previous.score) * 10) / 10 : null;
  const areaLabel = (id: AccountHealthResult["areas"][number]["id"]) =>
    accountHealthAreaLabels[id][language];
  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
            {en ? "Account analysis" : "Accountanalyse"}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {en ? "Account Health" : "Account Health"}: {health.score}/100
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            {en ? "General progress" : "Allgemeiner Fortschritt"}: {health.generalProgressScore} · {en ? "Balance" : "Ausgewogenheit"}: {health.balanceScore}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-300/10 px-4 py-3 text-right">
          <p className="text-xs text-slate-400">{en ? "Strategy fit" : "Strategiepassung"}</p>
          <p className="text-xl font-bold text-amber-200">{health.strategyFitScore}/100</p>
          <p className="text-xs text-slate-300">
            {(en ? strategyLabelsEnglish : strategyLabels)[health.strategy]}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {health.areas.map((area) => (
          <div key={area.id} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-200">{areaLabel(area.id)}</span>
              <span className={area.score === null ? "text-slate-500" : "font-bold text-white"}>
                {area.score === null ? (en ? "Data missing" : "Daten fehlen") : area.score}
              </span>
            </div>
            {area.score !== null ? <div className="mt-3"><ScoreBar value={area.score} /></div> : null}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{en ? "Strongest area" : "Stärkster Bereich"}</p>
          <p className="mt-1 font-semibold text-emerald-300">{health.strongestArea ? `${areaLabel(health.strongestArea.id)} (${health.strongestArea.score})` : "–"}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{en ? "Weakest area" : "Schwächster Bereich"}</p>
          <p className="mt-1 font-semibold text-rose-300">{health.weakestArea ? `${areaLabel(health.weakestArea.id)} (${health.weakestArea.score})` : "–"}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{en ? "Rush risk" : "Rush-Risiko"}</p>
          <p className="mt-1 font-semibold text-amber-200">{rushLabels[health.rushRiskLevel][language]} · {health.rushRiskScore}/100</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
        <h4 className="font-semibold text-white">{en ? "Three concrete next steps" : "Drei konkrete nächste Schritte"}</h4>
        {health.improvements.length ? (
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            {health.improvements.map((improvement, index) => (
              <li key={`${improvement.reasonCode}:${improvement.areaId}`} className="flex gap-3">
                <span className="font-bold text-amber-300">{index + 1}.</span>
                <span>{en ? improvement.en : improvement.de}</span>
              </li>
            ))}
          </ol>
        ) : <p className="mt-2 text-sm text-emerald-300">{en ? "No urgent catch-up action detected." : "Aktuell wurde kein dringender Aufholbedarf erkannt."}</p>}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
        <span>{en ? "Largest progress gap" : "Größte Fortschrittslücke"}: {health.largestProgressGap} {en ? "points" : "Punkte"}</span>
        <span>{en ? "Data completeness" : "Datenabdeckung"}: {health.dataCompletenessPercent}%</span>
        {delta !== null ? <span>{en ? "Change since previous snapshot" : "Seit letztem Snapshot"}: {delta > 0 ? "+" : ""}{delta}</span> : null}
      </div>

      {health.missingData.length ? (
        <p className="mt-3 text-xs text-amber-200">
          {en ? "Not included due to missing data" : "Wegen fehlender Daten nicht eingerechnet"}: {health.missingData.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
