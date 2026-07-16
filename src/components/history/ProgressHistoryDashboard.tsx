"use client";

import { useMemo, useState } from "react";
import { analyzeProgressHistory, filterProgressHistory, progressHistoryCsv } from "@/features/progress-history/progress-history.engine";
import type { HistoryPeriod, ProgressCategory, ProgressHistorySnapshot } from "@/features/progress-history/progress-history.types";

type Props = { snapshots: ProgressHistorySnapshot[]; language: "de" | "en"; isSaving: boolean; onCapture: () => void };
const labels: Record<ProgressCategory, { de: string; en: string }> = {
  buildings: { de: "Gebäude", en: "Buildings" }, heroes: { de: "Helden", en: "Heroes" }, troops: { de: "Truppen", en: "Troops" }, spells: { de: "Zauber", en: "Spells" }, siegeMachines: { de: "Belagerung", en: "Siege" }, laboratory: { de: "Labor gesamt", en: "Laboratory" }, pets: { de: "Pets", en: "Pets" }, equipment: { de: "Ausrüstung", en: "Equipment" },
};
const sourceLabels: Record<ProgressHistorySnapshot["source"], { de: string; en: string }> = {
  daily: { de: "Tagessnapshot", en: "Daily snapshot" }, screenshot_import: { de: "Screenshot-Import", en: "Screenshot import" }, api_sync: { de: "API-Abgleich", en: "API sync" }, town_hall_change: { de: "Rathauswechsel", en: "Town Hall change" }, goal_completed: { de: "Zielabschluss", en: "Goal completed" }, manual_refresh: { de: "Manuell", en: "Manual" },
};
const format = (value: number, language: "de" | "en", digits = 1) => new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", { maximumFractionDigits: digits }).format(value);

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

function ProgressChart({ items, language }: { items: ProgressHistorySnapshot[]; language: "de" | "en" }) {
  if (items.length < 2) return <div className="flex h-52 items-center justify-center rounded-2xl bg-slate-950/60 text-sm text-slate-500">{language === "en" ? "A trend appears after the second snapshot." : "Ein Verlauf erscheint ab dem zweiten Snapshot."}</div>;
  const width = 800; const height = 220; const padding = 24;
  const points = items.map((item, index) => `${padding + index / Math.max(1, items.length - 1) * (width - padding * 2)},${height - padding - item.overallProgress / 100 * (height - padding * 2)}`).join(" ");
  return <div className="overflow-x-auto rounded-2xl bg-slate-950/60 p-3"><svg role="img" aria-label={language === "en" ? "Progress over time" : "Fortschritt im Zeitverlauf"} viewBox={`0 0 ${width} ${height}`} className="min-w-[520px]"><line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#334155"/><line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#334155"/><polyline points={points} fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinejoin="round"/><text x={padding} y={18} fill="#94a3b8" fontSize="13">100%</text><text x={padding} y={height-4} fill="#94a3b8" fontSize="13">0%</text></svg></div>;
}

export function ProgressHistoryDashboard({ snapshots, language, isSaving, onCapture }: Props) {
  const en = language === "en";
  const [period, setPeriod] = useState<HistoryPeriod>(30);
  const visible = useMemo(() => filterProgressHistory(snapshots, period), [period, snapshots]);
  const stats = useMemo(() => analyzeProgressHistory(visible), [visible]);
  const cards = [
    [en ? "Progress" : "Fortschritt", `${stats.progressGain >= 0 ? "+" : ""}${format(stats.progressGain, language)} %`],
    [en ? "Completed upgrades" : "Abgeschlossene Upgrades", format(stats.completedUpgradeCount, language, 0)],
    [en ? "Completed upgrade time" : "Abgeschlossene Upgradezeit", `${format(stats.completedUpgradeHours, language)} h`],
    [en ? "Builder utilization" : "Builder-Auslastung", stats.averageBuilderUtilization === null ? "–" : `${format(stats.averageBuilderUtilization, language)} %`],
    [en ? "Laboratory utilization" : "Labor-Auslastung", stats.averageLaboratoryUtilization === null ? "–" : `${format(stats.averageLaboratoryUtilization, language)} %`],
    [en ? "Forecast error" : "Prognosefehler", stats.forecastMeanAbsoluteErrorHours === null ? "–" : `${format(stats.forecastMeanAbsoluteErrorHours, language)} h`],
  ];
  return <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-300">{en ? "Progress history" : "Fortschrittshistorie"}</p><h2 className="mt-2 text-2xl font-bold">{en ? "Account development and performance" : "Accountentwicklung und Leistung"}</h2><p className="mt-1 text-sm text-slate-400">{en ? "Immutable snapshots; missing days are never interpolated silently." : "Unveränderliche Snapshots; fehlende Tage werden nie stillschweigend interpoliert."}</p></div><button type="button" disabled={isSaving} onClick={onCapture} className="rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-40">{isSaving ? "…" : en ? "Capture full snapshot" : "Vollsnapshot erstellen"}</button></div>
    <div className="mt-5 flex flex-wrap gap-2">{([7,30,90,365,"townHall","all"] as HistoryPeriod[]).map((value) => <button type="button" key={value} onClick={() => setPeriod(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${period === value ? "bg-amber-300 text-slate-950" : "bg-slate-900 text-slate-300"}`}>{value === "townHall" ? (en ? "Current TH" : "Aktuelles RH") : value === "all" ? (en ? "All" : "Gesamt") : `${value} ${en ? "days" : "Tage"}`}</button>)}</div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-950/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>
    <div className="mt-5"><ProgressChart items={visible} language={language}/></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-slate-950/60 p-4"><h3 className="font-bold">{en ? "Performance" : "Leistungsanalyse"}</h3><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><span className="text-slate-400">{en ? "Per week" : "Pro Woche"}</span><b>{format(stats.progressPerWeek, language)} %</b><span className="text-slate-400">{en ? "Per month" : "Pro Monat"}</span><b>{format(stats.progressPerMonth, language)} %</b><span className="text-slate-400">{en ? "Fastest area" : "Schnellster Bereich"}</span><b>{stats.fastestCategory ? labels[stats.fastestCategory][language] : "–"}</b><span className="text-slate-400">{en ? "Slowest area" : "Langsamster Bereich"}</span><b>{stats.slowestCategory ? labels[stats.slowestCategory][language] : "–"}</b><span className="text-slate-400">{en ? "On schedule" : "Planmäßig"}</span><b>{stats.onTimePercent === null ? "–" : `${stats.onTimePercent} %`}</b><span className="text-slate-400">{en ? "Average queue" : "Ø Queue"}</span><b>{stats.averageQueueLength ?? "–"}</b></div></div>
      <div className="rounded-2xl bg-slate-950/60 p-4"><h3 className="font-bold">{en ? "Time and resources" : "Zeit und Ressourcen"}</h3><div className="mt-3 space-y-2 text-sm"><p>{en ? "Gold spent" : "Gold ausgegeben"}: <b>{format(stats.spentResources.gold, language, 0)}</b></p><p>{en ? "Elixir spent" : "Elixier ausgegeben"}: <b>{format(stats.spentResources.elixir, language, 0)}</b></p><p>{en ? "Dark elixir spent" : "Dunkles Elixier ausgegeben"}: <b>{format(stats.spentResources.darkElixir, language, 0)}</b></p><p className="text-sky-300">Events: {format(stats.eventSavedHours, language)} h · {format(Object.values(stats.eventSavedResources).reduce((a,b)=>a+b,0), language, 0)} {en ? "resources" : "Ressourcen"}</p><p className="text-violet-300">Magic Items: {format(stats.magicItemSavedHours, language)} h · {format(Object.values(stats.magicItemSavedResources).reduce((a,b)=>a+b,0), language, 0)} {en ? "resources" : "Ressourcen"}</p></div></div>
    </div>
    {stats.missingDates.length ? <p className="mt-4 rounded-xl bg-amber-300/10 p-3 text-sm text-amber-100">{en ? `${stats.missingDates.length} days have no snapshot; longest transparent gap: ${stats.longestInactiveDays} days.` : `${stats.missingDates.length} Tage besitzen keinen Snapshot; längste transparent ausgewiesene Lücke: ${stats.longestInactiveDays} Tage.`}</p> : null}
    {stats.hasEstimates ? <p className="mt-3 text-xs text-slate-500">* {en ? "Forecast comparisons are model estimates; completed and spent values come from historical records." : "Prognosevergleiche sind Modellschätzungen; Abschlüsse und Ausgaben stammen aus historischen Datensätzen."}</p> : null}
    <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => download("clash-progress-history.csv", progressHistoryCsv(visible), "text/csv;charset=utf-8")} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold">CSV</button><button type="button" onClick={() => download("clash-progress-history.json", JSON.stringify(visible, null, 2), "application/json")} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold">JSON</button></div>
    <div className="mt-5 max-h-48 space-y-2 overflow-auto">{[...visible].reverse().slice(0,20).map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-950/50 px-3 py-2 text-xs"><span>{new Intl.DateTimeFormat(en ? "en-GB" : "de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.capturedAt))} · {sourceLabels[item.source][language]}</span><b>{item.overallProgress} % · TH {item.townHallLevel}</b></div>)}</div>
  </section>;
}
