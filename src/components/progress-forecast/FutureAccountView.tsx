import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";

type Props = {
  simulation: BuilderSimulationResult;
  horizonDays: number;
  language?: "de" | "en";
};

export function FutureAccountView({
  simulation,
  horizonDays,
  language = "de",
}: Props) {
  const en = language === "en";
  const completed = simulation.assignments.filter(
    (item) => item.endHour <= horizonDays * 24,
  );
  return (
    <section id="future-account-view" className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <h3 className="font-bold">
        {en
          ? `Account in ${horizonDays} days`
          : `Account in ${horizonDays} Tagen`}
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        {en
          ? "Expected levels from the current queue."
          : "Voraussichtliche Level aus der aktuellen Queue."}
      </p>
      {completed.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {completed.map((item) => (
            <div
              key={item.queueItemId}
              className="rounded-xl bg-white/5 p-3 text-sm"
            >
              <span className="font-bold">{item.name}</span>
              <span className="ml-2 text-emerald-300">
                Level {item.toLevel}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {item.slotLabel} · {en ? "completed after" : "fertig nach"}{" "}
                {item.endHour} h
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">
          {en
            ? "No queued upgrade will finish in this period."
            : "In diesem Zeitraum wird noch kein Queue-Upgrade abgeschlossen."}
        </p>
      )}
    </section>
  );
}
