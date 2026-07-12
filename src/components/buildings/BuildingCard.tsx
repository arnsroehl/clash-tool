import type { Building } from "@/types/building";

type BuildingCardProps = {
  building: Building;
  instanceLevels: number[];
  isSaving: boolean;
  onUpdateLevel: (building: Building, instanceIndex: number, nextLevel: number) => void;
};

export function BuildingCard({
  building,
  instanceLevels,
  isSaving,
  onUpdateLevel,
}: BuildingCardProps) {
  return (
    <details className="rounded-2xl border border-white/10 bg-slate-900">
      <summary className="cursor-pointer list-none p-5">
        <p className="font-bold text-white">{building.name}</p>
        <p className="mt-1 text-sm text-slate-400">
          {building.category} · Max Level {building.maxLevel}
          {building.countAfterMerges && building.countAfterMerges > 1
            ? ` · ${building.countAfterMerges}× vorhanden`
            : ""}
          {building.buildingCount !== building.countAfterMerges
            ? ` · vor Merge ${building.buildingCount}×`
            : ""}
        </p>
      </summary>
      <div className="space-y-3 border-t border-white/10 p-5">
        {Array.from({ length: building.countAfterMerges || 1 }, (_, index) => {
          const instanceIndex = index + 1;
          const currentLevel = instanceLevels[index] || 0;
          const isTownHall = building.name === "Rathaus";
          return <div key={instanceIndex} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 p-3">
            <span className="font-medium">{building.name} {instanceIndex}</span>
            <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdateLevel(building, instanceIndex, currentLevel - 1)}
          disabled={isSaving || isTownHall}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          -
        </button>
        <div className="min-w-24 rounded-xl bg-white/5 px-4 py-2 text-center font-bold">
          Level {currentLevel}
        </div>
        <button
          onClick={() => onUpdateLevel(building, instanceIndex, currentLevel + 1)}
          disabled={isSaving || isTownHall}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          +
        </button>
            </div>
          </div>;
        })}
      </div>
    </details>
  );
}
