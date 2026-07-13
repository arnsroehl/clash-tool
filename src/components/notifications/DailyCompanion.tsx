import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";

type Props = { simulation: BuilderSimulationResult; recommendations: UpgradeRecommendation[]; enabled: boolean };
export function DailyCompanion({ simulation, recommendations, enabled }: Props) {
  if (!enabled) return <div className="rounded-2xl bg-white/5 p-5 text-slate-400">Die tägliche Übersicht ist im Nutzerprofil deaktiviert.</div>;
  const nextFinishes = [...simulation.assignments].sort((a,b) => a.endHour-b.endHour).slice(0,3);
  return <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <h2 className="text-xl font-bold">Das solltest du heute tun</h2>
    <div className="mt-4 grid gap-3 md:grid-cols-3">{recommendations.slice(0,3).map((item,index) => <div key={item.itemId} className="rounded-2xl bg-slate-900 p-4"><p className="text-xs font-bold text-amber-300">Nächster Schritt {index+1}</p><p className="mt-1 font-bold">{item.name}</p><p className="mt-1 text-xs text-slate-400">Level {item.currentLevel} → {item.nextLevel}</p></div>)}</div>
    <h3 className="mt-6 font-bold">Nächste freie Slots</h3>
    {nextFinishes.length ? <div className="mt-3 flex flex-col gap-2">{nextFinishes.map((item) => <div key={item.queueItemId} className="rounded-xl bg-white/5 p-3 text-sm">{item.slotLabel}: {item.name} endet in {item.endHour} Stunden</div>)}</div> : <p className="mt-2 text-sm text-slate-400">Noch keine Upgrades eingeplant.</p>}
  </section>;
}
