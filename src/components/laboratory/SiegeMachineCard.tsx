import type { SiegeMachine } from "@/types/laboratory";

type SiegeMachineCardProps = {
  siegeMachine: SiegeMachine;
  currentLevel: number;
  isSaving: boolean;
  onUpdateLevel: (siegeMachine: SiegeMachine, nextLevel: number) => void;
};

export function SiegeMachineCard({
  siegeMachine,
  currentLevel,
  isSaving,
  onUpdateLevel,
}: SiegeMachineCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-bold text-white">{siegeMachine.name}</p>
        <p className="mt-1 text-sm text-slate-400">
          {siegeMachine.category} · Max Level {siegeMachine.maxLevel}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdateLevel(siegeMachine, currentLevel - 1)}
          disabled={isSaving}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          -
        </button>
        <div className="min-w-24 rounded-xl bg-white/5 px-4 py-2 text-center font-bold">
          Level {currentLevel}
        </div>
        <button
          onClick={() => onUpdateLevel(siegeMachine, currentLevel + 1)}
          disabled={isSaving}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          +
        </button>
      </div>
    </div>
  );
}
