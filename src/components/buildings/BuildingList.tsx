import { BuildingCard } from "@/components/buildings/BuildingCard";
import { BuildingProgress } from "@/components/buildings/BuildingProgress";
import type { ClashAccount } from "@/types/account";
import type { Building, BuildingInstanceLevelMap } from "@/types/building";

type BuildingListProps = {
  availableBuildings: Building[];
  buildingInstanceLevels: BuildingInstanceLevelMap;
  buildingsCount: number;
  isLoadingBuildings: boolean;
  isSavingBuildingId: string | null;
  progress: number;
  selectedAccount: ClashAccount | null;
  onUpdateBuildingLevel: (building: Building, instanceIndex: number, nextLevel: number) => void;
};

export function BuildingList({
  availableBuildings,
  buildingInstanceLevels,
  buildingsCount,
  isLoadingBuildings,
  isSavingBuildingId,
  progress,
  selectedAccount,
  onUpdateBuildingLevel,
}: BuildingListProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gebäude-Erfassung</h2>
          <p className="mt-3 text-slate-300">
            Wähle einen Account aus und trage die aktuellen Gebäudelevel ein.
            Die Werte werden pro Account gespeichert.
          </p>
        </div>
        <BuildingProgress progress={progress} />
      </div>

      {!selectedAccount ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Bitte zuerst einen Account auswählen.
        </div>
      ) : isLoadingBuildings ? (
        <p className="mt-8 text-slate-300">Lade Gebäude...</p>
      ) : buildingsCount === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Noch keine Gebäude in der Datenbank. Füge gleich ein paar
          Start-Gebäude über den Supabase SQL Editor ein.
        </div>
      ) : availableBuildings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Für dieses Rathauslevel sind noch keine Gebäude hinterlegt.
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {Object.entries(Object.groupBy(availableBuildings, (building) => building.category)).map(([category, categoryBuildings]) => (
            <details key={category} className="rounded-2xl border border-white/10 bg-white/5" open>
              <summary className="cursor-pointer p-5 text-lg font-bold">{category} ({categoryBuildings?.length || 0})</summary>
              <div className="space-y-3 border-t border-white/10 p-4">
              {(categoryBuildings || []).map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              instanceLevels={buildingInstanceLevels[building.id] || []}
              isSaving={isSavingBuildingId === building.id}
              onUpdateLevel={onUpdateBuildingLevel}
            />
              ))}
              </div>
            </details>
          ))}
        </div>
      )}

    </section>
  );
}
