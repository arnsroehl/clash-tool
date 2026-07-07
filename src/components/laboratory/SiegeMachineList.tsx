import { SiegeMachineCard } from "@/components/laboratory/SiegeMachineCard";
import type { ClashAccount } from "@/types/account";
import type {
  SiegeMachine,
  SiegeMachineLevelMap,
} from "@/types/laboratory";

type SiegeMachineListProps = {
  availableSiegeMachines: SiegeMachine[];
  siegeMachineLevels: SiegeMachineLevelMap;
  siegeMachinesCount: number;
  isLoadingSiegeMachines: boolean;
  isSavingSiegeMachineId: string | null;
  selectedAccount: ClashAccount | null;
  onUpdateSiegeMachineLevel: (
    siegeMachine: SiegeMachine,
    nextLevel: number,
  ) => void;
};

export function SiegeMachineList({
  availableSiegeMachines,
  siegeMachineLevels,
  siegeMachinesCount,
  isLoadingSiegeMachines,
  isSavingSiegeMachineId,
  selectedAccount,
  onUpdateSiegeMachineLevel,
}: SiegeMachineListProps) {
  if (!selectedAccount) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        Bitte zuerst einen Account auswählen.
      </div>
    );
  }

  if (isLoadingSiegeMachines) {
    return <p className="text-slate-300">Lade Belagerungsmaschinen...</p>;
  }

  if (siegeMachinesCount === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        Noch keine Belagerungsmaschinen in der Datenbank.
      </div>
    );
  }

  if (availableSiegeMachines.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        Für dieses Rathauslevel sind noch keine Belagerungsmaschinen verfügbar.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {availableSiegeMachines.map((siegeMachine) => (
        <SiegeMachineCard
          key={siegeMachine.id}
          siegeMachine={siegeMachine}
          currentLevel={siegeMachineLevels[siegeMachine.id] || 0}
          isSaving={isSavingSiegeMachineId === siegeMachine.id}
          onUpdateLevel={onUpdateSiegeMachineLevel}
        />
      ))}
    </div>
  );
}
