import { SiegeMachineCard } from "@/components/laboratory/SiegeMachineCard";
import type { ClashAccount } from "@/types/account";
import type { SiegeMachine, SiegeMachineLevelMap } from "@/types/laboratory";

type SiegeMachineListProps = {
  language?: "de" | "en";
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
  language = "de",
  availableSiegeMachines,
  siegeMachineLevels,
  siegeMachinesCount,
  isLoadingSiegeMachines,
  isSavingSiegeMachineId,
  selectedAccount,
  onUpdateSiegeMachineLevel,
}: SiegeMachineListProps) {
  const en = language === "en";
  if (!selectedAccount) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        {en
          ? "Please select an account first."
          : "Bitte zuerst einen Account auswählen."}
      </div>
    );
  }

  if (isLoadingSiegeMachines) {
    return (
      <p className="text-slate-300">
        {en ? "Loading siege machines…" : "Lade Belagerungsmaschinen..."}
      </p>
    );
  }

  if (siegeMachinesCount === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        {en
          ? "No siege machines in the database yet."
          : "Noch keine Belagerungsmaschinen in der Datenbank."}
      </div>
    );
  }

  if (availableSiegeMachines.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        {en
          ? "No siege machines are available for this Town Hall level."
          : "Für dieses Rathauslevel sind noch keine Belagerungsmaschinen verfügbar."}
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
