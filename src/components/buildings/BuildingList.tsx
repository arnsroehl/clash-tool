import { BuildingCard } from "@/components/buildings/BuildingCard";
import { BuildingProgress } from "@/components/buildings/BuildingProgress";
import type { ClashAccount } from "@/types/account";
import type { Building, BuildingLevelMap } from "@/types/building";

const nextSteps = [
  "Mehr echte Gebäude eintragen",
  "Max-Level je Rathaus berücksichtigen",
  "Fortschritt automatisch berechnen",
  "Upgrade-Kosten und Bauzeiten ergänzen",
];

type BuildingListProps = {
  availableBuildings: Building[];
  buildingLevels: BuildingLevelMap;
  buildingsCount: number;
  isLoadingBuildings: boolean;
  isSavingBuildingId: string | null;
  progress: number;
  selectedAccount: ClashAccount | null;
  onUpdateBuildingLevel: (building: Building, nextLevel: number) => void;
};

export function BuildingList({
  availableBuildings,
  buildingLevels,
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
        <div className="mt-8 flex flex-col gap-3">
          {availableBuildings.map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              currentLevel={buildingLevels[building.id] || 0}
              isSaving={isSavingBuildingId === building.id}
              onUpdateLevel={onUpdateBuildingLevel}
            />
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-white/10 pt-8">
        <h3 className="text-lg font-bold">Nächste Entwicklungsschritte</h3>
        <ul className="mt-5 space-y-4">
          {nextSteps.map((step, index) => (
            <li key={step} className="flex items-center gap-3 text-slate-300">
              <span className="flex size-8 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
