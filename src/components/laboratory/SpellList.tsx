import { SpellCard } from "@/components/laboratory/SpellCard";
import type { ClashAccount } from "@/types/account";
import type { Spell, SpellLevelMap } from "@/types/laboratory";

type SpellListProps = {
  language?: "de" | "en";
  availableSpells: Spell[];
  spellLevels: SpellLevelMap;
  spellsCount: number;
  isLoadingSpells: boolean;
  isSavingSpellId: string | null;
  selectedAccount: ClashAccount | null;
  onUpdateSpellLevel: (spell: Spell, nextLevel: number) => void;
};

export function SpellList({
  language = "de",
  availableSpells,
  spellLevels,
  spellsCount,
  isLoadingSpells,
  isSavingSpellId,
  selectedAccount,
  onUpdateSpellLevel,
}: SpellListProps) {
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

  if (isLoadingSpells) {
    return (
      <p className="text-slate-300">
        {en ? "Loading spells…" : "Lade Zauber..."}
      </p>
    );
  }

  if (spellsCount === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        {en
          ? "No spells in the database yet."
          : "Noch keine Zauber in der Datenbank."}
      </div>
    );
  }

  if (availableSpells.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
        {en
          ? "No spells are available for this Town Hall level."
          : "Für dieses Rathauslevel sind noch keine Zauber verfügbar."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {availableSpells.map((spell) => (
        <SpellCard
          key={spell.id}
          spell={spell}
          currentLevel={spellLevels[spell.id] || 0}
          isSaving={isSavingSpellId === spell.id}
          onUpdateLevel={onUpdateSpellLevel}
        />
      ))}
    </div>
  );
}
