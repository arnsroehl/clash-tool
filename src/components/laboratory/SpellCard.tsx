import type { Spell } from "@/types/laboratory";

type SpellCardProps = {
  spell: Spell;
  currentLevel: number;
  isSaving: boolean;
  onUpdateLevel: (spell: Spell, nextLevel: number) => void;
};

export function SpellCard({
  spell,
  currentLevel,
  isSaving,
  onUpdateLevel,
}: SpellCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-bold text-white">{spell.name}</p>
        <p className="mt-1 text-sm text-slate-400">
          {spell.category} · Max Level {spell.maxLevel}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdateLevel(spell, currentLevel - 1)}
          disabled={isSaving}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          -
        </button>
        <div className="min-w-24 rounded-xl bg-white/5 px-4 py-2 text-center font-bold">
          Level {currentLevel}
        </div>
        <button
          onClick={() => onUpdateLevel(spell, currentLevel + 1)}
          disabled={isSaving}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          +
        </button>
      </div>
    </div>
  );
}
