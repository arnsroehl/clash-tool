import { HeroCard } from "@/components/heroes/HeroCard";
import { HeroProgress } from "@/components/heroes/HeroProgress";
import type { ClashAccount } from "@/types/account";
import type { Hero, HeroLevelMap } from "@/types/hero";

type HeroListProps = {
  language?: "de" | "en";
  availableHeroes: Hero[];
  heroLevels: HeroLevelMap;
  heroesCount: number;
  isLoadingHeroes: boolean;
  isSavingHeroId: string | null;
  progress: number;
  selectedAccount: ClashAccount | null;
  onUpdateHeroLevel: (hero: Hero, nextLevel: number) => void;
};

export function HeroList({
  language = "de",
  availableHeroes,
  heroLevels,
  heroesCount,
  isLoadingHeroes,
  isSavingHeroId,
  progress,
  selectedAccount,
  onUpdateHeroLevel,
}: HeroListProps) {
  const en = language === "en";
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {en ? "Hero & guardian levels" : "Helden-Erfassung"}
          </h2>
          <p className="mt-3 text-slate-300">
            {en
              ? "Select an account and enter the current hero and guardian levels. Values are saved per account."
              : "Wähle einen Account aus und trage die aktuellen Heldenlevel ein. Die Werte werden pro Account gespeichert."}
          </p>
        </div>
        <HeroProgress progress={progress} language={language} />
      </div>

      {!selectedAccount ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en
            ? "Please select an account first."
            : "Bitte zuerst einen Account auswählen."}
        </div>
      ) : isLoadingHeroes ? (
        <p className="mt-8 text-slate-300">
          {en ? "Loading heroes…" : "Lade Helden..."}
        </p>
      ) : heroesCount === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en
            ? "No heroes in the database yet. Import the game data first."
            : "Noch keine Helden in der Datenbank. Importiere zuerst die Game-Daten."}
        </div>
      ) : availableHeroes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en
            ? "No heroes or guardians are available for this Town Hall level."
            : "Für dieses Rathauslevel sind noch keine Helden verfügbar."}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {availableHeroes.map((hero) => (
            <HeroCard
              key={hero.id}
              hero={hero}
              currentLevel={heroLevels[hero.id] || 0}
              isSaving={isSavingHeroId === hero.id}
              onUpdateLevel={onUpdateHeroLevel}
            />
          ))}
        </div>
      )}
    </section>
  );
}
