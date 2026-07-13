import { SiegeMachineList } from "@/components/laboratory/SiegeMachineList";
import { SpellList } from "@/components/laboratory/SpellList";
import { TroopList } from "@/components/laboratory/TroopList";
import type { ClashAccount } from "@/types/account";
import type {
  SiegeMachine,
  SiegeMachineLevelMap,
  Spell,
  SpellLevelMap,
  Troop,
  TroopLevelMap,
} from "@/types/laboratory";

type LaboratoryOverviewProps = {
  language?: "de" | "en";
  selectedAccount: ClashAccount | null;
  troops: Troop[];
  availableTroops: Troop[];
  troopLevels: TroopLevelMap;
  troopProgress: number;
  isLoadingTroops: boolean;
  isSavingTroopId: string | null;
  onUpdateTroopLevel: (troop: Troop, nextLevel: number) => void;
  spells: Spell[];
  availableSpells: Spell[];
  spellLevels: SpellLevelMap;
  spellProgress: number;
  isLoadingSpells: boolean;
  isSavingSpellId: string | null;
  onUpdateSpellLevel: (spell: Spell, nextLevel: number) => void;
  siegeMachines: SiegeMachine[];
  availableSiegeMachines: SiegeMachine[];
  siegeMachineLevels: SiegeMachineLevelMap;
  siegeMachineProgress: number;
  isLoadingSiegeMachines: boolean;
  isSavingSiegeMachineId: string | null;
  onUpdateSiegeMachineLevel: (
    siegeMachine: SiegeMachine,
    nextLevel: number,
  ) => void;
};

export function LaboratoryOverview({
  language = "de",
  selectedAccount,
  troops,
  availableTroops,
  troopLevels,
  troopProgress,
  isLoadingTroops,
  isSavingTroopId,
  onUpdateTroopLevel,
  spells,
  availableSpells,
  spellLevels,
  spellProgress,
  isLoadingSpells,
  isSavingSpellId,
  onUpdateSpellLevel,
  siegeMachines,
  availableSiegeMachines,
  siegeMachineLevels,
  siegeMachineProgress,
  isLoadingSiegeMachines,
  isSavingSiegeMachineId,
  onUpdateSiegeMachineLevel,
}: LaboratoryOverviewProps) {
  const en = language === "en";
  const averageProgress = Math.round(
    (troopProgress + spellProgress + siegeMachineProgress) / 3,
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {en ? "Laboratory levels" : "Labor-Erfassung"}
          </h2>
          <p className="mt-3 text-slate-300">
            {en
              ? "Track troops, spells and siege machines for the active account."
              : "Erfasse Truppen, Zauber und Belagerungsmaschinen für den aktiven Account."}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-bold text-amber-300">
          {averageProgress} % {en ? "complete" : "fertig"}
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <details open className="rounded-2xl border border-white/10 p-4">
          <summary className="cursor-pointer text-lg font-bold">
            {en ? "Troops" : "Truppen"} · {troopProgress} %
          </summary>
          <div className="mt-4">
            <TroopList
              availableTroops={availableTroops}
              troopLevels={troopLevels}
              troopsCount={troops.length}
              isLoadingTroops={isLoadingTroops}
              isSavingTroopId={isSavingTroopId}
              selectedAccount={selectedAccount}
              onUpdateTroopLevel={onUpdateTroopLevel}
              language={language}
            />
          </div>
        </details>

        <details open className="rounded-2xl border border-white/10 p-4">
          <summary className="cursor-pointer text-lg font-bold">
            {en ? "Spells" : "Zauber"} · {spellProgress} %
          </summary>
          <div className="mt-4">
            <SpellList
              availableSpells={availableSpells}
              spellLevels={spellLevels}
              spellsCount={spells.length}
              isLoadingSpells={isLoadingSpells}
              isSavingSpellId={isSavingSpellId}
              selectedAccount={selectedAccount}
              onUpdateSpellLevel={onUpdateSpellLevel}
              language={language}
            />
          </div>
        </details>

        <details open className="rounded-2xl border border-white/10 p-4">
          <summary className="cursor-pointer text-lg font-bold">
            {en ? "Siege machines" : "Belagerungsmaschinen"} ·{" "}
            {siegeMachineProgress} %
          </summary>
          <div className="mt-4">
            <SiegeMachineList
              availableSiegeMachines={availableSiegeMachines}
              siegeMachineLevels={siegeMachineLevels}
              siegeMachinesCount={siegeMachines.length}
              isLoadingSiegeMachines={isLoadingSiegeMachines}
              isSavingSiegeMachineId={isSavingSiegeMachineId}
              selectedAccount={selectedAccount}
              onUpdateSiegeMachineLevel={onUpdateSiegeMachineLevel}
              language={language}
            />
          </div>
        </details>
      </div>
    </section>
  );
}
