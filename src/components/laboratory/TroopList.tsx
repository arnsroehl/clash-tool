import { TroopCard } from "@/components/laboratory/TroopCard";
import type { ClashAccount } from "@/types/account";
import type { Troop, TroopLevelMap } from "@/types/laboratory";

type TroopListProps = {
  availableTroops: Troop[];
  troopLevels: TroopLevelMap;
  troopsCount: number;
  isLoadingTroops: boolean;
  isSavingTroopId: string | null;
  selectedAccount: ClashAccount | null;
  onUpdateTroopLevel: (troop: Troop, nextLevel: number) => void;
};

export function TroopList({
  availableTroops,
  troopLevels,
  troopsCount,
  isLoadingTroops,
  isSavingTroopId,
  selectedAccount,
  onUpdateTroopLevel,
}: TroopListProps) {
  if (!selectedAccount) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        Bitte zuerst einen Account auswählen.
      </div>
    );
  }

  if (isLoadingTroops) {
    return <p className="text-slate-300">Lade Truppen...</p>;
  }

  if (troopsCount === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        Noch keine Truppen in der Datenbank.
      </div>
    );
  }

  if (availableTroops.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        Für dieses Rathauslevel sind noch keine Truppen verfügbar.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {availableTroops.map((troop) => (
        <TroopCard
          key={troop.id}
          troop={troop}
          currentLevel={troopLevels[troop.id] || 0}
          isSaving={isSavingTroopId === troop.id}
          onUpdateLevel={onUpdateTroopLevel}
        />
      ))}
    </div>
  );
}
