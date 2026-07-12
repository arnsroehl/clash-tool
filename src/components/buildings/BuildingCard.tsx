import type { Building } from "@/types/building";

type BuildingCardProps = {
  building: Building;
  currentLevel: number;
  isSaving: boolean;
  onUpdateLevel: (building: Building, nextLevel: number) => void;
};

export function BuildingCard({
  building,
  currentLevel,
  isSaving,
  onUpdateLevel,
}: BuildingCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
      <div>
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
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdateLevel(building, currentLevel - 1)}
          disabled={isSaving}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          -
        </button>
        <div className="min-w-24 rounded-xl bg-white/5 px-4 py-2 text-center font-bold">
          Level {currentLevel}
        </div>
        <button
          onClick={() => onUpdateLevel(building, currentLevel + 1)}
          disabled={isSaving}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          +
        </button>
      </div>
    </div>
  );
}
