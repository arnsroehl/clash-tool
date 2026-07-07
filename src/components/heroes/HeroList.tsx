import { HeroCard } from "@/components/heroes/HeroCard";
import { HeroProgress } from "@/components/heroes/HeroProgress";
import type { ClashAccount } from "@/types/account";
import type { Hero, HeroLevelMap } from "@/types/hero";

type HeroListProps = {
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
  availableHeroes,
  heroLevels,
  heroesCount,
  isLoadingHeroes,
  isSavingHeroId,
  progress,
  selectedAccount,
  onUpdateHeroLevel,
}: HeroListProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Helden-Erfassung</h2>
          <p className="mt-3 text-slate-300">
            Wähle einen Account aus und trage die aktuellen Heldenlevel ein.
            Die Werte werden pro Account gespeichert.
          </p>
        </div>
        <HeroProgress progress={progress} />
      </div>

      {!selectedAccount ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Bitte zuerst einen Account auswählen.
        </div>
      ) : isLoadingHeroes ? (
        <p className="mt-8 text-slate-300">Lade Helden...</p>
      ) : heroesCount === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Noch keine Helden in der Datenbank. Importiere die Game-Daten oder
          führe die SQL-Datei im Supabase SQL Editor aus.
        </div>
      ) : availableHeroes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Für dieses Rathauslevel sind noch keine Helden verfügbar.
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
