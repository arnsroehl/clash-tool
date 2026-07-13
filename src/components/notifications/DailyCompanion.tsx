import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";

type Props = {
  simulation: BuilderSimulationResult;
  recommendations: UpgradeRecommendation[];
  enabled: boolean;
  language?: "de" | "en";
};
export function DailyCompanion({
  simulation,
  recommendations,
  enabled,
  language = "de",
}: Props) {
  const en = language === "en";
  if (!enabled)
    return (
      <div className="rounded-2xl bg-white/5 p-5 text-slate-400">
        {en
          ? "The daily overview is disabled in your profile."
          : "Die tägliche Übersicht ist im Nutzerprofil deaktiviert."}
      </div>
    );
  const nextFinishes = [...simulation.assignments]
    .sort((a, b) => a.endHour - b.endHour)
    .slice(0, 3);
  const weeklyAssignments = [...simulation.assignments]
    .filter((item) => item.endHour <= 7 * 24)
    .sort((a, b) => a.endHour - b.endHour);
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-bold">
        {en ? "What you should do today" : "Das solltest du heute tun"}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {recommendations.slice(0, 3).map((item, index) => (
          <div key={item.itemId} className="rounded-2xl bg-slate-900 p-4">
            <p className="text-xs font-bold text-amber-300">
              {en ? "Next step" : "Nächster Schritt"} {index + 1}
            </p>
            <p className="mt-1 font-bold">{item.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              Level {item.currentLevel} → {item.nextLevel}
            </p>
          </div>
        ))}
      </div>
      <h3 className="mt-6 font-bold">
        {en ? "Next free slots" : "Nächste freie Slots"}
      </h3>
      {nextFinishes.length ? (
        <div className="mt-3 flex flex-col gap-2">
          {nextFinishes.map((item) => (
            <div
              key={item.queueItemId}
              className="rounded-xl bg-white/5 p-3 text-sm"
            >
              {item.slotLabel}: {item.name}{" "}
              {en
                ? `finishes in ${item.endHour} hours`
                : `endet in ${item.endHour} Stunden`}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          {en
            ? "No upgrades scheduled yet."
            : "Noch keine Upgrades eingeplant."}
        </p>
      )}
      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h3 className="font-bold">
          {en ? "Seven-day plan" : "Sieben-Tage-Plan"}
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          {weeklyAssignments.length
            ? en
              ? `${weeklyAssignments.length} queued upgrades should finish this week.`
              : `${weeklyAssignments.length} Queue-Upgrades werden diese Woche voraussichtlich fertig.`
            : en
              ? "No queued upgrade currently finishes within seven days."
              : "Aktuell wird kein Queue-Upgrade innerhalb von sieben Tagen fertig."}
        </p>
        {weeklyAssignments.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {weeklyAssignments.slice(0, 8).map((item) => (
              <div
                key={`${item.queueItemId}-${item.endHour}`}
                className="rounded-xl bg-white/5 p-3 text-xs"
              >
                <b>
                  {item.name} Level {item.toLevel}
                </b>
                <span className="mt-1 block text-slate-500">
                  {en ? "Day" : "Tag"}{" "}
                  {Math.max(1, Math.ceil(item.endHour / 24))} · {item.slotLabel}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
